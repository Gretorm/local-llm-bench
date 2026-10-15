/* world.js - chunked voxel world: generation, caves, ores, trees, lighting */
(function () {
  'use strict';

  var CHUNK = 16, HEIGHT = 80, SEA = 32;
  var WORLD_SIZE = 48; // 3x3 region of chunks for light BFS
  var HSTRIDE = CHUNK * CHUNK; // index = lx + lz*CHUNK + y*HSTRIDE (y outermost)

  function World(seed) {
    this.seed = seed | 0;
    this.chunks = {};            // "cx,cz" -> chunk
    this.edits = {};             // "x,y,z" -> blockId (player edits, for save)
    this.dirty = {};             // "cx,cz" -> true (needs relight+remesh)
    this.spawn = null;
    this._bfsLight = new Uint8Array(WORLD_SIZE * HEIGHT * WORLD_SIZE);
    this._bfsStamp = new Uint32Array(WORLD_SIZE * HEIGHT * WORLD_SIZE);
    this._bfsVer = 0;
    this._bfsQueue = new Int32Array(WORLD_SIZE * HEIGHT * WORLD_SIZE);
  }

  World.HEIGHT = HEIGHT;
  World.SEA = SEA;
  World.CHUNK = CHUNK;

  function key(cx, cz) { return cx + ',' + cz; }

  // ---------------- terrain (pure functions of world coords + seed) ----------------
  function heightAt(x, z, seed) {
    var e = Util.fbm2(x * 0.0045, z * 0.0045, seed, 4);            // -1..1
    var m = Util.fbm2(x * 0.0016 + 31.7, z * 0.0016 + 47.2, seed + 999, 3);
    var c = Util.fbm2(x * 0.0008 + 77.7, z * 0.0008 + 33.3, seed + 7777, 2);
    var h = 24 + (e + 1) * 10; // 24..44
    if (m > 0.15) {
      var mm = (m - 0.15) / 0.85;
      h += Math.pow(Math.min(1, mm), 1.4) * 30;
    }
    if (c < 0) h += c * 40; // ocean basins
    return Math.max(6, Math.min(70, Math.floor(h)));
  }

  function biomeAt(x, z, seed) {
    var d = Util.fbm2(x * 0.0022 + 911.3, z * 0.0022 + 17.9, seed + 555, 3);
    var cold = Util.fbm2(x * 0.0011 + 55.5, z * 0.0011 + 9.9, seed + 31337, 3);
    var forest = Util.fbm2(x * 0.003 + 21.2, z * 0.003 + 84.8, seed + 24680, 3);
    return {
      desert: d > 0.42,
      cold: cold < -0.22,
      forest: forest > 0.1
    };
  }

  // ---------------- chunk generation ----------------
  function genChunkBlocks(cx, cz, seed) {
    var blocks = new Uint8Array(CHUNK * CHUNK * HEIGHT);
    var x0 = cx * CHUNK, z0 = cz * CHUNK;

    // columns
    for (var lz = 0; lz < CHUNK; lz++) for (var lx = 0; lx < CHUNK; lx++) {
      var x = x0 + lx, z = z0 + lz;
      var h = heightAt(x, z, seed);
      var bio = biomeAt(x, z, seed);
      var underWater = h < SEA;
      var bedrockAt1 = (Util.hashSeed2(x, z, seed + 31) < 0.85);
      var topBlock, sub = 2;
      if (bio.desert) { topBlock = 6; sub = 6; }
      else if (h > 58) { topBlock = 21; sub = 2; }
      else if (underWater) { topBlock = h <= 27 ? 6 : 2; sub = h <= 27 ? 6 : 2; }
      else if (h <= SEA) { topBlock = 6; sub = 2; }
      else { topBlock = 1; sub = 2; }

      for (var y = 0; y <= h && y < HEIGHT; y++) {
        var b;
        if (y === 0) b = 5; // bedrock
        else if (y === 1 && bedrockAt1) b = 5;
        else if (y === h) b = topBlock;
        else if (y >= h - 3) b = sub;
        else {
          b = 3; // stone, maybe ore
          var on = Util.fbm3(x * 0.11 + 11.1, y * 0.11, z * 0.11 + 13.7, seed + 7001, 2);
          if (on > 0.70) {
            if (y < 16) b = 18; else if (y < 28) b = 17; else if (y < 44) b = 16; else b = 15;
          } else if (on > 0.64 && y < 52) b = 15;
        }
        blocks[lx + lz * CHUNK + y * HSTRIDE] = b;
      }
      // caves
      for (var y2 = 2; y2 < h - 3 && y2 < HEIGHT; y2++) {
        var cn = Util.fbm3(x * 0.055 + 3.1, y2 * 0.075 + 9.2, z * 0.055 + 5.5, seed + 4242, 2);
        if (cn > 0.62) blocks[lx + lz * CHUNK + y2 * HSTRIDE] = 0;
      }
      // water
      if (h < SEA - 1) {
        for (var y3 = h + 1; y3 < SEA; y3++) {
          if (blocks[lx + lz * CHUNK + y3 * HSTRIDE] === 0) blocks[lx + lz * CHUNK + y3 * HSTRIDE] = 7;
        }
      }
    }

    // trees / cactus / plants (margin so trees crossing borders are complete)
    for (var mz = -3; mz < CHUNK + 3; mz++) for (var mx = -3; mx < CHUNK + 3; mx++) {
      var tx = x0 + mx, tz = z0 + mz;
      var hT = heightAt(tx, tz, seed);
      var bioT = biomeAt(tx, tz, seed);
      var r1 = Util.hashSeed2(tx, tz, seed + 77);
      var isLand = hT >= SEA && hT < 60;

      if (isLand) {
        var density = bioT.desert ? 0 : (bioT.forest ? 0.028 : 0.012);
        if (bioT.cold && !bioT.desert && r1 < density * 1.4) placeSpruce(blocks, tx, tz, hT, x0, z0);
        else if (!bioT.desert && r1 < density) placeOak(blocks, tx, tz, hT, seed, x0, z0);
      }
      if (bioT.desert && isLand) {
        var r2 = Util.hashSeed2(tx, tz, seed + 1234);
        if (r2 < 0.01) placeCactus(blocks, tx, tz, hT, 2 + (Util.hashSeed2(tx, tz, seed + 55) * 3 | 0), x0, z0);
      }
      // ground plants
      var topB = topBlockAt(tx, tz, seed);
      if ((topB === 1) && !bioT.desert) {
        var rp = Util.hashSeed2(tx, tz, seed + 90210);
        var top = topB;
        if (top === 1) {
          if (rp < 0.010) writePlant(blocks, tx, tz, hT + 1, 26, x0, z0);
          else if (rp < 0.014) writePlant(blocks, tx, tz, hT + 1, 24, x0, z0);
          else if (rp < 0.017) writePlant(blocks, tx, tz, hT + 1, 25, x0, z0);
        }
      }
    }
    return blocks;
  }

  function topBlockAt(x, z, seed) {
    var h = heightAt(x, z, seed);
    var bio = biomeAt(x, z, seed);
    if (bio.desert) return 6;
    if (h > 58) return 21;
    if (h < SEA) return h <= 27 ? 6 : 2;
    if (h <= SEA) return 6;
    return 1;
  }

  function setIn(blocks, x, z, y, id, x0, z0) {
    var lx = x - x0, lz = z - z0;
    if (lx < 0 || lz < 0 || lx >= CHUNK || lz >= CHUNK || y < 0 || y >= HEIGHT) return;
    if (blocks[lx + lz * CHUNK + y * HSTRIDE] === 0) blocks[lx + lz * CHUNK + y * HSTRIDE] = id;
  }

  function setInForce(blocks, x, z, y, id, x0, z0) {
    var lx = x - x0, lz = z - z0;
    if (lx < 0 || lz < 0 || lx >= CHUNK || lz >= CHUNK || y < 0 || y >= HEIGHT) return;
    blocks[lx + lz * CHUNK + y * HSTRIDE] = id;
  }

  function placeOak(blocks, x, z, h, seed, x0, z0) {
    var trunkH = 4 + (Util.hashSeed2(x, z, seed + 8) * 3 | 0);
    var top = h + trunkH;
    var r = Util.hashSeed2(x, z, seed + 9);
    for (var ly = -2; ly <= 1; ly++) {
      var y = top + ly;
      var rad = ly >= 0 ? 1 : 2;
      if (ly === 1 && rad === 1) {
        // small cap
        for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
          if (Math.abs(dx) === 1 && Math.abs(dz) === 1) continue;
          setIn(blocks, x + dx, z + dz, y, 9, x0, z0);
        }
        continue;
      }
      for (var dx2 = -rad; dx2 <= rad; dx2++) for (var dz2 = -rad; dz2 <= rad; dz2++) {
        if (Math.abs(dx2) === rad && Math.abs(dz2) === rad && r < 0.6) continue;
        setIn(blocks, x + dx2, z + dz2, y, 9, x0, z0);
      }
    }
    for (var y2 = h; y2 < top; y2++) setInForce(blocks, x, z, y2, 8, x0, z0);
  }

  function placeSpruce(blocks, x, z, h, x0, z0) {
    var trunkH = 6 + (Util.hashSeed2(x, z, 4242) * 3 | 0);
    var top = h + trunkH;
    for (var ly = -3; ly <= 0; ly++) {
      var y = top + ly;
      var rad = ly === 0 ? 1 : 1;
      for (var dx = -rad; dx <= rad; dx++) for (var dz = -rad; dz <= rad; dz++) {
        if (ly < -1 && Math.abs(dx) + Math.abs(dz) > 1) continue;
        setIn(blocks, x + dx, z + dz, y, 11, x0, z0);
      }
    }
    for (var y2 = h; y2 < top; y2++) setInForce(blocks, x, z, y2, 10, x0, z0);
  }

  function placeCactus(blocks, x, z, h, n, x0, z0) {
    for (var i = 1; i <= n; i++) setInForce(blocks, x, z, h + i, 22, x0, z0);
  }

  function writePlant(blocks, x, z, y, id, x0, z0) {
    setIn(blocks, x, z, y, id, x0, z0);
  }

  // ---------------- chunk access ----------------
  World.prototype.getChunk = function (cx, cz) {
    return this.chunks[key(cx, cz)];
  };

  World.prototype.ensureChunk = function (cx, cz) {
    var k = key(cx, cz);
    var ch = this.chunks[k];
    if (ch) return ch;
    ch = {
      cx: cx, cz: cz,
      blocks: genChunkBlocks(cx, cz, this.seed),
      sky: new Uint8Array(CHUNK * CHUNK * HEIGHT),
      bl: new Uint8Array(CHUNK * CHUNK * HEIGHT),
      generated: true, lightDone: false, mesh: null
    };
    this.chunks[k] = ch;
    return ch;
  };

  World.prototype.peek = function (x, y, z) {
    if (y < 0 || y >= HEIGHT) return y < 0 ? 5 : 0;
    var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    var ch = this.chunks[key(cx, cz)];
    if (!ch) return 0;
    var lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    return ch.blocks[lx + lz * CHUNK + y * HSTRIDE];
  };

  World.prototype.getBlock = function (x, y, z) {
    return this.peek(x, y, z);
  };

  World.prototype.neighborReady = function (cx, cz) {
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      if (!this.chunks[key(cx + dx, cz + dz)]) return false;
    }
    return true;
  };

  // edit + bookkeeping
  World.prototype.setBlock = function (x, y, z, id) {
    if (y < 0 || y >= HEIGHT) return;
    var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    var ch = this.ensureChunk(cx, cz);
    var lx = x - cx * CHUNK, lz = z - cz * CHUNK;
    var i = lx + lz * CHUNK + y * HSTRIDE;
    if (ch.blocks[i] === id) return;
    ch.blocks[i] = id;
    this.edits[x + ',' + y + ',' + z] = id;
    this.markDirty(cx, cz);
    // neighbors may need relight / remesh if near border
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      var ch2 = this.chunks[key(cx + dx, cz + dz)];
      if (ch2) this.dirty[key(cx + dx, cz + dz)] = true;
    }
  };

  World.prototype.markDirty = function (cx, cz) {
    this.dirty[key(cx, cz)] = true;
  };

  World.prototype.takeDirty = function () {
    var d = this.dirty;
    this.dirty = {};
    return d;
  };

  // ---------------- lighting ----------------
  World.prototype.computeSky = function (ch) {
    var b = ch.blocks, sky = ch.sky;
    for (var lz = 0; lz < CHUNK; lz++) for (var lx = 0; lx < CHUNK; lx++) {
      var light = 15;
      var idx = lx + lz * CHUNK;
      for (var y = HEIGHT - 1; y >= 0; y--) {
        sky[idx + y * HSTRIDE] = light;
        var blk = b[idx + y * HSTRIDE];
        if (light > 0) {
          if (Blocks.def[blk].opaque && !Blocks.def[blk].seesThrough) light = 0;
          else if (blk === 7) light = Math.max(0, light - 2);
          else if (blk === 9 || blk === 11) light = Math.max(0, light - 2);
          else if (blk === 14) light = Math.max(0, light - 1);
        }
      }
    }
  };

  // passable for block light
  function passesLight(blk) {
    var d = Blocks.def[blk];
    return !(d.opaque && !d.seesThrough);
  }

  // relight a region (box in world coords) and write results into the target chunk
  World.prototype.relight = function (ch, ex, ey, ez) {
    // box = around edit (or whole chunk for first pass), clamped to 3x3 region around ch
    var W = WORLD_SIZE, Hh = HEIGHT;
    var light = this._bfsLight, stamp = this._bfsStamp, queue = this._bfsQueue;
    this._bfsVer++;
    var ver = this._bfsVer;

    var x0 = (ch.cx - 1) * CHUNK, z0 = (ch.cz - 1) * CHUNK;
    var bx0, by0, bz0, bx1, by1, bz1;
    if (ex == null) {
      bx0 = x0; by0 = 0; bz0 = z0;
      bx1 = x0 + W - 1; by1 = Hh - 1; bz1 = z0 + W - 1;
    } else {
      bx0 = Math.max(x0, ex - 15); by0 = 0; bz0 = Math.max(z0, ez - 15);
      bx1 = Math.min(x0 + W - 1, ex + 15); by1 = Hh - 1; bz1 = Math.min(z0 + W - 1, ez + 15);
    }
    var qh = 0, qt = 0;

    function idxW(x, y, z) {
      var rx = x - x0, rz = z - z0;
      return rx + rz * W + y * W * W;
    }
    function blockAtW(x, y, z) {
      var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
      var c = this.chunks[key(cx, cz)];
      if (!c) return 0;
      return c.blocks[(x - cx * CHUNK) + (z - cz * CHUNK) * CHUNK + y * HSTRIDE];
    }
    var self = this;

    // init box: block light is recomputed from emitters; stored light is imported
    // only at the box border (light entering from outside the box). Cells affected
    // by an edit are within manhattan 14 of it, i.e. always interior, so stale
    // light from removed sources cannot survive.
    for (var y = by0; y <= by1; y++) for (var z = bz0; z <= bz1; z++) for (var x = bx0; x <= bx1; x++) {
      var i = idxW(x, y, z);
      stamp[i] = ver;
      var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
      var c = self.chunks[key(cx, cz)];
      var onB = (x === bx0 || x === bx1 || y === by0 || y === by1 || z === bz0 || z === bz1);
      var v = 0;
      if (ex == null || onB) v = c ? c.bl[(x - cx * CHUNK) + (z - cz * CHUNK) * CHUNK + y * HSTRIDE] : 0;
      var blk = blockAtW.call(self, x, y, z);
      var em = Blocks.def[blk].emit;
      if (em > v) v = em;
      // the edited cell must not keep stale light
      if (ex != null && x === ex && y === ey && z === ez) v = Math.min(v, em);
      light[i] = v;
      if (v > 0) queue[qt++] = i;
    }

    // BFS (monotone)
    while (qh < qt) {
      var ci = queue[qh++];
      var cxr = ci % W, r2 = (ci / W) | 0, cy = (r2 / W) | 0, czr = r2 % W;
      var wx = x0 + cxr, wz = z0 + czr, wy = cy;
      var lv = light[ci] - 1;
      if (lv < 1) continue;
      // 6 neighbors
      if (cxr > 0) { ni(ci - 1, wx - 1, wy, wz); }
      if (cxr < W - 1) { ni(ci + 1, wx + 1, wy, wz); }
      if (cy > 0) { ni(ci - W * W, wx, wy - 1, wz); }
      if (cy < Hh - 1) { ni(ci + W * W, wx, wy + 1, wz); }
      if (czr > 0) { ni(ci - W, wx, wy, wz - 1); }
      if (czr < W - 1) { ni(ci + W, wx, wy, wz + 1); }

      function ni(ni2, nx, ny, nz) {
        if (ny < by0 || ny > by1 || nz < bz0 || nz > bz1 || nx < bx0 || nx > bx1) return;
        if (stamp[ni2] === ver && light[ni2] >= lv) return;
        var blk = blockAtW.call(self, nx, ny, nz);
        if (!passesLight(blk)) return;
        stamp[ni2] = ver;
        light[ni2] = lv;
        queue[qt++] = ni2;
      }
    }

    // write back into chunk
    var bl = ch.bl;
    for (var y2 = by0; y2 <= by1; y2++) for (var z2 = bz0; z2 <= bz1; z2++) for (var x2 = bx0; x2 <= bx1; x2++) {
      var cx2 = Math.floor(x2 / CHUNK), cz2 = Math.floor(z2 / CHUNK);
      if (cx2 !== ch.cx || cz2 !== ch.cz) continue;
      bl[(x2 - cx2 * CHUNK) + (z2 - cz2 * CHUNK) * CHUNK + y2 * HSTRIDE] = light[idxW(x2, y2, z2)];
    }
    ch.lightDone = true;
  };

  World.prototype.lightAt = function (x, y, z) {
    if (y < 0 || y >= HEIGHT) return 0;
    var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    var ch = this.chunks[key(cx, cz)];
    if (!ch) return 0;
    var i = (x - cx * CHUNK) + (z - cz * CHUNK) * CHUNK + y * HSTRIDE;
    var a = ch.sky[i], b = ch.bl[i];
    return a > b ? a : b;
  };

  World.prototype.surfaceAt = function (x, z) {
    for (var y = HEIGHT - 1; y >= 0; y--) {
      var b = this.peek(x, y, z);
      if (b !== 0 && b !== 7 && !Blocks.def[b].plant) return y;
    }
    return 0;
  };

  World.prototype.findSpawn = function () {
    // deterministic: scan outward from origin for a grassy land column
    for (var r = 0; r < 40; r++) {
      for (var a = 0; a < 8; a++) {
        var x = Math.round(Math.cos(a / 8 * Math.PI * 2) * r * 7 + 8);
        var z = Math.round(Math.sin(a / 8 * Math.PI * 2) * r * 7 - 5);
        var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
        this.ensureChunk(cx, cz);
        var h = this.surfaceAt(x, z);
        var topB = this.peek(x, h, z);
        if (h >= SEA && h < 55 && (topB === 1 || topB === 21)) {
          return { x: x + 0.5, y: h + 1.0, z: z + 0.5 };
        }
      }
    }
    var cx2 = 0, cz2 = 0;
    this.ensureChunk(cx2, cz2);
    var h2 = this.surfaceAt(8, 8);
    return { x: 8.5, y: h2 + 1.0, z: 8.5 };
  };

  // apply saved edits
  World.prototype.applyEdits = function (edits) {
    // edits: { "x,y,z": id }
    var self = this;
    Object.keys(edits).forEach(function (k) {
      var p = k.split(',');
      var x = +p[0], y = +p[1], z = +p[2];
      var cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
      var ch = self.ensureChunk(cx, cz);
      var lx = x - cx * CHUNK, lz = z - cz * CHUNK;
      ch.blocks[lx + lz * CHUNK + y * HSTRIDE] = edits[k];
    });
    // mark all touched chunks dirty
    Object.keys(edits).forEach(function (k) {
      var p = k.split(',');
      var x = +p[0], z = +p[2];
      self.markDirty(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
    });
  };

  World.prototype.collectEdits = function () {
    return this.edits;
  };

  window.World = World;
})();
