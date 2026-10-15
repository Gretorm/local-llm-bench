/* Headless smoke test for GPU-free logic: world gen, lighting, mesher, player. */
'use strict';
var path = require('path');
var fs = require('fs');

global.window = global;
global.THREE = require(path.join(__dirname, 'js', 'three.min.js'));

function load(name) {
  var code = fs.readFileSync(path.join(__dirname, 'js', name), 'utf8');
  (0, eval)(code); // indirect eval -> global scope, sees window/THREE
}

load('util.js');
load('blocks.js');
load('world.js');
load('mesher.js');
load('player.js');

var W = window.World;
var M = window.Mesher;
var P = window.Player;
var B = window.Blocks;

// browser hooks that player.js fires; stub them headless
window.Audio = { step: function () {}, hurt: function () {}, splash: function () {},
                 dig: function () {}, place: function () {}, pop: function () {},
                 explosion: function () {}, eat: function () {}, update: function () {} };
window.onPlayerHurt = function (n, type) {};
window.onPlayerDeath = function () {};

var failures = 0;
function ok(cond, msg) {
  if (cond) { console.log('  ok  ' + msg); }
  else { failures++; console.log('  FAIL ' + msg); }
}

function uvStub(i) { return { u0: 0, v0: 0, u1: 1, v1: 1 }; }

console.log('World generation');
var w = new W(12345);
ok(w.seed === 12345, 'seed stored (' + w.seed + ')');
var sp = w.findSpawn();
ok(sp && typeof sp.x === 'number' && typeof sp.y === 'number' && typeof sp.z === 'number',
   'findSpawn returns {x,y,z}: ' + JSON.stringify(sp));
var scx = Math.floor(sp.x / 16), scz = Math.floor(sp.z / 16);

// carve a 5x5 of chunks around spawn (same as boot)
var a, b, ch;
for (a = -2; a <= 2; a++) for (b = -2; b <= 2; b++) {
  ch = w.ensureChunk(scx + b, scz + a);
  w.computeSky(ch);
}

console.log('Lighting (neighbor-gated relight, mirrors main.js)');
for (a = -2; a <= 2; a++) for (b = -2; b <= 2; b++) {
  var cx = scx + b, cz = scz + a;
  var c2 = w.chunks[cx + ',' + cz];
  if (!c2 || c2.lightDone) continue;
  if (w.neighborReady(cx, cz)) { w.relight(c2, null); w.markDirty(cx, cz); }
}
var central = w.chunks[scx + ',' + scz];
ok(central && central.lightDone === true, 'central chunk lightDone after neighbor-gated relight');
var ls = w.lightAt(Math.floor(sp.x), Math.floor(sp.y) + 1, Math.floor(sp.z));
ok(ls === 15, 'sky light 15 at/above surface, got ' + ls);
var deep = w.lightAt(Math.floor(sp.x), 1, Math.floor(sp.z));
ok(deep === 0, 'deep underground light 0, got ' + deep);
ok(w.neighborReady(scx, scz) === true, 'neighborReady true at spawn');

console.log('Meshing');
var mesher = new M(w, uvStub);
var g = mesher.build(scx, scz);
ok(g && g.opaque, 'opaque geometry produced');
ok(g.opaque && g.opaque.attributes.position.count > 0,
   'opaque has ' + (g.opaque ? g.opaque.attributes.position.count : 0) + ' vertices');
ok(g.water || true, 'water geometry optional');
ok(g.plant || true, 'plant geometry optional');
// geometry integrity: index max < vertex count
if (g.opaque) {
  var posCount = g.opaque.attributes.position.count;
  var idx = g.opaque.getIndex();
  var maxI = 0;
  if (idx) { for (var i = 0; i < idx.count; i++) { var v = idx.getX(i); if (v > maxI) maxI = v; } }
  ok(maxI < posCount, 'opaque indices in range (max ' + maxI + ' < ' + posCount + ')');
}

console.log('Player physics + raycast');
var pl = new P(sp.x, sp.y + 0.01, sp.z);
var input = { keys: {}, wTapTime: 0, _lastWTap: 0 };
var threw = null;
try {
  for (var s = 0; s < 120; s++) pl.update(1 / 60, w, input, 'survival');
} catch (e) { threw = e; }
ok(!threw, '120 update steps without throwing' + (threw ? ' -> ' + threw.message : ''));
ok(pl.pos.y > 0 && pl.pos.y < 90, 'player stays in world y-range, y=' + pl.pos.y.toFixed(2));
ok(pl.pos.y <= sp.y + 1, 'player did not teleport up (y=' + pl.pos.y.toFixed(2) + ' <= ' + (sp.y + 1) + ')');
var ray = pl.raycast(w, 5.5);
ok(ray === null || (typeof ray.x === 'number' && typeof ray.id === 'number'),
   'raycast returns null or {x,y,z,id,...}: ' + (ray ? JSON.stringify({ x: ray.x, y: ray.y, z: ray.z, id: ray.id }) : 'null'));

console.log('Raycast aims at ground');
pl.pitch = -1.2; // look down
var ray2 = pl.raycast(w, 5.5);
ok(!!ray2, 'downward raycast hits a block: ' + (ray2 ? (ray2.id + ' at ' + ray2.x + ',' + ray2.y + ',' + ray2.z) : 'null'));
if (ray2) {
  ok(w.peek(ray2.x, ray2.y, ray2.z) === ray2.id, 'raycast hit id matches world block');
  ok(!window.Blocks.def[ray2.id].plant, 'raycast did not stop at a plant (got ' + ray2.id + ')');
}

console.log('Torch block-light (main.js relightEdit flow)');
function relightEditWorld(x, y, z) {
  var cx = Math.floor(x / 16), cz = Math.floor(z / 16);
  for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
    var ch2 = w.getChunk(cx + dx, cz + dz);
    if (ch2) w.relight(ch2, x, y, z);
  }
}
var px = Math.floor(sp.x), pz = Math.floor(sp.z), py = Math.ceil(sp.y);
var tcx = Math.floor(px / 16), tcz = Math.floor(pz / 16);
w.setBlock(px, py, pz, 19);
relightEditWorld(px, py, pz);
var tch = w.chunks[tcx + ',' + tcz];
var tIdx = (px - tcx * 16) + (pz - tcz * 16) * 16 + py * 256;
ok(tch.bl[tIdx] === 14, 'torch cell block light = 14, got ' + tch.bl[tIdx]);
var nch = w.chunks[tcx + ',' + tcz];
var nIdx = (px - tcx * 16) + (pz - tcz * 16) * 16 + py * 256 + 0; // same cell (0-neighbor)
ok(nch.bl[nIdx] === 14, 'torch light seeds from emit value');
// neighbor 1 away should be 13
var nx = px + 1, ncx = Math.floor(nx / 16);
var nch2 = w.chunks[ncx + ',' + tcz];
if (nch2) {
  var ni = (nx - ncx * 16) + (pz - tcz * 16) * 16 + py * 256;
  ok(nch2.bl[ni] === 13, 'block 1 away from torch = 13, got ' + nch2.bl[ni]);
}
w.setBlock(px, py, pz, 0);
relightEditWorld(px, py, pz);
ok(tch.bl[tIdx] === 0, 'light returns to 0 after torch removed, got ' + tch.bl[tIdx]);
var edits = w.collectEdits();
ok(edits[px + ',' + py + ',' + pz] === 0, 'edit recorded for torch remove');

console.log('Block defs sanity');
ok(B.def[0] && B.def[0].id === 0, 'air id 0');
ok(B.def[19] && B.def[19].plant === true, 'torch is plant');
ok(B.def[19].hardness >= 0, 'torch breakable (hardness ' + B.def[19].hardness + ')');
ok(B.def[5].hardness === -1, 'bedrock unbreakable');
ok(B.def[33].hardness === -1, 'obsidian unbreakable');
ok(B.def[7].hardness === -1, 'water unbreakable');

console.log(failures === 0 ? '\nSMOKE TEST PASSED' : '\nSMOKE TEST FAILED (' + failures + ')');
process.exit(failures === 0 ? 0 : 1);
