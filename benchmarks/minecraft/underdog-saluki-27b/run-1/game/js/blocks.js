// Block/item definitions and the procedural texture atlas.
import * as THREE from 'three';
import { hash2 } from './noise.js';

export const TILE_PX = 16;
export const ATLAS_TILES = 16; // 16x16 grid of 16px tiles -> 256px canvas

// Tile indices in the atlas
const T = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, SAND: 4, WATER: 5, LOG_SIDE: 6, LOG_TOP: 7,
  LEAVES: 8, PLANKS: 9, COBBLE: 10, GLASS: 11, BEDROCK: 12, FLOWER_RED: 13, FLOWER_YELLOW: 14,
  TALL_GRASS: 15, ORE_IRON: 16, ORE_COAL: 17, ORE_GOLD: 18, ORE_DIAMOND: 19, STONE_BRICKS: 20,
  TORCH: 21, CARROT: 22, FURNACE_SIDE: 23, FURNACE_FRONT: 24, FURNACE_TOP: 25,
  STICKS: 26, INGOT_IRON: 27, INGOT_GOLD: 28, INGOT_DIAMOND: 29,
  TOOL_PICK_WOOD: 30, TOOL_PICK_IRON: 31, TOOL_AXE_WOOD: 32, TOOL_AXE_IRON: 33,
};

// Block registry: index === id used in the world grid
export const BLOCKS = [
  { id: 'air', name: 'Air', solid: false, transparent: true, liquid: false, drop: null, solidOnly: false },
  { id: 'grass', name: 'Grass Block', solid: true, transparent: false, liquid: false, drop: 'dirt', top: T.GRASS_TOP, side: T.GRASS_SIDE, bottom: T.DIRT },
  { id: 'dirt', name: 'Dirt', solid: true, transparent: false, liquid: false, drop: 'dirt', top: T.DIRT, side: T.DIRT, bottom: T.DIRT },
  { id: 'stone', name: 'Stone', solid: true, transparent: false, liquid: false, drop: 'cobblestone', requires: 'pickaxe', top: T.STONE, side: T.STONE, bottom: T.STONE },
  { id: 'sand', name: 'Sand', solid: true, transparent: false, liquid: false, drop: 'sand', top: T.SAND, side: T.SAND, bottom: T.SAND },
  { id: 'water', name: 'Water', solid: false, transparent: true, liquid: true, drop: null, top: T.WATER, side: T.WATER, bottom: T.WATER },
  { id: 'log', name: 'Oak Log', solid: true, transparent: false, liquid: false, drop: 'wood', requires: 'axe', top: T.LOG_TOP, side: T.LOG_SIDE, bottom: T.LOG_TOP },
  { id: 'leaves', name: 'Leaves', solid: true, transparent: false, liquid: false, drop: null, top: T.LEAVES, side: T.LEAVES, bottom: T.LEAVES },
  { id: 'planks', name: 'Oak Planks', solid: true, transparent: false, liquid: false, drop: 'planks', top: T.PLANKS, side: T.PLANKS, bottom: T.PLANKS },
  { id: 'cobblestone', name: 'Cobblestone', solid: true, transparent: false, liquid: false, drop: 'cobblestone', requires: 'pickaxe', top: T.COBBLE, side: T.COBBLE, bottom: T.COBBLE },
  { id: 'glass', name: 'Glass', solid: true, transparent: true, liquid: false, drop: 'glass', top: T.GLASS, side: T.GLASS, bottom: T.GLASS },
  { id: 'bedrock', name: 'Bedrock', solid: true, transparent: false, liquid: false, drop: null, unbreakable: true, top: T.BEDROCK, side: T.BEDROCK, bottom: T.BEDROCK },
  { id: 'red_flower', name: 'Rose', solid: false, transparent: true, liquid: false, drop: 'red_flower', deco: true, top: T.FLOWER_RED, side: T.FLOWER_RED, bottom: T.FLOWER_RED },
  { id: 'yellow_flower', name: 'Dandelion', solid: false, transparent: true, liquid: false, drop: 'yellow_flower', deco: true, top: T.FLOWER_YELLOW, side: T.FLOWER_YELLOW, bottom: T.FLOWER_YELLOW },
  { id: 'tall_grass', name: 'Tall Grass', solid: false, transparent: true, liquid: false, drop: 'tall_grass', deco: true, top: T.TALL_GRASS, side: T.TALL_GRASS, bottom: T.TALL_GRASS },
  { id: 'iron_ore', name: 'Iron Ore', solid: true, transparent: false, liquid: false, drop: 'iron_ingot', requires: 'pickaxe', top: T.ORE_IRON, side: T.ORE_IRON, bottom: T.ORE_IRON },
  { id: 'coal_ore', name: 'Coal Ore', solid: true, transparent: false, liquid: false, drop: 'coal', requires: 'pickaxe', top: T.ORE_COAL, side: T.ORE_COAL, bottom: T.ORE_COAL },
  { id: 'gold_ore', name: 'Gold Ore', solid: true, transparent: false, liquid: false, drop: 'gold_ingot', requires: 'pickaxe', top: T.ORE_GOLD, side: T.ORE_GOLD, bottom: T.ORE_GOLD },
  { id: 'diamond_ore', name: 'Diamond Ore', solid: true, transparent: false, liquid: false, drop: 'diamond', requires: 'pickaxe', top: T.ORE_DIAMOND, side: T.ORE_DIAMOND, bottom: T.ORE_DIAMOND },
  { id: 'stone_bricks', name: 'Stone Bricks', solid: true, transparent: false, liquid: false, drop: 'stone_bricks', requires: 'pickaxe', top: T.STONE_BRICKS, side: T.STONE_BRICKS, bottom: T.STONE_BRICKS },
  { id: 'torch', name: 'Torch', solid: false, transparent: true, liquid: false, drop: 'torch', deco: true, light: 14, top: T.TORCH, side: T.TORCH, bottom: T.TORCH },
  { id: 'carrot', name: 'Carrot', solid: false, transparent: true, liquid: false, drop: 'carrot', deco: true, eatable: 4, top: T.CARROT, side: T.CARROT, bottom: T.CARROT },
  { id: 'furnace', name: 'Furnace', solid: true, transparent: false, liquid: false, drop: 'furnace', top: T.FURNACE_TOP, side: T.FURNACE_SIDE, bottom: T.FURNACE_TOP },
];
export const BLOCK_INDEX = new Map(BLOCKS.map((b, i) => [b.id, i]));

// Item registry (inventory items). Blocks are also items; tools are not placeable.
export const ITEMS = {
  grass: { name: 'Grass Block', tile: T.GRASS_TOP, block: 'grass' },
  dirt: { name: 'Dirt', tile: T.DIRT, block: 'dirt' },
  stone: { name: 'Stone', tile: T.STONE, block: 'stone' },
  sand: { name: 'Sand', tile: T.SAND, block: 'sand' },
  cobblestone: { name: 'Cobblestone', tile: T.COBBLE, block: 'cobblestone' },
  stone_bricks: { name: 'Stone Bricks', tile: T.STONE_BRICKS, block: 'stone_bricks' },
  glass: { name: 'Glass', tile: T.GLASS, block: 'glass' },
  bedrock: { name: 'Bedrock', tile: T.BEDROCK, block: 'bedrock' },
  wood: { name: 'Oak Log', tile: T.LOG_SIDE, block: 'log' },
  planks: { name: 'Oak Planks', tile: T.PLANKS, block: 'planks' },
  sticks: { name: 'Sticks', tile: T.STICKS, block: null },
  coal: { name: 'Coal', tile: T.ORE_COAL, block: null },
  iron_ingot: { name: 'Iron Ingot', tile: T.INGOT_IRON, block: null },
  gold_ingot: { name: 'Gold Ingot', tile: T.INGOT_GOLD, block: null },
  diamond: { name: 'Diamond', tile: T.INGOT_DIAMOND, block: null },
  red_flower: { name: 'Rose', tile: T.FLOWER_RED, block: 'red_flower' },
  yellow_flower: { name: 'Dandelion', tile: T.FLOWER_YELLOW, block: 'yellow_flower' },
  tall_grass: { name: 'Tall Grass', tile: T.TALL_GRASS, block: 'tall_grass' },
  torch: { name: 'Torch', tile: T.TORCH, block: 'torch' },
  carrot: { name: 'Carrot', tile: T.CARROT, block: 'carrot' },
  furnace: { name: 'Furnace', tile: T.FURNACE_SIDE, block: 'furnace' },
  wooden_pickaxe: { name: 'Wooden Pickaxe', tile: T.TOOL_PICK_WOOD, tool: 'pickaxe', speed: 1 },
  iron_pickaxe: { name: 'Iron Pickaxe', tile: T.TOOL_PICK_IRON, tool: 'pickaxe', speed: 2 },
  wooden_axe: { name: 'Wooden Axe', tile: T.TOOL_AXE_WOOD, tool: 'axe', speed: 1 },
  iron_axe: { name: 'Iron Axe', tile: T.TOOL_AXE_IRON, tool: 'axe', speed: 2 },
};
export const ITEM_NAMES = Object.keys(ITEMS);

// Crafting recipes: { grid: [9 item ids or null], result: { id, count } }
export const RECIPES = [
  { grid: ['wood', null, null, null, null, null, null, null, null], result: { id: 'planks', count: 4 } },
  { grid: ['planks', 'planks', null, null, null, null, null, null, null], result: { id: 'sticks', count: 3 } },
  { grid: ['planks', 'sticks', null, null, null, null, null, null, null], result: { id: 'wooden_axe', count: 1 } },
  { grid: ['planks', 'planks', 'sticks', 'sticks', 'sticks', null, null, null, null], result: { id: 'wooden_pickaxe', count: 1 } },
  { grid: ['iron_ingot', 'iron_ingot', 'iron_ingot', 'sticks', 'sticks', null, null, null, null], result: { id: 'iron_pickaxe', count: 1 } },
  { grid: ['iron_ingot', 'sticks', null, null, null, null, null, null, null], result: { id: 'iron_axe', count: 1 } },
  { grid: ['planks', 'sticks', 'coal', null, null, null, null, null, null], result: { id: 'torch', count: 1 } },
  { grid: ['sand', null, null, null, null, null, null, null, null], result: { id: 'glass', count: 1 } },
  { grid: ['stone', 'stone', 'stone', 'stone', null, null, null, null, null], result: { id: 'stone_bricks', count: 4 } },
  { grid: ['stone', 'stone', 'stone', null, null, null, null, null, null], result: { id: 'furnace', count: 1 } },
];

// Smelting: { input, fuel, output }
export const SMELTS = [
  { input: 'iron_ore', output: 'iron_ingot' },
  { input: 'gold_ore', output: 'gold_ingot' },
  { input: 'sand', output: 'glass' },
  { input: 'stone', output: 'cobblestone' },
];

// ---- Procedural texture atlas ----
function px(ctx, x, y, r, g, b, a = 255) {
  ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a / 255})`;
  ctx.fillRect(x, y, 1, 1);
}

function fillNoise(ctx, x0, y0, base, vary, seed, alpha = 255) {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const n = hash2(x, y, seed);
      const m = n * vary;
      px(ctx, x0 + x, y0 + y, base[0] + m, base[1] + m * 0.6, base[2] + m * 0.3, alpha);
    }
  }
}

function tileFn(ctx, x0, y0, fn) {
  for (let y = 0; y < TILE_PX; y++)
    for (let x = 0; x < TILE_PX; x++) fn(ctx, x0 + x, y0 + y, x, y);
}

function drawAtlas() {
  const size = TILE_PX * ATLAS_TILES;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  const put = (t, fn) => tileFn(ctx, (t % ATLAS_TILES) * TILE_PX, Math.floor(t / ATLAS_TILES) * TILE_PX, fn);

  // grass top: green with darker patches
  put(T.GRASS_TOP, (c, x, y, tx, ty) => {
    const n = hash2(tx, ty, 11);
    if (n < 0.25) { px(c, x, y, 84, 128, 52); }
    else { const m = hash2(tx, ty, 12) * 22; px(c, x, y, 106 + m, 160 + m, 60 + m * 0.4); }
  });
  // grass side: dirt with 4px green top
  put(T.GRASS_SIDE, (c, x, y, tx, ty) => {
    if (ty < 4) { const m = hash2(tx, ty, 13) * 20; px(c, x, y, 106 + m, 160 + m, 60 + m * 0.4); }
    else { const m = hash2(tx, ty, 14) * 26; px(c, x, y, 134 + m, 96 + m * 0.7, 60 + m * 0.5); }
  });
  put(T.DIRT, (c, x, y, tx, ty) => {
    const n = hash2(tx, ty, 15);
    if (n < 0.08) px(c, x, y, 96, 66, 42);
    else { const m = hash2(tx, ty, 16) * 24; px(c, x, y, 134 + m, 96 + m * 0.7, 60 + m * 0.5); }
  });
  put(T.STONE, (c, x, y, tx, ty) => {
    const n = hash2(tx, ty, 17);
    if (n < 0.15) px(c, x, y, 74, 74, 74);
    else { const m = hash2(tx, ty, 18) * 20; px(c, x, y, 100 + m, 100 + m, 100 + m); }
  });
  put(T.SAND, (c, x, y, tx, ty) => {
    const m = hash2(tx, ty, 19) * 22;
    px(c, x, y, 214 + m, 190 + m * 0.8, 120 + m * 0.4);
  });
  // water: bluish with alpha
  put(T.WATER, (c, x, y, tx, ty) => {
    const m = hash2(tx, ty, 20) * 18;
    px(c, x, y, 40 + m, 105 + m, 180 + m, 215);
  });
  // log side: brown vertical stripes
  put(T.LOG_SIDE, (c, x, y, tx, ty) => {
    const stripe = tx % 2 === 0 ? 0 : 14;
    const m = hash2(tx, ty, 21) * 16;
    px(c, x, y, 110 + stripe + m * 0.5, 84 + stripe * 0.7, 50 + m * 0.3);
  });
  // log top: rings
  put(T.LOG_TOP, (c, x, y, tx, ty) => {
    const cx = tx - 7.5, cy = ty - 7.5;
    const r = Math.sqrt(cx * cx + cy * cy);
    const ring = Math.floor(r) % 2 === 0 ? 0 : 18;
    const m = hash2(tx, ty, 22) * 12;
    px(c, x, y, 150 + ring + m * 0.5, 116 + ring * 0.7, 66 + m * 0.3);
  });
  // leaves: green with holes
  put(T.LEAVES, (c, x, y, tx, ty) => {
    const n = hash2(tx, ty, 23);
    if (n < 0.12) px(c, x, y, 0, 0, 0, 0);
    else { const m = hash2(tx, ty, 24) * 26; px(c, x, y, 58 + m, 128 + m, 50 + m * 0.4); }
  });
  // planks: horizontal boards
  put(T.PLANKS, (c, x, y, tx, ty) => {
    const seam = ty % 4 === 3 ? -18 : 0;
    const m = hash2(tx, ty, 25) * 10;
    px(c, x, y, 168 + seam + m * 0.4, 136 + seam + m * 0.4, 86 + seam + m * 0.3);
  });
  // cobblestone: gray lumps
  put(T.COBBLE, (c, x, y, tx, ty) => {
    const lump = Math.floor(hash2(tx >> 2, ty >> 2, 26)) * 26;
    const m = hash2(tx, ty, 27) * 14;
    px(c, x, y, 96 + lump + m * 0.5, 96 + lump + m * 0.5, 96 + lump + m * 0.5);
  });
  // glass: mostly clear, a few specks
  put(T.GLASS, (c, x, y, tx, ty) => {
    const n = hash2(tx, ty, 28);
    if (n < 0.06) px(c, x, y, 255, 255, 255, 200);
    else px(c, x, y, 200, 220, 255, 40);
  });
  // bedrock: dark gray noise
  put(T.BEDROCK, (c, x, y, tx, ty) => {
    const m = hash2(tx, ty, 29) * 34;
    px(c, x, y, 40 + m, 40 + m, 40 + m);
  });
  // flowers: transparent bg, flower shape
  put(T.FLOWER_RED, (c, x, y, tx, ty) => {
    if (ty >= 12 && tx === 7) px(c, x, y, 60, 120, 50); // stem
    const cx = tx - 7, cy = ty - 5;
    if (Math.abs(cx) <= 1 && Math.abs(cy) <= 1 && !(cx === 0 && cy === 0)) px(c, x, y, 214, 48, 66);
    if (cx === 0 && cy === 0) px(c, x, y, 240, 220, 60);
  });
  put(T.FLOWER_YELLOW, (c, x, y, tx, ty) => {
    if (ty >= 12 && tx === 7) px(c, x, y, 60, 120, 50);
    const cx = tx - 7, cy = ty - 5;
    if (Math.abs(cx) <= 1 && Math.abs(cy) <= 1 && !(cx === 0 && cy === 0)) px(c, x, y, 250, 250, 255);
    if (cx === 0 && cy === 0) px(c, x, y, 250, 210, 40);
  });
  // tall grass: blades
  put(T.TALL_GRASS, (c, x, y, tx, ty) => {
    for (let i = 0; i < 4; i++) {
      const bx = 2 + i * 3 + Math.floor(hash2(i, 0, 30) * 2);
      const lean = hash2(i, 1, 31) < 0.5 ? 1 : -1;
      if (tx === bx || (ty > 4 && tx === bx + lean && ty < 12)) px(c, x, y, 70 + hash2(tx, ty, 32) * 20, 130 + hash2(tx, ty, 32) * 20, 50);
    }
  });
  // ores: stone base + specks
  const ore = (t, color, s) => put(t, (c, x, y, tx, ty) => {
    const n = hash2(tx, ty, s);
    if (n < 0.35) {
      const m = hash2(tx, ty, s + 1) * 16;
      px(c, x, y, color[0] + m, color[1] + m, color[2] + m);
    } else {
      const m = hash2(tx, ty, s + 2) * 20;
      px(c, x, y, 100 + m, 100 + m, 100 + m);
    }
  });
  ore(T.ORE_IRON, [190, 190, 190], 33);
  ore(T.ORE_COAL, [20, 20, 20], 34);
  ore(T.ORE_GOLD, [255, 200, 60], 35);
  ore(T.ORE_DIAMOND, [80, 220, 230], 36);
  // stone bricks
  put(T.STONE_BRICKS, (c, x, y, tx, ty) => {
    const seam = (ty % 8 === 7) || (ty < 4 ? tx % 8 === 7 : tx % 8 === 3);
    const m = hash2(tx, ty, 37) * 12;
    if (seam) px(c, x, y, 70, 70, 70);
    else px(c, x, y, 112 + m * 0.5, 112 + m * 0.5, 112 + m * 0.5);
  });
  // torch: stick + flame
  put(T.TORCH, (c, x, y, tx, ty) => {
    if (ty >= 5 && tx === 7) px(c, x, y, 120, 82, 48);
    if (ty < 5 && (tx === 7 || (tx === 6 && ty < 3) || (tx === 8 && ty < 3))) {
      const n = hash2(tx, ty, 38);
      px(c, x, y, 250, 160 + n * 60, 30, 230);
    }
  });
  // carrot
  put(T.CARROT, (c, x, y, tx, ty) => {
    if (ty < 4 && tx === 7) px(c, x, y, 70, 140, 50);
    const cx = tx - 7, cy = ty - 8;
    if (Math.abs(cx) <= 1 && cy >= -2 && cy <= 3 && (Math.abs(cx) <= 1 - (cy > 1 ? 1 : 0))) px(c, x, y, 240, 140, 40);
  });
  // furnace
  put(T.FURNACE_SIDE, (c, x, y, tx, ty) => {
    const m = hash2(tx, ty, 39) * 10;
    px(c, x, y, 120 + m * 0.5, 100 + m * 0.5, 80 + m * 0.4);
  });
  put(T.FURNACE_FRONT, (c, x, y, tx, ty) => {
    const m = hash2(tx, ty, 40) * 10;
    if (ty >= 5 && ty < 11 && tx >= 4 && tx < 12) px(c, x, y, 30, 20, 15);
    else px(c, x, y, 120 + m * 0.5, 100 + m * 0.5, 80 + m * 0.4);
  });
  put(T.FURNACE_TOP, (c, x, y, tx, ty) => {
    const m = hash2(tx, ty, 41) * 10;
    px(c, x, y, 120 + m * 0.5, 100 + m * 0.5, 80 + m * 0.4);
  });
  // sticks
  put(T.STICKS, (c, x, y, tx, ty) => {
    if (ty >= 4 && ty < 12 && (tx === 7 || (ty < 8 && tx === 8))) px(c, x, y, 110, 84, 50);
  });
  // ingots: flat shape on transparent bg
  const ingot = (t, color, s) => put(t, (c, x, y, tx, ty) => {
    const cx = tx - 7, cy = ty - 8;
    if (Math.abs(cx) <= 3 && (cy === -1 || cy === 0 || (cy === 1 && Math.abs(cx) <= 2))) px(c, x, y, color[0], color[1], color[2]);
  });
  ingot(T.INGOT_IRON, [190, 190, 190], 42);
  ingot(T.INGOT_GOLD, [255, 200, 60], 43);
  ingot(T.INGOT_DIAMOND, [80, 220, 230], 44);
  // tools
  const drawPick = (t, head, handle) => put(t, (c, x, y, tx, ty) => {
    for (let i = 0; i < 8; i++) {
      const hx = 4 + i, hy = 12 - i;
      if (hx < 16 && hy >= 0) px(c, x, y, handle[0], handle[1], handle[2]);
    }
    for (let i = 0; i < 5; i++) {
      const hx = 2 + i, hy = 4 + i; // diagonal head
      if (hx < 16 && hy < 16) px(c, x, y, head[0], head[1], head[2]);
    }
    for (let i = 0; i < 5; i++) {
      const hx = 13 - i, hy = 4 + i;
      if (hx < 16 && hy < 16) px(c, x, y, head[0], head[1], head[2]);
    }
  });
  const drawAxe = (t, head, handle) => put(t, (c, x, y, tx, ty) => {
    for (let i = 0; i < 8; i++) {
      const hx = 4 + i, hy = 12 - i;
      if (hx < 16 && hy >= 0) px(c, x, y, handle[0], handle[1], handle[2]);
    }
    for (let i = 0; i < 6; i++) {
      const hx = 12 + i, hy = 3 + i;
      if (hx < 16 && hy < 16) px(c, x, y, head[0], head[1], head[2]);
    }
    for (let i = 0; i < 6; i++) {
      const hx = 11 - i, hy = 3 + i;
      if (hx >= 0 && hy < 16) px(c, x, y, head[0], head[1], head[2]);
    }
  });
  drawPick(T.TOOL_PICK_WOOD, [160, 160, 160], [110, 84, 50]);
  drawPick(T.TOOL_PICK_IRON, [210, 210, 215], [110, 84, 50]);
  drawAxe(T.TOOL_AXE_WOOD, [160, 160, 160], [110, 84, 50]);
  drawAxe(T.TOOL_AXE_IRON, [210, 210, 215], [110, 84, 50]);

  return canvas;
}

let atlasCanvas = null;
export function getAtlasCanvas() {
  if (!atlasCanvas) atlasCanvas = drawAtlas();
  return atlasCanvas;
}

let atlasTexture = null;
export function getAtlasTexture() {
  if (atlasTexture) return atlasTexture;
  const tex = new THREE.CanvasTexture(getAtlasCanvas());
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  atlasTexture = tex;
  return tex;
}

// Small icon canvas for UI (draws one tile).
export function drawIcon(tile, pxSize = 32) {
  const canvas = document.createElement('canvas');
  canvas.width = pxSize; canvas.height = pxSize;
  const ctx = canvas.getContext('2d');
  const src = getAtlasCanvas();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, (tile % ATLAS_TILES) * TILE_PX, Math.floor(tile / ATLAS_TILES) * TILE_PX, TILE_PX, TILE_PX, 0, 0, pxSize, pxSize);
  return canvas;
}
