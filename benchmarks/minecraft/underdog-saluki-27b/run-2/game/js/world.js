// World data: block grid, water levels, terrain generation, save/load.

const W = 128;      // world width (x)
const D = 128;      // world depth (z)
const H = 64;       // world height (y)
const SEA = 18;     // sea level

const idx = (x, y, z) => y * W * D + x * D + z;

class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.blocks = new Uint8Array(W * D * H);
    this.waterLevel = new Float32Array(W * D); // per column, 0..1
    this.light = new Uint8Array(W * D * H);     // skylight 0..15
    this.crops = new Map(); // key -> {stage, timer}
    this.generate();
  }

  inBounds(x, y, z) {
    return x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;
  }

  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return B.AIR;
    return this.blocks[idx(x, y, z)];
  }

  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return;
    const i = idx(x, y, z);
    const prev = this.blocks[i];
    this.blocks[i] = id;
    if (id === B.WATER && prev !== B.WATER) this.waterLevel[x * D + z] = 1;
    if (prev === B.WATER && id !== B.WATER) this.waterLevel[x * D + z] = 0;
    return prev;
  }

  solid(x, y, z) {
    const m = BLOCKS[this.get(x, y, z)];
    return m ? m.solid : false;
  }

  // ---- skylight -----------------------------------------------------------
  computeLight() {
    const light = this.light;
    // column pass
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        let l = 15;
        for (let y = H - 1; y >= 0; y--) {
          const b = this.blocks[idx(x, y, z)];
          const m = BLOCKS[b];
          if (m && m.solid && b !== B.GRASS) l = 0;
          // grass/leaves/plants let some light through (half)
          else if (m && m.solid) l = Math.min(l, 7);
          else if (b === B.WATER) l = Math.min(l, l > 0 ? 7 : l);
          light[(y * W + x * D + z)] = l;
        }
      }
    // horizontal spread (2 iterations)
    for (let pass = 0; pass < 2; pass++) {
      const next = new Uint8Array(W * D * H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          for (let z = 0; z < D; z++) {
            const i = idx(x, y, z);
            const l = light[i];
            if (l >= 15) { next[i] = 15; continue; }
            let s = 0;
            const n = [
              [x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z],
              [x, y, z + 1], [x, y, z - 1], [x + 1, y, z + 1], [x - 1, y, z - 1]
            ];
            for (const [nx, ny, nz] of n) {
              if (this.inBounds(nx, ny, nz)) s += light[idx(nx, ny, nz)];
            }
            next[i] = Math.min(15, l, Math.floor(s / 8));
          }
      this.light = next;
    }
  }

  // ---- terrain generation ---------------------------------------------------
  generate() {
    const perlin = new Perlin(this.seed);
    const biomeN = new Perlin(this.seed + 1000);
    const desN = new Perlin(this.seed + 2000);
    const mtN = new Perlin(this.seed + 3000);

    const heights = new Int16Array(W * D);
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        const n = perlin.fbm(x / 64, z / 64, 5, 2, 0.5);
        const m = mtN.fbm(x / 96, z / 96, 4, 2, 0.5);
        let h = 22 + n * 14;
        if (m > 0.25) h += (m - 0.25) * 40;
        h = Math.max(4, Math.min(H - 8, h));
        heights[x * D + z] = Math.floor(h);
      }

    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        const h = heights[x * D + z];
        const desert = desN.fbm(x / 48, z / 48, 3, 2, 0.5) > 0.35;
        const forest = biomeN.fbm(x / 40, z / 40, 3, 2, 0.5) > 0.2;
        const mountain = h > 40;

        for (let y = 0; y <= h; y++) {
          let id;
          if (y === 0) id = B.BEDROCK;
          else if (y < h - 3) id = B.STONE;
          else if (y < h) id = B.DIRT;
          else {
            if (desert) id = B.SAND;
            else if (mountain) id = B.SNOW;
            else if (forest) id = B.GRASS;
            else id = B.GRASS;
          }
          this.blocks[idx(x, y, z)] = id;
        }
        // ocean
        if (h < SEA) {
          for (let y = h + 1; y <= SEA; y++)
            this.blocks[idx(x, y, z)] = B.WATER;
          this.waterLevel[x * D + z] = 1;
        }
        // beach sand
        if (h >= SEA - 2 && h <= SEA + 2 && !desert) {
          for (let y = h; y >= h - 2; y--)
            if (y > 0) this.blocks[idx(x, y, z)] = B.SAND;
        }
        // gravel patches
        if (perlin.fbm(x / 16, z / 16, 3, 2, 0.5) > 0.5 && h > SEA)
          this.blocks[idx(x, h, z)] = B.GRAVEL;
      }

    // ores
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++)
        for (let y = 1; y < heights[x * D + z] - 2; y++) {
          if (this.blocks[idx(x, y, z)] !== B.STONE) continue;
          const r = perlin.noise(x * 0.1, y * 0.1 + z * 0.13) + 0.5;
          if (y < 12 && r > 0.93) this.blocks[idx(x, y, z)] = B.DIAMOND_ORE;
          else if (y < 32 && r > 0.88) this.blocks[idx(x, y, z)] = B.GOLD_ORE;
          else if (r > 0.85) this.blocks[idx(x, y, z)] = B.IRON_ORE;
          else if (r > 0.82) this.blocks[idx(x, y, z)] = B.COAL_ORE;
        }

    // obsidian in mountains
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++)
        if (heights[x * D + z] > 52 && Math.random() < 0.02)
          this.blocks[idx(x, heights[x * D + z], z)] = B.OBSIDIAN;

    // trees
    for (let x = 2; x < W - 2; x++)
      for (let z = 2; z < D - 2; z++) {
        const h = heights[x * D + z];
        if (h <= SEA) continue;
        const top = this.blocks[idx(x, h, z)];
        if (top !== B.GRASS) continue;
        const forest = biomeN.fbm(x / 40, z / 40, 3, 2, 0.5) > 0.2;
        if (Math.random() < (forest ? 0.22 : 0.08)) {
          const type = Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? 1 : 2);
          const th = type === 1 ? 5 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 3);
          const trunk = type === 1 ? B.SPRUCE_LOG : (type === 2 ? B.BIRCH_LOG : B.OAK_LOG);
          const leaves = type === 1 ? B.SPRUCE_LEAVES : (type === 2 ? B.BIRCH_LEAVES : B.OAK_LEAVES);
          for (let y = h + 1; y <= h + th; y++) this.blocks[idx(x, y, z)] = trunk;
          const r = type === 1 ? 1 : 2;
          for (let dx = -r; dx <= r; dx++)
            for (let dz = -r; dz <= r; dz++)
              for (let y = h + th - 1; y <= h + th + 1; y++)
                if (this.blocks[idx(x + dx, y, z + dz)] === B.AIR)
                  this.blocks[idx(x + dx, y, z + dz)] = leaves;
        }
      }

    // desert cacti
    for (let x = 2; x < W - 2; x++)
      for (let z = 2; z < D - 2; z++) {
        const h = heights[x * D + z];
        if (h <= SEA) continue;
        if (this.blocks[idx(x, h, z)] === B.SAND && Math.random() < 0.05) {
          const ch = 2 + Math.floor(Math.random() * 3);
          for (let y = h + 1; y <= h + ch; y++) this.blocks[idx(x, y, z)] = B.CACTUS;
        }
      }

    // flowers & tall grass
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        const h = heights[x * D + z];
        if (h <= SEA) continue;
        if (this.blocks[idx(x, h, z)] === B.GRASS && Math.random() < 0.12) {
          const r = Math.random();
          this.blocks[idx(x, h, z)] = r < 0.15 ? B.FLOWER_RED : (r < 0.3 ? B.FLOWER_YELLOW : B.TALL_GRASS);
        }
      }

    this.computeLight();
  }

  // ---- water flow -----------------------------------------------------------
  flowWater() {
    const changed = [];
    const setW = (x, y, z, level) => {
      if (!this.inBounds(x, y, z)) return;
      const i = idx(x, y, z);
      if (this.blocks[i] !== B.WATER) {
        this.blocks[i] = B.WATER;
        changed.push(i);
      }
      this.waterLevel[x * D + z] = Math.max(this.waterLevel[x * D + z], level);
    };
    for (let x = 0; x < W; x++)
      for (let z = 0; z < D; z++) {
        const lvl = this.waterLevel[x * D + z];
        if (lvl <= 0) continue;
        for (let y = 1; y < H; y++) {
          const i = idx(x, y, z);
          if (this.blocks[i] !== B.WATER) continue;
          // fall: water below is air
          if (this.blocks[i + W * D] === B.AIR) {
            setW(x, y + 1, z, lvl);
            this.blocks[i] = B.AIR;
            this.waterLevel[x * D + z] = 0;
            changed.push(i);
            break;
          }
          // horizontal spread
          for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
            if (!this.inBounds(nx, y, nz)) continue;
            const j = idx(nx, y, nz);
            if (this.blocks[j] === B.AIR && this.solid(nx, y - 1, nz)) {
              const nl = Math.min(1, lvl - 0.125);
              if (nl > 0 && this.waterLevel[nx * D + nz] < nl) {
                setW(nx, y, nz, nl);
                changed.push(j);
              }
            }
          }
        }
      }
    return changed;
  }

  // ---- crops ------------------------------------------------------------------
  tickCrops() {
    const changed = [];
    for (const [key, c] of this.crops) {
      c.timer += 1;
      const [x, y, z] = key.split(',').map(Number);
      if (this.get(x, y, z) !== this.cropBlockId(c)) continue;
      if (c.timer > c.maxTime) {
        c.stage++;
        c.timer = 0;
        if (c.stage >= 3) {
          this.set(x, y, z, B.AIR);
          this.crops.delete(key);
        } else {
          this.set(x, y, z, this.cropBlockId(c));
          changed.push(idx(x, y, z));
        }
      }
    }
    return changed;
  }

  cropBlockId(c) {
    return c.seed === B.WHEAT ? B.WHEAT : (c.seed === B.CARROT ? B.CARROT : B.POTATO);
  }

  plantCrop(x, y, z, seed) {
    const key = `${x},${y},${z}`;
    this.crops.set(key, { seed, stage: 0, timer: 0, maxTime: 20 + Math.floor(Math.random() * 20) });
    const b = this.cropBlockId({ seed });
    this.set(x, y, z, b);
    return idx(x, y, z);
  }

  // ---- save / load -------------------------------------------------------------
  b64(bytes) {
    let out = '';
    const CHUNK = 32768;
    for (let i = 0; i < bytes.length; i += CHUNK)
      out += btoa(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
    return out;
  }

  save() {
    const waterBytes = new Uint8Array(this.waterLevel.length);
    for (let i = 0; i < this.waterLevel.length; i++)
      waterBytes[i] = Math.round(this.waterLevel[i] * 10);
    const data = {
      v: 1,
      seed: this.seed,
      blocks: this.b64(this.blocks),
      water: this.b64(waterBytes),
      light: this.b64(this.light),
      crops: Array.from(this.crops.entries()).map(([k, c]) => [k, c.seed, c.stage, c.timer, c.maxTime]),
    };
    return JSON.stringify(data);
  }

  load(json) {
    const data = JSON.parse(json);
    if (data.v !== 1) return false;
    this.seed = data.seed;
    const dec = atob(data.blocks);
    this.blocks = new Uint8Array(dec.length);
    for (let i = 0; i < dec.length; i++) this.blocks[i] = dec.charCodeAt(i);
    const wdec = atob(data.water);
    this.waterLevel = new Float32Array(wdec.length);
    for (let i = 0; i < wdec.length; i++) this.waterLevel[i] = wdec.charCodeAt(i) / 10;
    const ldec = atob(data.light);
    this.light = new Uint8Array(ldec.length);
    for (let i = 0; i < ldec.length; i++) this.light[i] = ldec.charCodeAt(i);
    this.crops = new Map();
    for (const [k, seed, stage, timer, maxTime] of data.crops)
      this.crops.set(k, { seed, stage, timer, maxTime });
    return true;
  }
}
