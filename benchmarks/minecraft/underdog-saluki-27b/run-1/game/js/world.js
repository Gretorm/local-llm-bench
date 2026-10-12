// Voxel world storage + procedural terrain generation.
import { BLOCKS, BLOCK_INDEX } from './blocks.js';
import { fbm } from './noise.js';

export const WORLD_SIZE = 128;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 12;
export const CHUNK = 16;

export class World {
  constructor() {
    this.size = WORLD_SIZE;
    this.height = WORLD_HEIGHT;
    this.blocks = new Uint8Array(this.size * this.size * this.height);
  }

  inBounds(x, y, z) {
    return x >= 0 && x < this.size && y >= 0 && y < this.height && z >= 0 && z < this.size;
  }

  index(x, y, z) {
    return (y * this.size + z) * this.size + x;
  }

  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return 0;
    return this.blocks[this.index(x, y, z)];
  }

  set(x, y, z, id) {
    if (!this.inBounds(x, y, z)) return;
    this.blocks[this.index(x, y, z)] = id;
  }

  solid(x, y, z) {
    return BLOCKS[this.get(x, y, z)].solid;
  }

  liquid(x, y, z) {
    return BLOCKS[this.get(x, y, z)].liquid;
  }

  transparent(x, y, z) {
    return BLOCKS[this.get(x, y, z)].transparent;
  }

  topSolidY(x, z) {
    for (let y = this.height - 1; y >= 0; y--) {
      if (this.solid(x, y, z)) return y;
    }
    return -1;
  }

  // highest non-liquid block (for placing on surfaces)
  surfaceY(x, z) {
    for (let y = this.height - 1; y >= 0; y--) {
      const b = this.get(x, y, z);
      if (b !== 0 && !BLOCKS[b].liquid) return y;
    }
    return -1;
  }

  // topmost solid column y or water level (for spawn height)
  groundY(x, z) {
    const s = this.topSolidY(x, z);
    if (s >= 0) return s + 1;
    return SEA_LEVEL + 1;
  }
}

// Biome: 0 desert, 1 plains, 2 forest, 3 mountains
function biomeAt(x, z, seed) {
  const n = fbm(x * 0.047, z * 0.047, seed + 5000, 4, 0.5);
  if (n < 0.35) return 0;
  if (n < 0.55) return 1;
  if (n < 0.75) return 2;
  return 3;
}

export function generateTerrain(world, seed) {
  const { size, height } = world;
  const W = BLOCK_INDEX.get('water');
  const DIRT = BLOCK_INDEX.get('dirt');
  const STONE = BLOCK_INDEX.get('stone');
  const SAND = BLOCK_INDEX.get('sand');
  const GRASS = BLOCK_INDEX.get('grass');
  const BEDROCK = BLOCK_INDEX.get('bedrock');
  const LOG = BLOCK_INDEX.get('log');
  const LEAVES = BLOCK_INDEX.get('leaves');
  const FLOWER_R = BLOCK_INDEX.get('red_flower');
  const FLOWER_Y = BLOCK_INDEX.get('yellow_flower');
  const TALL = BLOCK_INDEX.get('tall_grass');
  const ORE_IRON = BLOCK_INDEX.get('iron_ore');
  const ORE_COAL = BLOCK_INDEX.get('coal_ore');
  const ORE_GOLD = BLOCK_INDEX.get('gold_ore');
  const ORE_DIAMOND = BLOCK_INDEX.get('diamond_ore');

  // per-column heights
  const heights = new Int16Array(size * size);
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const base = fbm(x * 0.0625, z * 0.0625, seed, 5, 0.5);
      const mtn = fbm(x * 0.03125 + 100, z * 0.03125 + 100, seed + 777, 4, 0.5);
      const biome = biomeAt(x, z, seed);
      let h = 6 + base * 18;
      if (biome === 3) h += mtn * 26;
      if (biome === 0) h = Math.min(h, 10);
      heights[x * size + z] = Math.max(1, Math.min(height - 2, Math.floor(h)));
    }
  }

  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const h = heights[x * size + z];
      const biome = biomeAt(x, z, seed);
      const sandy = biome === 0 || h <= SEA_LEVEL + 2;
      for (let y = 0; y < height; y++) {
        let id;
        if (y === 0) id = BEDROCK;
        else if (y <= h) {
          if (sandy && y >= h - 2) id = SAND;
          else if (y === h) id = biome === 0 ? SAND : GRASS;
          else if (y >= h - 2) id = DIRT;
          else {
            // stone with ores
            const r = Math.random();
            if (y < 20 && r < 0.004) id = ORE_DIAMOND;
            else if (y < 40 && r < 0.012) id = ORE_GOLD;
            else if (r < 0.03) id = ORE_COAL;
            else if (r < 0.055) id = ORE_IRON;
            else id = STONE;
          }
        } else if (y <= SEA_LEVEL) id = W;
        else id = 0;
        world.set(x, y, z, id);
      }
    }
  }

  // trees
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const h = heights[x * size + z];
      if (h <= SEA_LEVEL) continue;
      const biome = biomeAt(x, z, seed);
      const chance = biome === 2 ? 0.14 : biome === 1 ? 0.05 : biome === 3 ? 0.06 : 0.02;
      if (Math.random() > chance) continue;
      const trunk = 4 + Math.floor(Math.random() * 3);
      const top = h + trunk;
      for (let y = h + 1; y <= top; y++) world.set(x, y, z, LOG);
      for (let dy = -2; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const y2 = top + dy;
            if (y2 < 0 || y2 >= height) continue;
            const r = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
            if (r <= 2 || (r === 3 && Math.random() < 0.6)) {
              if (world.get(x + dx, y2, z + dz) === 0) world.set(x + dx, y2, z + dz, LEAVES);
            }
          }
        }
      }
    }
  }

  // surface decorations
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const h = heights[x * size + z];
      if (h <= SEA_LEVEL) continue;
      const top = world.get(x, h, z);
      if (top !== GRASS) continue;
      const r = Math.random();
      if (r < 0.05) world.set(x, h + 1, z, FLOWER_R);
      else if (r < 0.1) world.set(x, h + 1, z, FLOWER_Y);
      else if (r < 0.25) world.set(x, h + 1, z, TALL);
    }
  }
}
