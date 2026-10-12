// Procedural value noise (original implementation).
(function (global) {
  "use strict";

  // 32-bit integer hash -> [0,1)
  function hashInt(n) {
    n = Math.imul(n ^ (n >>> 15), 2246822519);
    n = Math.imul(n ^ (n >>> 13), 3266489917);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }

  function hash2(x, y, seed) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed | 0, 1274126177);
    return hashInt(h);
  }

  function hash3(x, y, z, seed) {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1103515245) ^ Math.imul(seed | 0, 1274126177);
    return hashInt(h);
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function valueNoise2(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = fade(x - xi), yf = fade(y - yi);
    const v00 = hash2(xi, yi, seed);
    const v10 = hash2(xi + 1, yi, seed);
    const v01 = hash2(xi, yi + 1, seed);
    const v11 = hash2(xi + 1, yi + 1, seed);
    return lerp(lerp(v00, v10, xf), lerp(v01, v11, xf), yf);
  }

  function valueNoise3(x, y, z, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const c000 = hash3(xi, yi, zi, seed);
    const c100 = hash3(xi + 1, yi, zi, seed);
    const c010 = hash3(xi, yi + 1, zi, seed);
    const c110 = hash3(xi + 1, yi + 1, zi, seed);
    const c001 = hash3(xi, yi, zi + 1, seed);
    const c101 = hash3(xi + 1, yi, zi + 1, seed);
    const c011 = hash3(xi, yi + 1, zi + 1, seed);
    const c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
    return lerp(
      lerp(lerp(c000, c100, xf), lerp(c010, c110, xf), yf),
      lerp(lerp(c001, c101, xf), lerp(c011, c111, xf), yf),
      zf
    );
  }

  // Fractal Brownian Motion, output normalized to ~[0,1] (mean 0.5).
  function fbm2(x, y, octaves, seed) {
    let sum = 0, amp = 1, norm = 0, fx = 1, fy = 1;
    for (let i = 0; i < octaves; i++) {
      sum += valueNoise2(x * fx, y * fy, seed + i * 1013) * amp;
      norm += amp;
      amp *= 0.5;
      fx *= 2.01; fy *= 2.01;
    }
    return sum / norm;
  }

  function fbm3(x, y, z, octaves, seed) {
    let sum = 0, amp = 1, norm = 0, fx = 1, fy = 1, fz = 1;
    for (let i = 0; i < octaves; i++) {
      sum += valueNoise3(x * fx, y * fy, z * fz, seed + i * 1013) * amp;
      norm += amp;
      amp *= 0.5;
      fx *= 2.01; fy *= 2.01; fz *= 2.01;
    }
    return sum / norm;
  }

  // Deterministic PRNG
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  global.Noise = { hash2, hash3, hashInt, valueNoise2, valueNoise3, fbm2, fbm3, mulberry32, fade, lerp };
})(window);
