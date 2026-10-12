// HUD and screens: hotbar, hearts, hunger, inventory, crafting, furnace,
// menu, death, help.

const ICON_CACHE = {};

function iconCanvas(atlas, id) {
  if (ICON_CACHE[id]) return ICON_CACHE[id];
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  let tile;
  if (BLOCKS[id] && BLOCKS[id].placeable !== false && !ITEMS[id]) {
    tile = faceTile(id, 0);
  } else {
    tile = iconTile(id);
  }
  const tx = (tile % 16) * 16, ty = Math.floor(tile / 16) * 16;
  g.imageSmoothingEnabled = false;
  g.drawImage(atlas, tx, ty, 16, 16, 0, 0, 32, 32);
  ICON_CACHE[id] = c;
  return c;
}

function makeSlot(onClick, size = 32) {
  const div = document.createElement('div');
  div.className = 'slot';
  div.style.width = size + 'px';
  div.style.height = size + 'px';
  const img = document.createElement('canvas');
  img.width = size; img.height = size;
  img.style.imageRendering = 'pixelated';
  const g = img.getContext('2d');
  g.imageSmoothingEnabled = false;
  const countEl = document.createElement('div');
  countEl.className = 'slot-count';
  div.appendChild(img);
  div.appendChild(countEl);
  div.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return { div, img, g, countEl };
}

function setSlot(slot, item, atlas) {
  slot.g.clearRect(0, 0, slot.img.width, slot.img.height);
  if (item) {
    slot.g.drawImage(iconCanvas(atlas, item.id), 0, 0);
    slot.countEl.textContent = item.count > 1 ? item.count : '';
  } else {
    slot.countEl.textContent = '';
  }
}

class UI {
  constructor(atlas, inventory, callbacks) {
    this.atlas = atlas;
    this.inv = inventory;
    this.cb = callbacks;
    this.craftGridItems = new Array(9).fill(null);
    this.furnItems = { input: null, fuel: null, output: null };
    this.furnOutputItem = null;
    this.craftOutItem = null;
    this.furnProgress = 0;
    this.buildHUD();
    this.buildScreens();
    this.bindKeys();
  }

  buildHUD() {
    const hotbar = document.createElement('div');
    hotbar.id = 'hotbar';
    this.hotbarSlots = [];
    for (let i = 0; i < 9; i++) {
      const s = makeSlot(() => {}, 28);
      s.index = i;
      hotbar.appendChild(s.div);
      this.hotbarSlots.push(s);
    }
    document.body.appendChild(hotbar);

    const hearts = document.createElement('div');
    hearts.id = 'hearts';
    this.heartEls = [];
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      c.style.width = '16px'; c.style.height = '16px';
      hearts.appendChild(c);
      this.heartEls.push(c);
    }
    document.body.appendChild(hearts);

    const hunger = document.createElement('div');
    hunger.id = 'hunger';
    this.hungerEls = [];
    for (let i = 0; i < 10; i++) {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      c.style.width = '16px'; c.style.height = '16px';
      hunger.appendChild(c);
      this.hungerEls.push(c);
    }
    document.body.appendChild(hunger);

    const selName = document.createElement('div');
    selName.id = 'selected-name';
    document.body.appendChild(selName);

    const clock = document.createElement('div');
    clock.id = 'clock';
    document.body.appendChild(clock);

    const debug = document.createElement('div');
    debug.id = 'debug';
    debug.style.display = 'none';
    document.body.appendChild(debug);
  }

  drawHeart(g, full, half) {
    g.clearRect(0, 0, 16, 16);
    if (!full && !half) return;
    g.fillStyle = full ? '#ff2222' : '#550000';
    // heart shape
    const draw = (ox) => {
      g.beginPath();
      g.moveTo(ox + 8, 14);
      g.lineTo(ox + 2, 8);
      g.quadraticCurveTo(ox + 2, 2, ox + 5, 2);
      g.quadraticCurveTo(ox + 8, 4, ox + 8, 6);
      g.quadraticCurveTo(ox + 11, 4, ox + 11, 2);
      g.quadraticCurveTo(ox + 14, 2, ox + 14, 8);
      g.lineTo(ox + 8, 14);
      g.fill();
    };
    draw(0);
    if (half) {
      g.fillStyle = '#ff2222';
      g.beginPath();
      g.moveTo(8, 14);
      g.lineTo(2, 8);
      g.quadraticCurveTo(2, 2, 5, 2);
      g.quadraticCurveTo(8, 4, 8, 6);
      g.lineTo(8, 14);
      g.fill();
    }
  }

  drawDrumstick(g, full) {
    g.clearRect(0, 0, 16, 16);
    if (!full) return;
    g.fillStyle = '#ff9933';
    g.fillRect(4, 3, 8, 8);
    g.fillStyle = '#ffcc66';
    g.fillRect(6, 5, 4, 4);
    g.fillStyle = '#ff9933';
    g.beginPath();
    g.arc(12, 12, 3, 0, Math.PI * 2);
    g.fill();
  }

  updateHUD(player) {
    // hotbar
    for (let i = 0; i < 9; i++) {
      setSlot(this.hotbarSlots[i], this.inv.hotbar[i], this.atlas);
      this.hotbarSlots[i].div.classList.toggle('selected', i === this.inv.selected);
    }
    const sel = this.inv.getSelected();
    const name = sel ? (ITEMS[sel.id] ? ITEMS[sel.id].name : BLOCKS[sel.id].name) : '';
    document.getElementById('selected-name').textContent = name;

    // hearts
    for (let i = 0; i < 10; i++) {
      const full = player.health >= (i + 1) * 2;
      const half = !full && player.health >= i * 2 + 1;
      this.drawHeart(this.heartEls[i].getContext('2d'), full, half);
    }
    // hunger
    for (let i = 0; i < 10; i++) {
      this.drawDrumstick(this.hungerEls[i].getContext('2d'), player.hunger > i * 10);
    }
  }

  setClock(time) {
    const t = (time % 600) / 600;
    const hour = Math.floor(t * 24);
    const min = Math.floor((t * 24 % 1) * 60);
    const isDay = t < 0.5;
    document.getElementById('clock').textContent =
      `${isDay ? '☀' : '☾'} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  setDebug(obj) {
    const el = document.getElementById('debug');
    if (obj) {
      el.style.display = 'block';
      el.textContent = obj;
    } else {
      el.style.display = 'none';
    }
  }

  // ---- screens (populate the static HTML elements) --------------------------
  buildScreens() {
    // inventory
    this.invHotbar = [];
    for (let i = 0; i < 9; i++) {
      const s = makeSlot(() => this.pickFrom('hotbar', i), 32);
      s.source = 'hotbar'; s.index = i;
      document.getElementById('inv-hotbar').appendChild(s.div);
      this.invHotbar.push(s);
    }
    this.invMain = [];
    for (let i = 0; i < 27; i++) {
      const s = makeSlot(() => this.pickFrom('main', i), 32);
      s.source = 'main'; s.index = i;
      document.getElementById('inv-main').appendChild(s.div);
      this.invMain.push(s);
    }

    // crafting
    this.craftGrid = [];
    for (let i = 0; i < 9; i++) {
      const s = makeSlot(() => this.pickFrom('craft', i), 32);
      s.source = 'craft'; s.index = i;
      document.getElementById('craft-grid').appendChild(s.div);
      this.craftGrid.push(s);
    }
    this.craftOut = makeSlot(() => this.takeCraftOut(), 32);
    document.getElementById('craft-out-slot').replaceWith(this.craftOut.div);
    this.craftHotbar = [];
    for (let i = 0; i < 9; i++) {
      const s = makeSlot(() => this.pickFrom('hotbar', i, 'crafting'), 32);
      s.source = 'hotbar'; s.index = i; s.mode = 'crafting';
      document.getElementById('craft-hotbar').appendChild(s.div);
      this.craftHotbar.push(s);
    }
    this.craftMain = [];
    for (let i = 0; i < 27; i++) {
      const s = makeSlot(() => this.pickFrom('main', i, 'crafting'), 32);
      s.source = 'main'; s.index = i; s.mode = 'crafting';
      document.getElementById('craft-main').appendChild(s.div);
      this.craftMain.push(s);
    }

    // furnace
    this.furnInput = makeSlot(() => this.pickFrom('furn', 'input'), 32);
    document.getElementById('furn-input').replaceWith(this.furnInput.div);
    this.furnFuel = makeSlot(() => this.pickFrom('furn', 'fuel'), 32);
    document.getElementById('furn-fuel').replaceWith(this.furnFuel.div);
    this.furnOutput = makeSlot(() => this.takeFurnOut(), 32);
    document.getElementById('furn-output').replaceWith(this.furnOutput.div);
    this.furnHotbar = [];
    for (let i = 0; i < 9; i++) {
      const s = makeSlot(() => this.pickFrom('hotbar', i, 'furnace'), 32);
      s.source = 'hotbar'; s.index = i; s.mode = 'furnace';
      document.getElementById('furn-hotbar').appendChild(s.div);
      this.furnHotbar.push(s);
    }
    this.furnMain = [];
    for (let i = 0; i < 27; i++) {
      const s = makeSlot(() => this.pickFrom('main', i, 'furnace'), 32);
      s.source = 'main'; s.index = i; s.mode = 'furnace';
      document.getElementById('furn-main').appendChild(s.div);
      this.furnMain.push(s);
    }
  }

  // shared slot click logic
  pickFrom(source, index, mode) {
    // get current item at source/index
    let slotItem;
    if (source === 'hotbar') slotItem = this.inv.hotbar[index];
    else if (source === 'main') slotItem = this.inv.main[index];
    else if (source === 'craft') slotItem = this.craftGridItems[index];
    else if (source === 'furn') {
      const map = { input: this.furnItems.input, fuel: this.furnItems.fuel, output: this.furnItems.output };
      slotItem = map[index];
    }

    if (this.inv.cursor) {
      // place cursor item
      if (source === 'hotbar') this.placeInto('hotbar', index, this.inv.cursor);
      else if (source === 'main') this.placeInto('main', index, this.inv.cursor);
      else if (source === 'craft') this.placeInto('craft', index, this.inv.cursor);
      else this.placeInto('furn', index, this.inv.cursor);
      this.inv.cursor = null;
    } else if (slotItem) {
      // pick up
      if (source === 'hotbar') this.inv.hotbar[index] = null;
      else if (source === 'main') this.inv.main[index] = null;
      else if (source === 'craft') this.craftGridItems[index] = null;
      else {
        const map = { input: this.furnItems.input, fuel: this.furnItems.fuel, output: this.furnItems.output };
        map[index] = null;
      }
      this.inv.cursor = slotItem;
    }
    this.renderAll();
    if (source === 'craft') this.updateCraft();
  }

  placeInto(source, index, item) {
    if (source === 'hotbar') {
      const s = this.inv.hotbar[index];
      if (!s) { this.inv.hotbar[index] = item; return; }
      if (s.id === item.id && this.inv.stackSize(item.id) > 1) {
        const add = Math.min(item.count, this.inv.stackSize(item.id) - s.count);
        s.count += add;
        item.count -= add;
        if (item.count > 0) this.inv.cursor = item;
      } else {
        this.inv.hotbar[index] = item;
      }
    } else if (source === 'main') {
      const s = this.inv.main[index];
      if (!s) { this.inv.main[index] = item; return; }
      if (s.id === item.id && this.inv.stackSize(item.id) > 1) {
        const add = Math.min(item.count, this.inv.stackSize(item.id) - s.count);
        s.count += add;
        item.count -= add;
        if (item.count > 0) this.inv.cursor = item;
      } else {
        this.inv.main[index] = item;
      }
    } else if (source === 'craft') {
      const s = this.craftGridItems[index];
      if (!s) { this.craftGridItems[index] = item; return; }
      if (s.id === item.id && this.inv.stackSize(item.id) > 1) {
        const add = Math.min(item.count, this.inv.stackSize(item.id) - s.count);
        s.count += add;
        item.count -= add;
        if (item.count > 0) this.inv.cursor = item;
      } else {
        this.craftGridItems[index] = item;
      }
    } else {
      const map = { input: this.furnItems.input, fuel: this.furnItems.fuel, output: this.furnItems.output };
      const s = map[index];
      if (!s) { map[index] = item; return; }
      if (s.id === item.id && this.inv.stackSize(item.id) > 1) {
        const add = Math.min(item.count, this.inv.stackSize(item.id) - s.count);
        s.count += add;
        item.count -= add;
        if (item.count > 0) this.inv.cursor = item;
      } else {
        map[index] = item;
      }
    }
  }

  takeCraftOut() {
    const out = this.craftOutItem;
    if (!out) return;
    // consume grid
    for (let i = 0; i < 9; i++) {
      const s = this.craftGridItems[i];
      if (s) {
        this.inv.addItem(s.id, s.count);
        this.craftGridItems[i] = null;
      }
    }
    this.inv.addItem(out.id, out.count);
    this.craftOutItem = null;
    this.cb.onCraft();
    this.renderAll();
    this.updateCraft();
  }

  takeFurnOut() {
    const out = this.furnOutputItem;
    if (!out) return;
    this.inv.addItem(out.id, out.count);
    this.furnItems.output = null;
    this.furnOutputItem = null;
    this.renderAll();
  }

  updateCraft() {
    const res = matchRecipe(this.craftGridItems);
    if (res) {
      if (!this.craftOutItem || this.craftOutItem.id !== res[0] || this.craftOutItem.count !== res[1])
        this.craftOutItem = { id: res[0], count: res[1] };
    } else {
      this.craftOutItem = null;
    }
    setSlot(this.craftOut, this.craftOutItem, this.atlas);
  }

  renderAll() {
    // inventory screen
    for (let i = 0; i < 9; i++) setSlot(this.invHotbar[i], this.inv.hotbar[i], this.atlas);
    for (let i = 0; i < 27; i++) setSlot(this.invMain[i], this.inv.main[i], this.atlas);
    // crafting
    for (let i = 0; i < 9; i++) setSlot(this.craftGrid[i], this.craftGridItems[i], this.atlas);
    for (let i = 0; i < 9; i++) setSlot(this.craftHotbar[i], this.inv.hotbar[i], this.atlas);
    for (let i = 0; i < 27; i++) setSlot(this.craftMain[i], this.inv.main[i], this.atlas);
    // furnace
    setSlot(this.furnInput, this.furnItems.input, this.atlas);
    setSlot(this.furnFuel, this.furnItems.fuel, this.atlas);
    setSlot(this.furnOutput, this.furnItems.output, this.atlas);
    for (let i = 0; i < 9; i++) setSlot(this.furnHotbar[i], this.inv.hotbar[i], this.atlas);
    for (let i = 0; i < 27; i++) setSlot(this.furnMain[i], this.inv.main[i], this.atlas);
  }

  open(screen) {
    this.closeAll();
    document.getElementById(screen).style.display = 'flex';
    this.craftGridItems = new Array(9).fill(null);
    this.furnItems = { input: null, fuel: null, output: null };
    this.furnOutputItem = null;
    this.furnProgress = 0;
    this.inv.cursor = null;
    this.renderAll();
    if (screen === 'crafting-screen') this.updateCraft();
  }

  tickFurnace(dt) {
    const inp = this.furnItems.input;
    const fuel = this.furnItems.fuel;
    const el = document.getElementById('furn-progress');
    if (!inp || !fuel || !SMELT[inp.id] || !(FUEL[fuel.id] > 0)) {
      this.furnProgress = 0;
      el.style.width = '0%';
      return;
    }
    this.furnProgress += dt * 10; // 10s per smelted item
    if (this.furnProgress >= 10) {
      this.furnProgress -= 10;
      fuel.count--;
      if (fuel.count <= 0) this.furnItems.fuel = null;
      const outId = SMELT[inp.id];
      const cur = this.furnItems.output;
      this.furnItems.output = cur && cur.id === outId
        ? { id: outId, count: cur.count + 1 }
        : { id: outId, count: 1 };
      this.furnOutputItem = this.furnItems.output;
      this.renderAll();
    }
    el.style.width = Math.min(100, this.furnProgress * 10) + '%';
  }

  closeAll() {
    for (const id of ['inventory-screen', 'crafting-screen', 'furnace-screen', 'menu', 'death-screen', 'help-screen']) {
      document.getElementById(id).style.display = 'none';
    }
    // if cursor held, put back in inventory
    if (this.inv.cursor) {
      if (!this.inv.addItem(this.inv.cursor.id, this.inv.cursor.count)) {
        this.cb.dropItem(this.inv.cursor);
      }
      this.inv.cursor = null;
    }
    this.renderAll();
  }

  showMenu(onSaveQuit, onNewWorld) {
    const menu = document.getElementById('menu');
    menu.style.display = 'flex';
    document.getElementById('btn-save-quit').onclick = () => { onSaveQuit(); };
    document.getElementById('btn-new-world').onclick = () => {
      if (confirm('Start a new world? Your current save will be lost.')) onNewWorld();
    };
    document.getElementById('btn-help').onclick = () => this.showHelp();
    document.getElementById('btn-resume').onclick = () => this.closeAll();
  }

  showDeath() {
    document.getElementById('death-screen').style.display = 'flex';
  }

  showHelp() {
    document.getElementById('help-screen').style.display = 'flex';
  }

  hideHelp() {
    document.getElementById('help-screen').style.display = 'none';
  }

  bindKeys() {
    const keymap = {
      'KeyE': () => this.open('inventory-screen'),
      'Tab': () => { this.open('crafting-screen'); },
      'KeyF': () => this.open('furnace-screen'),
      'Escape': () => {
        const menu = document.getElementById('menu');
        if (menu.style.display === 'flex') this.closeAll();
        else this.showMenu(this.cb.onSaveQuit, this.cb.onNewWorld);
      },
      'KeyF1': () => this.showHelp(),
      'KeyQ': () => this.cb.dropItem(this.inv.getSelected()),
    };
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const fn = keymap[e.code];
      if (fn) {
        if (e.code === 'Tab') e.preventDefault();
        fn();
      }
      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        this.inv.selected = parseInt(e.code.slice(5)) - 1;
      }
    });
  }
}
