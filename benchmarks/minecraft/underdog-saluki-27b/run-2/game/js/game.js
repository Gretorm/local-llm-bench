// Main game: input, mining/placement, item entities, save, loop.

const SAVE_KEY = 'mc_clone_save';

class Game {
  constructor() {
    // scene
    this.renderer3d = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: false });
    this.renderer3d.setSize(window.innerWidth, window.innerHeight);
    this.renderer3d.setPixelRatio(1);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88bbff);
    this.scene.fog = new THREE.Fog(0x88bbff, 30, 110);

    this.world = new World(Math.floor(Math.random() * 0x7fffffff));
    this.renderer = new WorldRenderer(this.scene, this.world);
    this.renderer.buildAll();

    this.player = new Player(this.world);
    this.player.pos.copy(this.player.findSpawn(this.world));

    this.inventory = new Inventory();
    // starter items
    this.inventory.addItem(B.PLANKS, 0);
    this.inventory.addItem(B.W_PICK, 1);
    this.inventory.addItem(B.W_AXE, 1);
    this.inventory.addItem(B.W_SHOVEL, 1);
    this.inventory.addItem(B.W_HOE, 1);
    this.inventory.addItem(B.APPLE, 3);

    this.sky = new Sky(this.scene);
    this.particles = new Particles(this.scene);
    this.sound = new Sound();

    // camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // lighting
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(100, 100, -100);
    this.scene.add(this.sunLight);
    this.ambient = new THREE.AmbientLight(0x666666, 0.4);
    this.scene.add(this.ambient);

    // UI
    this.ui = new UI(this.renderer.atlas, this.inventory, {
      onCraft: () => this.sound.play('craft'),
      onFurnace: () => this.sound.play('furnace'),
      onSaveQuit: () => { this.save(); location.reload(); },
      onNewWorld: () => { localStorage.removeItem(SAVE_KEY); location.reload(); },
      dropItem: (item) => this.dropItem(item),
    });

    // crack overlay
    const crackCanvas = document.createElement('canvas');
    crackCanvas.width = 48; crackCanvas.height = 16;
    const cg = crackCanvas.getContext('2d');
    cg.imageSmoothingEnabled = false;
    // copy crack frames from atlas
    for (let f = 0; f < 3; f++) {
      const ty = (103 + f) * 16;
      cg.drawImage(this.renderer.atlas.image, 0, ty, 16, 16, f * 16, 0, 16, 16);
    }
    this.crackTex = new THREE.CanvasTexture(crackCanvas);
    this.crackTex.magFilter = THREE.NearestFilter;
    this.crackTex.minFilter = THREE.NearestFilter;
    this.crackMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: this.crackTex, transparent: true, depthWrite: false })
    );
    this.crackMesh.visible = false;
    this.scene.add(this.crackMesh);

    // ghost block
    this.ghost = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false })
    );
    this.ghost.visible = false;
    this.scene.add(this.ghost);

    // item entities
    this.items = [];

    // show menu on start
    this.ui.showMenu(this.cb.onSaveQuit, this.cb.onNewWorld);

    // state
    this.mining = { target: null, time: 0 };
    this.waterTick = 0;
    this.cropTick = 0;
    this.saveTick = 0;
    this.lightTick = 0;
    this.fps = 0;
    this.frames = 0;
    this.fpsTime = 0;

    // load save
    this.load();

    // input
    this.keys = {};
    this.lookDX = 0;
    this.lookDY = 0;
    this.mouseDown = 0;
    this.bindInput();

    // loop
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.sound.ensure();
      this.sound.resume();
      // close death screen on any key
      const death = document.getElementById('death-screen');
      if (death.style.display === 'flex') {
        this.ui.closeAll();
        return;
      }
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouseDown = 0;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown === 0 || this.mouseDown === 2 || !this.uiOpen()) {
        this.lookDX += e.movementX * 0.0022;
        this.lookDY += e.movementY * 0.0022;
      }
    });
    window.addEventListener('mousedown', (e) => {
      if (this.uiOpen()) return;
      this.sound.ensure();
      this.sound.resume();
      if (e.button === 0) this.mouseDown = 1;
      if (e.button === 2) {
        this.mouseDown = 2;
        this.placeBlock();
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        if (this.mouseDown === 1) {
          // quick mine: if held < 0.3s and block is soft, break instantly? keep standard
        }
        this.mouseDown = 0;
        this.mining = { target: null, time: 0 };
      }
      if (e.button === 2) this.mouseDown = 0;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', () => {
      this.renderer3d.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
    window.addEventListener('beforeunload', () => this.save());
  }

  uiOpen() {
    return ['inventory-screen', 'crafting-screen', 'furnace-screen', 'menu', 'death-screen', 'help-screen']
      .some((id) => document.getElementById(id).style.display === 'flex');
  }

  // ---- targeting -----------------------------------------------------------
  raycast() {
    const origin = this.player.getEyePos();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const maxDist = 5;
    let px = Math.floor(origin.x), py = Math.floor(origin.y), pz = Math.floor(origin.z);
    for (let d = 0.01; d < maxDist; d += 0.05) {
      const nx = Math.floor(origin.x + dir.x * d);
      const ny = Math.floor(origin.y + dir.y * d);
      const nz = Math.floor(origin.z + dir.z * d);
      if (nx !== px || ny !== py || nz !== pz) {
        const b = this.world.get(nx, ny, nz);
        const m = BLOCKS[b];
        if (m && (m.solid || m.translucent || b === B.WATER)) {
          const face = [0, 0, 0];
          if (nx !== px) face[nx > px ? 2 : 3] = 1;
          if (ny !== py) face[ny > py ? 0 : 1] = 1;
          if (nz !== pz) face[nz > pz ? 4 : 5] = 1;
          return { x: nx, y: ny, z: nz, face };
        }
        px = nx; py = ny; pz = nz;
      }
    }
    return null;
  }

  // ---- item pickup -----------------------------------------------------------
  pickItemEntity() {
    const origin = this.player.getEyePos();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    let best = null, bestD = Infinity;
    for (const it of this.items) {
      const to = it.pos.clone().sub(origin);
      const t = to.dot(dir);
      if (t < 0 || t > 5) continue;
      const d = to.addScaledVector(dir, -t).length();
      if (d < 0.5 && d < bestD) { bestD = d; best = it; }
    }
    return best;
  }

  // ---- mining ----------------------------------------------------------------
  tryMine(dt) {
    if (this.mouseDown !== 1) return;
    // pick up item entities first
    const item = this.pickItemEntity();
    if (item) {
      this.inventory.addItem(item.id, item.count);
      this.scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      this.items.splice(this.items.indexOf(item), 1);
      this.sound.play('pickup');
      this.mining = { target: null, time: 0 };
      return;
    }
    const target = this.raycast();
    if (!target) { this.mining = { target: null, time: 0 }; return; }
    const key = `${target.x},${target.y},${target.z}`;
    if (!this.mining.target || this.mining.target.key !== key) {
      this.mining = { target, key, time: 0 };
    }
    const tool = this.inventory.getSelected();
    const meta = BLOCKS[this.world.get(target.x, target.y, target.z)];
    if (!canBreak(this.world.get(target.x, target.y, target.z), tool)) {
      this.mining.time = 0;
      return;
    }
    this.mining.time += dt;
    const t = breakTime(this.world.get(target.x, target.y, target.z), tool);
    if (t <= 0) {
      this.breakBlock(target.x, target.y, target.z, tool);
      return;
    }
    // crack overlay
    const progress = Math.min(1, this.mining.time / t);
    this.crackMesh.visible = true;
    const c = FACES[target.face].corners;
    const center = new THREE.Vector3(
      target.x + 0.5 + FACES[target.face].dir[0] * 0.5,
      target.y + 0.5 + FACES[target.face].dir[1] * 0.5,
      target.z + 0.5 + FACES[target.face].dir[2] * 0.5
    );
    this.crackMesh.position.copy(center);
    this.crackMesh.lookAt(this.camera.position);
    // frame selection
    const frame = Math.min(2, Math.floor(progress * 3));
    // texture offset: 3 frames side by side
    this.crackMesh.material.map.offset.x = frame / 3;
    this.crackMesh.material.map.repeat.x = 1 / 3;
    this.crackMesh.material.map.repeat.y = 1;
    this.crackMesh.material.map.needsUpdate = true;
  }

  breakBlock(x, y, z, tool) {
    const id = this.world.get(x, y, z);
    if (id === B.AIR || id === B.WATER) return;
    // drop
    const drop = dropFor(id);
    if (drop !== null) {
      const n = 1;
      this.spawnItemEntity(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), drop, n);
    }
    // tool durability
    if (tool && tool.durability) {
      tool.durability--;
      if (tool.durability <= 0) {
        const slot = this.inventory.hotbar[this.inventory.selected];
        if (slot && slot.id === tool.id) slot.count = 0;
        this.inventory.hotbar[this.inventory.selected] = null;
      }
    }
    // cactus drop already handled; leaves -> apple chance
    if (id === B.OAK_LEAVES && Math.random() < 0.1) {
      this.spawnItemEntity(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), B.APPLE, 1);
    }
    this.world.set(x, y, z, B.AIR);
    this.renderer.rebuildArea(x, y, z);
    this.particles.spawnBurst(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), this.blockColor(id), 16);
    this.sound.play('break', { pitch: Math.random() });
    this.mining = { target: null, time: 0 };
    this.crackMesh.visible = false;
  }

  blockColor(id) {
    // rough colors from block id
    const map = {
      [B.DIRT]: [0.53, 0.38, 0.26], [B.STONE]: [0.47, 0.47, 0.47], [B.GRASS]: [0.3, 0.6, 0.35],
      [B.SAND]: [0.82, 0.78, 0.6], [B.GRAVEL]: [0.39, 0.39, 0.39], [B.COBBLE]: [0.43, 0.43, 0.43],
      [B.OAK_LOG]: [0.3, 0.22, 0.13], [B.SPRUCE_LOG]: [0.2, 0.3, 0.25], [B.BIRCH_LOG]: [0.86, 0.86, 0.86],
      [B.OAK_LEAVES]: [0.2, 0.6, 0.25], [B.SPRUCE_LEAVES]: [0.15, 0.5, 0.2], [B.BIRCH_LEAVES]: [0.3, 0.65, 0.3],
      [B.SANDSTONE]: [0.82, 0.74, 0.55], [B.STONE_BRICK]: [0.55, 0.55, 0.55],
      [B.IRON_ORE]: [0.47, 0.47, 0.47], [B.COAL_ORE]: [0.47, 0.47, 0.47],
      [B.GOLD_ORE]: [0.47, 0.47, 0.47], [B.DIAMOND_ORE]: [0.47, 0.47, 0.47],
      [B.FARMLAND]: [0.31, 0.22, 0.16], [B.SNOW]: [0.96, 0.96, 0.96],
    };
    return map[id] || [0.5, 0.5, 0.5];
  }

  // ---- placement -------------------------------------------------------------
  placeBlock() {
    const target = this.raycast();
    if (!target) return;
    const sel = this.inventory.getSelected();
    if (!sel) return;
    const it = ITEMS[sel.id];

    // interact with furnace / crafting table
    const cur = this.world.get(target.x, target.y, target.z);
    if (cur === B.FURNACE) { this.ui.open('furnace-screen'); return; }
    if (cur === B.CRAFTING_TABLE) { this.ui.open('crafting-screen'); return; }

    // hoe tilling
    if (it && it.id === B.W_HOE && (cur === B.GRASS || cur === B.DIRT)) {
      this.world.set(target.x, target.y, target.z, B.FARMLAND);
      this.renderer.rebuildArea(target.x, target.y, target.z);
      this.sound.play('place');
      return;
    }

    // eat food
    if (it && it.food) {
      sel.count--;
      if (sel.count <= 0) this.inventory.hotbar[this.inventory.selected] = null;
      this.player.eat(it.food);
      this.sound.play('eat');
      return;
    }
    if (!it || !it.placeable) return;
    const nx = target.x + FACES[target.face].dir[0];
    const ny = target.y + FACES[target.face].dir[1];
    const nz = target.z + FACES[target.face].dir[2];
    if (!this.world.inBounds(nx, ny, nz)) return;
    // can't place inside player
    const p = this.player.pos;
    if (nx < p.x + PLAYER_R && nx + 1 > p.x - PLAYER_R &&
        ny < p.y + PLAYER_H && ny + 1 > p.y &&
        nz < p.z + PLAYER_R && nz + 1 > p.z - PLAYER_R) {
      this.sound.play('deny');
      return;
    }
    const cur = this.world.get(nx, ny, nz);
    if (cur !== B.AIR && cur !== B.WATER) return;
    sel.count--;
    if (sel.count <= 0) this.inventory.hotbar[this.inventory.selected] = null;
    this.world.set(nx, ny, nz, sel.id);
    this.renderer.rebuildArea(nx, ny, nz);
    this.sound.play('place');
    // plant crops
    if (it.seed) {
      const below = this.world.get(nx, ny - 1, nz);
      if (below === B.FARMLAND) {
        this.world.plantCrop(nx, ny, nz, sel.id);
      }
    }
  }

  dropItem(item) {
    if (!item) return;
    this.spawnItemEntity(new THREE.Vector3(
      this.player.pos.x, this.player.pos.y + 1, this.player.pos.z
    ), item.id, item.count);
    this.inventory.hotbar[this.inventory.selected] = null;
  }

  // ---- item entities ----------------------------------------------------------
  spawnItemEntity(pos, id, count) {
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    // map one atlas tile onto every face
    const tile = ITEMS[id] ? iconTile(id) : faceTile(id, 0);
    const r = uvRect(tile);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, r.u0 + uv.getX(i) * (r.u1 - r.u0));
      uv.setY(i, r.v0 + uv.getY(i) * (r.v1 - r.v0));
    }
    const mat = new THREE.MeshLambertMaterial({ map: this.renderer.atlas });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.items.push({
      mesh,
      pos,
      vel: new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2),
      id, count,
      timer: 60,
    });
  }

  updateItems(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.timer -= dt;
      it.vel.y -= 20 * dt;
      it.pos.addScaledVector(it.vel, dt);
      // ground collision
      const gy = Math.floor(it.pos.y);
      const m = BLOCKS[this.world.get(Math.floor(it.pos.x), gy, Math.floor(it.pos.z))];
      if (m && m.solid) {
        it.pos.y = gy + 1 + 0.1;
        it.vel.y = 0;
        it.vel.x *= 0.8;
        it.vel.z *= 0.8;
      }
      it.mesh.position.copy(it.pos);
      it.mesh.rotation.x += dt * 2;
      it.mesh.rotation.y += dt * 2;
      if (it.timer <= 0 || it.pos.y < -10) {
        this.scene.remove(it.mesh);
        it.mesh.geometry.dispose();
        it.mesh.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }

  // ---- save / load -------------------------------------------------------------
  save() {
    try {
      const data = {
        world: this.world.save(),
        player: {
          pos: [this.player.pos.x, this.player.pos.y, this.player.pos.z],
          yaw: this.player.yaw, pitch: this.player.pitch,
          health: this.player.health, hunger: this.player.hunger,
          selected: this.inventory.selected,
        },
        inventory: {
          hotbar: this.inventory.hotbar,
          main: this.inventory.main,
        },
        time: this.sky.time,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { /* storage full */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!this.world.load(data.world)) return;
      this.renderer.buildAll();
      this.player.pos.set(data.player.pos[0], data.player.pos[1], data.player.pos[2]);
      this.player.yaw = data.player.yaw;
      this.player.pitch = data.player.pitch;
      this.player.health = data.player.health;
      this.player.hunger = data.player.hunger;
      this.inventory.selected = data.player.selected;
      this.inventory.hotbar = data.inventory.hotbar;
      this.inventory.main = data.inventory.main;
      this.sky.time = data.time;
    } catch (e) { /* corrupt save */ }
  }

  // ---- main loop ---------------------------------------------------------------
  loop(t) {
    requestAnimationFrame((t2) => this.loop(t2));
    const dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;

    // fps
    this.frames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frames;
      this.frames = 0;
      this.fpsTime = 0;
    }

    // player
    this.player.update(dt, {
      keys: this.keys,
      lookDX: this.lookDX,
      lookDY: this.lookDY,
    }, this.sound);
    this.lookDX = 0;
    this.lookDY = 0;

    // camera
    this.camera.position.copy(this.player.getEyePos());
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0);

    // mining
    this.tryMine(dt);

    // ghost block
    const sel = this.inventory.getSelected();
    const selMeta = sel ? (ITEMS[sel.id] || BLOCKS[sel.id]) : null;
    if (selMeta && selMeta.placeable && !this.uiOpen()) {
      const target = this.raycast();
      if (target) {
        this.ghost.visible = true;
        this.ghost.position.set(
          target.x + 0.5 + FACES[target.face].dir[0] * 0.5,
          target.y + 0.5 + FACES[target.face].dir[1] * 0.5,
          target.z + 0.5 + FACES[target.face].dir[2] * 0.5
        );
      } else {
        this.ghost.visible = false;
      }
    } else {
      this.ghost.visible = false;
    }

    // water & crops
    this.waterTick += dt;
    if (this.waterTick >= 1) {
      this.waterTick = 0;
      const changed = this.world.flowWater();
      if (changed.length) {
        const chunks = new Set();
        for (const i of changed) {
          const y = Math.floor(i / (W * D));
          const rem = i % (W * D);
          const x = Math.floor(rem / D);
          const z = rem % D;
          chunks.add(Math.floor(x / CS) + ',' + Math.floor(z / CS));
        }
        for (const c of chunks) {
          const [cx, cz] = c.split(',').map(Number);
          this.renderer.rebuild(cx, cz);
        }
      }
    }
    this.cropTick += dt;
    if (this.cropTick >= 1) {
      this.cropTick = 0;
      const changed = this.world.tickCrops();
      if (changed.length) {
        for (const i of changed) {
          const y = Math.floor(i / (W * D));
          const rem = i % (W * D);
          const x = Math.floor(rem / D);
          const z = rem % D;
          this.renderer.rebuildArea(x, y, z);
        }
      }
    }

    // lighting day/night
    this.sky.update(dt);
    const day = this.sky.dayFactor;
    this.sunLight.intensity = 0.2 + day * 1.1;
    this.sunLight.position.set(Math.sin(this.sky.time / 600 * Math.PI * 2) * 100, Math.sin(this.sky.time / 600 * Math.PI * 2) * 100 + 50, -Math.cos(this.sky.time / 600 * Math.PI * 2) * 100);
    this.ambient.intensity = 0.15 + day * 0.3;
    this.scene.fog.color.set(day > 0.5 ? 0x88bbff : 0x111122);
    this.renderer3d.setClearColor(day > 0.5 ? 0x88bbff : 0x111122);

    // particles
    this.particles.update(dt);
    this.updateItems(dt);

    // sound ambient
    this.sound.tick(dt, day);

    // UI
    this.ui.updateHUD(this.player);
    this.ui.tickFurnace(dt);
    this.ui.setClock(this.sky.time);
    if (this.keys['KeyF3']) {
      this.ui.setDebug(`FPS ${this.fps} | pos ${this.player.pos.x.toFixed(1)}, ${this.player.pos.y.toFixed(1)}, ${this.player.pos.z.toFixed(1)} | items ${this.items.length}`);
    } else {
      this.ui.setDebug(null);
    }

    // death
    if (this.player.dead && !this.uiOpen()) {
      this.ui.showDeath();
    }

    // autosave
    this.saveTick += dt;
    if (this.saveTick >= 30) {
      this.saveTick = 0;
      this.save();
    }

    this.renderer3d.render(this.scene);
  }
}

new Game();
