// Chunked voxel world: generation, storage, meshing (with ambient occlusion).
(function (global) {
  "use strict";
  const B = global.Blocks.B;
  const T = global.Blocks.T;
  const tileUV = global.Blocks.tileUV;
  const { fbm2, fbm3, hash2, hashInt } = global.Noise;

  const CX = 16, CY = 80, SEA = 30;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function World(seed) {
    this.seed = seed | 0;
    this.chunks = new Map();
  }

  World.prototype.key = function (cx, cz) { return cx * 100000 + cz; };

  World.prototype.getChunk = function (cx, cz) { return this.chunks.get(this.key(cx, cz)); };

  World.prototype.getBlock = function (x, y, z) {
    if (y < 0) return B.BEDROCK;
    if (y >= CY) return B.AIR;
    const cx = x >> 4, cz = z >> 4;
    const ch = this.chunks.get(this.key(cx, cz));
    if (!ch) return B.AIR;
    return ch.data[(y * CX + (z - cz * CX)) * CX + (x - cx * CX)];
  };

  World.prototype.setBlock = function (x, y, z, id) {
    if (y < 0 || y >= CY) return null;
    const cx = x >> 4, cz = z >> 4;
    const ch = this.chunks.get(this.key(cx, cz));
    if (!ch) return null;
    ch.data[(y * CX + (z - cz * CX)) * CX + (x - cx * CX)] = id;
    return ch;
  };

  World.prototype.isOpaque = function (x, y, z) {
    const b = this.getBlock(x, y, z);
    return b !== B.AIR && b !== B.WATER && b !== B.GLASS && b !== B.LEAVES;
  };

  World.prototype.isSolid = function (x, y, z) {
    const b = this.getBlock(x, y, z);
    return b !== B.AIR && b !== B.WATER;
  };

  // ---------------- terrain generation ----------------
  World.prototype.generateChunk = function (chunk) { generateTerrain(this, chunk); };

  function generateTerrain(world, chunk) {
    const d = chunk.data;
    const seed = world.seed;
    const wx0 = chunk.cx * CX, wz0 = chunk.cz * CX;

    const heights = new Int16Array(CX * CX);
    const flags = new Uint8Array(CX * CX); // 1 desert, 2 forest
    for (let lz = 0; lz < CX; lz++) for (let lx = 0; lx < CX; lx++) {
      const wx = wx0 + lx, wz = wz0 + lz;
      const cont = fbm2(wx * 0.0045, wz * 0.0045, 3, seed + 1000);
      const detail = fbm2(wx * 0.02, wz * 0.02, 3, seed + 2000);
      let h = 18 + cont * 26 + (detail - 0.5) * 8;
      h = clamp(Math.floor(h), 6, CY - 12);
      heights[lx + lz * CX] = h;
      let f = 0;
      if (fbm2(wx * 0.006 + 1000.7, wz * 0.006 + 1000.7, 3, seed + 3000) > 0.58) f |= 1;
      if (fbm2(wx * 0.012 + 2000.3, wz * 0.012 + 2000.3, 3, seed + 4000) > 0.56) f |= 2;
      flags[lx + lz * CX] = f;
    }

    const nearWater = h => Math.abs(h - SEA) <= 2;

    for (let lz = 0; lz < CX; lz++) for (let lx = 0; lx < CX; lx++) {
      const wx = wx0 + lx, wz = wz0 + lz;
      const h = heights[lx + lz * CX];
      const desert = (flags[lx + lz * CX] & 1) !== 0;
      const i = lx + lz * CX;

      for (let y = 0; y < h; y++) {
        let id;
        if (y === 0) id = B.BEDROCK;
        else if (y === 1 && hashInt(wx * 92821 + wz * 68917 + seed) < 0.45) id = B.BEDROCK;
        else if (y === h - 1) id = desert ? B.SAND : (nearWater(h) ? B.SAND : (h < SEA - 2 ? B.DIRT : B.GRASS));
        else if (desert) id = y >= h - 5 ? B.SAND : B.STONE;
        else id = y >= h - 4 ? B.DIRT : B.STONE;
        d[(y * CX + lz) * CX + lx] = id;
      }

      // ores (replace stone only)
      for (let y = 2; y < h - 1; y++) {
        const idx = (y * CX + lz) * CX + lx;
        if (d[idx] !== B.STONE) continue;
        const r = hash2(wx * 7 + y * 13, wz * 11 + y * 7, seed + 5000);
        if (y < 58 && r < 0.022) d[idx] = B.COAL_ORE;
        else if (y < 46 && r < 0.014) d[idx] = B.IRON_ORE;
        else if (y < 20 && r < 0.008) d[idx] = B.GOLD_ORE;
        else if (y < 14 && r < 0.005) d[idx] = B.DIAMOND_ORE;
      }

      // caves
      for (let y = 2; y < h - 2; y++) {
        const idx = (y * CX + lz) * CX + lx;
        if (d[idx] === B.AIR) continue;
        const c = fbm3(wx * 0.08, y * 0.11, wz * 0.08, 3, seed + 6000);
        if (c > 0.655) d[idx] = B.AIR;
      }

      // water
      for (let y = h; y < SEA; y++) {
        const idx = (y * CX + lz) * CX + lx;
        if (d[idx] === B.AIR) d[idx] = B.WATER;
      }
    }

    // trees (interior only, canopy radius 2 never crosses chunk border)
    for (let lz = 2; lz < CX - 2; lz++) for (let lx = 2; lx < CX - 2; lx++) {
      const wx = wx0 + lx, wz = wz0 + lz;
      const h = heights[lx + lz * CX];
      if (h <= SEA + 1) continue;
      const surf = d[((h - 1) * CX + lz) * CX + lx];
      if (surf !== B.GRASS) continue;
      const forest = (flags[lx + lz * CX] & 2) !== 0;
      const p = hash2(wx, wz, seed + 7000);
      if (p >= (forest ? 0.05 : 0.006)) continue;

      const th = 4 + Math.floor(hash2(wx * 3 + 1, wz * 7, seed + 7100) * 3);
      const Ttop = h + th - 1;
      if (Ttop + 2 >= CY - 1) continue;

      const setLeaf = (x, y, z) => {
        if (y < 1 || y >= CY) return;
        const cx2 = x >> 4, cz2 = z >> 4;
        if (cx2 !== chunk.cx || cz2 !== chunk.cz) return;
        const li = ((y * CX) + (z - cz2 * CX)) * CX + (x - cx2 * CX);
        if (d[li] === B.AIR) d[li] = B.LEAVES;
      };

      for (let y = h; y <= Ttop; y++) {
        const idx = ((y * CX + lz) * CX + lx);
        if (d[idx] === B.AIR) d[idx] = B.LOG;
      }
      for (let dy = -2; dy <= 1; dy++) {
        const ly = Ttop + dy;
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && dy >= 0) continue;
          if (dy === 1 && Math.abs(dx) > 1) continue;
          if (dy === 1 && Math.abs(dz) > 1) continue;
          setLeaf(wx + dx, ly, wz + dz);
        }
      }
    }

    chunk.generated = true;
  }

  // ---------------- meshing ----------------
  // Face tables: corners ordered CCW seen from outside, uv per corner.
  // v coords are cell-local [0,1].
  const FACES = [
    { // +Y top
      n: [0, 1, 0],
      v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
      uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
      bright: 1.0
    },
    { // -Y bottom
      n: [0, -1, 0],
      v: [[1, 0, 0], [1, 0, 1], [0, 0, 1], [0, 0, 0]],
      uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
      bright: 0.5
    },
    { // +X
      n: [1, 0, 0],
      v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      bright: 0.7
    },
    { // -X
      n: [-1, 0, 0],
      v: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
      uv: [[0, 0], [0, 1], [1, 1], [1, 0]],
      bright: 0.7
    },
    { // +Z
      n: [0, 0, 1],
      v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
      uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
      bright: 0.85
    },
    { // -Z
      n: [0, 0, -1],
      v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
      uv: [[0, 0], [1, 0], [1, 1], [0, 1]],
      bright: 0.85
    }
  ];
  const FACE_AXIS = [1, 1, 0, 0, 2, 2]; // axis of the normal (0=x 1=y 2=z)
  const AO_BRIGHT = [1.0, 0.82, 0.64, 0.46];

  function faceTile(def, faceIdx) {
    // faceIdx: 0 +y, 1 -y, else side
    if (faceIdx === 0) return def.faces.top;
    if (faceIdx === 1) return def.faces.bottom;
    return def.faces.side;
  }

  World.prototype.meshChunk = function (chunk, three) {
    const pos = [], uvs = [], col = [], idx = [];
    const wpos = [], wuvs = [], widx = [];
    const wx0 = chunk.cx * CX, wz0 = chunk.cz * CX;
    const data = chunk.data;

    const selfOpaque = (lx, y, lz) => {
      const b = data[(y * CX + lz) * CX + lx];
      return b !== B.AIR && b !== B.WATER && b !== B.GLASS && b !== B.LEAVES;
    };

    // opaque at world (x,y,z) with fast local path
    const opaqueAt = (wx, y, wz) => {
      if (y < 0) return true;
      if (y >= CY) return false;
      const cx = wx >> 4, cz = wz >> 4;
      if (cx === chunk.cx && cz === chunk.cz) {
        return selfOpaque(wx - wx0, y, wz - wz0);
      }
      return this.isOpaque(wx, y, wz);
    };

    // AO per vertex, classic 2-side + corner test
    function vertexAO(cellX, cellY, cellZ, faceIdx, v) {
      const n = FACES[faceIdx].n;
      const axis = FACE_AXIS[faceIdx];
      const tang = [0, 1, 2].filter(a => a !== axis);
      const o1 = v[tang[0]] === 1 ? 1 : -1;
      const o2 = v[tang[1]] === 1 ? 1 : -1;
      const bx = cellX + n[0], by = cellY + n[1], bz = cellZ + n[2];
      const s1 = opaqueAt(bx + (tang[0] === 0 ? o1 : 0), by + (tang[0] === 1 ? o1 : 0), bz + (tang[0] === 2 ? o1 : 0));
      const s2 = opaqueAt(bx + (tang[1] === 0 ? o2 : 0), by + (tang[1] === 1 ? o2 : 0), bz + (tang[1] === 2 ? o2 : 0));
      const co = s1 && s2 ? 3 : (s1 ? 1 : 0) + (s2 ? 1 : 0);
      return FACES[faceIdx].bright * AO_BRIGHT[co];
    }

    function pushFace(cellX, cellY, cellZ, faceIdx, tile) {
      const f = FACES[faceIdx];
      const base = pos.length / 3;
      const uvT = tileUV(tile);
      const du = uvT[2] - uvT[0], dv = uvT[3] - uvT[1];
      for (let i = 0; i < 4; i++) {
        const v = f.v[i];
        pos.push(cellX + v[0], cellY + v[1], cellZ + v[2]);
        uvs.push(uvT[0] + f.uv[i][0] * du, uvT[1] + f.uv[i][1] * dv);
        const b = vertexAO(cellX, cellY, cellZ, faceIdx, v);
        col.push(b, b, b);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    function pushWaterFace(cellX, cellY, cellZ, faceIdx) {
      const f = FACES[faceIdx];
      const base = wpos.length / 3;
      const hTop = 0.875;
      for (let i = 0; i < 4; i++) {
        const v = f.v[i];
        const wy = v[1] === 1 ? hTop : 0;
        wpos.push(cellX + v[0], cellY + wy, cellZ + v[2]);
        wuvs.push(f.uv[i][0], f.uv[i][1]);
      }
      widx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    const airAt = (wx, y, wz) => {
      if (y < 0 || y >= CY) return false;
      const cx = wx >> 4, cz = wz >> 4;
      if (cx === chunk.cx && cz === chunk.cz) return data[(y * CX + (wz - wz0)) * CX + (wx - wx0)] === B.AIR;
      return this.getBlock(wx, y, wz) === B.AIR;
    };

    for (let lz = 0; lz < CX; lz++) for (let lx = 0; lx < CX; lx++) {
      for (let y = 0; y < CY; y++) {
        const b = data[(y * CX + lz) * CX + lx];
        if (b === B.AIR) continue;
        const wx = wx0 + lx, wz = wz0 + lz;

        if (b === B.WATER) {
          const above = this.getBlock(wx, y + 1, wz);
          const surf = above === B.AIR || above === B.GLASS;
          if (surf) {
            pushWaterFace(wx, y, wz, 0);
            if (airAt(wx + 1, y, wz)) pushWaterFace(wx, y, wz, 2);
            if (airAt(wx - 1, y, wz)) pushWaterFace(wx, y, wz, 3);
            if (airAt(wx, y, wz + 1)) pushWaterFace(wx, y, wz, 4);
            if (airAt(wx, y, wz - 1)) pushWaterFace(wx, y, wz, 5);
          }
          continue;
        }

        const def = global.Blocks.DEFS[b];
        for (let fi = 0; fi < 6; fi++) {
          const n = FACES[fi].n;
          const nb = this.getBlock(wx + n[0], y + n[1], wz + n[2]);
          let visible;
          if (nb === B.AIR) visible = true;
          else if (nb === b) visible = false;
          else visible = nb === B.WATER || nb === B.GLASS || nb === B.LEAVES;
          if (!visible) continue;
          pushFace(wx, y, wz, fi, faceTile(def, fi));
        }
      }
    }

    const build = (p, u, c, i, material) => {
      if (p.length === 0) return null;
      const g = new three.BufferGeometry();
      g.setAttribute("position", new three.Float32BufferAttribute(p, 3));
      g.setAttribute("uv", new three.Float32BufferAttribute(u, 2));
      g.setAttribute("color", new three.Float32BufferAttribute(c, 3));
      g.setIndex(i);
      g.computeBoundingSphere();
      const m = new three.Mesh(g, material);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      return m;
    };

    chunk.mesh = build(pos, uvs, col, idx, this._opaqueMat);
    chunk.waterMesh = build(wpos, wuvs, [], widx, this._waterMat);
    return true;
  };

  World.prototype.disposeChunk = function (chunk) {
    if (chunk.mesh) { chunk.mesh.geometry.dispose(); }
    if (chunk.waterMesh) { chunk.waterMesh.geometry.dispose(); }
    chunk.mesh = null;
    chunk.waterMesh = null;
  };

  global.World = World;
  global.WorldConstants = { CX, CY, SEA };
})(window);
