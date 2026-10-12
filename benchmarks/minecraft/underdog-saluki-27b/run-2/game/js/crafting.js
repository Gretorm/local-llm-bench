// Crafting recipes (shapeless + grid) and furnace smelting.

const TOOL_MATERIALS = [
  { mat: B.PLANKS, tool: B.W_PICK, axe: B.W_AXE, shovel: B.W_SHOVEL, hoe: B.W_HOE },
  { mat: B.STONE,  tool: B.S_PICK, axe: B.S_AXE, shovel: B.S_SHOVEL, hoe: B.S_HOE },
  { mat: B.IRON_INGOT, tool: B.I_PICK, axe: B.I_AXE, shovel: B.I_SHOVEL, hoe: B.I_HOE },
  { mat: B.DIAMOND,  tool: B.D_PICK, axe: B.D_AXE, shovel: B.D_SHOVEL, hoe: B.D_HOE },
];

const SHAPELESS = [
  { ing: [[B.PLANKS, 1]], out: [B.PLANKS, 4] },
  { ing: [[B.PLANKS, 2]], out: [B.STICK, 3] },
  { ing: [[B.WHEAT, 3]], out: [B.BREAD, 1] },
  { ing: [[B.STONE, 4]], out: [B.STONE_BRICK, 4] },
  { ing: [[B.SAND, 4]], out: [B.SANDSTONE, 4] },
  { ing: [[B.COAL, 8]], out: [B.COAL_BLOCK, 1] },
  { ing: [[B.IRON_INGOT, 9]], out: [B.IRON_BLOCK, 1] },
  { ing: [[B.GOLD_INGOT, 9]], out: [B.GOLD_BLOCK, 1] },
  { ing: [[B.DIAMOND, 9]], out: [B.DIAMOND_BLOCK, 1] },
];

const GRID = [
  { pat: [[B.PLANKS, B.PLANKS], [B.PLANKS, B.PLANKS]], out: [B.CRAFTING_TABLE, 1] },
  ...TOOL_MATERIALS.map((t) => ({
    pat: [[t.mat, t.mat], [B.STICK, B.STICK]], out: [t.tool, 1],
  })),
  ...TOOL_MATERIALS.map((t) => ({
    pat: [[t.mat, B.STICK], [B.STICK, null]], out: [t.axe, 1],
  })),
  ...TOOL_MATERIALS.map((t) => ({
    pat: [[t.mat, null], [B.STICK, null], [B.STICK, null]], out: [t.shovel, 1],
  })),
  ...TOOL_MATERIALS.map((t) => ({
    pat: [[t.mat, t.mat], [B.STICK, null]], out: [t.hoe, 1],
  })),
  {
    pat: [
      [B.STONE, B.STONE, B.STONE],
      [B.STONE, null, B.STONE],
      [B.STONE, B.STONE, B.STONE],
    ],
    out: [B.FURNACE, 1],
  },
];

const FUEL = {
  [B.PLANKS]: 60,
  [B.WHEAT]: 60,
  [B.CARROT]: 60,
  [B.POTATO]: 60,
  [B.COAL]: 80,
  [B.CHARCOAL]: 80,
};

const SMELT = {
  [B.IRON_ORE]: B.IRON_INGOT,
  [B.GOLD_ORE]: B.GOLD_INGOT,
  [B.DIAMOND_ORE]: B.DIAMOND,
  [B.SAND]: B.GLASS,
  [B.CARROT]: B.COOKED_CARROT,
  [B.POTATO]: B.COOKED_POTATO,
  [B.PLANKS]: B.CHARCOAL,
};

function matchGrid(grid) {
  // grid: 9 items or nulls, row-major
  for (const r of GRID) {
    const rows = r.pat.length;
    const cols = r.pat[0].length;
    let ok = true;
    for (let y = 0; y < rows && ok; y++)
      for (let x = 0; x < cols && ok; x++) {
        const cell = grid[y * 3 + x];
        const want = r.pat[y][x];
        if (want === null) { if (cell) ok = false; }
        else if (!cell || cell.id !== want) ok = false;
      }
    if (ok) return r.out;
  }
  return null;
}

function matchShapeless(grid) {
  // count items in grid
  const counts = new Map();
  for (const s of grid) {
    if (!s) continue;
    counts.set(s.id, (counts.get(s.id) || 0) + s.count);
  }
  for (const r of SHAPELESS) {
    let ok = true;
    for (const [id, n] of r.ing) {
      const c = counts.get(id) || 0;
      if (c < n) { ok = false; break; }
    }
    if (ok) return r.out;
  }
  return null;
}

function matchRecipe(grid) {
  return matchGrid(grid) || matchShapeless(grid);
}
