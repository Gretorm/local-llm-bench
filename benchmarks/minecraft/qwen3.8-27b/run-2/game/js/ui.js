/* ui.js - HUD, menus, save/load */
window.UI = (function () {
  'use strict';

  var game = null;
  var hotbarEls = [];
  var heartEls = [], foodEls = [], bubbleEls = [];
  var toastTimer = null;
  var _lastHealth = -1, _lastHunger = -1, _lastAir = -1;

  function $(id) { return document.getElementById(id); }

  // ---------- pixel icons ----------
  function makeIcon(rows, colorFn) {
    var c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    var ctx = c.getContext('2d');
    for (var y = 0; y < 8; y++) {
      for (var x = 0; x < 8; x++) {
        var ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        ctx.fillStyle = colorFn(ch);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  var HEART_FULL = ['.XX..XX.', 'XXXXXXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '...XX...', '........', '........'];
  var FOOD = ['....XXX.', '...XXXX.', '..XXXXX.', '..XXXX..', '..XXXX..', '...XX...', '...X....', '..XX....'];
  var BUBBLE = ['..XXX...', '.X...X..', 'X.....X.', 'X.....X.', 'X.....X.', '.X...X..', '..XXX...', '........'];

  var icons = {};

  function halfIcon(full, empty) {
    var c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    var x = c.getContext('2d');
    x.drawImage(full, 0, 0);
    x.fillStyle = empty ? '#3a3a3a' : '#4a4a4a';
    x.fillRect(4, 0, 4, 8);
    return c;
  }

  function buildIcons() {
    icons.heartFull = makeIcon(HEART_FULL, function () { return '#ef4040'; });
    icons.heartEmpty = makeIcon(HEART_FULL, function () { return '#3a3a3a'; });
    icons.heartHalf = halfIcon(icons.heartFull, true);
    icons.foodFull = makeIcon(FOOD, function () { return '#c98a4b'; });
    icons.foodEmpty = makeIcon(FOOD, function () { return '#4a4a4a'; });
    icons.foodHalf = halfIcon(icons.foodFull, false);
    icons.bubFull = makeIcon(BUBBLE, function () { return '#9fd4ff'; });
    icons.bubEmpty = makeIcon(BUBBLE, function () { return '#33475a'; });
  }

  // ---------- screens ----------
  function show(screen) {
    var overlays = ['world-select', 'options-screen', 'help-screen', 'pause-screen', 'inventory-screen', 'death-screen', 'loading-screen'];
    for (var i = 0; i < overlays.length; i++) {
      $(overlays[i]).classList.toggle('hidden', screen !== overlays[i]);
    }
    $('title-screen').classList.toggle('hidden', screen !== 'title');
    // hud visible only when actually playing (screen === null)
    $('hud').classList.toggle('hidden', screen !== null);
  }

  // ---------- hotbar ----------
  function buildHotbar() {
    var hb = $('hotbar');
    hb.innerHTML = '';
    hotbarEls = [];
    for (var i = 0; i < 9; i++) {
      var slot = document.createElement('div');
      slot.className = 'slot';
      var ic = document.createElement('canvas');
      ic.width = 32; ic.height = 32;
      var cnt = document.createElement('span');
      cnt.className = 'slot-count';
      slot.appendChild(ic); slot.appendChild(cnt);
      hb.appendChild(slot);
      hotbarEls.push({ slot: slot, ic: ic, cnt: cnt });
    }
  }

  function renderHotbar() {
    if (!game) return;
    for (var i = 0; i < 9; i++) {
      var e = hotbarEls[i];
      var it = game.hotbar[i];
      var ctx = e.ic.getContext('2d');
      ctx.clearRect(0, 0, 32, 32);
      if (it) {
        var icon = Textures.icon(it.id);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(icon, 0, 0, 32, 32);
        e.cnt.textContent = it.count ? String(it.count) : '';
        e.slot.title = Blocks.def[it.id].name;
      } else {
        e.cnt.textContent = '';
        e.slot.title = '';
      }
      e.slot.classList.toggle('selected', i === game.selected);
    }
  }

  // ---------- status bars ----------
  function buildBars() {
    function makeBar(id, list) {
      var wrap = $(id);
      var arr = [];
      for (var i = 0; i < 10; i++) {
        var s = document.createElement('span');
        var c = document.createElement('canvas');
        c.width = 8; c.height = 8;
        c.style.width = '16px'; c.style.height = '16px';
        s.appendChild(c);
        wrap.appendChild(s);
        arr.push(c);
      }
      return arr;
    }
    heartEls = makeBar('health-bar', icons.heartFull);
    foodEls = makeBar('hunger-bar', icons.foodFull);
    bubbleEls = makeBar('air-bar', icons.bubFull);
  }

  function drawBar(c, list, fill01) {
    var ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 8, 8);
    var base = list[2]; // empty
    ctx.drawImage(base, 0, 0);
    if (fill01 <= 0) return;
    var full = list[0];
    var half = list[1];
    if (fill01 >= 1) ctx.drawImage(full, 0, 0);
    else ctx.drawImage(half, 0, 0);
  }

  function renderStats(p) {
    if (p.health !== _lastHealth) {
      _lastHealth = p.health;
      for (var i = 0; i < 10; i++) drawBar(heartEls[i], [icons.heartFull, icons.heartHalf, icons.heartEmpty], Math.max(0, Math.min(1, (p.health - i * 2) / 2)));
    }
    if (p.hunger !== _lastHunger) {
      _lastHunger = p.hunger;
      for (var j = 0; j < 10; j++) drawBar(foodEls[j], [icons.foodFull, icons.foodHalf, icons.foodEmpty], Math.max(0, Math.min(1, (p.hunger - j * 2) / 2)));
    }
    if (p.air !== _lastAir) {
      _lastAir = p.air;
      for (var k = 0; k < 10; k++) drawBar(bubbleEls[k], [icons.bubFull, null, icons.bubEmpty], p.air > k ? 1 : 0);
      $('air-bar-wrap').classList.toggle('hidden', p.air >= 10);
    }
  }

  // ---------- toast / fx ----------
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }

  function flashDamage() {
    var d = $('damage-flash');
    d.classList.remove('hidden');
    setTimeout(function () { d.classList.add('hidden'); }, 220);
  }

  function setWaterTint(on) {
    $('water-tint').classList.toggle('hidden', !on);
  }

  function setBreakProgress(p) {
    var el = $('break-progress');
    if (p <= 0) { el.classList.add('hidden'); el.style.width = '0%'; return; }
    el.classList.remove('hidden');
    el.style.width = Math.min(1, p) * 100 + '%';
  }

  function setDebug(text) {
    $('debug-overlay').innerHTML = text;
  }

  // ---------- inventory ----------
  function openInventory() {
    show('inventory-screen');
    var grid = $('inventory-grid');
    grid.innerHTML = '';
    var list = game.mode === 'creative' ? Blocks.CREATIVE_LIST : null;
    if (game.mode === 'creative') {
      $('inventory-title').textContent = 'Blocks';
      for (var i = 0; i < list.length; i++) {
        (function (id) {
          var b = document.createElement('div');
          b.className = 'inv-cell' + (game.creativeSel === id ? ' sel' : '');
          var c = document.createElement('canvas');
          c.width = 40; c.height = 40;
          c.getContext('2d').drawImage(Textures.icon(id), 0, 0, 40, 40);
          var lb = document.createElement('div');
          lb.className = 'inv-label';
          lb.textContent = Blocks.def[id].name;
          b.appendChild(c); b.appendChild(lb);
          b.title = Blocks.def[id].name;
          b.onclick = function () {
            game.creativeSel = id;
            game.hotbar[game.selected] = { id: id };
            renderHotbar();
            openInventory();
          };
          grid.appendChild(b);
        })(list[i]);
      }
    } else {
      $('inventory-title').textContent = 'Inventory (survival)';
      for (var s = 0; s < 9; s++) {
        (function (i) {
          var b = document.createElement('div');
          b.className = 'inv-cell';
          var c = document.createElement('canvas');
          c.width = 40; c.height = 40;
          var it = game.hotbar[i];
          if (it) {
            var ctx2 = c.getContext('2d');
            ctx2.imageSmoothingEnabled = false;
            ctx2.drawImage(Textures.icon(it.id), 0, 0, 40, 40);
          }
          var lb = document.createElement('div');
          lb.className = 'inv-label';
          lb.textContent = it ? (Blocks.def[it.id].name + (it.count ? ' x' + it.count : '')) : '';
          b.appendChild(c); b.appendChild(lb);
          grid.appendChild(b);
        })(s);
      }
    }
  }

  // ---------- saves ----------
  function listWorlds() {
    try {
      var w = JSON.parse(localStorage.getItem('blockcraft:worlds') || '[]');
      return w;
    } catch (e) { return []; }
  }

  function saveWorlds(list) {
    localStorage.setItem('blockcraft:worlds', JSON.stringify(list));
  }

  function renderSaved() {
    var list = $('saved-list');
    list.innerHTML = '';
    var worlds = listWorlds();
    if (!worlds.length) {
      list.innerHTML = '<div class="muted saved-empty">No worlds yet. Create one above.</div>';
      return;
    }
    worlds.forEach(function (w) {
      var row = document.createElement('div');
      row.className = 'saved-row';
      var nm = document.createElement('div');
      nm.className = 'saved-name';
      nm.textContent = w.name;
      var sd = document.createElement('div');
      sd.className = 'saved-seed muted';
      sd.textContent = 'seed ' + w.seed + ' - ' + w.mode;
      var play = document.createElement('div');
      play.className = 'menu-btn small';
      play.textContent = 'Play';
      play.onclick = function () { if (game) game.loadWorld(w.name); };
      var del = document.createElement('div');
      del.className = 'menu-btn small danger';
      del.textContent = 'Delete';
      del.onclick = function () {
        if (!confirm('Delete world "' + w.name + '"?')) return;
        localStorage.removeItem('blockcraft:save:' + w.name);
        saveWorlds(listWorlds().filter(function (o) { return o.name !== w.name; }));
        renderSaved();
      };
      row.appendChild(nm); row.appendChild(sd); row.appendChild(play); row.appendChild(del);
      list.appendChild(row);
    });
  }

  function loadOpts() {
    try {
      var o = JSON.parse(localStorage.getItem('blockcraft:opts') || '{}');
      return {
        master: o.master != null ? o.master : 70,
        music: o.music != null ? o.music : 60,
        musicOn: o.musicOn != null ? o.musicOn : 1,
        render: o.render != null ? o.render : 7,
        fov: o.fov != null ? o.fov : 80
      };
    } catch (e) {
      return { master: 70, music: 60, musicOn: 1, render: 7, fov: 80 };
    }
  }

  function opts() {
    return {
      master: +$('opt-master').value,
      music: +$('opt-music').value,
      musicOn: $('opt-music-on').value === '1' ? 1 : 0,
      render: +$('opt-render').value,
      fov: +$('opt-fov').value
    };
  }

  // ---------- init ----------
  function init() {
    buildIcons();
    buildHotbar();
    buildBars();

    var o = loadOpts();
    $('opt-master').value = o.master;
    $('opt-music').value = o.music;
    $('opt-music-on').value = o.musicOn;
    $('opt-render').value = o.render;
    $('opt-fov').value = o.fov;

    function back() { show('title'); }

    $('btn-play').onclick = function () { renderSaved(); show('world-select'); };
    $('btn-cancel-select').onclick = back;
    $('btn-create').onclick = function () {
      var name = $('world-name').value.trim() || 'New World';
      var seedStr = $('world-seed').value.trim();
      var seed;
      if (seedStr === '') {
        seed = (Math.random() * 1e9) | 0;
      } else if (/^-?\d+$/.test(seedStr)) {
        seed = parseInt(seedStr, 10) % 2147483647;
      } else {
        var h = 2166136261 >>> 0;
        for (var i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
        seed = h % 2147483647;
      }
      if (game) game.createWorld(name, seed, $('world-mode').value);
    };

    $('btn-options').onclick = function () { show('options-screen'); };
    $('btn-options-back').onclick = back;
    ['opt-master', 'opt-music', 'opt-music-on', 'opt-render', 'opt-fov'].forEach(function (id) {
      $(id).onchange = function () {
        localStorage.setItem('blockcraft:opts', JSON.stringify(opts()));
        if (game) game.applyOptions(loadOpts());
      };
    });

    $('btn-help').onclick = function () { show('help-screen'); };
    $('btn-help-back').onclick = back;

    $('btn-pause-resume').onclick = function () { if (game) game.resume(); };
    $('btn-pause-save').onclick = function () { if (game) { game.save(); toast('World saved'); } };
    $('btn-pause-quit').onclick = function () { if (game) game.quitToTitle(); };
    $('btn-inv-close').onclick = function () { if (game) game.closeInventory(); };
    $('btn-respawn').onclick = function () { if (game) game.respawn(); };

    show('title');
  }

  window.UI = {
    init: init,
    setGame: function (g) { game = g; },
    show: show,
    renderHotbar: renderHotbar,
    renderStats: renderStats,
    toast: toast,
    flashDamage: flashDamage,
    setWaterTint: setWaterTint,
    setBreakProgress: setBreakProgress,
    setDebug: setDebug,
    openInventory: openInventory,
    loadOpts: loadOpts,
    showPointerHint: function (on) { $('pointer-hint').classList.toggle('hidden', !on); }
  };
  return window.UI;
})();
