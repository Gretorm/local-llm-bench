// Voxelcraft main: scene, sky, player, interaction, particles, HUD, game loop.
(function () {
  "use strict";
  const B = window.Blocks.B;
  const DEFS = window.Blocks.DEFS;
  const { CX, CY, SEA } = window.WorldConstants;
  const R = 3; // chunk render radius

  // ---------------- DOM ----------------
  const $ = (id) => document.getElementById(id);
  const canvas = $("game-canvas");
  const hud = $("hud");
  const damageOverlay = $("damage-overlay");
  const waterOverlay = $("water-overlay");
  const heartsEl = $("hearts");
  const hotbarEl = $("hotbar");
  const debugPanel = $("debug-panel");
  const loadingScreen = $("loading-screen");
  const loadingStatus = $("loading-status");
  const loadingBar = $("loading-bar");
  const startScreen = $("start-screen");
  const playBtn = $("play-btn");
  const pauseScreen = $("pause-screen");
  const resumeBtn = $("resume-btn");
  const deathScreen = $("death-screen");
  const respawnBtn = $("respawn-btn");

  // ---------------- renderer / scene ----------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8fb8e8, 26, 74);
  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  // ---------------- textures / materials ----------------
  const atlasTex = new THREE.CanvasTexture(window.Blocks.atlasCanvas);
  atlasTex.magFilter = THREE.NearestFilter;
  atlasTex.minFilter = THREE.NearestFilter;

  const waterTex = new THREE.CanvasTexture(window.Blocks.waterTileCanvas);
  waterTex.magFilter = THREE.NearestFilter;
  waterTex.minFilter = THREE.NearestFilter;
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;

  const opaqueMat = new THREE.MeshBasicMaterial({ vertexColors: true, map: atlasTex });
  const waterMat = new THREE.MeshBasicMaterial({
    map: waterTex, transparent: true, opacity: 0.75,
    side: THREE.DoubleSide, depthWrite: false
  });

  // ---------------- world ----------------
  const seed = Math.floor(Math.random() * 2147483647) + 1;
  const world = new window.World(seed);
  world._opaqueMat = opaqueMat;
  world._waterMat = waterMat;

  // ---------------- sky ----------------
  function glowTexture(inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, inner);
    g.addColorStop(0.4, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    return t;
  }
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("rgba(255,240,180,1)", "rgba(255,240,180,0)"),
    transparent: true, depthTest: false, fog: false
  }));
  sun.scale.set(46, 46, 1);
  scene.add(sun);

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture("rgba(220,228,255,1)", "rgba(220,228,255,0)"),
    transparent: true, depthTest: false, fog: false, opacity: 0.9
  }));
  moon.scale.set(26, 26, 1);
  scene.add(moon);

  // stars
  const starGroup = new THREE.Group();
  (function () {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(700);
      if (v.y < -20) v.y = -v.y;
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    starGroup.add(new THREE.Points(g, m));
  })();
  scene.add(starGroup);

  // clouds
  let cloudMesh;
  (function () {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(256, 256);
    const n2 = (x, y) => window.Noise.fbm2(x * 0.05, y * 0.05, 4, 99991);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const v = n2(x, y);
      const a = Math.max(0, Math.min(1, (v - 0.52) / 0.22)) * 255;
      const i = (y * 256 + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.85, depthWrite: false, fog: false, side: THREE.DoubleSide });
    cloudMesh = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), m);
    cloudMesh.rotation.x = -Math.PI / 2;
    cloudMesh.position.y = 96;
    scene.add(cloudMesh);
  })();

  // ---------------- block highlight ----------------
  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
  );
  highlight.visible = false;
  scene.add(highlight);

  // ---------------- particles ----------------
  const PMAX = 512;
  const pPos = new Float32Array(PMAX * 3);
  const pCol = new Float32Array(PMAX * 3);
  const particles = [];
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const particleMat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false });
  const particlePoints = new THREE.Points(particleGeo, particleMat);
  particlePoints.frustumCulled = false;
  scene.add(particlePoints);
  for (let i = 0; i < PMAX; i++) { pPos[i * 3 + 1] = -9999; }

  function spawnParticles(x, y, z, rgb, n, spread) {
    for (let i = 0; i < n; i++) {
      if (particles.length >= PMAX) break;
      particles.push({
        x: x + (Math.random() - 0.5) * 0.7, y: y + (Math.random() - 0.5) * 0.7, z: z + (Math.random() - 0.5) * 0.7,
        vx: (Math.random() - 0.5) * spread, vy: Math.random() * spread * 0.8, vz: (Math.random() - 0.5) * spread,
        life: 0.35 + Math.random() * 0.4,
        r: rgb[0] + (Math.random() - 0.5) * 0.1, g: rgb[1] + (Math.random() - 0.5) * 0.1, b: rgb[2] + (Math.random() - 0.5) * 0.1
      });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy -= 16 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    for (let i = 0; i < PMAX; i++) {
      if (i < particles.length) {
        const p = particles[i];
        pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
        pCol[i * 3] = p.r; pCol[i * 3 + 1] = p.g; pCol[i * 3 + 2] = p.b;
      } else {
        pPos[i * 3 + 1] = -9999;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
  }

  // ---------------- player ----------------
  const player = {
    x: 8.5, y: 80, z: 8.5,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0,
    onGround: false,
    hp: 20,
    flying: false,
    inWater: false, headInWater: false,
    fallStart: null,
    regenTimer: 0,
    stepAcc: 0,
    bobPhase: 0,
    bobAmp: 0
  };
  let spawnPoint = { x: 8.5, y: 80, z: 8.5 };

  function findSpawn() {
    let fallback = null;
    for (let r = 0; r < 24; r++) {
      const pts = [];
      if (r === 0) pts.push([0, 0]);
      else {
        for (let x = -r; x <= r; x++) { pts.push([x, -r]); pts.push([x, r]); }
        for (let z = -r + 1; z <= r - 1; z++) { pts.push([-r, z]); pts.push([r, z]); }
      }
      for (const [ox, oz] of pts) {
        let surf = -1;
        for (let y = CY - 2; y >= 1; y--) {
          const b = world.getBlock(ox, y, oz);
          if (b === B.GRASS || b === B.DIRT || b === B.SAND || b === B.STONE) { surf = y; break; }
        }
        if (surf < 0 || world.getBlock(ox, surf + 1, oz) !== B.AIR) continue;
        if (world.getBlock(ox, surf, oz) === B.GRASS) {
          return { x: ox + 0.5, y: surf + 1, z: oz + 0.5 };
        }
        if (!fallback) fallback = { x: ox + 0.5, y: surf + 1, z: oz + 0.5 };
      }
    }
    return fallback || { x: 8.5, y: 80, z: 8.5 };
  }

  function solidColX(cx, y, z) {
    const hw = 0.3, hh = 1.8;
    for (let by = Math.floor(y); by <= Math.floor(y + hh); by++)
      for (let bz = Math.floor(z - hw); bz <= Math.floor(z + hw); bz++)
        if (world.isSolid(cx, by, bz)) return true;
    return false;
  }
  function solidColZ(cz, x, y) {
    const hw = 0.3, hh = 1.8;
    for (let by = Math.floor(y); by <= Math.floor(y + hh); by++)
      for (let bx = Math.floor(x - hw); bx <= Math.floor(x + hw); bx++)
        if (world.isSolid(bx, by, cz)) return true;
    return false;
  }
  function solidPlaneY(cy, x, z) {
    const hw = 0.3;
    for (let bx = Math.floor(x - hw); bx <= Math.floor(x + hw); bx++)
      for (let bz = Math.floor(z - hw); bz <= Math.floor(z + hw); bz++)
        if (world.isSolid(bx, cy, bz)) return true;
    return false;
  }

  function moveX(d) {
    player.x += d;
    const hw = 0.3;
    if (d > 0) {
      const c = Math.floor(player.x + hw);
      if (solidColX(c, player.y + 0.001, player.z)) { player.x = c - hw - 0.0001; player.vx = 0; }
    } else if (d < 0) {
      const c = Math.floor(player.x - hw);
      if (solidColX(c, player.y + 0.001, player.z)) { player.x = c + 1 + hw + 0.0001; player.vx = 0; }
    }
  }
  function moveZ(d) {
    player.z += d;
    const hw = 0.3;
    if (d > 0) {
      const c = Math.floor(player.z + hw);
      if (solidColZ(c, player.x, player.y + 0.001)) { player.z = c - hw - 0.0001; player.vz = 0; }
    } else if (d < 0) {
      const c = Math.floor(player.z - hw);
      if (solidColZ(c, player.x, player.y + 0.001)) { player.z = c + 1 + hw + 0.0001; player.vz = 0; }
    }
  }
  function moveY(d) {
    player.y += d;
    const H = 1.8;
    if (d > 0) {
      const c = Math.floor(player.y + H);
      if (solidPlaneY(c, player.x, player.z)) { player.y = c - H - 0.0001; player.vy = 0; }
    } else if (d < 0) {
      const c = Math.floor(player.y);
      if (solidPlaneY(c, player.x, player.z)) {
        player.y = c + 1 + 0.0001;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }

  // ---------------- input ----------------
  const input = {
    keys: {},
    mouse: { left: false, right: false },
    lastW: 0,
    sprinting: false
  };
  let hotbarSel = 0;
  let showDebug = false;

  window.addEventListener("keydown", (e) => {
    if (e.code === "F3") { e.preventDefault(); showDebug = !showDebug; debugPanel.classList.toggle("hidden", !showDebug); return; }
    if (e.code === "KeyF") { if (state === "playing") { player.flying = !player.flying; player.vy = 0; } }
    if (e.code === "KeyW") {
      const now = performance.now();
      if (now - input.lastW < 280) input.sprinting = true;
      input.lastW = now;
    }
    for (let i = 0; i < 9; i++) {
      if (e.code === "Digit" + (i + 1)) selectSlot(i);
    }
    input.keys[e.code] = true;
    if (["Space", "KeyF"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW") input.sprinting = false;
    if (e.code === "KeyS") input.sprinting = false;
    input.keys[e.code] = false;
  });

  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    if (locked) {
      pauseScreen.classList.add("hidden");
      hud.classList.remove("hidden");
      state = "playing";
    } else if (state === "playing") {
      state = "paused";
      pauseScreen.classList.remove("hidden");
      input.mouse.left = input.mouse.right = false;
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (state !== "playing") return;
    player.yaw -= e.movementX * 0.0024;
    player.pitch -= e.movementY * 0.0024;
    const lim = Math.PI / 2 - 0.001;
    player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
  });

  document.addEventListener("mousedown", (e) => {
    if (state !== "playing") return;
    if (e.button === 0) {
      input.mouse.left = true;
    } else if (e.button === 2) {
      input.mouse.right = true;
      tryPlace();
    }
  });
  document.addEventListener("mouseup", (e) => {
    if (e.button === 0) input.mouse.left = false;
    if (e.button === 2) input.mouse.right = false;
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // ---------------- state / menus ----------------
  let state = "loading"; // loading | playing | paused | dead

  function lockPointer() {
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* headless/test environment */ }
  }
  function unlockPointer() {
    try { document.exitPointerLock(); } catch (e) { }
  }

  playBtn.addEventListener("click", () => {
    window.Audio.init();
    window.Audio.click();
    startScreen.classList.add("hidden");
    state = "playing";
    lockPointer();
  });
  resumeBtn.addEventListener("click", () => {
    window.Audio.resume();
    window.Audio.click();
    lockPointer();
  });
  respawnBtn.addEventListener("click", () => {
    window.Audio.click();
    deathScreen.classList.add("hidden");
    player.x = spawnPoint.x; player.y = spawnPoint.y; player.z = spawnPoint.z;
    player.vx = player.vy = player.vz = 0;
    player.hp = 20;
    player.fallStart = null;
    player.flying = false;
    updateHearts();
    state = "playing";
    lockPointer();
  });
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------------- HUD ----------------
  const HEART_W = 9, HEART_H = 9;
  const HEART_ROWS = [
    ".XX...XX.",
    "XXXX.XXXX",
    "XXXXXXXXX",
    "XXXXXXXXX",
    ".XXXXXXX.",
    "..XXXXX..",
    "...XXX...",
    "....X...."
  ];
  function drawHeart(canvas, full) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, HEART_W, HEART_H);
    ctx.fillStyle = full ? "#d43a2a" : "#3a3a3a";
    for (let y = 0; y < HEART_ROWS.length; y++)
      for (let x = 0; x < HEART_W; x++)
        if (HEART_ROWS[y][x] === "X") ctx.fillRect(x, y, 1, 1);
    if (full) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(1, 1, 2, 1);
    }
  }
  const heartCanvases = [];
  for (let i = 0; i < 10; i++) {
    const c = document.createElement("canvas");
    c.width = HEART_W; c.height = HEART_H;
    c.style.width = "20px"; c.style.height = "20px";
    heartsEl.appendChild(c);
    heartCanvases.push(c);
  }
  function updateHearts() {
    const hp = player.hp;
    for (let i = 0; i < 10; i++) {
      const heartHp = hp - i * 2;
      let full = true;
      if (heartHp <= 0) full = false;
      drawHeart(heartCanvases[i], full);
    }
  }
  updateHearts();

  const slotEls = [];
  window.Blocks.HOTBAR.forEach((blockId, i) => {
    const slot = document.createElement("div");
    slot.className = "slot" + (i === 0 ? " selected" : "");
    const num = document.createElement("span");
    num.className = "keynum";
    num.textContent = String(i + 1);
    slot.appendChild(window.Blocks.iconFor(blockId));
    slot.appendChild(num);
    hotbarEl.appendChild(slot);
    slotEls.push(slot);
  });
  function selectSlot(i) {
    if (i < 0 || i > 8) return;
    hotbarSel = i;
    slotEls.forEach((el, j) => el.classList.toggle("selected", j === i));
  }

  function flashDamage() {
    damageOverlay.style.transition = "none";
    damageOverlay.style.opacity = "1";
    requestAnimationFrame(() => {
      damageOverlay.style.transition = "opacity 0.6s";
      damageOverlay.style.opacity = "0";
    });
  }

  function damage(n) {
    if (state !== "playing" || player.hp <= 0) return;
    player.hp = Math.max(0, player.hp - n);
    player.regenTimer = 5;
    player.vy = Math.max(player.vy, 2.5);
    flashDamage();
    window.Audio.hurt();
    updateHearts();
    if (player.hp <= 0) {
      state = "dead";
      window.Audio.death();
      deathScreen.classList.remove("hidden");
      unlockPointer();
      input.mouse.left = false;
    }
  }

  // ---------------- interaction ----------------
  let breakTarget = null;
  let breakProgress = 0;
  let crackTimer = 0;

  function eyePos() {
    return [player.x, player.y + 1.62, player.z];
  }
  function camDir() {
    const p = player.pitch, y = player.yaw;
    return [
      -Math.sin(y) * Math.cos(p),
      Math.sin(p),
      -Math.cos(y) * Math.cos(p)
    ];
  }

  function raycast(o, d, maxD) {
    let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
    const stepX = d[0] > 0 ? 1 : -1, stepY = d[1] > 0 ? 1 : -1, stepZ = d[2] > 0 ? 1 : -1;
    const tdx = d[0] !== 0 ? Math.abs(1 / d[0]) : Infinity;
    const tdy = d[1] !== 0 ? Math.abs(1 / d[1]) : Infinity;
    const tdz = d[2] !== 0 ? Math.abs(1 / d[2]) : Infinity;
    let tmx = d[0] !== 0 ? (d[0] > 0 ? (x + 1 - o[0]) : (o[0] - x)) * tdx : Infinity;
    let tmy = d[1] !== 0 ? (d[1] > 0 ? (y + 1 - o[1]) : (o[1] - y)) * tdy : Infinity;
    let tmz = d[2] !== 0 ? (d[2] > 0 ? (z + 1 - o[2]) : (o[2] - z)) * tdz : Infinity;
    let nx = 0, ny = 0, nz = 0;
    let t = 0;
    for (let i = 0; i < 128; i++) {
      if (world.getBlock(x, y, z) !== B.AIR && world.getBlock(x, y, z) !== B.WATER) {
        if (i > 0 || t === 0) return { x, y, z, nx, ny, nz };
      }
      if (tmx < tmy && tmx < tmz) { x += stepX; t = tmx; nx = -stepX; ny = 0; nz = 0; tmx += tdx; }
      else if (tmy < tmz) { y += stepY; t = tmy; nx = 0; ny = -stepY; nz = 0; tmy += tdy; }
      else { z += stepZ; t = tmz; nx = 0; ny = 0; nz = -stepZ; tmz += tdz; }
      if (t > maxD) return null;
    }
    return null;
  }

  const dirtyChunks = new Set();
  function setBlockAndRefresh(x, y, z, id) {
    const ch = world.setBlock(x, y, z, id);
    if (!ch) return;
    dirtyChunks.add(ch);
    const lx = x - ch.cx * 16, lz = z - ch.cz * 16;
    if (lx === 0) { const n = world.getChunk(ch.cx - 1, ch.cz); if (n) dirtyChunks.add(n); }
    if (lx === 15) { const n = world.getChunk(ch.cx + 1, ch.cz); if (n) dirtyChunks.add(n); }
    if (lz === 0) { const n = world.getChunk(ch.cx, ch.cz - 1); if (n) dirtyChunks.add(n); }
    if (lz === 15) { const n = world.getChunk(ch.cx, ch.cz + 1); if (n) dirtyChunks.add(n); }
  }
  function processDirty() {
    if (dirtyChunks.size === 0) return;
    for (const ch of dirtyChunks) {
      if (!ch.generated) continue;
      world.disposeChunk(ch);
      world.meshChunk(ch, THREE);
      if (ch.mesh) scene.add(ch.mesh);
      if (ch.waterMesh) scene.add(ch.waterMesh);
    }
    dirtyChunks.clear();
  }

  function intersectsPlayer(px, py, pz) {
    const hw = 0.3;
    return player.x + hw > px && player.x - hw < px + 1 &&
      player.y + 1.8 > py && player.y < py + 1 &&
      player.z + hw > pz && player.z - hw < pz + 1;
  }

  function tryPlace() {
    if (state !== "playing") return;
    const o = eyePos(), d = camDir();
    const hit = raycast(o, d, 5.0);
    if (!hit) return;
    const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
    if (py < 1 || py >= CY) return;
    const cur = world.getBlock(px, py, pz);
    if (cur !== B.AIR && cur !== B.WATER) return;
    const sel = window.Blocks.HOTBAR[hotbarSel];
    const def = DEFS[sel];
    if (def.solid && intersectsPlayer(px, py, pz)) return;
    setBlockAndRefresh(px, py, pz, sel);
    window.Audio.place(def.mat);
    spawnParticles(px + 0.5, py + 0.5, pz + 0.5, [0.8, 0.8, 0.8], 4, 1.2);
  }

  function updateBreaking(dt) {
    if (state !== "playing") { breakTarget = null; breakProgress = 0; }
    const o = eyePos(), d = camDir();
    const hit = raycast(o, d, 5.0);
    if (!hit) { breakTarget = null; breakProgress = 0; highlight.visible = false; return; }
    highlight.visible = true;
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    const b = world.getBlock(hit.x, hit.y, hit.z);
    const def = DEFS[b];
    if (def && def.hard === Infinity) { breakTarget = null; breakProgress = 0; return; }

    if (input.mouse.left && def) {
      if (breakTarget && breakTarget.x === hit.x && breakTarget.y === hit.y && breakTarget.z === hit.z) {
        breakProgress += dt / def.hard;
      } else {
        breakTarget = hit;
        breakProgress = 0;
      }
      crackTimer -= dt;
      if (crackTimer <= 0) {
        crackTimer = 0.12;
        const d2 = Math.sqrt(hit.nx * hit.nx + hit.ny * hit.ny + hit.nz * hit.nz);
        const px = hit.x + 0.5 + hit.nx * 0.45, py = hit.y + 0.5 + hit.ny * 0.45, pz = hit.z + 0.5 + hit.nz * 0.45;
        spawnParticles(px, py, pz, def.color || [0.5, 0.5, 0.5], 3, 1.5);
      }
      if (breakProgress >= 1) {
        const id = world.getBlock(hit.x, hit.y, hit.z);
        setBlockAndRefresh(hit.x, hit.y, hit.z, B.AIR);
        window.Audio.dig(def.mat);
        spawnParticles(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, def.color || [0.5, 0.5, 0.5], 14, 2.5);
        breakTarget = null;
        breakProgress = 0;
      }
    } else {
      breakTarget = null;
      breakProgress = 0;
    }
  }

  // ---------------- chunk streaming ----------------
  let spawnReady = false;

  function updateChunks() {
    const pcx = Math.floor(player.x / 16), pcz = Math.floor(player.z / 16);
    const now0 = performance.now();

    // generate missing chunks (nearest first)
    const needed = [];
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const cx = pcx + dx, cz = pcz + dz;
      if (!world.getChunk(cx, cz)) needed.push([cx, cz, dx * dx + dz * dz]);
    }
    needed.sort((a, b) => a[2] - b[2]);
    for (const [cx, cz] of needed) {
      if (performance.now() - now0 > 10) break;
      const ch = { cx, cz, data: new Uint8Array(16 * CY * 16), generated: false };
      world.chunks.set(world.key(cx, cz), ch);
      world.generateChunk(ch);
    }

    // mesh generated chunks (nearest first)
    const toMesh = [];
    for (const ch of world.chunks.values()) {
      if (!ch.generated || ch.mesh) continue;
      const dx = ch.cx - pcx, dz = ch.cz - pcz;
      if (dx * dx + dz * dz <= R * R) toMesh.push([ch, dx * dx + dz * dz]);
    }
    toMesh.sort((a, b) => a[2] - b[2]);
    for (const [ch] of toMesh) {
      if (performance.now() - now0 > 14) break;
      world.meshChunk(ch, THREE);
      if (ch.mesh) scene.add(ch.mesh);
      if (ch.waterMesh) scene.add(ch.waterMesh);
    }

    // progress (spawn area only until ready)
    let done = 0, total = 0;
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      total++;
      const ch = world.getChunk(pcx + dx, pcz + dz);
      if (ch && ch.mesh) done++;
    }
    const pct = Math.floor((done / total) * 100);
    loadingBar.style.width = pct + "%";
    loadingStatus.textContent = pct >= 100 ? "Done" : "Generating world... " + pct + "%";
    if (!spawnReady && pct >= 100) {
      spawnReady = true;
      const sp = findSpawn();
      spawnPoint = sp;
      player.x = sp.x; player.y = sp.y; player.z = sp.z;
      player.yaw = 0.6;
      loadingScreen.classList.add("hidden");
      startScreen.classList.remove("hidden");
    }

    // unload far chunks
    for (const [k, ch] of world.chunks) {
      const dx = ch.cx - pcx, dz = ch.cz - pcz;
      if (dx * dx + dz * dz > (R + 1) * (R + 1)) {
        world.disposeChunk(ch);
        if (ch.mesh) scene.remove(ch.mesh);
        if (ch.waterMesh) scene.remove(ch.waterMesh);
        world.chunks.delete(k);
      }
    }
  }

  // ---------------- day / night ----------------
  let dayT = 0.08;
  const DAY_LENGTH = 420;
  const skyNight = new THREE.Color(0x0a0a1e);
  const skyDay = new THREE.Color(0x87b5e0);
  const skyDawn = new THREE.Color(0xff9a5a);
  const waterDay = new THREE.Color(0xffffff);
  const waterNight = new THREE.Color(0x8899bb);
  const tmpColor = new THREE.Color();

  function dayFactor() {
    const a = dayT * Math.PI * 2;
    const elev = Math.sin(a);
    return Math.max(0, Math.min(1, (elev + 0.12) / 0.37));
  }

  function updateSky(dt) {
    dayT = (dayT + dt / DAY_LENGTH) % 1;
    const a = dayT * Math.PI * 2;
    const elev = Math.sin(a);
    const light = dayFactor();

    const sx = Math.cos(a) * 0.85, sy = elev, sz = -0.35;
    const sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
    const sp = eyePos();
    sun.position.set(sp[0] + sx / sl * 500, sp[1] + sy / sl * 500, sp[2] + sz / sl * 500);
    sun.material.opacity = Math.max(0, Math.min(1, elev * 6 + 0.2));
    moon.position.set(sp[0] - sx / sl * 500, sp[1] - sy / sl * 500, sp[2] - sz / sl * 500);
    moon.material.opacity = Math.max(0, Math.min(1, -elev * 6 + 0.1));

    tmpColor.copy(skyNight).lerp(skyDay, light);
    const dawn = Math.max(0, 1 - Math.abs(elev) * 5) * light * 0.5;
    tmpColor.lerp(skyDawn, dawn);
    scene.background = scene.background || new THREE.Color();
    scene.background.copy(tmpColor);
    scene.fog.color.copy(tmpColor);

    starGroup.position.set(sp[0], 0, sp[2]);
    starGroup.children[0].material.opacity = Math.max(0, Math.min(1, -elev * 5));
    starGroup.visible = starGroup.children[0].material.opacity > 0.02;

    const cl = 0.15 + 0.85 * light;
    cloudMesh.material.color.setScalar(cl);
    cloudMesh.material.opacity = 0.75 * (0.25 + 0.75 * light);
    const grid = 300;
    cloudMesh.position.x = Math.round(sp[0] / grid) * grid;
    cloudMesh.position.z = Math.round(sp[2] / grid) * grid;

    opaqueMat.color.setScalar(0.12 + 0.88 * light);
    tmpColor.copy(waterNight).lerp(waterDay, light);
    waterMat.color.copy(tmpColor);
    waterMat.opacity = 0.75;
  }

  // ---------------- main loop ----------------
  let lastT = performance.now();
  let fps = 60, fpsAcc = 0, fpsCount = 0, fpsTimer = 0;
  let debugTimer = 0;

  function cameraUpdate() {
    camera.position.set(player.x, player.y + 1.62, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now();
    let dt = (now - lastT) / 1000;
    lastT = now;
    if (dt > 0.05) dt = 0.05;

    fpsAcc += 1 / Math.max(dt, 0.0001); fpsCount++;
    fpsTimer += dt;
    if (fpsTimer > 0.5) { fps = fpsAcc / fpsCount; fpsAcc = 0; fpsCount = 0; fpsTimer = 0; }

    if (state === "loading") {
      updateChunks();
      updateSky(dt);
      cameraUpdate();
      processDirty();
      renderer.render(scene, camera);
      return;
    }

    if (state === "paused" || state === "dead") {
      renderer.render(scene, camera);
      return;
    }

    // playing
    updateChunks();
    processDirty();

    // --- player update ---
    const k = input.keys;
    let f = 0, s = 0;
    if (k["KeyW"]) f += 1;
    if (k["KeyS"]) f -= 1;
    if (k["KeyA"]) s -= 1;
    if (k["KeyD"]) s += 1;
    const sneak = k["ShiftLeft"] || k["ShiftRight"];
    const sprinting = input.sprinting && !sneak && f > 0;

    const fy = Math.sin(player.yaw), fy2 = Math.cos(player.yaw);
    const fwdX = -fy, fwdZ = -fy2;
    const rightX = fy2, rightZ = -fy;

    let mx = fwdX * f + rightX * s;
    let mz = fwdZ * f + rightZ * s;
    const ml = Math.sqrt(mx * mx + mz * mz);
    if (ml > 1) { mx /= ml; mz /= ml; }

    const headWater = world.getBlock(Math.floor(player.x), Math.floor(player.y + 1.62), Math.floor(player.z)) === B.WATER;
    const bodyWater = world.getBlock(Math.floor(player.x), Math.floor(player.y + 0.5), Math.floor(player.z)) === B.WATER;
    player.inWater = bodyWater;
    player.headInWater = headWater;
    waterOverlay.classList.toggle("hidden", !headWater);

    let speed;
    if (player.flying) speed = sprinting ? 24 : 12;
    else if (sneak) speed = 1.3;
    else if (sprinting) speed = 5.6;
    else speed = 4.317;
    if (player.inWater && !player.flying) speed *= 0.75;

    const accel = player.onGround || player.flying || player.inWater ? 14 : 4;
    const t = Math.min(1, accel * dt);
    player.vx += (mx * speed - player.vx) * t;
    player.vz += (mz * speed - player.vz) * t;

    if (player.flying) {
      let tv = 0;
      if (k["Space"]) tv = speed;
      if (sneak) tv = -speed;
      player.vy += (tv - player.vy) * Math.min(1, 12 * dt);
      player.fallStart = null;
    } else if (player.inWater) {
      player.vy -= 22 * dt;
      player.vy = Math.max(player.vy, -3.4);
      if (k["Space"]) {
        player.vy += 26 * dt;
        player.vy = Math.min(player.vy, 3.4);
      }
      if (!k["Space"]) player.fallStart = null;
    } else {
      player.vy -= 28 * dt;
      player.vy = Math.max(player.vy, -50);
      if (k["Space"] && player.onGround) {
        player.vy = 8.4;
        player.onGround = false;
        player.fallStart = null;
      }
    }

    const wasGround = player.onGround;
    player.onGround = false;
    moveX(player.vx * dt);
    moveZ(player.vz * dt);
    const prevVy = player.vy;
    moveY(player.vy * dt);

    // fall tracking
    if (player.onGround && !wasGround && prevVy < -4 && player.fallStart !== null && !player.inWater && !player.flying) {
      const fall = player.fallStart - player.y;
      if (fall > 3.5) damage(fall - 3);
      player.fallStart = null;
    } else if (!player.onGround && player.vy <= 0 && !player.inWater && !player.flying) {
      if (player.fallStart === null) player.fallStart = player.y;
    } else {
      player.fallStart = null;
    }

    // regen
    if (player.regenTimer > 0) player.regenTimer -= dt;
    else if (player.hp < 20) {
      player.regenTimer = 0.5;
      if (Math.random() < dt * 0.7) {
        player.hp = Math.min(20, player.hp + 1);
        updateHearts();
      }
    }

    // footsteps
    const hSpeed = Math.sqrt(player.vx * player.vx + player.vz * player.vz);
    if (player.onGround && hSpeed > 0.5) {
      player.stepAcc += hSpeed * dt;
      player.bobPhase += dt * (6 + hSpeed * 1.6);
      if (player.stepAcc > 2.1) {
        player.stepAcc = 0;
        const under = world.getBlock(Math.floor(player.x), Math.floor(player.y - 0.2), Math.floor(player.z));
        const def = DEFS[under];
        window.Audio.step(def ? def.mat : "stone", 1);
      }
    } else {
      player.stepAcc = 0;
    }
    player.bobAmp += ((player.onGround && hSpeed > 2 ? Math.min(1, hSpeed / 5) : 0) - player.bobAmp) * Math.min(1, 8 * dt);

    // head bob
    const bobY = Math.sin(player.bobPhase) * 0.06 * player.bobAmp;
    camera.position.set(player.x, player.y + 1.62 + bobY, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);

    // interaction
    updateBreaking(dt);

    // sky
    updateSky(dt);
    waterTex.offset.x += dt * 0.021;
    waterTex.offset.y += dt * 0.013;

    updateParticles(dt);

    // debug
    debugTimer -= dt;
    if (debugTimer <= 0) {
      debugTimer = 0.25;
      if (showDebug) {
        const p = player;
        const calls = renderer.info.render.calls;
        const tris = renderer.info.render.triangles;
        const dirs = ["down", "up", "north", "south", "west", "east"];
        const d = camDir();
        let dirName = "down";
        const ax = Math.abs(d[1]) > 0.92 ? 1 : 0;
        if (ax === 0) {
          const axv = Math.abs(d[0]) > Math.abs(d[2]) ? 0 : 2;
          dirName = axv === 0 ? (d[0] > 0 ? "east" : "west") : (d[2] > 0 ? "south" : "north");
        } else dirName = d[1] > 0 ? "up" : "down";
        debugPanel.textContent =
          "Voxelcraft (original clone)\n" +
          "FPS: " + fps.toFixed(1) + "\n" +
          "Pos: " + p.x.toFixed(1) + " " + p.y.toFixed(1) + " " + p.z.toFixed(1) + "  Facing: " + dirName + "\n" +
          "Chunk: " + Math.floor(p.x / 16) + "," + Math.floor(p.z / 16) + "  Fly: " + (p.flying ? "on" : "off") + "\n" +
          "Draw calls: " + calls + "  Tris: " + tris + "\n" +
          "Time: " + Math.floor(dayT * 1440) + " min (" + (dayT < 0.5 ? "day" : "night") + ")";
      }
    }

    renderer.render(scene, camera);
  }

  // ---------------- boot ----------------
  window.__vox = {
    get state() { return state; },
    get player() { return player; },
    get world() { return world; },
    get renderer() { return renderer; }
  };
  updateChunks();
  loop();
})();
