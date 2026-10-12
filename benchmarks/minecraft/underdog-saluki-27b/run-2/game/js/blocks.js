// Block & item definitions + procedural texture atlas.
// All textures are generated at runtime on <canvas> elements — no external assets.

const B = {
  AIR: 0,
  GRASS: 1, DIRT: 2, STONE: 3, BEDROCK: 4, SAND: 5, GRAVEL: 6, COBBLE: 7,
  WATER: 8,
  OAK_LOG: 9, SPRUCE_LOG: 10, BIRCH_LOG: 11,
  OAK_LEAVES: 12, SPRUCE_LEAVES: 13, BIRCH_LEAVES: 14,
  TALL_GRASS: 15, FERN: 16, FLOWER_RED: 17, FLOWER_YELLOW: 18, CACTUS: 19,
  SANDSTONE: 20, GLASS: 21, STONE_BRICK: 22,
  IRON_ORE: 23, COAL_ORE: 24, GOLD_ORE: 25, DIAMOND_ORE: 26, OBSIDIAN: 27,
  SNOW: 28, FARMLAND: 29,
  WHEAT: 30, CARROT: 31, POTATO: 32,
  PLANKS: 33, STICK: 34, COAL: 35, IRON_INGOT: 36, GOLD_INGOT: 37, DIAMOND: 38,
  FURNACE: 39, CRAFTING_TABLE: 40,
  COAL_BLOCK: 41, IRON_BLOCK: 42, GOLD_BLOCK: 43, DIAMOND_BLOCK: 44, CHARCOAL: 45,
  BREAD: 46, APPLE: 47, COOKED_CARROT: 48, COOKED_POTATO: 49,
  W_PICK: 50, S_PICK: 51, I_PICK: 52, D_PICK: 53,
  W_AXE: 54, S_AXE: 55, I_AXE: 56, D_AXE: 57,
  W_SHOVEL: 58, S_SHOVEL: 59, I_SHOVEL: 60, D_SHOVEL: 61,
  W_HOE: 62, S_HOE: 63, I_HOE: 64, D_HOE: 65,
};

// ---- block metadata -----------------------------------------------------
// solid: blocks collision; placeable: can be placed; drop: item id on break
// water: fluid; translucent: rendered transparently
const BLOCKS = {
  [B.AIR]:            { name: 'air', solid: false, placeable: false, drop: null },
  [B.GRASS]:          { name: 'grass', solid: true, placeable: true, drop: B.DIRT },
  [B.DIRT]:           { name: 'dirt', solid: true, placeable: true, drop: B.DIRT },
  [B.STONE]:          { name: 'stone', solid: true, placeable: true, drop: B.STONE },
  [B.BEDROCK]:        { name: 'bedrock', solid: true, placeable: false, drop: null, unbreakable: true },
  [B.SAND]:           { name: 'sand', solid: true, placeable: true, drop: B.SAND },
  [B.GRAVEL]:         { name: 'gravel', solid: true, placeable: true, drop: B.GRAVEL },
  [B.COBBLE]:         { name: 'cobblestone', solid: true, placeable: true, drop: B.COBBLE },
  [B.WATER]:          { name: 'water', solid: false, placeable: true, drop: null, water: true },
  [B.OAK_LOG]:        { name: 'oak log', solid: true, placeable: true, drop: B.OAK_LOG },
  [B.SPRUCE_LOG]:     { name: 'spruce log', solid: true, placeable: true, drop: B.SPRUCE_LOG },
  [B.BIRCH_LOG]:      { name: 'birch log', solid: true, placeable: true, drop: B.BIRCH_LOG },
  [B.OAK_LEAVES]:     { name: 'oak leaves', solid: false, placeable: true, drop: B.APPLE, leaves: true, translucent: true },
  [B.SPRUCE_LEAVES]:  { name: 'spruce leaves', solid: false, placeable: true, drop: null, leaves: true, translucent: true },
  [B.BIRCH_LEAVES]:   { name: 'birch leaves', solid: false, placeable: true, drop: null, leaves: true, translucent: true },
  [B.TALL_GRASS]:     { name: 'tall grass', solid: false, placeable: false, drop: null, plant: true, translucent: true },
  [B.FERN]:           { name: 'fern', solid: false, placeable: false, drop: null, plant: true, translucent: true },
  [B.FLOWER_RED]:     { name: 'red flower', solid: false, placeable: false, drop: B.FLOWER_RED, plant: true, translucent: true },
  [B.FLOWER_YELLOW]:  { name: 'yellow flower', solid: false, placeable: false, drop: B.FLOWER_YELLOW, plant: true, translucent: true },
  [B.CACTUS]:         { name: 'cactus', solid: true, placeable: true, drop: B.CACTUS },
  [B.SANDSTONE]:      { name: 'sandstone', solid: true, placeable: true, drop: B.SANDSTONE },
  [B.GLASS]:          { name: 'glass', solid: true, placeable: true, drop: B.GLASS, translucent: true },
  [B.STONE_BRICK]:    { name: 'stone brick', solid: true, placeable: true, drop: B.STONE_BRICK },
  [B.IRON_ORE]:       { name: 'iron ore', solid: true, placeable: true, drop: B.IRON_INGOT },
  [B.COAL_ORE]:       { name: 'coal ore', solid: true, placeable: true, drop: B.COAL },
  [B.GOLD_ORE]:       { name: 'gold ore', solid: true, placeable: true, drop: B.GOLD_INGOT },
  [B.DIAMOND_ORE]:    { name: 'diamond ore', solid: true, placeable: true, drop: B.DIAMOND },
  [B.OBSIDIAN]:        { name: 'obsidian', solid: true, placeable: false, drop: null },
  [B.SNOW]:           { name: 'snow', solid: true, placeable: true, drop: B.SNOW },
  [B.FARMLAND]:       { name: 'farmland', solid: true, placeable: false, drop: B.DIRT },
  [B.WHEAT]:          { name: 'wheat', solid: false, placeable: false, drop: B.WHEAT, plant: true, crop: 0, translucent: true },
  [B.CARROT]:         { name: 'carrot', solid: false, placeable: false, drop: B.CARROT, plant: true, crop: 1, translucent: true },
  [B.POTATO]:         { name: 'potato', solid: false, placeable: false, drop: B.POTATO, plant: true, crop: 2, translucent: true },
  [B.PLANKS]:         { name: 'planks', solid: true, placeable: true, drop: B.PLANKS },
  [B.STICK]:          { name: 'sticks', solid: false, placeable: false, drop: B.STICK },
  [B.COAL]:           { name: 'coal', solid: false, placeable: false, drop: B.COAL },
  [B.IRON_INGOT]:     { name: 'iron ingot', solid: false, placeable: false, drop: B.IRON_INGOT },
  [B.GOLD_INGOT]:     { name: 'gold ingot', solid: false, placeable: false, drop: B.GOLD_INGOT },
  [B.DIAMOND]:        { name: 'diamond', solid: false, placeable: false, drop: B.DIAMOND },
  [B.FURNACE]:        { name: 'furnace', solid: true, placeable: true, drop: B.FURNACE },
  [B.CRAFTING_TABLE]: { name: 'crafting table', solid: true, placeable: true, drop: B.CRAFTING_TABLE },
  [B.COAL_BLOCK]:     { name: 'coal block', solid: true, placeable: true, drop: B.COAL_BLOCK },
  [B.IRON_BLOCK]:     { name: 'iron block', solid: true, placeable: true, drop: B.IRON_BLOCK },
  [B.GOLD_BLOCK]:     { name: 'gold block', solid: true, placeable: true, drop: B.GOLD_BLOCK },
  [B.DIAMOND_BLOCK]:  { name: 'diamond block', solid: true, placeable: true, drop: B.DIAMOND_BLOCK },
  [B.CHARCOAL]:       { name: 'charcoal', solid: false, placeable: false, drop: B.CHARCOAL },
  [B.BREAD]:          { name: 'bread', solid: false, placeable: false, drop: B.BREAD },
  [B.APPLE]:          { name: 'apple', solid: false, placeable: false, drop: B.APPLE },
  [B.COOKED_CARROT]:  { name: 'cooked carrot', solid: false, placeable: false, drop: B.COOKED_CARROT },
  [B.COOKED_POTATO]:  { name: 'cooked potato', solid: false, placeable: false, drop: B.COOKED_POTATO },
};

// ---- item metadata (non-block items) -------------------------------------
const ITEMS = {
  [B.PLANKS]:   { name: 'planks', stack: 64 },
  [B.STICK]:    { name: 'sticks', stack: 64 },
  [B.COAL]:     { name: 'coal', stack: 64 },
  [B.IRON_INGOT]:{ name: 'iron ingot', stack: 64 },
  [B.GOLD_INGOT]:{ name: 'gold ingot', stack: 64 },
  [B.DIAMOND]:  { name: 'diamond', stack: 64 },
  [B.CHARCOAL]: { name: 'charcoal', stack: 64 },
  [B.BREAD]:    { name: 'bread', stack: 64, food: 5 },
  [B.APPLE]:    { name: 'apple', stack: 64, food: 4 },
  [B.COOKED_CARROT]: { name: 'cooked carrot', stack: 64, food: 6 },
  [B.COOKED_POTATO]: { name: 'cooked potato', stack: 64, food: 5 },
  [B.WHEAT]:    { name: 'wheat', stack: 64, food: 1, seed: true },
  [B.CARROT]:   { name: 'carrot', stack: 64, food: 2, seed: true },
  [B.POTATO]:   { name: 'potato', stack: 64, food: 1, seed: true },
  [B.W_PICK]:   { name: 'wooden pickaxe', stack: 1, tool: 'pickaxe', tier: 1, durability: 60 },
  [B.S_PICK]:   { name: 'stone pickaxe', stack: 1, tool: 'pickaxe', tier: 2, durability: 100 },
  [B.I_PICK]:   { name: 'iron pickaxe', stack: 1, tool: 'pickaxe', tier: 3, durability: 100 },
  [B.D_PICK]:   { name: 'diamond pickaxe', stack: 1, tool: 'pickaxe', tier: 4, durability: 1000 },
  [B.W_AXE]:    { name: 'wooden axe', stack: 1, tool: 'axe', tier: 1, durability: 60 },
  [B.S_AXE]:    { name: 'stone axe', stack: 1, tool: 'axe', tier: 2, durability: 100 },
  [B.I_AXE]:    { name: 'iron axe', stack: 1, tool: 'axe', tier: 3, durability: 100 },
  [B.D_AXE]:    { name: 'diamond axe', stack: 1, tool: 'axe', tier: 4, durability: 1000 },
  [B.W_SHOVEL]: { name: 'wooden shovel', stack: 1, tool: 'shovel', tier: 1, durability: 60 },
  [B.S_SHOVEL]: { name: 'stone shovel', stack: 1, tool: 'shovel', tier: 2, durability: 100 },
  [B.I_SHOVEL]: { name: 'iron shovel', stack: 1, tool: 'shovel', tier: 3, durability: 100 },
  [B.D_SHOVEL]: { name: 'diamond shovel', stack: 1, tool: 'shovel', tier: 4, durability: 1000 },
  [B.W_HOE]:    { name: 'wooden hoe', stack: 1, tool: 'hoe', tier: 1, durability: 60 },
  [B.S_HOE]:    { name: 'stone hoe', stack: 1, tool: 'hoe', tier: 2, durability: 100 },
  [B.I_HOE]:    { name: 'iron hoe', stack: 1, tool: 'hoe', tier: 3, durability: 100 },
  [B.D_HOE]:    { name: 'diamond hoe', stack: 1, tool: 'hoe', tier: 4, durability: 1000 },
};

// ---- break times (seconds) per tool tier -----------------------------------
// key: block id -> [bare hands, tier1, tier2, tier3, tier4]
const BREAK_TIMES = {
  [B.GRASS]:        [0.75, 0.75, 0.75, 0.75, 0.75],
  [B.DIRT]:         [0.75, 0.75, 0.75, 0.75, 0.75],
  [B.SAND]:         [0.75, 0.5, 0.5, 0.5, 0.5],
  [B.GRAVEL]:       [0.75, 0.5, 0.5, 0.5, 0.5],
  [B.SNOW]:         [0.3, 0.3, 0.3, 0.3, 0.3],
  [B.STONE]:        [5, 2.5, 1.5, 0.75, 0.4],
  [B.COBBLE]:       [5, 2.5, 1.5, 0.75, 0.4],
  [B.STONE_BRICK]:  [5, 2.5, 1.5, 0.75, 0.4],
  [B.SANDSTONE]:    [5, 2.5, 1.5, 0.75, 0.4],
  [B.OAK_LOG]:      [3, 0.5, 0.5, 0.5, 0.5],
  [B.SPRUCE_LOG]:   [3, 0.5, 0.5, 0.5, 0.5],
  [B.BIRCH_LOG]:   [3, 0.5, 0.5, 0.5, 0.5],
  [B.OAK_LEAVES]:   [0.2, 0.2, 0.2, 0.2, 0.2],
  [B.SPRUCE_LEAVES]:[0.2, 0.2, 0.2, 0.2, 0.2],
  [B.BIRCH_LEAVES]: [0.2, 0.2, 0.2, 0.2, 0.2],
  [B.TALL_GRASS]:   [0.05, 0.05, 0.05, 0.05, 0.05],
  [B.FERN]:         [0.05, 0.05, 0.05, 0.05, 0.05],
  [B.FLOWER_RED]:   [0.05, 0.05, 0.05, 0.05, 0.05],
  [B.FLOWER_YELLOW]:[0.05, 0.05, 0.05, 0.05, 0.05],
  [B.CACTUS]:       [0.5, 0.5, 0.5, 0.5, 0.5],
  [B.IRON_ORE]:     [5, 2.5, 1.5, 0.75, 0.4],
  [B.COAL_ORE]:     [5, 2.5, 1.5, 0.75, 0.4],
  [B.GOLD_ORE]:     [5, 2.5, 1.5, 0.75, 0.4],
  [B.DIAMOND_ORE]:  [5, 2.5, 1.5, 0.75, 0.4],
  [B.FARMLAND]:     [0.5, 0.5, 0.5, 0.5, 0.5],
  [B.WHEAT]:        [0.3, 0.3, 0.3, 0.3, 0.3],
  [B.CARROT]:       [0.3, 0.3, 0.3, 0.3, 0.3],
  [B.POTATO]:       [0.3, 0.3, 0.3, 0.3, 0.3],
  [B.PLANKS]:       [5, 2.5, 1.5, 0.75, 0.4],
  [B.GLASS]:        [5, 2.5, 1.5, 0.75, 0.4],
  [B.FURNACE]:      [5, 2.5, 1.5, 0.75, 0.4],
  [B.CRAFTING_TABLE]: [5, 2.5, 1.5, 0.75, 0.4],
  [B.COAL_BLOCK]:   [5, 2.5, 1.5, 0.75, 0.4],
  [B.IRON_BLOCK]:   [5, 2.5, 1.5, 0.75, 0.4],
  [B.GOLD_BLOCK]:   [5, 2.5, 1.5, 0.75, 0.4],
  [B.DIAMOND_BLOCK]: [5, 2.5, 1.5, 0.75, 0.4],
};

function breakTime(blockId, tool) {
  const t = BREAK_TIMES[blockId];
  if (!t) return 0;
  if (!tool) return t[0];
  return t[Math.min(tool.tier, 4) - 1];
}

function canBreak(blockId, tool) {
  const meta = BLOCKS[blockId];
  if (!meta || meta.unbreakable) return false;
  if (meta.water) return false;
  if (!tool) {
    // bare hands: soft blocks, plants, crops, leaves
    return meta.plant || blockId === B.DIRT || blockId === B.GRASS ||
           blockId === B.SAND || blockId === B.GRAVEL || blockId === B.SNOW ||
           blockId === B.OAK_LEAVES || blockId === B.SPRUCE_LEAVES ||
           blockId === B.BIRCH_LEAVES || blockId === B.CACTUS;
  }
  // any tool can break plants/crops
  if (meta.plant || blockId === B.OAK_LEAVES || blockId === B.SPRUCE_LEAVES ||
      blockId === B.BIRCH_LEAVES || blockId === B.CACTUS) return true;
  switch (tool.tool) {
    case 'pickaxe':
      return BREAK_TIMES[blockId] !== undefined;
    case 'axe':
      return blockId === B.OAK_LOG || blockId === B.SPRUCE_LOG || blockId === B.BIRCH_LOG ||
             blockId === B.PLANKS;
    case 'shovel':
      return blockId === B.SAND || blockId === B.GRAVEL || blockId === B.FARMLAND;
    case 'hoe':
      return false; // hoe is for tilling, handled separately
  }
  return false;
}

function dropFor(blockId) {
  const meta = BLOCKS[blockId];
  if (!meta) return null;
  return meta.drop;
}

// ---- texture atlas -------------------------------------------------------
// 16x16px per face, packed into a 256x256 atlas (16x16 tiles).
// face index: 0=top, 1=bottom, 2=+x, 3=-x, 4=+z, 5=-z

const TILE = 16;
const ATLAS = 256; // 16x16 tiles

function makeAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS; canvas.height = ATLAS;
  const g = canvas.getContext('2d');
  const img = g.getImageData(ATLAS, ATLAS);
  const set = (x, y, r, gg, b) => {
    const i = (y * ATLAS + x) * 4;
    img[i] = r; img[i + 1] = gg; img[i + 2] = b; img[i + 3] = 255;
  };
  const setA = (x, y, r, gg, b, a) => {
    const i = (y * ATLAS + x) * 4;
    img[i] = r; img[i + 1] = gg; img[i + 2] = b; img[i + 3] = a;
  };
  const rand = mulberry32(12345);
  const noise = () => rand() - 0.5;
  const fill = (tx, ty, fn) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const [r, gg, b] = fn(x, y, rand);
        set(tx + x, ty + y, r | 0, gg | 0, b | 0);
      }
  };

  const base = (r, g, b, spread) => (x, y, rand) => [
    r + noise() * spread, g + noise() * spread, b + noise() * spread
  ];

  const defs = {
    grassTop: (x, y, rand) => {
      const s = 140 + noise() * 30;
      return [s * 0.45, s, s * 0.55];
    },
    dirt: base(134, 96, 67, 18),
    stone: (x, y, rand) => {
      const s = 120 + noise() * 25;
      return [s, s, s];
    },
    bedrock: (x, y, rand) => {
      const s = 40 + noise() * 30;
      return [s, s, s];
    },
    sand: (x, y, rand) => {
      const s = 210 + noise() * 20;
      return [s, s * 0.95, s * 0.75];
    },
    gravel: (x, y, rand) => {
      const s = 100 + noise() * 40;
      return [s, s, s];
    },
    cobble: (x, y, rand) => {
      const cx = Math.floor(x / 4) + (rand() > 0.5 ? 1 : 0);
      const cy = Math.floor(y / 4) + (rand() > 0.5 ? 1 : 0);
      const s = 110 + ((cx + cy) % 2) * 30 + noise() * 20;
      return [s, s, s];
    },
    oakSide: (x, y, rand) => {
      const s = 150 + noise() * 20;
      return [s * 0.5, s * 0.35, s * 0.2];
    },
    oakTop: (x, y, rand) => {
      const dx = x - 8, dy = y - 8;
      const d = Math.sqrt(dx * dx + dy * dy);
      const rings = Math.floor(d / 2);
      const s = 160 + (rings % 2) * 25 + noise() * 15;
      return [s * 0.55, s * 0.4, s * 0.25];
    },
    spruceSide: (x, y, rand) => {
      const s = 90 + noise() * 15 + (x % 4 === 0 ? 20 : 0);
      return [s * 0.4, s * 0.5, s * 0.45];
    },
    birchSide: (x, y, rand) => {
      const s = 220 + noise() * 15;
      const dark = (x % 8 === 0 || y % 8 === 0) ? -60 : 0;
      return [s + dark, s + dark, s + dark];
    },
    leaves: (x, y, rand) => {
      const s = 120 + noise() * 35;
      if (rand() < 0.08) return [s * 0.3, s * 0.5, s * 0.3];
      return [s * 0.35, s, s * 0.4];
    },
    sandstone: (x, y, rand) => {
      const s = 210 + noise() * 15;
      return [s, s * 0.92, s * 0.7];
    },
    glass: (x, y, rand) => {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      if (edge) return [200, 220, 235];
      return [230, 240, 250];
    },
    stoneBrick: (x, y, rand) => {
      const edge = x === 0 || y === 0 || x === 7 || y === 7;
      const s = 140 + noise() * 15;
      return edge ? [s * 0.75, s * 0.75, s * 0.75] : [s, s, s];
    },
    ironOre: (x, y, rand) => {
      const s = 120 + noise() * 20;
      if (rand() < 0.25) return [230, 230, 235];
      return [s, s, s];
    },
    coalOre: (x, y, rand) => {
      const s = 120 + noise() * 20;
      if (rand() < 0.25) return [20, 20, 20];
      return [s, s, s];
    },
    goldOre: (x, y, rand) => {
      const s = 120 + noise() * 20;
      if (rand() < 0.25) return [255, 215, 0];
      return [s, s, s];
    },
    diamondOre: (x, y, rand) => {
      const s = 120 + noise() * 20;
      if (rand() < 0.25) return [0, 255, 240];
      return [s, s, s];
    },
    obsidian: (x, y, rand) => {
      const s = 20 + noise() * 15;
      return [s, s, s + 15];
    },
    snow: (x, y, rand) => {
      const s = 245 + noise() * 10;
      return [s, s, s];
    },
    farmland: (x, y, rand) => {
      const s = 80 + noise() * 12;
      return [s, s * 0.7, s * 0.5];
    },
    planks: (x, y, rand) => {
      const s = 190 + noise() * 15;
      const grain = (y % 4 === 0) ? -25 : 0;
      return [s + grain, s * 0.8 + grain, s * 0.55 + grain];
    },
    coalBlock: (x, y, rand) => {
      const s = 30 + noise() * 15;
      return [s, s, s];
    },
    ironBlock: (x, y, rand) => {
      const s = 200 + noise() * 15;
      return [s, s, s];
    },
    goldBlock: (x, y, rand) => {
      const s = 220 + noise() * 20;
      return [s, s * 0.85, 60];
    },
    diamondBlock: (x, y, rand) => {
      const s = 180 + noise() * 20;
      return [s * 0.5, s, s * 0.9];
    },
    charcoal: (x, y, rand) => {
      const s = 40 + noise() * 20;
      return [s, s, s];
    },
  };

  // face layout per block: [top, bottom, side]
  const layout = {
    [B.GRASS]: ['grassTop', 'dirt', 'dirt'],
    [B.DIRT]: ['dirt', 'dirt', 'dirt'],
    [B.STONE]: ['stone', 'stone', 'stone'],
    [B.BEDROCK]: ['bedrock', 'bedrock', 'bedrock'],
    [B.SAND]: ['sand', 'sand', 'sand'],
    [B.GRAVEL]: ['gravel', 'gravel', 'gravel'],
    [B.COBBLE]: ['cobble', 'cobble', 'cobble'],
    [B.OAK_LOG]: ['oakTop', 'oakTop', 'oakSide'],
    [B.SPRUCE_LOG]: ['oakTop', 'oakTop', 'spruceSide'],
    [B.BIRCH_LOG]: ['oakTop', 'oakTop', 'birchSide'],
    [B.OAK_LEAVES]: ['leaves', 'leaves', 'leaves'],
    [B.SPRUCE_LEAVES]: ['leaves', 'leaves', 'leaves'],
    [B.BIRCH_LEAVES]: ['leaves', 'leaves', 'leaves'],
    [B.SANDSTONE]: ['sandstone', 'sandstone', 'sandstone'],
    [B.GLASS]: ['glass', 'glass', 'glass'],
    [B.STONE_BRICK]: ['stoneBrick', 'stoneBrick', 'stoneBrick'],
    [B.IRON_ORE]: ['ironOre', 'ironOre', 'ironOre'],
    [B.COAL_ORE]: ['coalOre', 'coalOre', 'coalOre'],
    [B.GOLD_ORE]: ['goldOre', 'goldOre', 'goldOre'],
    [B.DIAMOND_ORE]: ['diamondOre', 'diamondOre', 'diamondOre'],
    [B.OBSIDIAN]: ['obsidian', 'obsidian', 'obsidian'],
    [B.SNOW]: ['snow', 'snow', 'snow'],
    [B.FARMLAND]: ['farmland', 'dirt', 'farmland'],
    [B.PLANKS]: ['planks', 'planks', 'planks'],
    [B.COAL_BLOCK]: ['coalBlock', 'coalBlock', 'coalBlock'],
    [B.IRON_BLOCK]: ['ironBlock', 'ironBlock', 'ironBlock'],
    [B.GOLD_BLOCK]: ['goldBlock', 'goldBlock', 'goldBlock'],
    [B.DIAMOND_BLOCK]: ['diamondBlock', 'diamondBlock', 'diamondBlock'],
    [B.CHARCOAL]: ['charcoal', 'charcoal', 'charcoal'],
  };

  for (const [id, [top, bottom, side]] of Object.entries(layout)) {
    const t = id * 3;
    fill(0, t * TILE, defs[top]);
    fill(0, (t + 1) * TILE, defs[bottom]);
    for (let i = 0; i < 4; i++) fill(0, (t + 2 + i) * TILE, defs[side]);
  }

  // water (animated: 2 frames)
  for (let f = 0; f < 2; f++) {
    const t = 100 + f;
    fill(0, t * TILE, (x, y, rand) => {
      const w = Math.sin((x + y + f * 8) * 0.8) * 0.5 + 0.5;
      return [40 + w * 40, 100 + w * 60, 180 + w * 50];
    });
  }

  // crack frames (mining progress) — transparent black lines
  for (let f = 0; f < 3; f++) {
    const t = 103 + f;
    const g2 = g;
    // clear
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const i = ((t * TILE + y) * ATLAS + x) * 4;
        img[i] = img[i + 1] = img[i + 2] = img[i + 3] = 0;
      }
    const cracks = 4 + f * 4;
    for (let c = 0; c < cracks; c++) {
      let x = Math.floor(rand() * TILE), y = Math.floor(rand() * TILE);
      for (let s = 0; s < 4 + f * 3; s++) {
        set(x, y, 0, 0, 0);
        x += Math.floor(rand() * 3) - 1;
        y += Math.floor(rand() * 3) - 1;
        x = Math.max(0, Math.min(TILE - 1, x));
        y = Math.max(0, Math.min(TILE - 1, y));
      }
    }
  }

  // ---- plants (transparent-background tiles, 138..144) -------------------
  const plantDraw = (t, drawFn) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const i = ((t * TILE + y) * ATLAS + x) * 4;
        img[i] = img[i + 1] = img[i + 2] = img[i + 3] = 0;
      }
    drawFn(t);
  };
  plantDraw(138, (t) => { // tall grass
    for (let i = 0; i < 7; i++) {
      const x = 2 + Math.floor(rand() * 12);
      for (let y = 3; y < 14; y++)
        px(t, x, y, 60 + Math.floor(rand() * 20), 130 + Math.floor(rand() * 30), 50);
    }
  });
  plantDraw(139, (t) => { // fern
    for (let i = 0; i < 6; i++) {
      const x = 3 + Math.floor(rand() * 10);
      for (let y = 8; y < 14; y++) px(t, x, y, 70, 150, 60);
    }
  });
  plantDraw(140, (t) => { // red flower
    for (let y = 8; y < 14; y++) px(t, 8, y, 60, 120, 60);
    for (let y = 4; y < 8; y++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) + Math.abs(y - 5) < 3) px(t, 8 + dx, y, 220, 40, 40);
  });
  plantDraw(141, (t) => { // yellow flower
    for (let y = 8; y < 14; y++) px(t, 8, y, 60, 120, 60);
    for (let y = 4; y < 8; y++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) + Math.abs(y - 5) < 3) px(t, 8 + dx, y, 240, 220, 40);
  });
  plantDraw(142, (t) => { // wheat
    for (let y = 6; y < 14; y++) px(t, 8, y, 180, 160, 80);
    for (let y = 3; y < 7; y++)
      for (let dx = -1; dx <= 1; dx++) px(t, 8 + dx, y, 220, 200, 100);
  });
  plantDraw(143, (t) => { // carrot
    for (let y = 6; y < 12; y++)
      for (let x = 7; x < 10; x++) px(t, x, y, 240, 140, 40);
    for (let y = 3; y < 6; y++) px(t, 8, y, 60, 140, 60);
  });
  plantDraw(144, (t) => { // potato
    for (let y = 7; y < 12; y++)
      for (let x = 6; x < 11; x++)
        if (Math.abs(x - 8) + Math.abs(y - 9) < 4) px(t, x, y, 190, 150, 100);
  });

  // cactus (145..150)
  const cactusSide = (x, y, rand) => {
    const s = 120 + noise() * 20;
    if (x % 8 === 0 || y % 8 === 0) return [s * 0.5, s * 0.6, s * 0.5];
    return [s * 0.4, s, s * 0.5];
  };
  const cactusTop = (x, y, rand) => {
    const s = 200 + noise() * 15;
    return [s, s * 0.9, s * 0.7];
  };
  fill(0, 145 * TILE, cactusTop);
  fill(0, 146 * TILE, cactusTop);
  for (let i = 0; i < 4; i++) fill(0, (147 + i) * TILE, cactusSide);

  // furnace (151..156)
  fill(0, 151 * TILE, defs.stone);
  fill(0, 152 * TILE, defs.stone);
  fill(0, 153 * TILE, defs.stone);
  fill(0, 154 * TILE, defs.stone);
  fill(0, 155 * TILE, (x, y, rand) => {
    if (x >= 4 && x < 12 && y >= 5 && y < 11) return [30, 20, 15];
    return defs.stone(x, y, rand);
  });
  fill(0, 156 * TILE, defs.stone);

  // crafting table (157..162)
  const planksFn = defs.planks;
  fill(0, 157 * TILE, (x, y, rand) => {
    const e = x === 0 || y === 0 || x === 7 || y === 7 || x === 15 || y === 15;
    if (e) { const s = 160 + noise() * 15; return [s * 0.7, s * 0.55, s * 0.35]; }
    return planksFn(x, y, rand);
  });
  fill(0, 158 * TILE, planksFn);
  for (let i = 0; i < 4; i++) fill(0, (159 + i) * TILE, planksFn);

  // item icons (16x16 each, packed in rows 168..200)
  const icon = (id, draw) => {
    const t = 168 + (id - 33);
    draw(t);
  };
  // helper to draw into atlas via set
  const px = (t, x, y, r, gg, b) => set((t * TILE + x) * ATLAS + x, (t * TILE + y) * ATLAS + y, r, gg, b);

  const drawTool = (t, color, shape) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        let on = false;
        if (shape === 'pickaxe') {
          // diagonal head + handle
          on = (x >= 2 && x <= 13 && y >= 2 && y <= 5 && (y - 2) * 2 + (x - 2) < 12) ||
               (x >= 6 && x <= 9 && y >= 6 && y <= 13);
        } else if (shape === 'axe') {
          on = (x >= 8 && x <= 13 && y >= 1 && y <= 8) ||
               (x >= 3 && x <= 9 && y >= 9 && y <= 13);
        } else if (shape === 'shovel') {
          on = (x >= 6 && x <= 9 && y >= 1 && y <= 13) ||
               (x >= 4 && x <= 11 && y >= 10 && y <= 13);
        } else if (shape === 'hoe') {
          on = (x >= 6 && x <= 9 && y >= 1 && y <= 13) ||
               (x >= 3 && x <= 12 && y >= 12 && y <= 13);
        }
        if (on) px(t, x, y, color[0], color[1], color[2]);
      }
  };

  const drawIngot = (t, color) => {
    for (let y = 5; y < 11; y++)
      for (let x = 3; x < 13; x++) {
        const edge = (y === 5 || y === 10) ? 1 : 0;
        if (x >= 3 + edge && x < 13 - edge) px(t, x, y, color[0], color[1], color[2]);
      }
  };

  const drawFood = (t, draw) => draw(t);

  // planks (33)
  icon(B.PLANKS, (t) => { for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) px(t, x, y, 190, 150, 100); });
  // sticks (34)
  icon(B.STICK, (t) => { for (let i = 0; i < 10; i++) { const x = 3 + i, y = 12 - i; px(t, x, y, 120, 90, 60); px(t, x, y + 1, 120, 90, 60); } });
  // coal (35)
  icon(B.COAL, (t) => { for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) px(t, x, y, 25, 25, 25); });
  // iron ingot (36)
  drawIngot(168 + (B.IRON_INGOT - 33), [220, 220, 225]);
  // gold ingot (37)
  drawIngot(168 + (B.GOLD_INGOT - 33), [255, 215, 0]);
  // diamond (38)
  icon(B.DIAMOND, (t) => { for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) { if (Math.abs(x - 8) + Math.abs(y - 8) < 5) px(t, x, y, 0, 255, 240); } });
  // charcoal (45)
  icon(B.CHARCOAL, (t) => { for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) px(t, x, y, 50, 50, 50); });
  // bread (46)
  icon(B.BREAD, (t) => { for (let y = 5; y < 11; y++) for (let x = 3; x < 13; x++) px(t, x, y, 220, 180, 120); for (let x = 4; x < 12; x++) px(t, x, 5, 200, 160, 100); });
  // apple (47)
  icon(B.APPLE, (t) => { for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) { if (Math.abs(x - 8) + Math.abs(y - 8) < 5) px(t, x, y, 220, 30, 30); } px(t, 8, 3, 120, 80, 40); });
  // cooked carrot (48)
  icon(B.COOKED_CARROT, (t) => { for (let y = 3; y < 13; y++) for (let x = 6; x < 10; x++) px(t, x, y, 230, 140, 40); });
  // cooked potato (49)
  icon(B.COOKED_POTATO, (t) => { for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) { if (Math.abs(x - 8) + Math.abs(y - 8) < 5) px(t, x, y, 160, 130, 90); } });
  // wheat (30)
  icon(B.WHEAT, (t) => { for (let y = 2; y < 14; y++) for (let x = 7; x < 9; x++) px(t, x, y, 200, 180, 100); for (let y = 4; y < 12; y++) for (let x = 5; x < 11; x++) if (Math.abs(x - 8) < 3) px(t, x, y, 210, 190, 110); });
  // carrot (31)
  icon(B.CARROT, (t) => { for (let y = 3; y < 13; y++) for (let x = 6; x < 10; x++) px(t, x, y, 240, 150, 40); px(t, 8, 2, 100, 180, 60); });
  // potato (32)
  icon(B.POTATO, (t) => { for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) { if (Math.abs(x - 8) + Math.abs(y - 8) < 5) px(t, x, y, 200, 170, 120); } });
  // tools
  const toolColors = {
    W: [160, 120, 80], S: [120, 120, 120], I: [220, 220, 225], D: [0, 255, 240]
  };
  const tools = [
    [B.W_PICK, 'pickaxe', 'W'], [B.S_PICK, 'pickaxe', 'S'], [B.I_PICK, 'pickaxe', 'I'], [B.D_PICK, 'pickaxe', 'D'],
    [B.W_AXE, 'axe', 'W'], [B.S_AXE, 'axe', 'S'], [B.I_AXE, 'axe', 'I'], [B.D_AXE, 'axe', 'D'],
    [B.W_SHOVEL, 'shovel', 'W'], [B.S_SHOVEL, 'shovel', 'S'], [B.I_SHOVEL, 'shovel', 'I'], [B.D_SHOVEL, 'shovel', 'D'],
    [B.W_HOE, 'hoe', 'W'], [B.S_HOE, 'hoe', 'S'], [B.I_HOE, 'hoe', 'I'], [B.D_HOE, 'hoe', 'D'],
  ];
  for (const [id, shape, c] of tools) drawTool(168 + (id - 33), toolColors[c], shape);

  // furnace (39)
  icon(B.FURNACE, (t) => {
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) px(t, x, y, 120, 120, 120);
    for (let y = 6; y < 11; y++) for (let x = 5; x < 11; x++) px(t, x, y, 40, 30, 20);
  });
  // crafting table (40)
  icon(B.CRAFTING_TABLE, (t) => {
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) px(t, x, y, 190, 150, 100);
    for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) px(t, x, y, 160, 120, 80);
  });

  g.putImageData(img, 0, 0);
  return canvas;
}

// UV rect for a tile index
function uvRect(tile) {
  const tx = tile % 16, ty = Math.floor(tile / 16);
  return { u0: tx / 16, u1: (tx + 1) / 16, v0: ty / 16, v1: (ty + 1) / 16 };
}

// dedicated tile ranges (avoid collisions with the id*3 block layout)
const PLANT_TILES = {
  [B.TALL_GRASS]: 138, [B.FERN]: 139, [B.FLOWER_RED]: 140, [B.FLOWER_YELLOW]: 141,
  [B.WHEAT]: 142, [B.CARROT]: 143, [B.POTATO]: 144,
};
const SPECIAL_TILES = {
  [B.CACTUS]: 145, [B.FURNACE]: 151, [B.CRAFTING_TABLE]: 157,
};

// face tile for a block type + face index (0=top,1=bottom,2=+x,3=-x,4=+z,5=-z)
function faceTile(blockId, face) {
  if (PLANT_TILES[blockId] !== undefined) return PLANT_TILES[blockId];
  if (SPECIAL_TILES[blockId] !== undefined) return SPECIAL_TILES[blockId] + face;
  const t = blockId * 3;
  if (face === 0) return t;
  if (face === 1) return t + 1;
  return t + 2 + (face - 2);
}

// crack tile for progress stage 0..2
function crackTile(stage) {
  return 103 + stage;
}

// water tile (2 frames)
function waterTile(frame) {
  return 100 + frame;
}

// icon tile for an item id
function iconTile(id) {
  return 168 + (id - 33);
}
