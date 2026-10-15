/* util.js - RNG, hashing and noise (original implementation, no external assets) */
(function () {
  'use strict';

  // ---------- deterministic RNG ----------
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 32-bit integer hash of two ints
  function hash2i(x, z) {
    var h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1);
    h ^= h >>> 15;
    h = Math.imul(h, 0x9e3779b1) | 0;
    h ^= h >>> 13;
    return h >>> 0;
  }
  function hash3i(x, y, z) {
    var h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1)) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 0x85ebca6b) | 0;
    h ^= h >>> 13;
    return h >>> 0;
  }

  // hash with seed, returns float 0..1
  function hashSeed2(x, z, seed) {
    return (hash2i(x ^ (seed | 0), z ^ ((seed >> 13) | 0)) >>> 0) / 4294967296;
  }
  function hashSeed3(x, y, z, seed) {
    return (hash3i(x ^ (seed | 0), y ^ ((seed >> 11) | 0), z ^ ((seed >> 17) | 0)) >>> 0) / 4294967296;
  }

  // ---------- 2D value noise ----------
  function smooth(t) { t = t - Math.floor(t); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // returns -1..1
  function noise2(x, z, seed) {
    var xi = Math.floor(x), zi = Math.floor(z);
    var fx = x - xi, fz = z - zi;
    var v00 = hashSeed2(xi, zi, seed) * 2 - 1;
    var v10 = hashSeed2(xi + 1, zi, seed) * 2 - 1;
    var v01 = hashSeed2(xi, zi + 1, seed) * 2 - 1;
    var v11 = hashSeed2(xi + 1, zi + 1, seed) * 2 - 1;
    var sx = smooth(fx), sz = smooth(fz);
    return lerp(lerp(v00, v10, sx), lerp(v01, v11, sx), sz);
  }
  // fractal brownian motion, -1..1
  function fbm2(x, z, seed, octaves) {
    var sum = 0, amp = 1, tot = 0, f = 1;
    for (var i = 0; i < octaves; i++) {
      sum += noise2(x * f, z * f, seed + i * 101) * amp;
      tot += amp; amp *= 0.5; f *= 2;
    }
    return sum / tot;
  }

  // ---------- 3D value noise ----------
  function lerp3(a, b, t) { return a + (b - a) * t; }
  function noise3(x, y, z, seed) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var fx = x - xi, fy = y - yi, fz = z - zi;
    var c000 = hashSeed3(xi, yi, zi, seed) * 2 - 1;
    var c100 = hashSeed3(xi + 1, yi, zi, seed) * 2 - 1;
    var c010 = hashSeed3(xi, yi + 1, zi, seed) * 2 - 1;
    var c110 = hashSeed3(xi + 1, yi + 1, zi, seed) * 2 - 1;
    var c001 = hashSeed3(xi, yi, zi + 1, seed) * 2 - 1;
    var c101 = hashSeed3(xi + 1, yi, zi + 1, seed) * 2 - 1;
    var c011 = hashSeed3(xi, yi + 1, zi + 1, seed) * 2 - 1;
    var c111 = hashSeed3(xi + 1, yi + 1, zi + 1, seed) * 2 - 1;
    var sx = smooth(fx), sy = smooth(fy), sz = smooth(fz);
    var x00 = lerp(c000, c100, sx), x10 = lerp(c010, c110, sx);
    var x01 = lerp(c001, c101, sx), x11 = lerp(c011, c111, sx);
    return lerp3(lerp3(x00, x10, sy), lerp3(x01, x11, sy), sz);
  }
  function fbm3(x, y, z, seed, octaves) {
    var sum = 0, amp = 1, tot = 0, f = 1;
    for (var i = 0; i < octaves; i++) {
      sum += noise3(x * f, y * f, z * f, seed + i * 101) * amp;
      tot += amp; amp *= 0.5; f *= 2;
    }
    return sum / tot;
  }

  // small helpers
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerpColor(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  window.Util = {
    mulberry32: mulberry32,
    hash2i: hash2i, hash3i: hash3i,
    hashSeed2: hashSeed2, hashSeed3: hashSeed3,
    noise2: noise2, fbm2: fbm2,
    noise3: noise3, fbm3: fbm3,
    clamp: clamp, lerp: lerp, lerpColor: lerpColor
  };
})();
