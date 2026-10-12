// Block definitions + 100% procedurally generated textures (original art, drawn at runtime).
(function (global) {
  "use strict";

  const B = {
    AIR: 0, STONE: 1, GRASS: 2, DIRT: 3, PLANKS: 4, LOG: 5, LEAVES: 6,
    SAND: 7, GRAVEL: 8, COBBLE: 9, WATER: 10, GLASS: 11, BEDROCK: 12,
    COAL_ORE: 13, IRON_ORE: 14, GOLD_ORE: 15, DIAMOND_ORE: 16
  };

  // tile indices on the 8x8 atlas
  const T = {
    GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, COBBLE: 4, PLANKS: 5,
    LOG_SIDE: 6, LOG_TOP: 7, LEAVES: 8, SAND: 9, GRAVEL: 10, WATER: 11,
    GLASS: 12, BEDROCK: 13, COAL_ORE: 14, IRON_ORE: 15, GOLD_ORE: 16, DIAMOND_ORE: 17
  };

  const ATLAS_N = 8; // 8x8 tiles
  const TILE = 16;
  const ATLAS = ATLAS_N * TILE;

  const DEFS = {
    [B.AIR]:         { name: "Air", solid: false, opaque: false, hard: 0 },
    [B.STONE]:      { name: "Stone", solid: true, opaque: true, hard: 1.5, faces: { top: T.STONE, side: T.STONE, bottom: T.STONE }, mat: "stone", color: [0.5, 0.5, 0.5] },
    [B.GRASS]:      { name: "Grass", solid: true, opaque: true, hard: 0.5, faces: { top: T.GRASS_TOP, side: T.GRASS_SIDE, bottom: T.DIRT }, mat: "grass", color: [0.45, 0.55, 0.25] },
    [B.DIRT]:       { name: "Dirt", solid: true, opaque: true, hard: 0.45, faces: { top: T.DIRT, side: T.DIRT, bottom: T.DIRT }, mat: "dirt", color: [0.5, 0.37, 0.26] },
    [B.PLANKS]:     { name: "Planks", solid: true, opaque: true, hard: 0.9, faces: { top: T.PLANKS, side: T.PLANKS, bottom: T.PLANKS }, mat: "wood", color: [0.6, 0.5, 0.32] },
    [B.LOG]:        { name: "Log", solid: true, opaque: true, hard: 0.9, faces: { top: T.LOG_TOP, side: T.LOG_SIDE, bottom: T.LOG_TOP }, mat: "wood", color: [0.42, 0.34, 0.2] },
    [B.LEAVES]:     { name: "Leaves", solid: true, opaque: false, hard: 0.15, faces: { top: T.LEAVES, side: T.LEAVES, bottom: T.LEAVES }, mat: "leaves", color: [0.3, 0.5, 0.2] },
    [B.SAND]:       { name: "Sand", solid: true, opaque: true, hard: 0.35, faces: { top: T.SAND, side: T.SAND, bottom: T.SAND }, mat: "sand", color: [0.85, 0.8, 0.6] },
    [B.GRAVEL]:     { name: "Gravel", solid: true, opaque: true, hard: 0.5, faces: { top: T.GRAVEL, side: T.GRAVEL, bottom: T.GRAVEL }, mat: "gravel", color: [0.5, 0.49, 0.47] },
    [B.COBBLE]:    { name: "Cobblestone", solid: true, opaque: true, hard: 1.5, faces: { top: T.COBBLE, side: T.COBBLE, bottom: T.COBBLE }, mat: "stone", color: [0.48, 0.48, 0.48] },
    [B.WATER]:      { name: "Water", solid: false, opaque: false, hard: 0 },
    [B.GLASS]:      { name: "Glass", solid: true, opaque: false, hard: 0.3, faces: { top: T.GLASS, side: T.GLASS, bottom: T.GLASS }, mat: "glass", color: [0.8, 0.9, 0.95] },
    [B.BEDROCK]:    { name: "Bedrock", solid: true, opaque: true, hard: Infinity, faces: { top: T.BEDROCK, side: T.BEDROCK, bottom: T.BEDROCK }, mat: "stone", color: [0.25, 0.25, 0.25] },
    [B.COAL_ORE]:   { name: "Coal ore", solid: true, opaque: true, hard: 1.5, faces: { top: T.COAL_ORE, side: T.COAL_ORE, bottom: T.COAL_ORE }, mat: "stone", color: [0.4, 0.4, 0.4] },
    [B.IRON_ORE]:   { name: "Iron ore", solid: true, opaque: true, hard: 1.8, faces: { top: T.IRON_ORE, side: T.IRON_ORE, bottom: T.IRON_ORE }, mat: "stone", color: [0.55, 0.52, 0.5] },
    [B.GOLD_ORE]:   { name: "Gold ore", solid: true, opaque: true, hard: 1.8, faces: { top: T.GOLD_ORE, side: T.GOLD_ORE, bottom: T.GOLD_ORE }, mat: "stone", color: [0.7, 0.6, 0.3] },
    [B.DIAMOND_ORE]:{ name: "Diamond ore", solid: true, opaque: true, hard: 2.0, faces: { top: T.DIAMOND_ORE, side: T.DIAMOND_ORE, bottom: T.DIAMOND_ORE }, mat: "stone", color: [0.4, 0.85, 0.85] }
  };

  const HOTBAR = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.PLANKS, B.LOG, B.LEAVES, B.SAND, B.GLASS];

  // ---------- pixel drawing helpers ----------
  function canvas16() {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    return c;
  }
  function px(ctx, x, y, col, a) {
    ctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (a == null ? 1 : a) + ")";
    ctx.fillRect(x, y, 1, 1);
  }
  function noiseFill(ctx, rng, base, spread) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = (rng() - 0.5) * 2 * spread;
      px(ctx, x, y, [
        Math.max(0, Math.min(255, base[0] + d)),
        Math.max(0, Math.min(255, base[1] + d * 0.8)),
        Math.max(0, Math.min(255, base[2] + d * 0.6))
      ]);
    }
  }
  function spots(ctx, rng, col, count, size, a) {
    for (let i = 0; i < count; i++) {
      const x = (rng() * 16) | 0, y = (rng() * 16) | 0;
      for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
        if (rng() < 0.75) px(ctx, (x + dx) & 15, (y + dy) & 15, col, a);
      }
    }
  }

  // ---------- tile painters (each returns a 16x16 canvas) ----------
  function drawGrassTop(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [106, 168, 64], 14);
    spots(ctx, rng, [86, 140, 48], 14, 2);
    spots(ctx, rng, [126, 190, 84], 8, 1);
    return c;
  }
  function drawDirt(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [133, 95, 66], 12);
    spots(ctx, rng, [92, 62, 42], 12, 2);
    spots(ctx, rng, [160, 120, 84], 6, 1);
    return c;
  }
  function drawGrassSide(dirtCanvas, rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    ctx.drawImage(dirtCanvas, 0, 0);
    const gr = rng;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) {
      const d = (gr() - 0.5) * 2 * 14;
      px(ctx, x, y, [106 + d, 168 + d * 0.8, 64 + d * 0.6]);
    }
    // jagged grass edge
    for (let x = 0; x < 16; x++) {
      const depth = 3 + ((rng() * 3) | 0);
      for (let y = 4; y < depth + 3 && y < 7; y++) {
        if (rng() < 0.55) {
          const d = (rng() - 0.5) * 2 * 10;
          px(ctx, x, y, [100 + d, 158 + d * 0.8, 58 + d * 0.6]);
        }
      }
    }
    return c;
  }
  function drawStone(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [127, 127, 127], 9);
    spots(ctx, rng, [105, 105, 105], 10, 2);
    spots(ctx, rng, [145, 145, 145], 8, 1);
    return c;
  }
  function drawCobble(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    const shades = [];
    for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) shades.push(100 + rng() * 50);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const cell = shades[(x >> 2) + (y >> 2) * 4];
      let v = cell + (rng() - 0.5) * 14;
      // darker border between cells of very different shade
      const cx0 = x >> 2, cy0 = y >> 2;
      const cx1 = (x + 1) >> 2, cy1 = (y + 1) >> 2;
      if ((cx1 !== cx0 && Math.abs(shades[cy1 * 4 + cx1] - shades[cy0 * 4 + cx0]) > 18) ||
          (cy1 !== cy0 && Math.abs(shades[cy1 * 4 + cx1] - shades[cy0 * 4 + cx0]) > 18)) v -= 34;
      v = Math.max(60, Math.min(180, v));
      px(ctx, x, y, [v, v, v]);
    }
    return c;
  }
  function drawPlanks(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [158, 127, 72], 8);
    const seams = [(rng() * 16) | 0, (rng() * 16) | 0, (rng() * 16) | 0, (rng() * 16) | 0];
    for (let y = 0; y < 16; y++) {
      const row = y >> 2;
      if (y % 4 === 0) for (let x = 0; x < 16; x++) px(ctx, x, y, [112, 84, 44]);
      const seam = seams[row];
      for (let x = 0; x < 16; x++) if (x === seam) px(ctx, x, y, [120, 92, 48]);
    }
    // grain
    spots(ctx, rng, [140, 108, 58], 16, 2);
    spots(ctx, rng, [172, 140, 84], 8, 1);
    return c;
  }
  function drawLogSide(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [109, 87, 52], 9);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (x % 4 === 0) px(ctx, x, y, [74 + (rng() - 0.5) * 12, 56 + (rng() - 0.5) * 10, 30 + (rng() - 0.5) * 8]);
    }
    spots(ctx, rng, [88, 68, 38], 8, 1);
    return c;
  }
  function drawLogTop(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x - 7.5, dy = y - 7.5;
      const r = Math.sqrt(dx * dx + dy * dy);
      let col;
      if (r > 7.4) col = [104, 84, 50];
      else if (Math.floor(r) % 2 === 0) col = [152, 120, 72];
      else col = [112, 88, 52];
      const d = (rng() - 0.5) * 10;
      px(ctx, x, y, [col[0] + d, col[1] + d, col[2] + d]);
    }
    return c;
  }
  function drawLeaves(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [52, 124, 36], 16);
    spots(ctx, rng, [36, 92, 24], 18, 2);
    spots(ctx, rng, [74, 152, 50], 10, 1);
    return c;
  }
  function drawSand(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [219, 205, 160], 9);
    spots(ctx, rng, [192, 177, 132], 10, 1);
    return c;
  }
  function drawGravel(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    noiseFill(ctx, rng, [128, 124, 118], 6);
    spots(ctx, rng, [84, 80, 76], 12, 2);
    spots(ctx, rng, [170, 166, 160], 12, 2);
    return c;
  }
  function drawWater(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const w = Math.sin(x * 1.05 + y * 0.8) * 9 + Math.sin(y * 1.7) * 7;
      const d = (rng() - 0.5) * 10;
      px(ctx, x, y, [46 + w + d, 104 + w + d, 182 + w + d * 0.5]);
    }
    return c;
  }
  function drawGlass(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 16, 16);
    for (let i = 0; i < 16; i++) {
      px(ctx, i, 0, [215, 235, 240]); px(ctx, i, 15, [215, 235, 240]);
      px(ctx, 0, i, [215, 235, 240]); px(ctx, 15, i, [215, 235, 240]);
    }
    px(ctx, 1, 1, [190, 220, 230], 0.9); px(ctx, 2, 1, [190, 220, 230], 0.6); px(ctx, 1, 2, [190, 220, 230], 0.6);
    for (let i = 3; i <= 7; i++) px(ctx, i, 11 - i + 3, [255, 255, 255], 0.85);
    for (let i = 5; i <= 9; i++) px(ctx, i, 12 - i + 4, [255, 255, 255], 0.5);
    return c;
  }
  function drawBedrock(rng) {
    const c = canvas16(); const ctx = c.getContext("2d");
    const dark = rng() < 0.5;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const cell = (x >> 2) + (y >> 2) * 4;
      const isDark = rng() < 0.45;
      const v = isDark ? 38 + rng() * 22 : 96 + rng() * 40;
      px(ctx, x, y, [v, v, v]);
    }
    return c;
  }
  function drawOre(baseCanvas, rng, col, hi) {
    const c = canvas16(); const ctx = c.getContext("2d");
    ctx.drawImage(baseCanvas, 0, 0);
    for (let i = 0; i < 4; i++) {
      const x = 1 + ((rng() * 13) | 0), y = 1 + ((rng() * 13) | 0);
      px(ctx, x, y, col); px(ctx, x + 1, y, col);
      px(ctx, x, y + 1, col); if (rng() < 0.8) px(ctx, x + 1, y + 1, col);
      if (rng() < 0.7) px(ctx, x, y, hi);
    }
    return c;
  }

  // ---------- build atlas ----------
  function buildAtlas() {
    const atlas = document.createElement("canvas");
    atlas.width = atlas.height = ATLAS;
    const actx = atlas.getContext("2d");
    const place = (canvas, idx) => {
      actx.drawImage(canvas, (idx % ATLAS_N) * TILE, Math.floor(idx / ATLAS_N) * TILE);
    };

    const r = Noise.mulberry32;
    const dirt = drawDirt(r(11));
    const stone = drawStone(r(21));

    const tiles = {
      [T.GRASS_TOP]: drawGrassTop(r(31)),
      [T.GRASS_SIDE]: drawGrassSide(dirt, r(32)),
      [T.DIRT]: dirt,
      [T.STONE]: stone,
      [T.COBBLE]: drawCobble(r(41)),
      [T.PLANKS]: drawPlanks(r(51)),
      [T.LOG_SIDE]: drawLogSide(r(61)),
      [T.LOG_TOP]: drawLogTop(r(62)),
      [T.LEAVES]: drawLeaves(r(71)),
      [T.SAND]: drawSand(r(81)),
      [T.GRAVEL]: drawGravel(r(91)),
      [T.WATER]: drawWater(r(101)),
      [T.GLASS]: drawGlass(r(111)),
      [T.BEDROCK]: drawBedrock(r(121)),
      [T.COAL_ORE]: drawOre(stone, r(131), [32, 32, 32], [70, 70, 70]),
      [T.IRON_ORE]: drawOre(stone, r(141), [222, 182, 152], [255, 230, 200]),
      [T.GOLD_ORE]: drawOre(stone, r(151), [250, 212, 80], [255, 240, 160]),
      [T.DIAMOND_ORE]: drawOre(stone, r(161), [92, 230, 230], [200, 255, 255])
    };
    for (const k of Object.keys(tiles)) place(tiles[k], Number(k));

    return { atlas, tiles, waterTile: tiles[T.WATER] };
  }

  // ---------- isometric block icons for the hotbar ----------
  function drawIcon(blockId, size) {
    const def = DEFS[blockId];
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const s = size / 48;
    const top = built.tiles[def.faces.top], side = built.tiles[def.faces.side], bottom = built.tiles[def.faces.bottom];

    function face(canvas, ox, oy, ux, uy, vx, vy, tint) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.transform(ux / 16 * s, uy / 16 * s, vx / 16 * s, vy / 16 * s, ox * s, oy * s);
      ctx.drawImage(canvas, 0, 0, 16, 16, 0, 0, 16, 16);
      if (tint > 0) {
        ctx.fillStyle = "rgba(0,0,0," + tint + ")";
        ctx.fillRect(0, 0, 16, 16);
      }
      ctx.restore();
    }

    // top face
    face(top, 24, 2, 18, 10, -18, 10, 0);
    // left face
    face(side, 6, 12, 18, 10, 0, 24, 0.30);
    // right face
    face(side, 24, 22, 18, -10, 0, 24, 0.15);
    return c;
  }

  const built = buildAtlas();
  const iconCache = {};
  function iconFor(blockId) {
    if (!iconCache[blockId]) iconCache[blockId] = drawIcon(blockId, 40);
    return iconCache[blockId];
  }

  // UV helper (flipY aware, half-pixel inset to avoid atlas bleeding)
  const inset = 0.5 / ATLAS;
  function tileUV(tile) {
    const cx = tile % ATLAS_N, cy = Math.floor(tile / ATLAS_N);
    const u0 = cx * TILE / ATLAS + inset;
    const v1 = 1 - cy * TILE / ATLAS - inset;
    const v0 = 1 - (cy + 1) * TILE / ATLAS + inset;
    const u1 = (cx + 1) * TILE / ATLAS - inset;
    return [u0, v0, u1, v1];
  }

  global.Blocks = {
    B, T, DEFS, HOTBAR,
    atlasCanvas: built.atlas,
    tiles: built.tiles,
    waterTileCanvas: built.waterTile,
    tileUV,
    iconFor
  };
})(window);
