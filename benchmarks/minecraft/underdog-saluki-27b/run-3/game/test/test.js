// Headless smoke test for Blockcraft core logic (Node, no browser).
import './stub-dom.js';
import { World, generateTerrain, WORLD_SIZE, WORLD_HEIGHT, SEA_LEVEL } from '../js/world.js';
import { Player, raycastVoxel } from '../js/physics.js';
import { BLOCKS, BLOCK_INDEX, RECIPES } from '../js/blocks.js';
import { saveGame, loadGame } from '../js/save.js';
import { Renderer, buildChunk } from '../js/renderer.js';
import { Audio } from '../js/audio.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
}

// 1. world generation
const world = new World();
generateTerrain(world, 42);
const counts = {};
for (let i = 0; i < world.blocks.length; i++) counts[world.blocks[i]] = (counts[world.blocks[i]] || 0) + 1;
const has = (id) => (counts[BLOCK_INDEX.get(id)] || 0) > 0;
check('terrain: grass exists', has('grass'));
check('terrain: stone exists', has('stone'));
check('terrain: water exists', has('water'));
check('terrain: logs exist', has('log'));
check('terrain: leaves exist', has('leaves'));
check('terrain: flowers exist', has('red_flower') || has('yellow_flower'));
check('terrain: tall grass exists', has('tall_grass'));
check('terrain: ores exist', has('iron_ore') || has('coal_ore'));
check('terrain: bedrock floor', world.get(5, 0, 5) === BLOCK_INDEX.get('bedrock'));
let waterTop = -1;
for (let x = 0; x < WORLD_SIZE; x++) {
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      if (world.get(x, y, z) === BLOCK_INDEX.get('water')) { waterTop = Math.max(waterTop, y); break; }
    }
  }
}
check('terrain: water surface at sea level', waterTop === SEA_LEVEL);

// 2. physics: fall onto flat floor
const w2 = new World();
const STONE = BLOCK_INDEX.get('stone');
for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) w2.set(x, 0, z, STONE);
const p = new Player(3.5, 5.5, 3.5, 0, 0);
const inp = { forward: 0, back: 0, left: 0, right: 0, jump: 0, sneak: 0 };
for (let i = 0; i < 200; i++) p.update(1 / 60, inp, w2);
check('physics: lands on floor', Math.abs(p.pos.y - 1.0) < 0.01);
check('physics: on ground', p.onGround === true);
check('physics: no residual vertical velocity', Math.abs(p.vel.y) < 0.01);

// 3. physics: wall collision
const w3 = new World();
for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) w3.set(x, 0, z, STONE);
for (let y = 0; y < 5; y++) w3.set(5, y, 3, STONE);
const p3 = new Player(4.4, 1.05, 3.5, 0, 0);
p3.vel.x = 50;
let maxX = 4.4;
for (let i = 0; i < 30; i++) {
  p3.update(1 / 60, inp, w3);
  maxX = Math.max(maxX, p3.pos.x);
}
check('physics: wall blocks movement', maxX < 4.71);

// 4. raycast
const w4 = new World();
w4.set(5, 5, 0, STONE);
const hit = raycastVoxel(w4, { x: 0.5, y: 5.5, z: 0.5 }, { x: 1, y: 0, z: 0 }, 10);
check('raycast: hits block', !!hit && hit.x === 5 && hit.y === 5 && hit.z === 0);
check('raycast: prev voxel correct', !!hit && hit.px === 4 && hit.py === 5 && hit.pz === 0);
const noHit = raycastVoxel(w4, { x: 0.5, y: 5.5, z: 0.5 }, { x: 0, y: 1, z: 0 }, 10);
check('raycast: misses empty space', noHit === null);

// 5. save / load roundtrip
const w5 = new World();
generateTerrain(w5, 7);
w5.set(3, 4, 3, BLOCK_INDEX.get('glass'));
const inv = Array(36).fill(null);
inv[0] = { id: 'planks', count: 5 };
const hotbar = [
  { id: 'grass', count: 64 }, { id: 'dirt', count: 64 }, { id: 'stone', count: 64 },
  { id: 'cobblestone', count: 64 }, { id: 'planks', count: 32 }, { id: 'wood', count: 32 },
  { id: 'glass', count: 16 }, { id: 'sand', count: 32 }, { id: 'torch', count: 16 },
];
saveGame({
  world: w5,
  player: { pos: { x: 1.5, y: 2.5, z: 3.5 }, yaw: 0.5, pitch: -0.2, fly: false },
  inventory: inv, hotbar, selected: 2, time: 0.3, health: 8, food: 12,
});
const loaded = loadGame();
check('save: world roundtrip',
  !!loaded && loaded.world.blocks.length === w5.blocks.length &&
  Array.from(loaded.world.blocks).every((v, i) => v === w5.blocks[i]));
check('save: inventory roundtrip',
  !!loaded && loaded.inventory[0] && loaded.inventory[0].id === 'planks' && loaded.inventory[0].count === 5);
check('save: player roundtrip', !!loaded && Math.abs(loaded.player.pos.x - 1.5) < 1e-6);

// 6. crafting recipe matching
function matchRecipe(grid) {
  for (const r of RECIPES) {
    let ok = true;
    for (let i = 0; i < 9; i++) {
      const want = r.grid[i], have = grid[i];
      if (want === null && have === null) continue;
      if (want === null || !have || have.id !== want) { ok = false; break; }
    }
    if (ok) return r.result;
  }
  return null;
}
check('crafting: log -> planks',
  matchRecipe([{ id: 'wood' }, null, null, null, null, null, null, null, null]).id === 'planks');
check('crafting: wrong grid rejected',
  matchRecipe([{ id: 'planks' }, null, null, null, null, null, null, null, null]) === null);
check('crafting: iron pickaxe',
  matchRecipe([{ id: 'iron_ingot' }, { id: 'iron_ingot' }, { id: 'iron_ingot' }, { id: 'sticks' }, { id: 'sticks' }, null, null, null, null]).id === 'iron_pickaxe');

// 7. renderer chunk geometry (headless)
const r = new Renderer({});
const w6 = new World();
w6.set(0, 0, 0, BLOCK_INDEX.get('stone'));
const c1 = buildChunk(w6, 0, 0);
check('renderer: single stone block has 6 faces', c1.op.positions.length === 6 * 4 * 3);
check('renderer: stone has no transparent faces', c1.tp.positions.length === 0);

w6.set(0, 1, 0, BLOCK_INDEX.get('water'));
const c2 = buildChunk(w6, 0, 0);
check('renderer: water renders faces', c2.tp.positions.length > 0);
check('renderer: water has 5 faces (bottom hidden)', c2.tp.positions.length === 5 * 4 * 3);

w6.set(0, 2, 0, BLOCK_INDEX.get('red_flower'));
const c3 = buildChunk(w6, 0, 0);
check('renderer: flower decoration renders', c3.tp.positions.length > 0);

// renderer update (headless)
r.update(0.016, 0.25, { eye: () => ({ x: 0, y: 0, z: 0 }) }, false);
check('renderer: update runs without error', true);

// 8. audio
const au = new Audio();
au.init();
au.playBreak('stone');
au.playPlace('dirt');
au.playStep('dirt');
au.update(0.016, { dayF: 1, inWater: false, eyeInWater: false, moving: true, onGround: true });
check('audio: runs without error', true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
