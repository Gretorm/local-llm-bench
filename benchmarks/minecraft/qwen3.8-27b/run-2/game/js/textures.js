/* textures.js - 100% procedurally generated pixel textures (no external assets) */
(function () {
  'use strict';

  var ATLAS_COLS = 8, ATLAS_ROWS = 6, TS = 16; // tile size
  var T = Blocks.T;

  var tileCanvases = []; // index -> 16x16 canvas

  function rng(seed) { return Util.mulberry32(seed); }

  function n2(x, y, seed) { return (Util.fbm2(x * 0.9, y * 0.9, seed, 2) + 1) * 0.5; }

  function makeTile(idx, seed, drawFn) {
    var c = document.createElement('canvas');
    c.width = TS; c.height = TS;
    var ctx = c.getContext('2d');
    drawFn(ctx, seed);
    tileCanvases[idx] = c;
  }

  function px(ctx, x, y, r, g, b, a) {
    ctx.fillStyle = 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + (a == null ? 1 : a) + ')';
    ctx.fillRect(x, y, 1, 1);
  }

  // fill with smooth noise around a base color
  function noiseFill(ctx, seed, base, spread) {
    for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
      var n = n2(x, y, seed);
      var v = 1 - Math.abs(n - 0.5) * 2; // 0..1 centered
      var f = (v - 0.5) * 2; // -1..1
      px(ctx, x, y, base[0] + f * spread, base[1] + f * spread, base[2] + f * spread);
    }
  }

  function speckle(ctx, seed, color, count, size) {
    var r = rng(seed);
    for (var i = 0; i < count; i++) {
      var x = 1 + (r() * 14 | 0), y = 1 + (r() * 14 | 0);
      for (var dy = 0; dy < size; dy++) for (var dx = 0; dx < size; dx++) {
        if (r() < 0.75) px(ctx, x + dx, y + dy, color[0] + (r() - 0.5) * 16, color[1] + (r() - 0.5) * 16, color[2] + (r() - 0.5) * 16);
      }
    }
  }

  function oreSpeckles(ctx, seed, color) {
    var r = rng(seed);
    for (var i = 0; i < 5; i++) {
      var cx = 1 + (r() * 13 | 0), cy = 1 + (r() * 13 | 0);
      var n = 2 + (r() * 5 | 0);
      for (var j = 0; j < n; j++) {
        var ox = cx + (r() * 3 | 0) - 1, oy = cy + (r() * 3 | 0) - 1;
        px(ctx, ox, oy, color[0] + (r() - 0.5) * 24, color[1] + (r() - 0.5) * 24, color[2] + (r() - 0.5) * 24);
      }
    }
  }

  function build() {
    // ---------- grass / dirt / stone family ----------
    makeTile(T.GRASS_TOP, 101, function (ctx, seed) {
      noiseFill(ctx, seed, [104, 168, 66], 22);
      speckle(ctx, seed + 7, [88, 150, 52], 5, 1);
    });

    makeTile(T.DIRT, 102, function (ctx, seed) {
      noiseFill(ctx, seed, [134, 96, 67], 18);
      speckle(ctx, seed + 3, [105, 74, 50], 4, 1);
    });

    makeTile(T.GRASS_SIDE, 103, function (ctx, seed) {
      // dirt base
      noiseFill(ctx, seed, [134, 96, 67], 18);
      // grass overhang on top
      var r = rng(seed + 11);
      for (var x = 0; x < TS; x++) {
        var depth = 3 + (r() * 2 | 0);
        for (var y = 0; y < depth; y++) {
          px(ctx, x, y, 104 + (r() - 0.5) * 24, 168 + (r() - 0.5) * 24, 66 + (r() - 0.5) * 20);
        }
        // jagged edge
        px(ctx, x, depth, 104 + (r() - 0.5) * 24, 160 + (r() - 0.5) * 24, 62);
      }
    });

    makeTile(T.STONE, 104, function (ctx, seed) {
      noiseFill(ctx, seed, [126, 126, 126], 14);
      speckle(ctx, seed + 5, [100, 100, 100], 3, 1);
    });

    makeTile(T.COBBLE, 105, function (ctx, seed) {
      var r = rng(seed);
      var centers = [];
      for (var gx = 0; gx < 3; gx++) for (var gy = 0; gy < 3; gy++) {
        centers.push([4 + gx * 5 + (r() - 0.5) * 2, 4 + gy * 5 + (r() - 0.5) * 2, 80 + r() * 50]);
      }
      for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
        var best = 99, bc = 120;
        for (var i = 0; i < centers.length; i++) {
          var dx = x - centers[i][0], dy = y - centers[i][1];
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < best) { best = d; bc = centers[i][2]; }
        }
        var v = best < 1.2 ? bc - 25 : best < 3 ? bc : bc - 45;
        v += (n2(x, y, seed) - 0.5) * 14;
        px(ctx, x, y, v, v, v);
      }
    });

    makeTile(T.BEDROCK, 106, function (ctx, seed) {
      noiseFill(ctx, seed, [62, 62, 62], 26);
      var r = rng(seed + 9);
      for (var i = 0; i < 14; i++) {
        var x = (r() * 14 | 0), y = (r() * 14 | 0), dark = r() < 0.5;
        px(ctx, x, y, dark ? 18 : 105, dark ? 18 : 105, dark ? 18 : 105);
        px(ctx, (x + 1) % 16, y, dark ? 18 : 105, dark ? 18 : 105, dark ? 18 : 105);
      }
    });

    makeTile(T.SAND, 107, function (ctx, seed) {
      noiseFill(ctx, seed, [219, 207, 163], 10);
      speckle(ctx, seed + 2, [200, 188, 145], 3, 1);
    });

    makeTile(T.WATER, 108, function (ctx, seed) {
      for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
        var w = Math.sin(x * 0.9 + y * 1.3 + Math.sin(y * 0.7) * 2);
        var light = w > 0.4;
        px(ctx, x, y, light ? 76 : 50, light ? 136 : 108, light ? 226 : 198);
      }
    });

    // ---------- wood ----------
    function barkTile(colorA, colorB, notchEvery) {
      return function (ctx, seed) {
        var r = rng(seed + 4);
        for (var x = 0; x < TS; x++) {
          var col = n2(x * 1.4, 0.5, seed) ;
          var f = col * 0.6 + 0.2;
          var base = [colorA[0] + (colorB[0] - colorA[0]) * f, colorA[1] + (colorB[1] - colorA[1]) * f, colorA[2] + (colorB[2] - colorA[2]) * f];
          for (var y = 0; y < TS; y++) {
            var v = (n2(x * 0.8, y * 0.4, seed + 30) - 0.5) * 18;
            px(ctx, x, y, base[0] + v, base[1] + v, base[2] + v);
          }
          if (r() < 0.6) {
            var ny = 2 + (r() * 12 | 0);
            px(ctx, x, ny, base[0] * 0.6, base[1] * 0.6, base[2] * 0.6);
          }
        }
      };
    }
    makeTile(T.LOG_SIDE, 110, barkTile([96, 76, 44], [122, 98, 58], 0));
    makeTile(T.SPRUCE_LOG_SIDE, 111, barkTile([70, 52, 32], [96, 74, 44], 0));

    makeTile(T.LOG_TOP, 112, function (ctx, seed) {
      for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
        var dx = x - 7.5, dy = y - 7.5;
        var d = Math.sqrt(dx * dx + dy * dy);
        var ring = (Math.floor(d / 1.7) % 2) === 0;
        var v = ring ? 1 : 0.72;
        var c = [150 * v, 122 * v, 74 * v];
        px(ctx, x, y, c[0] + (n2(x, y, seed) - 0.5) * 10, c[1] + (n2(x, y, seed + 1) - 0.5) * 10, c[2] + (n2(x, y, seed + 2) - 0.5) * 10);
      }
    });

    function leavesTile(base, dark) {
      return function (ctx, seed) {
        for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
          var n = n2(x, y, seed);
          var f = 0.85 + n * 0.3;
          px(ctx, x, y, base[0] * f, base[1] * f, base[2] * f);
        }
        speckle(ctx, seed + 4, dark, 7, 1);
      };
    }
    makeTile(T.LEAVES_OAK, 120, leavesTile([64, 126, 36], [40, 90, 24]));
    makeTile(T.LEAVES_SPRUCE, 121, leavesTile([48, 100, 58], [32, 74, 42]));

    // ---------- building ----------
    makeTile(T.PLANKS, 130, function (ctx, seed) {
      var r = rng(seed);
      for (var row = 0; row < 4; row++) {
        var shade = 0.9 + r() * 0.2;
        var seamX = (r() * 16) | 0;
        for (var y = row * 4; y < row * 4 + 4; y++) for (var x = 0; x < TS; x++) {
          var v = (n2(x, y, seed + row) - 0.5) * 12;
          var c0 = [164 * shade, 132 * shade, 80 * shade];
          if (y === row * 4 + 3) { px(ctx, x, y, c0[0] * 0.62, c0[1] * 0.62, c0[2] * 0.62); continue; }
          if (x === seamX) { px(ctx, x, y, c0[0] * 0.7, c0[1] * 0.7, c0[2] * 0.7); continue; }
          px(ctx, x, y, c0[0] + v, c0[1] + v, c0[2] + v);
        }
      }
    });

    makeTile(T.BRICK, 131, function (ctx, seed) {
      var r = rng(seed);
      for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
        var row = Math.floor(y / 4);
        var off = (row % 2) * 8;
        var bx = (x + off) % 16;
        var isMortar = (y % 4) === 3 || ((bx % 8) === 7);
        if (isMortar) { px(ctx, x, y, 158 + (r() - 0.5) * 16, 152 + (r() - 0.5) * 16, 148 + (r() - 0.5) * 16); }
        else {
          var bseed = Math.floor((x + off) / 8) + row * 3;
          var bs = 0.9 + (n2(bseed, row, seed) * 0.2);
          px(ctx, x, y, 148 * bs + (r() - 0.5) * 12, 92 * bs + (r() - 0.5) * 12, 82 * bs + (r() - 0.5) * 10);
        }
      }
    });

    makeTile(T.GLASS, 132, function (ctx) {
      // transparent with frame + streaks
      px(ctx, 0, 0, 210, 225, 235, 0);
      for (var i = 0; i < TS; i++) {
        px(ctx, i, 0, 200, 216, 228, 1);
        px(ctx, i, 15, 190, 206, 220, 1);
        px(ctx, 0, i, 200, 216, 228, 1);
        px(ctx, 15, i, 190, 206, 220, 1);
      }
      for (var d = 0; d < 5; d++) px(ctx, 3 + d, 2 + d, 235, 245, 252, 1);
      for (var d2 = 0; d2 < 3; d2++) px(ctx, 8 + d2, 9 + d2, 235, 245, 252, 1);
    });

    makeTile(T.TORCH, 133, function (ctx) {
      // stick
      for (var y = 10; y < 16; y++) { px(ctx, 7, y, 122, 92, 52); px(ctx, 8, y, 108, 80, 44); }
      // flame
      var flame = [
        [0, 0, 0, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 2, 2, 2, 1, 1],
        [1, 2, 2, 2, 2, 2, 1],
        [0, 1, 2, 2, 2, 1, 0]
      ];
      for (var y = 0; y < flame.length; y++) for (var x = 3; x < 10; x++) {
        var v = flame[y][x - 3];
        if (v === 1) px(ctx, x, 2 + y, 255, 176, 46);
        else if (v === 2) px(ctx, x, 2 + y, 255, 236, 120);
      }
      px(ctx, 7, 7, 255, 246, 200);
      px(ctx, 8, 7, 255, 246, 200);
    });

    makeTile(T.SNOW, 140, function (ctx, seed) {
      noiseFill(ctx, seed, [236, 240, 246], 7);
    });
    makeTile(T.SNOW_SIDE, 141, function (ctx, seed) {
      noiseFill(ctx, seed, [134, 96, 67], 18);
      var r = rng(seed + 5);
      for (var x = 0; x < TS; x++) {
        var depth = 3 + (r() * 2 | 0);
        for (var y = 0; y < depth; y++) px(ctx, x, y, 232 + (r() - 0.5) * 10, 236 + (r() - 0.5) * 10, 242 + (r() - 0.5) * 8);
      }
    });

    makeTile(T.CACTUS_SIDE, 142, function (ctx, seed) {
      noiseFill(ctx, seed, [84, 130, 50], 12);
      var r = rng(seed + 8);
      [2, 8, 13].forEach(function (x) {
        for (var y = 0; y < TS; y++) px(ctx, x, y, 52 + (r() - 0.5) * 14, 92 + (r() - 0.5) * 14, 34);
      });
      // spines
      for (var i = 0; i < 12; i++) px(ctx, (r() * 16 | 0), (r() * 16 | 0), 190, 220, 140);
    });
    makeTile(T.CACTUS_TOP, 143, function (ctx, seed) {
      noiseFill(ctx, seed, [92, 140, 56], 10);
      for (var y = 5; y < 11; y++) for (var x = 5; x < 11; x++) px(ctx, x, y, 60, 100, 38);
    });

    // ---------- TNT ----------
    makeTile(T.TNT_SIDE, 150, function (ctx, seed) {
      var r = rng(seed);
      for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
        if (y < 4 || y >= 12) px(ctx, x, y, 168 + (r() - 0.5) * 20, 60 + (r() - 0.5) * 14, 44 + (r() - 0.5) * 12);
        else px(ctx, x, y, 226 + (r() - 0.5) * 14, 214 + (r() - 0.5) * 14, 176 + (r() - 0.5) * 12);
      }
      // "TNT" in 3x5 pixel font, rows 5..9, x=2..12
      var font = {
        T: ['111', '010', '010', '010', '010'],
        N: ['101', '111', '111', '101', '101']
      };
      var word = [font.T, font.N, font.T];
      var wx = 2, wy = 5;
      for (var w = 0; w < word.length; w++) {
        for (var y2 = 0; y2 < 5; y2++) for (var x2 = 0; x2 < 3; x2++) {
          if (word[w][y2][x2] === '1') px(ctx, wx + x2, wy + y2, 25, 25, 25);
        }
        wx += 4;
      }
    });
    makeTile(T.TNT_TOP, 151, function (ctx, seed) {
      var r = rng(seed);
      for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) px(ctx, x, y, 168 + (r() - 0.5) * 20, 60 + (r() - 0.5) * 14, 44 + (r() - 0.5) * 12);
      for (var y = 5; y < 11; y++) for (var x = 5; x < 11; x++) px(ctx, x, y, 210, 205, 195);
      px(ctx, 7, 7, 90, 70, 45); px(ctx, 8, 7, 90, 70, 45); px(ctx, 7, 8, 90, 70, 45); px(ctx, 8, 8, 90, 70, 45);
    });

    // ---------- ores ----------
    makeTile(T.COAL_ORE, 160, function (ctx, seed) { noiseFill(ctx, seed, [126, 126, 126], 14); oreSpeckles(ctx, seed, [35, 35, 38]); });
    makeTile(T.IRON_ORE, 161, function (ctx, seed) { noiseFill(ctx, seed, [126, 126, 126], 14); oreSpeckles(ctx, seed, [222, 205, 185]); });
    makeTile(T.GOLD_ORE, 162, function (ctx, seed) { noiseFill(ctx, seed, [126, 126, 126], 14); oreSpeckles(ctx, seed, [248, 218, 84]); });
    makeTile(T.DIAMOND_ORE, 163, function (ctx, seed) { noiseFill(ctx, seed, [126, 126, 126], 14); oreSpeckles(ctx, seed, [96, 230, 230]); });

    // ---------- plants ----------
    function flowerTile(petal, center) {
      return function (ctx) {
        // stem
        for (var y = 10; y < 16; y++) px(ctx, 8, y, 52, 118, 40);
        px(ctx, 6, 12, 52, 118, 40); px(ctx, 10, 11, 52, 118, 40);
        // head: plus-shaped petal around center
        var cx = 8, cy = 6;
        px(ctx, cx - 1, cy - 1, petal[0], petal[1], petal[2]);
        px(ctx, cx + 1, cy - 1, petal[0], petal[1], petal[2]);
        px(ctx, cx - 1, cy + 1, petal[0], petal[1], petal[2]);
        px(ctx, cx + 1, cy + 1, petal[0], petal[1], petal[2]);
        px(ctx, cx, cy - 1, petal[0], petal[1], petal[2]);
        px(ctx, cx, cy + 1, petal[0], petal[1], petal[2]);
        px(ctx, cx - 1, cy, petal[0], petal[1], petal[2]);
        px(ctx, cx + 1, cy, petal[0], petal[1], petal[2]);
        px(ctx, cx, cy, center[0], center[1], center[2]);
        px(ctx, cx - 1, cy, center[0], center[1], center[2]);
      };
    }
    makeTile(T.FLOWER_RED, 170, flowerTile([206, 62, 52], [250, 214, 84]));
    makeTile(T.FLOWER_YELLOW, 171, flowerTile([240, 198, 62], [120, 90, 40]));

    makeTile(T.TALLGRASS, 172, function (ctx, seed) {
      var r = rng(seed);
      var blades = 6 + (r() * 4 | 0);
      for (var i = 0; i < blades; i++) {
        var x = 1 + (r() * 14 | 0);
        var h = 6 + (r() * 9 | 0);
        var lean = r() < 0.3 ? 1 : 0;
        for (var y = 15; y > 15 - h; y--) {
          px(ctx, Math.max(0, Math.min(15, x + (lean ? (15 - y) % 2 : 0))), y, 58 + (r() - 0.5) * 20, 122 + (r() - 0.5) * 20, 44);
        }
      }
    });

    // ---------- wools ----------
    function woolTile(color) {
      return function (ctx, seed) {
        for (var y = 0; y < TS; y++) for (var x = 0; x < TS; x++) {
          var n = n2(x, y, seed);
          var f = 0.92 + n * 0.16;
          px(ctx, x, y, color[0] * f, color[1] * f, color[2] * f);
        }
      };
    }
    makeTile(T.WOOL_WHITE, 180, woolTile([228, 228, 228]));
    makeTile(T.WOOL_RED, 181, woolTile([158, 52, 46]));
    makeTile(T.WOOL_YELLOW, 182, woolTile([218, 188, 62]));
    makeTile(T.WOOL_BLUE, 183, woolTile([58, 82, 160]));
    makeTile(T.WOOL_GREEN, 184, woolTile([70, 140, 58]));
    makeTile(T.WOOL_ORANGE, 185, woolTile([222, 132, 44]));

    makeTile(T.OBSIDIAN, 186, function (ctx, seed) {
      noiseFill(ctx, seed, [26, 20, 42], 10);
      var r = rng(seed + 2);
      for (var i = 0; i < 16; i++) px(ctx, (r() * 16 | 0), (r() * 16 | 0), 92 + r() * 30, 70 + r() * 24, 148 + r() * 30);
    });

    // ---------- crack frames (row 5, tiles 40..47) ----------
    var crackPixels = [];
    (function () {
      var r = rng(2024);
      var pts = [];
      for (var i = 0; i < 5; i++) pts.push([2 + (r() * 12 | 0), 2 + (r() * 12 | 0)]);
      var seen = {};
      pts.forEach(function (p) {
        var x = p[0], y = p[1];
        var dx = r() < 0.5 ? 1 : -1, dy = r() < 0.5 ? 1 : -1;
        var len = 6 + (r() * 12 | 0);
        for (var s = 0; s < len; s++) {
          if (x < 0 || y < 0 || x > 15 || y > 15) break;
          var k = x + ',' + y;
          if (!seen[k]) { seen[k] = 1; crackPixels.push([x, y]); }
          if (r() < 0.22) { dx = r() < 0.5 ? 1 : -1; dy = r() < 0.5 ? 1 : -1; }
          if (r() < 0.1) { dx = 0; } else if (r() < 0.1) { dy = 0; }
          x += dx; y += dy;
        }
      });
    })();
    for (var f = 0; f <= 7; f++) {
      (function (frame) {
        makeTile(40 + frame, 210 + frame, function (ctx, seed) {
          var count = Math.floor((frame + 1) / 8 * crackPixels.length);
          for (var i = 0; i < count; i++) {
            var p = crackPixels[i];
            px(ctx, p[0], p[1], 42, 42, 42, 1);
            if (p[0] > 0) px(ctx, p[0] - 1, p[1], 42, 42, 42, 0.4);
          }
        });
      })(f);
    }

    // ---------- assemble atlas ----------
    var atlas = document.createElement('canvas');
    atlas.width = ATLAS_COLS * TS;
    atlas.height = ATLAS_ROWS * TS;
    var actx = atlas.getContext('2d');
    actx.imageSmoothingEnabled = false;
    for (var i = 0; i < tileCanvases.length; i++) {
      var t = tileCanvases[i];
      if (!t) continue;
      var col = i % ATLAS_COLS, row = (i / ATLAS_COLS) | 0;
      actx.drawImage(t, col * TS, row * TS);
    }

    // average colors for particles
    var avgColors = {};
    var cache = {};

    return {
      canvas: atlas,
      cols: ATLAS_COLS,
      rows: ATLAS_ROWS,
      tile: TS,
      tileCanvas: function (i) { return tileCanvases[i]; },
      uvRect: function (tileIdx) {
        var col = tileIdx % ATLAS_COLS, row = (tileIdx / ATLAS_COLS) | 0;
        var e = 0.5 / (TS * ATLAS_COLS); // half-texel inset
        return {
          u0: col / ATLAS_COLS + e,
          u1: (col + 1) / ATLAS_COLS - e,
          v0: 1 - (row + 1) / ATLAS_ROWS + e,
          v1: 1 - row / ATLAS_ROWS - e
        };
      },
      avgColor: function (blockId) {
        if (avgColors[blockId]) return avgColors[blockId];
        var b = Blocks.def[blockId];
        var idx = b && b.tex ? (b.tex.s != null ? b.tex.s : b.tex.t) : 0;
        if (!tileCanvases[idx]) { avgColors[blockId] = [255, 255, 255]; return [255, 255, 255]; }
        var ctx = tileCanvases[idx].getContext('2d');
        var d = ctx.getImageData(0, 0, TS, TS).data;
        var r = 0, g = 0, bl = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 40) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
        }
        if (!n) { r = g = bl = 255; n = 1; }
        avgColors[blockId] = [r / n, g / n, bl / n];
        return avgColors[blockId];
      },
      icon: function (blockId) {
        if (cache[blockId]) return cache[blockId];
        var b = Blocks.def[blockId];
        var c = document.createElement('canvas');
        c.width = 48; c.height = 48;
        var ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        if (b.plant) {
          var t = tileCanvases[b.tex.s];
          ctx.drawImage(t, 14, 14, 20, 20);
          cache[blockId] = c;
          return c;
        }
        var top = tileCanvases[b.tex.t], side = tileCanvases[b.tex.s], bot = tileCanvases[b.tex.b != null ? b.tex.b : b.tex.s];
        var leftC = shade(side, 0.62), rightC = shade(side, 0.82), topC = shade(top, 1);
        // left face
        ctx.save();
        ctx.setTransform(13 / 16, 7 / 16, 0, 13 / 16, 11, 13);
        ctx.drawImage(leftC, 0, 0, 16, 16, 0, 0, 16, 16);
        ctx.restore();
        // right face
        ctx.save();
        ctx.setTransform(13 / 16, -7 / 16, 0, 13 / 16, 24, 20);
        ctx.drawImage(rightC, 0, 0, 16, 16, 0, 0, 16, 16);
        ctx.restore();
        // top face
        ctx.save();
        ctx.setTransform(13 / 16, 7 / 16, -13 / 16, 7 / 16, 24, 6);
        ctx.drawImage(topC, 0, 0, 16, 16, 0, 0, 16, 16);
        ctx.restore();
        cache[blockId] = c;
        return c;
      }
    };

    function shade(src, f) {
      var c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      var ctx = c.getContext('2d');
      ctx.drawImage(src, 0, 0);
      var img = ctx.getImageData(0, 0, 16, 16);
      var d = img.data;
      for (var i = 0; i < d.length; i += 4) { d[i] = d[i] * f; d[i + 1] = d[i + 1] * f; d[i + 2] = d[i + 2] * f; }
      ctx.putImageData(img, 0, 0);
      return c;
    }
  }

  window.Textures = { build: build };
})();
