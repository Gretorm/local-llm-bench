// Game entry point: world, player, input, loop, save.
import * as THREE from 'three';
import { World, generateTerrain, WORLD_SIZE, WORLD_HEIGHT, SEA_LEVEL, CHUNK } from './world.js';
import { Player, raycastVoxel } from './physics.js';
import { BLOCKS, BLOCK_INDEX, ITEMS, SMELTS, getAtlasCanvas } from './blocks.js';
import { Renderer } from './renderer.js';
import { Audio } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { createHUD, createTitleScreen, createPauseMenu, createInventory, createCrafting, createFurnace } from './ui.js';

const canvas = document.getElementById('game');
let state = null;
let renderer = null;
let audio = null;
let hud = null;
let titleEl = null;
let pauseEl = null;
let invEl = null;
let craftEl = null;
let furnaceEl = null;
let furnaceState = null;
let furnaceData = null;
let paused = false;
let openPanel = null;
let last = performance.now();
let fps = 60;
let starveTimer = 0;
let regenTimer = 0;
let fallStart = 0;
let wasOnGround = true;
let autosaveTimer = 0;

const input = { forward: 0, back: 0, left: 0, right: 0, jump: 0, sneak: 0 };
const keyMap = {
  KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right',
  Space: 'jump', ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

function lookDir() {
  const cp = Math.cos(state.player.pitch);
  return {
    x: Math.sin(state.player.yaw) * cp,
    y: Math.sin(state.player.pitch),
    z: -Math.cos(state.player.yaw) * cp,
  };
}

function addItem(id, count) {
  for (let i = 0; i < 36; i++) {
    const s = state.inventory[i];
    if (s && s.id === id && s.count < 64) { s.count += count; return; }
  }
  for (let i = 0; i < 36; i++) {
    if (!state.inventory[i]) { state.inventory[i] = { id, count }; return; }
  }
  for (let i = 0; i < 9; i++) {
    const s = state.hotbar[i];
    if (s && s.id === id && s.count < 64) { s.count += count; return; }
  }
  for (let i = 0; i < 9; i++) {
    if (!state.hotbar[i]) { state.hotbar[i] = { id, count }; return; }
  }
}

function sampleColor(blockId) {
  const def = BLOCKS[blockId];
  const tile = def.side;
  const cv = getAtlasCanvas();
  const ctx = cv.getContext('2d');
  const d = ctx.getImageData((tile % 16) * 16 + 8, Math.floor(tile / 16) * 16 + 8, 1, 1).data;
  return new THREE.Color(d[0] / 255, d[1] / 255, d[2] / 255);
}

function rebuildAround(x, z) {
  const cx0 = Math.floor(x / CHUNK), cz0 = Math.floor(z / CHUNK);
  const max = Math.ceil(WORLD_SIZE / CHUNK);
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const cx = cx0 + dx, cz = cz0 + dz;
      if (cx >= 0 && cz >= 0 && cx < max && cz < max) renderer.rebuildChunk(state.world, cx, cz);
    }
  }
}

function spawnPlayer(world) {
  const x = Math.floor(WORLD_SIZE / 2), z = Math.floor(WORLD_SIZE / 2);
  const gy = world.groundY(x, z);
  return new Player(x + 0.5, gy + 0.1, z + 0.5, Math.PI * 0.75, 0);
}

function initialHotbar() {
  return [
    { id: 'grass', count: 64 }, { id: 'dirt', count: 64 }, { id: 'stone', count: 64 },
    { id: 'cobblestone', count: 64 }, { id: 'planks', count: 32 }, { id: 'wood', count: 32 },
    { id: 'glass', count: 16 }, { id: 'sand', count: 32 }, { id: 'torch', count: 16 },
  ];
}

function startGame(mode) {
  let data;
  if (mode === 'new') {
    const world = new World();
    generateTerrain(world, Math.floor(Math.random() * 1e9));
    data = {
      world,
      player: spawnPlayer(world),
      inventory: Array(36).fill(null),
      hotbar: initialHotbar(),
      selected: 0,
      time: 0.25,
      health: 10,
      food: 20,
    };
  } else {
    data = loadGame();
    if (!data) return startGame('new');
    data.player = new Player(
      data.player.pos.x, data.player.pos.y, data.player.pos.z,
      data.player.yaw, data.player.pitch,
    );
    data.player.fly = data.player.fly || false;
  }
  state = {
    world: data.world,
    player: data.player,
    inventory: data.inventory,
    hotbar: data.hotbar,
    selected: data.selected ?? 0,
    time: data.time ?? 0.25,
    health: data.health ?? 10,
    food: data.food ?? 20,
  };

  try {
    renderer = new Renderer(canvas);
    canvas.style.display = 'block';
  } catch (e) {
    const msg = document.createElement('div');
    msg.className = 'overlay';
    msg.innerHTML = '<div class="titlebox"><h2>WebGL not available</h2><p class="hint">Your browser could not create a WebGL context, so the game cannot render. Try a modern browser (Chrome, Edge, Firefox).</p></div>';
    document.body.appendChild(msg);
    return;
  }
  renderer.resize(window.innerWidth, window.innerHeight);
  renderer.buildAll(state.world);
  audio = new Audio();
  hud = createHUD();
  pauseEl = createPauseMenu({
    onResume: () => { paused = false; pauseEl.classList.add('hidden'); },
    onSave: () => { saveGame(saveData()); pauseEl.classList.add('hidden'); paused = false; },
    onQuit: () => {
      saveGame(saveData());
      state = null;
      paused = false;
      if (renderer) renderer.dispose();
      showTitle();
    },
  });
  invEl = createInventory({
    state,
    onSelected: (i) => { state.selected = i; },
    onClose: () => { invEl.close(); openPanel = null; },
  });
  craftEl = createCrafting({
    state,
    onCraft: () => { audio.playCraft(); },
    onClose: () => { craftEl.close(); openPanel = null; },
  });
  furnaceData = { fuel: null, input: null, output: null, progress: 0, hotbar: null };
  furnaceEl = createFurnace({
    furnace: furnaceData,
    onFurnaceChange: () => {},
    onClose: () => { furnaceEl.close(); openPanel = null; furnaceState = null; },
  });

  document.getElementById('underwater').classList.remove('hidden');
  document.getElementById('underwater').classList.add('hidden');
  hudElShow();
}

function saveData() {
  return {
    world: state.world,
    player: {
      pos: [state.player.pos.x, state.player.pos.y, state.player.pos.z],
      yaw: state.player.yaw, pitch: state.player.pitch, fly: state.player.fly,
    },
    inventory: state.inventory,
    hotbar: state.hotbar,
    selected: state.selected,
    time: state.time,
    health: state.health,
    food: state.food,
  };
}

function showTitle() {
  if (titleEl) titleEl.remove();
  titleEl = createTitleScreen({
    onNew: () => {
      titleEl.remove();
      audio.init();
      audio.resume();
      startGame('new');
    },
    onContinue: hasSave() ? () => {
      titleEl.remove();
      audio.init();
      audio.resume();
      startGame('continue');
    } : null,
  });
}

function hudElShow() {
  const hudEl = document.getElementById('hud');
  if (hudEl) hudEl.classList.remove('hidden');
}

function togglePanel(which) {
  if (openPanel === which) {
    if (which === 'inventory') invEl.close();
    else if (which === 'crafting') craftEl.close();
    else if (which === 'furnace') { furnaceEl.close(); furnaceState = null; }
    openPanel = null;
    return;
  }
  openPanel = which;
  if (which === 'inventory') invEl.open();
  else if (which === 'crafting') craftEl.open();
  else if (which === 'furnace') {
    furnaceData.fuel = null;
    furnaceData.input = null;
    furnaceData.output = null;
    furnaceData.progress = 0;
    furnaceData.hotbar = state.hotbar;
    furnaceState = furnaceData;
    furnaceEl.open();
  }
}

function togglePause() {
  if (openPanel) {
    togglePanel(openPanel);
    return;
  }
  paused = !paused;
  pauseEl.classList.toggle('hidden', !paused);
}

function breakBlock() {
  const d = lookDir();
  const hit = raycastVoxel(state.world, state.player.eye(), d, 5);
  if (!hit) return;
  const def = BLOCKS[hit.id];
  if (def.unbreakable) { audio.playDenied(); return; }
  if (def.requires) {
    const sel = state.hotbar[state.selected];
    if (!sel || !ITEMS[sel.id] || !ITEMS[sel.id].tool || ITEMS[sel.id].tool !== def.requires) {
      audio.playDenied();
      return;
    }
  }
  if (def.drop) addItem(def.drop, 1);
  state.world.set(hit.x, hit.y, hit.z, 0);
  rebuildAround(hit.x, hit.z);
  renderer.spawnParticles(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, sampleColor(hit.id));
  audio.playBreak(def.id);
}

function placeBlock() {
  const sel = state.hotbar[state.selected];
  if (!sel) return;
  const item = ITEMS[sel.id];
  if (!item || !item.block) { audio.playDenied(); return; }
  const d = lookDir();
  const hit = raycastVoxel(state.world, state.player.eye(), d, 5);
  if (!hit) return;
  const px = hit.px, py = hit.py, pz = hit.pz;
  if (!state.world.inBounds(px, py, pz)) return;
  const a = state.player.aabb();
  if (px + 1 > a.minX && px < a.maxX && py + 1 > a.minY && py < a.maxY && pz + 1 > a.minZ && pz < a.maxZ) {
    audio.playDenied();
    return;
  }
  const cur = state.world.get(px, py, pz);
  const curDef = BLOCKS[cur];
  if (curDef.solid && !curDef.deco) { audio.playDenied(); return; }
  const below = state.world.get(px, py - 1, pz);
  const placing = BLOCKS[BLOCK_INDEX.get(item.block)];
  if (placing.deco && !BLOCKS[below].solid && !BLOCKS[below].deco) {
    audio.playDenied();
    return;
  }
  state.world.set(px, py, pz, BLOCK_INDEX.get(item.block));
  sel.count--;
  if (sel.count <= 0) state.hotbar[state.selected] = null;
  rebuildAround(px, pz);
  audio.playPlace(item.block);
}

function interact() {
  const d = lookDir();
  const hit = raycastVoxel(state.world, state.player.eye(), d, 5);
  if (!hit) return;
  const def = BLOCKS[hit.id];
  if (def.id === 'furnace') {
    togglePanel('furnace');
    audio.playClick();
    return;
  }
  if (def.eatable) {
    state.world.set(hit.x, hit.y, hit.z, 0);
    rebuildAround(hit.x, hit.z);
    state.food = Math.min(20, state.food + def.eatable);
    audio.playEat();
  }
}

function updateFurnace(dt) {
  if (!furnaceState) return;
  const f = furnaceState;
  const smelt = f.input ? SMELTS.find(s => s.input === f.input.id) : null;
  if (f.fuel && smelt && (!f.output || f.output.id === smelt.output)) {
    f.progress += dt / 10;
    if (f.progress >= 1) {
      f.progress = 0;
      f.input.count--;
      if (f.input.count <= 0) f.input = null;
      f.fuel.count--;
      if (f.fuel.count <= 0) f.fuel = null;
      if (!f.output) f.output = { id: smelt.output, count: 1 };
      else f.output.count++;
    }
  } else {
    f.progress = 0;
  }
}

function respawn() {
  const p = state.player;
  p.pos.x = Math.floor(WORLD_SIZE / 2) + 0.5;
  p.pos.z = Math.floor(WORLD_SIZE / 2) + 0.5;
  const gy = state.world.groundY(p.pos.x | 0, p.pos.z | 0);
  p.pos.y = gy + 0.1;
  p.vel.x = 0; p.vel.y = 0; p.vel.z = 0;
  state.health = 10;
  state.food = 20;
}

function update(dt) {
  const p = state.player;
  // time: 1 day = 600s
  state.time += dt / 600;
  if (state.time >= 1) state.time -= 1;

  p.update(dt, input, state.world);

  // fall damage
  if (wasOnGround && !p.onGround) {
    fallStart = p.pos.y;
  } else if (!wasOnGround && p.onGround) {
    const fall = fallStart - p.pos.y;
    if (fall > 3) {
      const dmg = Math.max(1, Math.floor((fall - 3) / 2));
      state.health = Math.max(0, state.health - dmg);
      audio.playLand('stone');
    }
  }
  wasOnGround = p.onGround;

  // vitals
  state.food -= dt / 60;
  if (state.food < 0) state.food = 0;
  if (state.food === 0) {
    starveTimer += dt;
    if (starveTimer >= 15) { starveTimer = 0; state.health--; }
  } else {
    starveTimer = 0;
    if (state.food >= 10 && state.health < 10) {
      regenTimer += dt;
      if (regenTimer >= 5) { regenTimer = 0; state.health++; }
    } else regenTimer = 0;
  }
  if (state.health <= 0) respawn();

  updateFurnace(dt);

  // autosave
  autosaveTimer += dt;
  if (autosaveTimer > 30) {
    autosaveTimer = 0;
    saveGame(saveData());
  }

  // audio
  const dayF = Math.sin(state.time * Math.PI * 2);
  audio.update(dt, {
    dayF: Math.max(0, dayF),
    inWater: p.inWater,
    eyeInWater: p.eyeInWater,
    moving: Math.hypot(p.vel.x, p.vel.z) > 0.5,
    onGround: p.onGround,
  });

  // footsteps
  if (p.onGround && Math.hypot(p.vel.x, p.vel.z) > 1 && !p.fly) {
    stepTimer += dt;
    if (stepTimer > 0.45) {
      stepTimer = 0;
      const fy = Math.floor(p.pos.y) - 1;
      const b = state.world.get(Math.floor(p.pos.x), fy, Math.floor(p.pos.z));
      audio.playStep(BLOCKS[b].id);
    }
  } else stepTimer = 0;

  // HUD
  const hour = Math.floor((state.time % 1) * 24);
  const min = Math.floor((state.time % 1) * 24 * 60) % 60;
  const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  hud.update({
    health: state.health,
    food: state.food,
    hotbarItems: state.hotbar,
    selected: state.selected,
    pos: p.pos,
    fps,
    day: `Day ${Math.floor(state.time) + 1}`,
    timeStr,
    fly: p.fly,
  });

  // underwater overlay
  const uw = document.getElementById('underwater');
  if (uw) uw.classList.toggle('hidden', !p.eyeInWater);

  // renderer
  const eye = p.eye();
  renderer.setCamera(eye, new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.pitch, -p.yaw, 0, 'YXZ')));
  renderer.update(dt, state.time, p, p.eyeInWater);
}

let stepTimer = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  if (!state || !renderer) return;
  if (!paused) {
    fps = fps * 0.9 + (1 / dt) * 0.1;
    update(dt);
  }
  renderer.render();
}

// ---- input ----
window.addEventListener('keydown', (e) => {
  if (!state) return;
  const k = keyMap[e.code];
  if (k) input[k] = 1;
  if (window.__debugKeydown) window.__debugKeydown(e.code, { ...input });
  if (e.code === 'Escape') {
    if (!paused) {
      if (openPanel) togglePanel(openPanel);
      else togglePause();
    } else {
      togglePause();
    }
  }
  if (e.code === 'KeyE') togglePanel('inventory');
  if (e.code === 'KeyC') togglePanel('crafting');
  if (e.code === 'KeyF') {
    state.player.fly = !state.player.fly;
    if (state.player.fly) state.player.vel.y = 0;
  }
  if (e.code.startsWith('Digit')) {
    const d = parseInt(e.code.slice(5), 10);
    if (d >= 1 && d <= 9) state.selected = d - 1;
  }
});
window.addEventListener('keyup', (e) => {
  const k = keyMap[e.code];
  if (k) input[k] = 0;
});

canvas.addEventListener('click', () => {
  if (state && !paused && !openPanel) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  if (state) {
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.classList.toggle('hidden', !locked);
    const uw = document.getElementById('underwater');
    if (uw && !locked) uw.classList.add('hidden');
  }
});
document.addEventListener('mousemove', (e) => {
  if (!state || document.pointerLockElement !== canvas) return;
  state.player.yaw += e.movementX * 0.0022;
  state.player.pitch = clamp(state.player.pitch - e.movementY * 0.0022, -1.55, 1.55);
});
document.addEventListener('mousedown', (e) => {
  if (!state || document.pointerLockElement !== canvas || paused || openPanel) return;
  if (e.button === 0) breakBlock();
  else if (e.button === 2) interact();
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('resize', () => {
  if (renderer) renderer.resize(window.innerWidth, window.innerHeight);
});
window.addEventListener('beforeunload', () => {
  if (state) saveGame(saveData());
});

// ---- boot ----
audio = new Audio();
showTitle();
requestAnimationFrame(loop);

// debug hook (harmless)
window.__pos = () => state && state.player ? {
  x: state.player.pos.x, y: state.player.pos.y, z: state.player.pos.z,
  vx: state.player.vel.x, vy: state.player.vel.y, vz: state.player.vel.z,
} : null;
