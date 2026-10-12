// Chunked voxel mesh rendering with baked ambient occlusion + skylight.

const CS = 16; // chunk size in x/z, full height

const FACES = [
  { dir: [0, 1, 0],  corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] }, // +Y
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] }, // -Y
  { dir: [1, 0, 0],  corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] }, // +X
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] }, // -X
  { dir: [0, 0, 1],  corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }, // +Z
  { dir: [0, 0, -1], corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] }, // -Z
];

// AO samples per face (3 diagonal neighbors)
const AO_SAMP = [
  [[-1, 1, -1], [1, 1, -1], [-1, 1, 1]],   // +Y
  [[-1, -1, -1], [1, -1, -1], [-1, -1, 1]], // -Y
  [[1, -1, -1], [1, 1, -1], [1, -1, 1]],   // +X
  [[-1, -1, -1], [-1, 1, -1], [-1, -1, 1]], // -X
  [[-1, -1, 1], [1, -1, 1], [-1, 1, 1]],   // +Z
  [[-1, -1, -1], [1, -1, -1], [-1, 1, -1]], // -Z
];

function aoFor(world, x, y, z, face) {
  const s = AO_SAMP[face];
  let c = 0;
  for (const [dx, dy, dz] of s) {
    const b = world.get(x + dx, y + dy, z + dz);
    const m = BLOCKS[b];
    if (m && m.solid) c++;
  }
  return c / 3;
}

function brightness(world, x, y, z, face) {
  const light = world.light ? world.light[idx(x, y, z)] / 15 : 1;
  const ao = aoFor(world, x, y, z, face);
  return Math.max(0.03, light * (1 - ao * 0.55) + 0.02);
}

function pushFace(arr, x, y, z, face, blockId, world, uvFn) {
  const f = FACES[face];
  const d = f.dir;
  const n = [d[0], d[1], d[2]];
  const b = brightness(world, x, y, z, face);
  const [u0, u1, v0, v1] = uvFn();
  for (let i = 0; i < 4; i++) {
    const c = f.corners[i];
    arr.push(x + c[0], y + c[1], z + c[2]);
    arr.push(n[0], n[1], n[2]);
    arr.push(b, b, b);
    const cx = c[0], cy = c[1];
    arr.push(u0 + cx * (u1 - u0), v0 + (1 - cy) * (v1 - v0));
  }
}

function pushWaterFace(arr, x, y, z, face, world) {
  const f = FACES[face];
  const d = f.dir;
  const n = [d[0], d[1], d[2]];
  const level = world.waterLevel[x * D + z];
  const top = y + level;
  const b = 0.5;
  for (let i = 0; i < 4; i++) {
    const c = f.corners[i];
    const py = face === 0 ? top : (c[1] === 0 ? y : top);
    arr.push(x + c[0], py, z + c[2]);
    arr.push(n[0], n[1], n[2]);
    arr.push(b, b, b);
    // uv: tile by world x/z
    let u, v;
    if (face === 0) { u = (x % CS) / CS; v = (z % CS) / CS; }
    else if (face === 2 || face === 3) { u = (z % CS) / CS; v = (y % 1) / 1; }
    else { u = (x % CS) / CS; v = (y % 1) / 1; }
    arr.push(u, v);
  }
}

class Chunk {
  constructor(world, cx, cz, atlas) {
    this.world = world;
    this.cx = cx;
    this.cz = cz;
    this.atlas = atlas;
    this.group = new THREE.Group();
    this.group.position.set(cx * CS, 0, cz * CS);
    this.build();
  }

  build() {
    this.dispose();
    const opaque = { pos: [], norm: [], col: [], uv: [] };
    const transl = { pos: [], norm: [], col: [], uv: [] };
    const water = { pos: [], norm: [], col: [], uv: [] };

    const uvBlock = (blockId, face) => {
      const t = faceTile(blockId, face);
      const r = uvRect(t);
      return [r.u0, r.u1, r.v0, r.v1];
    };

    for (let lx = 0; lx < CS; lx++) {
      for (let lz = 0; lz < CS; lz++) {
        const x = this.cx * CS + lx;
        const z = this.cz * CS + lz;
        for (let y = 0; y < H; y++) {
          const id = this.world.get(x, y, z);
          if (id === B.AIR) continue;
          const m = BLOCKS[id];
          if (!m) continue;

          if (m.water) {
            // water surface
            const above = this.world.get(x, y + 1, z);
            const am = BLOCKS[above];
            if (!am || !am.solid) {
              pushWaterFace(water.pos, water.norm, water.col, water.uv, x, y, z, 0, this.world);
            }
            // water sides
            for (let face = 2; face < 6; face++) {
              const d = FACES[face].dir;
              const nb = this.world.get(x + d[0], y + d[1], z + d[2]);
              const nm = BLOCKS[nb];
              if (nm && nm.solid) continue;
              if (nm && nm.water) continue;
              pushWaterFace(water.pos, water.norm, water.col, water.uv, x, y, z, face, this.world);
            }
            continue;
          }

          const isTransl = m.translucent;
          for (let face = 0; face < 6; face++) {
            const d = FACES[face].dir;
            const nb = this.world.get(x + d[0], y + d[1], z + d[2]);
            const nm = BLOCKS[nb];
            let emit;
            if (isTransl) {
              emit = !nm || !nm.solid || nm.translucent || nm.water;
            } else {
              emit = !nm || !nm.solid || nm.translucent || nm.water || nm.plant;
            }
            if (!emit) continue;
            const arr = isTransl ? transl : opaque;
            pushFace(arr.pos, arr.norm, arr.col, arr.uv, x, y, z, face, id, this.world, uvBlock);
          }
        }
      }
    }

    const buildMesh = (data, mat) => {
      if (data.pos.length === 0) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32Buffer(data.pos));
      geo.setAttribute('normal', new THREE.Float32Buffer(data.norm));
      geo.setAttribute('color', new THREE.Float32Buffer(data.col));
      geo.setAttribute('uv', new THREE.Float32Buffer(data.uv));
      const mesh = new THREE.Mesh(geo, mat);
      return mesh;
    };

    const opaqueMat = new THREE.MeshLambertMaterial({ map: this.atlas, transparent: false });
    const translMat = new THREE.MeshLambertMaterial({
      map: this.atlas, transparent: true, opacity: 0.9, depthWrite: false,
    });
    const waterMat = new THREE.MeshLambertMaterial({
      map: this.waterTex,
      color: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const m1 = buildMesh(opaque, opaqueMat);
    const m2 = buildMesh(transl, translMat);
    const m3 = buildMesh(water, waterMat);
    if (m1) this.group.add(m1);
    if (m2) this.group.add(m2);
    if (m3) this.group.add(m3);
    this.waterMesh = m3;
  }

  dispose() {
    for (const child of [...this.group.children]) {
      child.geometry.dispose();
      child.material.dispose();
      this.group.remove(child);
    }
  }
}

class WorldRenderer {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.chunks = new Map();
    this.atlas = null;
    this.waterTex = null;
  }

  buildAll() {
    // remove old chunk groups so a reloaded world doesn't duplicate geometry
    for (const chunk of this.chunks.values()) {
      this.scene.remove(chunk.group);
      chunk.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    this.chunks.clear();
    this.atlas = new THREE.CanvasTexture(makeAtlas());
    this.atlas.magFilter = THREE.NearestFilter;
    this.atlas.minFilter = THREE.NearestFilter;
    // water texture: 2 frames stacked, repeat
    const c = document.createElement('canvas');
    c.width = 16; c.height = 32;
    const g = c.getContext('2d');
    const img = g.getImageData(16, 32);
    for (let f = 0; f < 2; f++)
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const i = (y * 16 + x) * 4;
          const w = Math.sin((x + y + f * 8) * 0.8) * 0.5 + 0.5;
          img[i] = 40 + w * 40; img[i + 1] = 100 + w * 60; img[i + 2] = 180 + w * 50; img[i + 3] = 255;
        }
    g.putImageData(img, 0, 0);
    this.waterTex = new THREE.CanvasTexture(c);
    this.waterTex.magFilter = THREE.NearestFilter;
    this.waterTex.minFilter = THREE.NearestFilter;
    this.waterTex.wrapS = THREE.RepeatWrapping;
    this.waterTex.wrapT = THREE.RepeatWrapping;

    for (let cx = 0; cx < W / CS; cx++)
      for (let cz = 0; cz < D / CS; cz++) {
        const chunk = new Chunk(this.world, cx, cz, this.atlas);
        this.chunks.set(cx + ',' + cz, chunk);
        this.scene.add(chunk.group);
      }
  }

  rebuild(cx, cz) {
    const key = cx + ',' + cz;
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    chunk.build();
  }

  rebuildArea(x, y, z) {
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    this.rebuild(cx, cz);
    // neighbors for AO at borders
    if (cx > 0) this.rebuild(cx - 1, cz);
    if (cx < W / CS - 1) this.rebuild(cx + 1, cz);
    if (cz > 0) this.rebuild(cx, cz - 1);
    if (cz < D / CS - 1) this.rebuild(cx, cz + 1);
  }

  update(dt) {
    if (this.waterTex) this.waterTex.offset.y = (this.waterTex.offset.y + dt * 0.08) % 1;
  }
}
