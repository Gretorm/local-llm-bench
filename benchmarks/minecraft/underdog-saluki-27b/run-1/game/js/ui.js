// DOM UI: HUD, title screen, pause menu, inventory, crafting, furnace.
import { ITEMS, drawIcon } from './blocks.js';
import { RECIPES } from './blocks.js';

function renderSlot(el, item) {
  el.innerHTML = '';
  el.classList.remove('has-item');
  if (item) {
    el.classList.add('has-item');
    const icon = drawIcon(item.tile);
    icon.className = 'icon';
    el.appendChild(icon);
    if (item.count > 1) {
      const cnt = document.createElement('span');
      cnt.className = 'count';
      cnt.textContent = item.count;
      el.appendChild(cnt);
    }
  }
}

// ---------- HUD ----------
export function createHUD() {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="crosshair"></div>
    <div id="info"></div>
    <div id="vitals">
      <div id="hearts"></div>
      <div id="hunger"></div>
    </div>
    <div id="hotbar"></div>
  `;
  document.body.appendChild(hud);

  const hearts = hud.querySelector('#hearts');
  const hunger = hud.querySelector('#hunger');
  const hotbar = hud.querySelector('#hotbar');
  const info = hud.querySelector('#info');

  const heartEls = [];
  for (let i = 0; i < 10; i++) {
    const h = document.createElement('div');
    h.className = 'heart';
    hearts.appendChild(h);
    heartEls.push(h);
  }
  const hungerEls = [];
  for (let i = 0; i < 10; i++) {
    const b = document.createElement('div');
    b.className = 'bar';
    hunger.appendChild(b);
    hungerEls.push(b);
  }

  const hotbarEls = [];
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.index = i;
    hotbar.appendChild(s);
    hotbarEls.push(s);
  }

  function update({ health, food, hotbarItems, selected, pos, fps, day, timeStr, fly }) {
    heartEls.forEach((el, i) => el.classList.toggle('empty', i >= Math.max(0, Math.ceil(health))));
    hungerEls.forEach((el, i) => el.classList.toggle('empty', i >= Math.max(0, Math.ceil(food / 2))));
    hotbarEls.forEach((el, i) => {
      renderSlot(el, hotbarItems[i]);
      el.classList.toggle('selected', i === selected);
    });
    info.textContent =
      `X ${pos.x.toFixed(1)}  Y ${pos.y.toFixed(1)}  Z ${pos.z.toFixed(1)}\n` +
      `FPS ${Math.round(fps)}   ${timeStr}   ${day}` + (fly ? '\nFLYING (F to toggle)' : '');
    info.style.whiteSpace = 'pre';
  }

  return { update };
}

// ---------- Title screen ----------
export function createTitleScreen({ onNew, onContinue }) {
  const el = document.createElement('div');
  el.id = 'titleScreen';
  el.className = 'overlay';
  el.innerHTML = `
    <div class="titlebox">
      <h1>BLOCKCRAFT</h1>
      <p class="sub">A Minecraft-style voxel sandbox, built from scratch — no original assets.</p>
      <div class="btns">
        <button class="btn" id="tNew">New World</button>
        ${onContinue ? '<button class="btn" id="tContinue">Continue</button>' : ''}
      </div>
      <div class="controls">
        <h3>Controls</h3>
        <ul>
          <li>W A S D — move &nbsp;&nbsp; Space — jump &nbsp;&nbsp; Shift — sneak</li>
          <li>Mouse — look &nbsp;&nbsp; Left click — break block &nbsp;&nbsp; Right click — place / interact</li>
          <li>1–9 — select block &nbsp;&nbsp; E — inventory &nbsp;&nbsp; C — crafting</li>
          <li>F — toggle fly mode &nbsp;&nbsp; Esc — pause / menu</li>
        </ul>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector('#tNew').addEventListener('click', onNew);
  if (onContinue) el.querySelector('#tContinue').addEventListener('click', onContinue);
  return el;
}

// ---------- Pause menu ----------
export function createPauseMenu({ onResume, onSave, onQuit }) {
  const el = document.createElement('div');
  el.id = 'pauseMenu';
  el.className = 'overlay hidden';
  el.innerHTML = `
    <div class="titlebox">
      <h2>Game Paused</h2>
      <div class="btns">
        <button class="btn" id="pResume">Resume</button>
        <button class="btn" id="pSave">Save World</button>
        <button class="btn" id="pQuit">Quit to Title</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.querySelector('#pResume').addEventListener('click', onResume);
  el.querySelector('#pSave').addEventListener('click', onSave);
  el.querySelector('#pQuit').addEventListener('click', onQuit);
  return el;
}

// ---------- Inventory ----------
export function createInventory({ state, onSelected, onClose }) {
  const el = document.createElement('div');
  el.id = 'inventory';
  el.className = 'overlay hidden';
  el.innerHTML = `
    <div class="titlebox">
      <h2>Inventory</h2>
      <div id="invHotbar" class="slotrow"></div>
      <div id="invGrid" class="slotgrid"></div>
      <p class="hint">Click an item to swap it with the selected hotbar slot (highlighted).</p>
      <button class="btn" id="invClose">Close</button>
    </div>
  `;
  document.body.appendChild(el);
  const hotbarRow = el.querySelector('#invHotbar');
  const grid = el.querySelector('#invGrid');
  const hotbarEls = [];
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    hotbarRow.appendChild(s);
    hotbarEls.push(s);
  }
  const gridEls = [];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    grid.appendChild(s);
    gridEls.push(s);
  }
  const refresh = () => {
    hotbarEls.forEach((s, i) => {
      renderSlot(s, state.hotbar[i]);
      s.classList.toggle('selected', i === state.selected);
    });
    gridEls.forEach((s, i) => renderSlot(s, state.inventory[i]));
  };
  refresh();

  hotbarEls.forEach((s, i) => {
    s.addEventListener('click', () => { state.selected = i; onSelected(i); refresh(); });
  });
  gridEls.forEach((s, i) => {
    s.addEventListener('click', () => {
      const a = state.inventory[i];
      const b = state.hotbar[state.selected];
      if (a === b) return;
      state.inventory[i] = b;
      state.hotbar[state.selected] = a;
      onSelected(state.selected);
      refresh();
    });
  });
  el.querySelector('#invClose').addEventListener('click', onClose);
  el.addEventListener('click', (e) => { if (e.target === el) onClose(); });

  return { open: () => { el.classList.remove('hidden'); refresh(); }, close: () => el.classList.add('hidden') };
}

// ---------- Crafting ----------
export function createCrafting({ state, onCraft, onClose }) {
  const el = document.createElement('div');
  el.id = 'crafting';
  el.className = 'overlay hidden';
  el.innerHTML = `
    <div class="titlebox">
      <h2>Crafting</h2>
      <div class="craftrow">
        <div id="craftGrid" class="slotgrid g3"></div>
        <div class="arrow">→</div>
        <div id="craftOut" class="slot big"></div>
      </div>
      <button class="btn" id="craftBtn">Craft</button>
      <div id="recipes" class="hint"></div>
      <button class="btn" id="craftClose">Close</button>
    </div>
  `;
  document.body.appendChild(el);
  const grid = el.querySelector('#craftGrid');
  const out = el.querySelector('#craftOut');
  const gridEls = [];
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    grid.appendChild(s);
    gridEls.push(s);
  }
  const craftGrid = Array(9).fill(null);
  const refresh = () => {
    gridEls.forEach((s, i) => renderSlot(s, craftGrid[i]));
    renderSlot(out, state.lastResult || null);
  };
  refresh();

  // click inventory item -> place in first empty cell (or take back if same id present)
  const invEls = [];
  // inventory panel is separate; craft UI reuses a mini inventory row
  const miniInv = document.createElement('div');
  miniInv.className = 'slotrow';
  miniInv.id = 'craftInv';
  el.querySelector('#recipes').before(miniInv);
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    miniInv.appendChild(s);
    invEls.push(s);
  }
  const refreshInv = () => invEls.forEach((s, i) => renderSlot(s, state.hotbar[i]));
  refreshInv();

  invEls.forEach((s, i) => {
    s.addEventListener('click', () => {
      const item = state.hotbar[i];
      if (!item) return;
      // take back if grid has same id
      const j = craftGrid.findIndex(c => c && c.id === item.id);
      if (j !== -1) {
        craftGrid[j] = null;
        state.hotbar[i] = { id: item.id, count: item.count + 1 };
      } else {
        const k = craftGrid.findIndex(c => c === null);
        if (k === -1) return;
        craftGrid[k] = { id: item.id, count: 1, from: i };
        state.hotbar[i].count--;
        if (state.hotbar[i].count <= 0) state.hotbar[i] = null;
      }
      refresh();
      refreshInv();
    });
  });

  el.querySelector('#craftBtn').addEventListener('click', () => {
    // find matching recipe
    for (const r of RECIPES) {
      let ok = true;
      for (let i = 0; i < 9; i++) {
        const want = r.grid[i];
        const have = craftGrid[i];
        if (want === null && have === null) continue;
        if (want === null || !have || have.id !== want) { ok = false; break; }
      }
      if (!ok) continue;
      // consume one item from each source hotbar slot
      for (let i = 0; i < 9; i++) {
        const cell = craftGrid[i];
        if (!cell) continue;
        const s = state.hotbar[cell.from];
        if (s && s.id === cell.id) {
          s.count--;
          if (s.count <= 0) state.hotbar[cell.from] = null;
        }
      }
      // give result
      const res = { id: r.result.id, count: r.result.count };
      // find hotbar slot with same id
      let placed = false;
      for (let i = 0; i < 9; i++) {
        if (state.hotbar[i] && state.hotbar[i].id === res.id && state.hotbar[i].count < 64) {
          state.hotbar[i].count += res.count;
          placed = true;
          break;
        }
      }
      if (!placed) {
        for (let i = 0; i < 9; i++) {
          if (!state.hotbar[i]) { state.hotbar[i] = res; placed = true; break; }
        }
      }
      if (!placed) {
        for (let i = 0; i < 36; i++) {
          if (!state.inventory[i]) { state.inventory[i] = res; placed = true; break; }
        }
      }
      if (!placed) return;
      craftGrid.fill(null);
      state.lastResult = res;
      onCraft();
      refresh();
      refreshInv();
      return;
    }
  });

  el.querySelector('#craftClose').addEventListener('click', onClose);
  el.addEventListener('click', (e) => { if (e.target === el) onClose(); });

  const hints = [
    '1 log → 4 planks', '2 planks → 3 sticks', '1 plank + 1 stick → axe',
    '2 planks + 3 sticks → pickaxe', '3 iron + 2 sticks → iron pickaxe',
    '1 iron + 1 stick → iron axe', '1 plank + 1 stick + 1 coal → torch',
    '1 sand → 1 glass', '4 stone → 4 stone bricks', '3 stone → 1 furnace',
  ];
  el.querySelector('#recipes').textContent = hints.join('  ·  ');

  return { open: () => { el.classList.remove('hidden'); refresh(); refreshInv(); }, close: () => el.classList.add('hidden') };
}

// ---------- Furnace ----------
// furnace = { fuel, input, output, progress, hotbar } where hotbar is the live player hotbar array
export function createFurnace({ furnace, onFurnaceChange, onClose }) {
  const el = document.createElement('div');
  el.id = 'furnace';
  el.className = 'overlay hidden';
  el.innerHTML = `
    <div class="titlebox">
      <h2>Furnace</h2>
      <div class="furnacecols">
        <div class="furnacecol"><div class="slot big" id="fFuel"></div><p class="hint">Fuel (coal)</p></div>
        <div class="furnacecol"><div class="slot big" id="fIn"></div><p class="hint">Input</p></div>
        <div class="furnacecol"><div class="slot big" id="fOut"></div><p class="hint">Output</p></div>
      </div>
      <div id="fProg" class="prog"></div>
      <div id="fMiniInv" class="slotrow"></div>
      <button class="btn" id="fClose">Close</button>
    </div>
  `;
  document.body.appendChild(el);
  const fuelEl = el.querySelector('#fFuel');
  const inEl = el.querySelector('#fIn');
  const outEl = el.querySelector('#fOut');
  const progEl = el.querySelector('#fProg');

  const refresh = () => {
    renderSlot(fuelEl, furnace.fuel);
    renderSlot(inEl, furnace.input);
    renderSlot(outEl, furnace.output);
    progEl.style.width = `${Math.min(100, furnace.progress * 100)}%`;
  };
  refresh();

  const miniInv = el.querySelector('#fMiniInv');
  const invEls = [];
  for (let i = 0; i < 9; i++) {
    const s = document.createElement('div');
    s.className = 'slot';
    miniInv.appendChild(s);
    invEls.push(s);
  }
  const refreshInv = () => {
    if (!furnace.hotbar) return;
    invEls.forEach((s, i) => renderSlot(s, furnace.hotbar[i]));
  };
  refreshInv();

  const moveOne = (fromSlot, toTarget) => {
    const item = fromSlot;
    if (!item) return;
    item.count--;
    if (item.count <= 0) fromSlot = null;
    if (toTarget && toTarget.id === item.id) {
      toTarget.count++;
    } else if (toTarget) {
      const back = { id: toTarget.id, count: toTarget.count };
      if (fromSlot) fromSlot.count += back.count;
      else fromSlot = back;
      toTarget = { id: item.id, count: 1 };
    } else {
      toTarget = { id: item.id, count: 1 };
    }
  };

  invEls.forEach((s, i) => {
    s.addEventListener('click', () => {
      const fromSlot = furnace.hotbar[i];
      if (!fromSlot) return;
      moveOne(fromSlot, furnace.fuel);
      onFurnaceChange();
      refresh();
      refreshInv();
    });
  });
  // clicking the fuel slot moves its item back to hotbar slot 0..? -> keep simple: to first empty hotbar slot
  const takeToHotbar = (slot) => {
    if (!slot) return;
    const o = slot;
    slot = null;
    for (let i = 0; i < 9; i++) {
      if (!furnace.hotbar[i]) { furnace.hotbar[i] = o; return; }
      if (furnace.hotbar[i].id === o.id && furnace.hotbar[i].count < 64) { furnace.hotbar[i].count += o.count; return; }
    }
  };
  fuelEl.addEventListener('click', () => { takeToHotbar(furnace.fuel); onFurnaceChange(); refresh(); refreshInv(); });
  inEl.addEventListener('click', () => { takeToHotbar(furnace.input); onFurnaceChange(); refresh(); refreshInv(); });
  outEl.addEventListener('click', () => { takeToHotbar(furnace.output); onFurnaceChange(); refresh(); refreshInv(); });

  el.querySelector('#fClose').addEventListener('click', onClose);
  el.addEventListener('click', (e) => { if (e.target === el) onClose(); });

  return { open: () => { el.classList.remove('hidden'); refresh(); refreshInv(); }, close: () => el.classList.add('hidden') };
}
