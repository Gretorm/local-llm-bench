/* main.js - bootstrap, render loop, chunk streaming, interaction, save/load */
(function () {
  'use strict';

  // ---------- atlas ----------
  var TEX = Textures.build();
  Textures.icon = TEX.icon;
  Textures.tileCanvas = TEX.tileCanvas;
  Textures.uvRect = TEX.uvRect;
  Textures.avgColor = TEX.avgColor;

  var atlasTex = new THREE.CanvasTexture(TEX.canvas);
  atlasTex.magFilter = THREE.NearestFilter;
  atlasTex.minFilter = THREE.NearestFilter;
  atlasTex.generateMipmaps = false;

  // ---------- renderer / scene / camera ----------
  var canvas = document.getElementById('game-canvas');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(80, 1, 0.1, 500);
  camera.rotation.order = 'YXZ';

  // ---------- voxel materials ----------
  var VERT = [
    'attribute float shade;',
    'varying vec2 vUv;',
    'varying float vShade;',
    'varying float vFog;',
    'uniform float uFogNear;',
    'uniform float uFogFar;',
    'void main(){',
    '  vUv = uv;',
    '  vShade = shade;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  vFog = smoothstep(uFogNear, uFogFar, length(mv.xyz));',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D uMap;',
    'uniform float uDay;',
    'uniform vec3 uFogColor;',
    'uniform float uOpacity;',
    'uniform float uAlphaTest;',
    'varying vec2 vUv;',
    'varying float vShade;',
    'varying float vFog;',
    'void main(){',
    '  vec4 tex = texture2D(uMap, vUv);',
    '  if (tex.a < uAlphaTest) discard;',
    '  vec3 col = tex.rgb * vShade * uDay;',
    '  gl_FragColor = vec4(mix(col, uFogColor, vFog), tex.a * uOpacity);',
    '}'
  ].join('\n');

  function makeVoxelMat(opacity, alphaTest, transparent, depthWrite) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: atlasTex },
        uDay: { value: 1 },
        uFogColor: { value: new THREE.Color(0xcfe0f5) },
        uFogNear: { value: 60 },
        uFogFar: { value: 105 },
        uOpacity: { value: opacity },
        uAlphaTest: { value: alphaTest }
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.DoubleSide,
      transparent: transparent,
      depthWrite: depthWrite
    });
  }

  var matOpaque = makeVoxelMat(1, 0.5, false, true);
  var matWater = makeVoxelMat(0.78, 0.0, true, false);
  var matPlant = makeVoxelMat(1, 0.5, false, true);
  var voxelMats = [matOpaque, matWater, matPlant];
  var matsByKind = { opaque: matOpaque, water: matWater, plant: matPlant };

  // ---------- sky ----------
  var skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: new THREE.Color(0.24, 0.44, 0.85) },
      uHorizon: { value: new THREE.Color(0.66, 0.78, 0.95) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uNight: { value: 0 },
      uDayAmt: { value: 1 }
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'precision mediump float;',
      'uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uSunDir;',
      'uniform float uNight; uniform float uDayAmt;',
      'varying vec3 vDir;',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float h = clamp(d.y, 0.0, 1.0);',
      '  vec3 col = mix(uHorizon, uZenith, pow(h, 0.55));',
      '  float sd = dot(d, uSunDir);',
      '  col += vec3(1.0, 0.96, 0.85) * (smoothstep(0.99930, 0.99965, sd) * 1.4 + smoothstep(0.955, 0.9993, sd) * 0.18) * uDayAmt;',
      '  float md = dot(d, -uSunDir);',
      '  col += vec3(0.75, 0.8, 1.0) * smoothstep(0.99965, 0.99985, md) * uNight;',
      '  vec3 sp = floor(d * 140.0);',
      '  float hsh = fract(sin(dot(sp, vec3(12.9898, 78.233, 37.719))) * 43758.5453);',
      '  float star = step(0.996, hsh) * uNight * smoothstep(0.05, 0.4, d.y);',
      '  col += vec3(star);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  var skyMesh = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), skyMat);
  skyMesh.frustumCulled = false;
  scene.add(skyMesh);

  // ---------- clouds ----------
  function makeCloudTexture() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(256, 256);
    for (var y = 0; y < 256; y++) for (var x = 0; x < 256; x++) {
      var n = Util.fbm2(x * 0.045 + 3.7, y * 0.045 + 9.1, 99173, 4);
      var a = Math.max(0, n - 0.18) * 2.6;
      if (a > 1) a = 1;
      var i = (y * 256 + x) * 4;
      img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255;
      img.data[i + 3] = (a * 200) | 0;
    }
    ctx.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  var cloudTex = makeCloudTexture();
  var cloudMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(256, 256),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })
  );
  cloudMesh.rotation.x = -Math.PI / 2;
  cloudMesh.frustumCulled = false;
  scene.add(cloudMesh);

  // ---------- particles ----------
  var MAXP = 500;
  var pPos = new Float32Array(MAXP * 3);
  var pCol = new Float32Array(MAXP * 3);
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
  var pMat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95 });
  var pMesh = new THREE.Points(pGeo, pMat);
  pMesh.frustumCulled = false;
  scene.add(pMesh);
  var particles = [];

  function burst(x, y, z, r, g, b, n, spd) {
    for (var i = 0; i < n; i++) {
      if (particles.length >= MAXP) break;
      var a = Math.random() * Math.PI * 2, a2 = Math.random() * Math.PI;
      var v = (0.4 + Math.random() * 0.6) * spd;
      particles.push({
        x: x, y: y, z: z,
        vx: Math.cos(a) * Math.sin(a2) * v,
        vy: Math.abs(Math.cos(a2)) * v * 1.4 + 1,
        vz: Math.sin(a) * Math.sin(a2) * v,
        life: 0.4 + Math.random() * 0.5,
        r: r, g: g, b: b
      });
    }
  }

  function updateParticles(dt) {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy -= 18 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
    for (var j = 0; j < particles.length; j++) {
      pPos[j * 3] = particles[j].x; pPos[j * 3 + 1] = particles[j].y; pPos[j * 3 + 2] = particles[j].z;
      pCol[j * 3] = particles[j].r; pCol[j * 3 + 1] = particles[j].g; pCol[j * 3 + 2] = particles[j].b;
    }
    pGeo.setDrawRange(0, particles.length);
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  // ---------- crack overlay + highlight ----------
  var crackGeo = new THREE.BoxGeometry(1.004, 1.004, 1.004);
  var crackMat = new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, depthWrite: false });
  var crackMesh = new THREE.Mesh(crackGeo, crackMat);
  crackMesh.frustumCulled = false;
  crackMesh.renderOrder = 10;
  crackMesh.visible = false;
  scene.add(crackMesh);

  var hlMesh = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
    new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.6 })
  );
  hlMesh.frustumCulled = false;
  hlMesh.visible = false;
  scene.add(hlMesh);

  function setCrackFrame(u0, v0, u1, v1) {
    var uv = crackGeo.attributes.uv;
    for (var i = 0; i < uv.count; i++) {
      var u = uv.getX(i), v = uv.getY(i);
      uv.setXY(i, u0 + u * (u1 - u0), v0 + v * (v1 - v0));
    }
    uv.needsUpdate = true;
  }

  // ---------- chunk nodes ----------
  var mesher = null; // set per world
  var chunkNodes = {};

  function ensureNode(cx, cz) {
    var k = cx + ',' + cz;
    var n = chunkNodes[k];
    if (!n) {
      n = { cx: cx, cz: cz, meshes: { opaque: null, water: null, plant: null } };
      chunkNodes[k] = n;
    }
    return n;
  }

  function remeshChunk(cx, cz) {
    if (!game.world) return;
    var node = chunkNodes[cx + ',' + cz];
    if (!node) return;
    var g = mesher.build(cx, cz);
    var kinds = ['opaque', 'water', 'plant'];
    for (var k2 = 0; k2 < 3; k2++) {
      (function (kind) {
        var geom = g ? g[kind] : null;
        var m = node.meshes[kind];
        if (geom) {
          if (!m) {
            m = new THREE.Mesh(geom, matsByKind[kind]);
            if (kind === 'water') { m.renderOrder = 2; }
            scene.add(m);
            node.meshes[kind] = m;
          } else {
            m.geometry.dispose();
            m.geometry = geom;
          }
          m.visible = true;
        } else if (m) {
          m.geometry.dispose();
          scene.remove(m);
          node.meshes[kind] = null;
        }
      })(kinds[k2]);
    }
  }

  function unloadFar() {
    if (!game.world) return;
    var pcx = Math.floor(game.player.pos.x / 16), pcz = Math.floor(game.player.pos.z / 16);
    var R = game.R;
    for (var k in chunkNodes) {
      var n = chunkNodes[k];
      var dx = n.cx - pcx, dz = n.cz - pcz;
      if (dx * dx + dz * dz > (R + 3) * (R + 3)) {
        var kinds = ['opaque', 'water', 'plant'];
        for (var i = 0; i < 3; i++) {
          var m = n.meshes[kinds[i]];
          if (m) { m.geometry.dispose(); scene.remove(m); n.meshes[kinds[i]] = null; }
        }
        delete chunkNodes[k];
      }
    }
  }

  function clearScene() {
    for (var k in chunkNodes) {
      var n = chunkNodes[k];
      var kinds = ['opaque', 'water', 'plant'];
      for (var i = 0; i < 3; i++) {
        var m = n.meshes[kinds[i]];
        if (m) { m.geometry.dispose(); scene.remove(m); }
      }
    }
    chunkNodes = {};
    particles.length = 0;
  }

  // ---------- game state ----------
  var game = {
    world: null,
    player: null,
    mode: 'survival',
    hotbar: [null, null, null, null, null, null, null, null, null],
    selected: 0,
    creativeSel: 12,
    tod: 0.3,
    day: 1,
    R: 7,
    state: 'menu',
    saveName: null
  };
  UI.setGame(game);

  var inventoryOpen = false;
  var suppressPause = false;
  var breakProgress = 0;
  var mouse = { down: false, x: 0, y: 0 };
  var input = { keys: {}, wTapTime: 0, _lastWTap: 0 };
  var targetRay = null;
  var autoSaveTimer = 0;
  var debugOn = false;
  var fpsCount = 0, fpsTime = 0, fps = 0;
  var cloudDrift = 0;
  var wanted = [], wantedSet = {}, lastPCX = 1e9, lastPCZ = 1e9, lastR = 0;
  var unloadTick = 0;

  function sunDir() {
    var ang = game.tod * Math.PI * 2;
    return new THREE.Vector3(Math.cos(ang), Math.sin(ang), -0.35).normalize();
  }

  function lerpColor(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
  }

  function updateSky() {
    var sd = sunDir();
    var s = (sd.y + 0.08) / 0.43;
    if (s < 0) s = 0; if (s > 1) s = 1;
    var dayLight = 0.18 + 0.82 * (s * s * (3 - 2 * s));
    var d = (sd.y + 0.15) / 0.45;
    if (d < 0) d = 0; if (d > 1) d = 1;
    d = d * d * (3 - 2 * d);

    var zen = lerpColor({ r: 0.012, g: 0.015, b: 0.05 }, { r: 0.24, g: 0.44, b: 0.85 }, d);
    var hor = lerpColor({ r: 0.02, g: 0.025, b: 0.06 }, { r: 0.66, g: 0.78, b: 0.95 }, d);

    skyMat.uniforms.uZenith.value.setRGB(zen.r, zen.g, zen.b);
    skyMat.uniforms.uHorizon.value.setRGB(hor.r, hor.g, hor.b);
    skyMat.uniforms.uSunDir.value.copy(sd);
    skyMat.uniforms.uNight.value = 1 - d;
    skyMat.uniforms.uDayAmt.value = d;

    var R16 = game.R * 16;
    for (var i = 0; i < voxelMats.length; i++) {
      var u = voxelMats[i].uniforms;
      u.uDay.value = dayLight;
      u.uFogColor.value.setRGB(hor.r, hor.g, hor.b);
      u.uFogNear.value = R16 * 0.55;
      u.uFogFar.value = R16 * 0.98;
    }

    var p = game.player ? game.player.pos : camera.position;
    skyMesh.position.copy(p);

    cloudMesh.position.x = p.x;
    cloudMesh.position.z = p.z;
    cloudDrift += 0.002;
    cloudTex.offset.x = p.x / 256 + cloudDrift;
    cloudTex.offset.y = -p.z / 256;
  }

  // ---------- streaming ----------
  function rebuildWanted() {
    var p = game.player.pos;
    var pcx = Math.floor(p.x / 16), pcz = Math.floor(p.z / 16);
    if (pcx === lastPCX && pcz === lastPCZ && lastR === game.R) return;
    lastPCX = pcx; lastPCZ = pcz; lastR = game.R;
    wanted = []; wantedSet = {};
    var R = game.R;
    for (var dx = -R; dx <= R; dx++) for (var dz = -R; dz <= R; dz++) {
      if (dx * dx + dz * dz > R * R) continue;
      var cx = pcx + dx, cz = pcz + dz;
      var k = cx + ',' + cz;
      wantedSet[k] = true;
      wanted.push({ cx: cx, cz: cz, k: k, d2: dx * dx + dz * dz });
    }
    wanted.sort(function (a, b) { return a.d2 - b.d2; });
  }

  function streaming() {
    if (!game.world) return;
    rebuildWanted();
    var w = game.world;

    var genBudget = 3;
    for (var i = 0; i < wanted.length && genBudget > 0; i++) {
      var wk = wanted[i];
      if (!w.chunks[wk.k]) {
        w.ensureChunk(wk.cx, wk.cz);
        w.computeSky(w.chunks[wk.k]);
        genBudget--;
      }
    }

    for (var i2 = 0; i2 < wanted.length; i2++) {
      var w2 = wanted[i2];
      var ch = w.chunks[w2.k];
      if (!ch || ch.lightDone) continue;
      if (w.neighborReady(ch.cx, ch.cz)) {
        w.relight(ch, null);
        w.markDirty(ch.cx, ch.cz);
      }
    }

    var dirty = w.takeDirty();
    var keys = Object.keys(dirty);
    if (keys.length) {
      var pp = game.player.pos;
      keys.sort(function (a, b) {
        var pa = a.split(','), pb = b.split(',');
        var ax = pa[0] * 16 + 8, az = pa[1] * 16 + 8, bx = pb[0] * 16 + 8, bz = pb[1] * 16 + 8;
        var da = (ax - pp.x) * (ax - pp.x) + (az - pp.z) * (az - pp.z);
        var db = (bx - pp.x) * (bx - pp.x) + (bz - pp.z) * (bz - pp.z);
        return da - db;
      });
      for (var i3 = 4; i3 < keys.length; i3++) w.dirty[keys[i3]] = true;
      for (var i4 = 0; i4 < keys.length && i4 < 4; i4++) {
        var parts = keys[i4].split(',');
        ensureNode(+parts[0], +parts[1]);
        remeshChunk(+parts[0], +parts[1]);
      }
    }

    if ((unloadTick++ % 30) === 0) unloadFar();
  }

  // ---------- world start (loading steps) ----------
  function runSteps(steps, done) {
    var subEl = document.getElementById('loading-sub');
    var barEl = document.getElementById('loading-bar');
    var i = 0;
    (function step() {
      if (i >= steps.length) { done(); return; }
      var s = steps[i++];
      if (subEl && s[0]) subEl.textContent = s[0];
      if (barEl) barEl.style.width = Math.round(s[1] * 100) + '%';
      s[2]();
      requestAnimationFrame(function () { requestAnimationFrame(step); });
    })();
  }

  function relightPass() {
    var w = game.world;
    for (var a = -2; a <= 2; a++) for (var b = -2; b <= 2; b++) {
      var cx = game._loadCX + b, cz = game._loadCZ + a;
      var ch = w.chunks[cx + ',' + cz];
      if (!ch || ch.lightDone) continue;
      if (w.neighborReady(cx, cz)) {
        w.relight(ch, null);
        w.markDirty(cx, cz);
      }
    }
  }

  function startWorld(name, seed, mode, loadExisting) {
    Audio.init();
    var data = null;
    if (loadExisting) {
      try { data = JSON.parse(localStorage.getItem('blockcraft:save:' + name)); } catch (e) { data = null; }
      if (data && data.seed != null) seed = data.seed;
    }
    game.state = 'loading';
    UI.show('loading-screen');
    var spRef = { x: 8, y: 40, z: 8 };
    var steps = [];

    steps.push(['Reading world data...', 0.06, function () {
      clearScene();
      game.world = new World(seed);
      if (data && data.edits) game.world.applyEdits(data.edits);
      game.mode = mode || (data && data.mode) || 'survival';
      game.saveName = name;
      game.tod = data && data.tod != null ? data.tod : 0.3;
      game.day = data && data.day ? data.day : 1;
      game.hotbar = [null, null, null, null, null, null, null, null, null];
      if (mode === 'creative') {
        for (var i = 0; i < 9; i++) game.hotbar[i] = { id: Blocks.CREATIVE_LIST[i % Blocks.CREATIVE_LIST.length] };
      }
      mesher = new Mesher(game.world, TEX.uvRect);
    }]);

    steps.push(['Finding spawn point...', 0.14, function () {
      var sp = null;
      if (data && data.player) {
        sp = { x: data.player.x, y: data.player.y, z: data.player.z };
      } else {
        sp = game.world.findSpawn();
      }
      game.spawn = sp;
      spRef.x = sp.x; spRef.y = sp.y; spRef.z = sp.z;
      game._loadCX = Math.floor(sp.x / 16);
      game._loadCZ = Math.floor(sp.z / 16);
    }]);

    for (var r = -2; r <= 2; r++) {
      (function (rr) {
        steps.push(['Carving terrain...', 0.14 + 0.55 * (rr + 3) / 5, function () {
          var w = game.world;
          for (var d = -2; d <= 2; d++) {
            var ch = w.ensureChunk(game._loadCX + d, game._loadCZ + rr);
            w.computeSky(ch);
          }
        }]);
      })(r);
    }

    steps.push(['Spreading light...', 0.74, relightPass]);
    steps.push(['Spreading light...', 0.82, relightPass]);
    steps.push(['Spreading light...', 0.90, relightPass]);

    steps.push(['Placing you down...', 0.97, function () {
      game.player = new Player(spRef.x, spRef.y + 0.01, spRef.z);
      if (data && data.player) {
        var pl = data.player;
        game.player.yaw = pl.yaw || 0;
        game.player.pitch = pl.pitch || 0;
        game.player.health = pl.health != null ? pl.health : 20;
        game.player.hunger = pl.hunger != null ? pl.hunger : 20;
        game.player.air = pl.air != null ? pl.air : 10;
        game.player.flying = !!pl.flying;
      }
      breakProgress = 0;
      UI.renderHotbar();
    }]);

    runSteps(steps, function () {
      game.state = 'playing';
      UI.show(null);
      lockPointer();
    });
  }

  // ---------- interaction ----------
  function relightEdit(x, y, z) {
    var cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      var ch = game.world.getChunk(cx + dx, cz + dz);
      if (ch) game.world.relight(ch, x, y, z);
    }
  }

  function addItem(id) {
    var hb = game.hotbar;
    for (var i = 0; i < 9; i++) if (hb[i] && hb[i].id === id) { hb[i].count = (hb[i].count || 1) + 1; UI.renderHotbar(); return true; }
    for (var j = 0; j < 9; j++) if (!hb[j]) { hb[j] = { id: id, count: 1 }; UI.renderHotbar(); return true; }
    return false;
  }

  function doBreak(ray) {
    var def = Blocks.def[ray.id];
    if (game.mode === 'survival') {
      if (!addItem(ray.id)) UI.toast('Inventory full!');
    }
    game.world.setBlock(ray.x, ray.y, ray.z, 0);
    relightEdit(ray.x, ray.y, ray.z);
    Audio.dig(def.dig, true);
    var col = TEX.avgColor(ray.id);
    burst(ray.x + 0.5, ray.y + 0.5, ray.z + 0.5, col[0] / 255, col[1] / 255, col[2] / 255, 18, 2.6);
  }

  function tryPlace() {
    var ray = game.player.raycast(game.world, 5.5);
    if (!ray) return;
    var id;
    if (game.mode === 'creative') id = game.creativeSel;
    else {
      var it = game.hotbar[game.selected];
      if (!it) { UI.toast('Nothing selected'); return; }
      id = it.id;
    }
    var cell = ray.plant ? [ray.x, ray.y, ray.z] : ray.prev;
    if (cell[1] < 0 || cell[1] >= 80) return;
    var def = Blocks.def[id];
    if (!def.plant) {
      var p = game.player.pos;
      if (cell[0] + 1 > p.x - 0.3 && cell[0] < p.x + 0.3 &&
          cell[2] + 1 > p.z - 0.3 && cell[2] < p.z + 0.3 &&
          cell[1] + 1 > p.y && cell[1] < p.y + 1.8) return;
    }
    if (game.mode === 'survival') {
      var slot = game.hotbar[game.selected];
      slot.count--;
      if (slot.count <= 0) game.hotbar[game.selected] = null;
      UI.renderHotbar();
    }
    game.world.setBlock(cell[0], cell[1], cell[2], id);
    relightEdit(cell[0], cell[1], cell[2]);
    Audio.place(def.dig);
  }

  function updateInteraction(dt) {
    var locked = document.pointerLockElement === canvas;
    if (!locked || game.state !== 'playing' || inventoryOpen || !game.player) {
      crackMesh.visible = false;
      hlMesh.visible = false;
      breakProgress = Math.max(0, breakProgress - dt * 8);
      UI.setBreakProgress(breakProgress);
      targetRay = null;
      return;
    }
    var ray = game.player.raycast(game.world, 5.5);
    targetRay = ray;
    hlMesh.visible = !!ray;
    if (ray) {
      hlMesh.position.set(ray.x + 0.5, ray.y + 0.5, ray.z + 0.5);
      var def = Blocks.def[ray.id];
      var can = def.hardness >= 0;
      if (mouse.down && can) {
        if (game.mode === 'creative') breakProgress = 1;
        else breakProgress += dt / def.hardness;
      } else {
        breakProgress = Math.max(0, breakProgress - dt * 8);
      }
      if (can && breakProgress >= 1) {
        doBreak(ray);
        breakProgress = 0;
      }
      if (mouse.down && can && breakProgress > 0) {
        crackMesh.visible = true;
        crackMesh.position.set(ray.x + 0.5, ray.y + 0.5, ray.z + 0.5);
        var fr = Math.min(7, (breakProgress * 8) | 0);
        var rec = TEX.uvRect(40 + fr);
        setCrackFrame(rec.u0, rec.v0, rec.u1, rec.v1);
      } else {
        crackMesh.visible = false;
      }
    } else {
      breakProgress = Math.max(0, breakProgress - dt * 8);
      crackMesh.visible = false;
    }
    UI.setBreakProgress(breakProgress);
  }

  // ---------- save / load ----------
  function saveGame() {
    if (!game.world || game.state === 'menu') return;
    var edits = game.world.collectEdits();
    var n = 0;
    for (var k in edits) n++;
    if (n > 20000) return;
    var p = game.player;
    var data = {
      v: 1,
      name: game.saveName,
      seed: game.world.seed,
      mode: game.mode,
      tod: game.tod,
      day: game.day,
      player: {
        x: p.pos.x, y: p.pos.y, z: p.pos.z,
        yaw: p.yaw, pitch: p.pitch,
        health: p.health, hunger: p.hunger, air: p.air,
        flying: p.flying
      },
      edits: edits
    };
    try {
      localStorage.setItem('blockcraft:save:' + game.saveName, JSON.stringify(data));
    } catch (e) { return; }
  }

  // ---------- main loop ----------
  var lastTime = performance.now();

  function frame() {
    requestAnimationFrame(frame);
    var now = performance.now();
    var dt = (now - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = now;

    fpsCount++;
    if (now - fpsTime > 500) {
      fps = Math.round(fpsCount * 1000 / (now - fpsTime));
      fpsCount = 0; fpsTime = now;
    }

    if (game.state === 'playing' || game.state === 'paused') {
      updateSky();
      if (game.state === 'playing' && document.pointerLockElement === canvas && !inventoryOpen) {
        game.player.update(dt, game.world, input, game.mode);
      }
      streaming();
      updateInteraction(dt);
      updateParticles(dt);
      Audio.update();

      if (game.state === 'playing') {
        game.tod += dt / 600;
        if (game.tod >= 1) { game.tod -= 1; game.day++; }
        autoSaveTimer += dt;
        if (autoSaveTimer > 30) {
          autoSaveTimer = 0;
          saveGame();
        }
        UI.renderStats(game.player);
        UI.setWaterTint(game.player.eyeInWater);
        UI.showPointerHint(document.pointerLockElement !== canvas && !inventoryOpen);
        if (debugOn) {
          var p = game.player.pos;
          UI.setDebug(
            'Blockcraft ' + fps + ' fps<br>' +
            'x ' + p.x.toFixed(1) + ' y ' + p.y.toFixed(1) + ' z ' + p.z.toFixed(1) + '<br>' +
            'chunk ' + Math.floor(p.x / 16) + ',' + Math.floor(p.z / 16) + '<br>' +
            'day ' + game.day + ' time ' + (game.tod * 24).toFixed(1) + 'h<br>' +
            game.mode + (game.player.flying ? ' (flying)' : '')
          );
        }
      }
    }

    // camera always follows player (even paused/dead, so world stays visible)
    if (game.player) {
      var e = game.player.eyePos();
      camera.position.copy(e);
      camera.rotation.y = game.player.yaw;
      camera.rotation.x = game.player.pitch;
    }

    renderer.render(scene, camera);
  }

  // ---------- input ----------
  function lockPointer() {
    try {
      var p = lockPointer();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    } catch (e) {}
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.code === 'F3') {
      ev.preventDefault();
      debugOn = !debugOn;
      document.getElementById('debug-overlay').classList.toggle('hidden', !debugOn);
      return;
    }
    if (game.state !== 'playing') return;
    input.keys[ev.code] = true;

    if (ev.code === 'KeyE') {
      ev.preventDefault();
      if (inventoryOpen) closeInventory();
      else openInventory();
      return;
    }
    if (ev.code === 'Escape') {
      if (inventoryOpen) closeInventory();
      return;
    }
    if (ev.code === 'KeyF' && game.mode === 'creative') {
      game.player.flying = !game.player.flying;
      if (game.player.flying) game.player.vel.y = 0;
      UI.toast('Flying: ' + (game.player.flying ? 'on' : 'off'));
      return;
    }
    if (ev.code === 'KeyM') {
      toggleMode();
      return;
    }
    var m = /^Digit([1-9])$/.exec(ev.code);
    if (m) {
      game.selected = +m[1] - 1;
      UI.renderHotbar();
    }
  });

  document.addEventListener('keyup', function (ev) {
    input.keys[ev.code] = false;
  });

  document.addEventListener('wheel', function (ev) {
    if (game.state !== 'playing') return;
    var d = ev.deltaY > 0 ? 1 : -1;
    game.selected = (game.selected + d + 9) % 9;
    UI.renderHotbar();
  }, { passive: true });

  canvas.addEventListener('mousedown', function (ev) {
    if (game.state !== 'playing') return;
    if (document.pointerLockElement !== canvas) { lockPointer(); return; }
    if (ev.button === 0) mouse.down = true;
    if (ev.button === 2) tryPlace();
  });

  document.addEventListener('mouseup', function (ev) {
    if (ev.button === 0) mouse.down = false;
  });

  document.addEventListener('mousemove', function (ev) {
    if (document.pointerLockElement !== canvas) return;
    if (game.state !== 'playing' || !game.player) return;
    game.player.yaw -= ev.movementX * 0.0022;
    game.player.pitch -= ev.movementY * 0.0022;
    if (game.player.pitch > 1.55) game.player.pitch = 1.55;
    if (game.player.pitch < -1.55) game.player.pitch = -1.55;
  });

  canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

  document.addEventListener('pointerlockchange', function () {
    var locked = document.pointerLockElement === canvas;
    if (locked) {
      if (game.state === 'paused') {
        game.state = 'playing';
        UI.show(null);
      }
      UI.showPointerHint(false);
    } else {
      if (suppressPause) { suppressPause = false; return; }
      if (inventoryOpen) { closeInventory(); return; }
      if (game.state === 'playing') {
        game.state = 'paused';
        UI.show('pause-screen');
        mouse.down = false;
      }
    }
  });

  window.addEventListener('blur', function () {
    input.keys = {};
    mouse.down = false;
  });

  window.addEventListener('resize', function () { onResize(); });

  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (game.state === 'menu') drawTitleBg();
  }

  function drawTitleBg() {
    var bg = document.getElementById('title-bg');
    if (!bg) return;
    try {
      bg.width = window.innerWidth; bg.height = window.innerHeight;
      var bctx = bg.getContext('2d');
      bctx.imageSmoothingEnabled = false;
      var tile = TEX.tileCanvas(0);
      if (tile) {
        var tileBig = document.createElement('canvas');
        tileBig.width = tile.width * 4; tileBig.height = tile.height * 4;
        var tctx = tileBig.getContext('2d');
        tctx.imageSmoothingEnabled = false;
        tctx.drawImage(tile, 0, 0, tileBig.width, tileBig.height);
        bctx.fillStyle = bctx.createPattern(tileBig, 'repeat');
        bctx.fillRect(0, 0, bg.width, bg.height);
      } else {
        bctx.fillStyle = '#4a7a2a';
        bctx.fillRect(0, 0, bg.width, bg.height);
      }
    } catch (e) { /* ignore */ }
  }

  window.onPlayerHurt = function (n, type) {
    UI.flashDamage();
  };

  window.onPlayerDeath = function () {
    if (game.state !== 'playing') return;
    game.state = 'dead';
    mouse.down = false;
    breakProgress = 0;
    crackMesh.visible = false;
    hlMesh.visible = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    UI.show('death-screen');
  };

  // ---------- game API used by UI ----------
  function openInventory() {
    inventoryOpen = true;
    UI.openInventory();
    suppressPause = true;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function closeInventory() {
    if (!inventoryOpen) return;
    inventoryOpen = false;
    UI.show(null);
    if (game.state === 'playing') lockPointer();
  }

  function toggleMode() {
    game.mode = game.mode === 'survival' ? 'creative' : 'survival';
    if (game.mode === 'creative') {
      for (var i = 0; i < 9; i++) {
        if (!game.hotbar[i]) game.hotbar[i] = { id: Blocks.CREATIVE_LIST[i % Blocks.CREATIVE_LIST.length] };
      }
    } else {
      if (game.player.flying) {
        game.player.flying = false;
        game.player.vel.y = Math.min(game.player.vel.y, 0);
      }
    }
    UI.toast('Mode: ' + (game.mode === 'creative' ? 'Creative' : 'Survival'));
    UI.renderHotbar();
  }

  game.createWorld = function (name, seed, mode) {
    // unique name
    var worlds = [];
    try { worlds = JSON.parse(localStorage.getItem('blockcraft:worlds') || '[]'); } catch (e) {}
    var final = name, n2 = 2;
    while (worlds.some(function (w) { return w.name === final; })) {
      final = name + ' ' + n2++;
    }
    name = final;
    var exists = worlds.some(function (w) { return w.name === name; });
    if (!exists) {
      worlds.push({ name: name, seed: seed, mode: mode });
      localStorage.setItem('blockcraft:worlds', JSON.stringify(worlds));
    }
    startWorld(name, seed, mode, exists);
  };

  game.loadWorld = function (name) {
    startWorld(name, null, null, true);
  };

  game.resume = function () {
    lockPointer();
  };

  game.save = function () { saveGame(); };

  game.quitToTitle = function () {
    saveGame();
    game.state = 'menu';
    game.world = null;
    game.player = null;
    clearScene();
    UI.show('title');
  };

  game.respawn = function () {
    var p = game.player;
    p.pos.set(game.spawn.x, game.spawn.y + 0.01, game.spawn.z);
    p.vel.set(0, 0, 0);
    p.yaw = 0; p.pitch = 0;
    p.health = 20; p.hunger = 20; p.air = 10;
    p.flying = false;
    p.fallStartY = null;
    if (game.mode === 'survival') {
      game.hotbar = [null, null, null, null, null, null, null, null, null];
      UI.renderHotbar();
      UI.toast('Your items were dropped');
    }
    breakProgress = 0;
    game.state = 'playing';
    UI.show(null);
    lockPointer();
  };

  game.closeInventory = function () { closeInventory(); };

  game.applyOptions = function (o) {
    game.R = o.render;
    camera.fov = o.fov;
    camera.updateProjectionMatrix();
    Audio.setVolumes(o.master / 100, o.music / 100);
    Audio.setMusicOn(o.musicOn);
  };

  // ---------- boot ----------
  cloudMesh.position.set(0, 60, 0);

  (function boot() {
    onResize();
    var opts = UI.loadOpts();
    game.R = opts.render;
    camera.fov = opts.fov;
    camera.updateProjectionMatrix();

    drawTitleBg();

    UI.init();
    frame();
  })();
})();
