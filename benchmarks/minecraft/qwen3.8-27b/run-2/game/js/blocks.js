/* blocks.js - block definitions (original content) */
(function () {
  'use strict';

  // texture tile indices in the atlas (atlas is 8 columns wide)
  var T = {
    GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3, COBBLE: 4, BEDROCK: 5, SAND: 6, WATER: 7,
    LOG_SIDE: 8, LOG_TOP: 9, LEAVES_OAK: 10, LEAVES_SPRUCE: 11, PLANKS: 12, BRICK: 13, GLASS: 14, TORCH: 15,
    SNOW: 16, SNOW_SIDE: 17, CACTUS_SIDE: 18, CACTUS_TOP: 19, TNT_SIDE: 20, TNT_TOP: 21, COAL_ORE: 22, IRON_ORE: 23,
    GOLD_ORE: 24, DIAMOND_ORE: 25, FLOWER_RED: 26, FLOWER_YELLOW: 27, TALLGRASS: 28, SPRUCE_LOG_SIDE: 29,
    WOOL_WHITE: 30, WOOL_RED: 31,
    WOOL_YELLOW: 32, WOOL_BLUE: 33, WOOL_GREEN: 34, WOOL_ORANGE: 35, OBSIDIAN: 36,
    CRACK_0: 37, CRACK_1: 38, CRACK_2: 39, CRACK_3: 40, CRACK_4: 41, CRACK_5: 42, CRACK_6: 43, CRACK_7: 44, CRACK_8: 45, CRACK_9: 46, CRACK_10: 47
  };

  var B = {};
  function def(id, name, opts) { B[id] = { id: id, name: name, solid: false, opaque: false, seesThrough: true, liquid: false, plant: false, emit: 0, hardness: 1, dig: 'dirt', drop: id, tex: null, tint: 1, cat: 'building' }; for (var k in opts) B[id][k] = opts[k]; return B[id]; }

  B[0] = def(0, 'Air', { seesThrough: true, opaque: false, cat: '' });
  def(1, 'Grass', { solid: true, opaque: true, seesThrough: false, dig: 'dirt', hardness: 0.75, drop: 2, tex: { t: T.GRASS_TOP, s: T.GRASS_SIDE, b: T.DIRT } });
  def(2, 'Dirt', { solid: true, opaque: true, seesThrough: false, dig: 'dirt', hardness: 0.75, tex: { t: T.DIRT, s: T.DIRT, b: T.DIRT } });
  def(3, 'Stone', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: 3.0, tex: { t: T.STONE, s: T.STONE, b: T.STONE } });
  def(4, 'Cobblestone', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: 3.0, tex: { t: T.COBBLE, s: T.COBBLE, b: T.COBBLE } });
  def(5, 'Bedrock', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: -1, tex: { t: T.BEDROCK, s: T.BEDROCK, b: T.BEDROCK } });
  def(6, 'Sand', { solid: true, opaque: true, seesThrough: false, dig: 'dirt', hardness: 0.75, tex: { t: T.SAND, s: T.SAND, b: T.SAND } });
  B[7] = def(7, 'Water', { liquid: true, seesThrough: true, opaque: false, dig: '', hardness: -1, tex: { t: T.WATER, s: T.WATER, b: T.WATER } });
  B[7].cat = '';
  def(8, 'Oak Log', { solid: true, opaque: true, seesThrough: false, dig: 'wood', hardness: 2.0, tex: { t: T.LOG_TOP, s: T.LOG_SIDE, b: T.LOG_TOP } });
  def(9, 'Oak Leaves', { solid: true, opaque: true, seesThrough: true, dig: 'leaves', hardness: 0.25, tex: { t: T.LEAVES_OAK, s: T.LEAVES_OAK, b: T.LEAVES_OAK } });
  def(10, 'Spruce Log', { solid: true, opaque: true, seesThrough: false, dig: 'wood', hardness: 2.0, tex: { t: T.LOG_TOP, s: T.SPRUCE_LOG_SIDE, b: T.LOG_TOP } });
  def(11, 'Spruce Leaves', { solid: true, opaque: true, seesThrough: true, dig: 'leaves', hardness: 0.25, tex: { t: T.LEAVES_SPRUCE, s: T.LEAVES_SPRUCE, b: T.LEAVES_SPRUCE } });
  def(12, 'Planks', { solid: true, opaque: true, seesThrough: false, dig: 'wood', hardness: 1.5, tex: { t: T.PLANKS, s: T.PLANKS, b: T.PLANKS } });
  def(13, 'Brick', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: 3.0, tex: { t: T.BRICK, s: T.BRICK, b: T.BRICK } });
  def(14, 'Glass', { solid: true, opaque: false, seesThrough: true, dig: 'glass', hardness: 0.25, tex: { t: T.GLASS, s: T.GLASS, b: T.GLASS } });
  def(15, 'Coal Ore', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: 3.0, tex: { t: T.COAL_ORE, s: T.COAL_ORE, b: T.COAL_ORE } });
  def(16, 'Iron Ore', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: 3.0, tex: { t: T.IRON_ORE, s: T.IRON_ORE, b: T.IRON_ORE } });
  def(17, 'Gold Ore', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: 3.0, tex: { t: T.GOLD_ORE, s: T.GOLD_ORE, b: T.GOLD_ORE } });
  def(18, 'Diamond Ore', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: 3.0, tex: { t: T.DIAMOND_ORE, s: T.DIAMOND_ORE, b: T.DIAMOND_ORE } });
  def(19, 'Torch', { plant: true, seesThrough: true, opaque: false, emit: 14, dig: 'wood', hardness: 0.25, tex: { s: T.TORCH }, cat: 'natural' });
  def(20, 'Snow', { solid: true, opaque: true, seesThrough: false, dig: 'dirt', hardness: 0.75, tex: { t: T.SNOW, s: T.SNOW_SIDE, b: T.SNOW } });
  def(21, 'Snowy Grass', { solid: true, opaque: true, seesThrough: false, dig: 'dirt', hardness: 0.75, drop: 2, tex: { t: T.SNOW, s: T.GRASS_SIDE, b: T.DIRT } });
  def(22, 'Cactus', { solid: true, opaque: true, seesThrough: false, dig: 'wood', hardness: 0.4, tex: { t: T.CACTUS_TOP, s: T.CACTUS_SIDE, b: T.CACTUS_TOP } });
  def(23, 'TNT', { solid: true, opaque: true, seesThrough: false, dig: 'wood', hardness: 0.2, emit: 0, tex: { t: T.TNT_TOP, s: T.TNT_SIDE, b: T.TNT_TOP } });
  def(24, 'Red Flower', { plant: true, seesThrough: true, opaque: false, dig: '', hardness: 0.2, tex: { s: T.FLOWER_RED }, cat: 'natural' });
  def(25, 'Yellow Flower', { plant: true, seesThrough: true, opaque: false, dig: '', hardness: 0.2, tex: { s: T.FLOWER_YELLOW }, cat: 'natural' });
  def(26, 'Tall Grass', { plant: true, seesThrough: true, opaque: false, dig: '', hardness: 0.2, tex: { s: T.TALLGRASS }, cat: 'natural' });
  def(27, 'White Wool', { solid: true, opaque: true, seesThrough: false, dig: 'wool', hardness: 0.25, tex: { t: T.WOOL_WHITE, s: T.WOOL_WHITE, b: T.WOOL_WHITE } });
  def(28, 'Red Wool', { solid: true, opaque: true, seesThrough: false, dig: 'wool', hardness: 0.25, tex: { t: T.WOOL_RED, s: T.WOOL_RED, b: T.WOOL_RED } });
  def(29, 'Yellow Wool', { solid: true, opaque: true, seesThrough: false, dig: 'wool', hardness: 0.25, tex: { t: T.WOOL_YELLOW, s: T.WOOL_YELLOW, b: T.WOOL_YELLOW } });
  def(30, 'Blue Wool', { solid: true, opaque: true, seesThrough: false, dig: 'wool', hardness: 0.25, tex: { t: T.WOOL_BLUE, s: T.WOOL_BLUE, b: T.WOOL_BLUE } });
  def(31, 'Green Wool', { solid: true, opaque: true, seesThrough: false, dig: 'wool', hardness: 0.25, tex: { t: T.WOOL_GREEN, s: T.WOOL_GREEN, b: T.WOOL_GREEN } });
  def(32, 'Orange Wool', { solid: true, opaque: true, seesThrough: false, dig: 'wool', hardness: 0.25, tex: { t: T.WOOL_ORANGE, s: T.WOOL_ORANGE, b: T.WOOL_ORANGE } });
  def(33, 'Obsidian', { solid: true, opaque: true, seesThrough: false, dig: 'stone', hardness: -1, tex: { t: T.OBSIDIAN, s: T.OBSIDIAN, b: T.OBSIDIAN } });

  // creative inventory ordering (id list)
  var CREATIVE_LIST = [
    1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33
  ];

  window.Blocks = { def: B, T: T, CREATIVE_LIST: CREATIVE_LIST };
})();
