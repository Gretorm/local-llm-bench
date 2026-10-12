// Deterministic Perlin noise (2D) with FBM
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed, 0x5D5C7D9B);
    seed = t ^ (seed >>> 15);
    seed = (t ^ (seed >>> 7)) >>> 0;
    return (seed >>> 0) / 4294967296;
  };
}

class Perlin {
  constructor(seed) {
    const rand = mulberry32(seed >>> 0);
    this.perm = new Uint8Array(512);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (let i = 0; i < 256; i++) this.perm[i] = this.perm[i + 256] = p[i];
    this.grads = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1]
    ];
  }

  hash(x, y) {
    return this.perm[(this.perm[x & 255] + y) & 255] / 255;
  }

  noise(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0 + 1, y1 = y0 + 1;
    const fx = x - x0, fy = y - y0;
    const u = fx * fx * fx * (3 - 3 * fx + fx * fx);
    const v = fy * fy * fy * (3 - 3 * fy + fy * fy);
    const g = (i, j) => this.grads[this.hash(i, j) * 8 | 0];
    const n00 = g(x0, y0)[0] * fx + g(x0, y0)[1] * fy;
    const n10 = g(x1, y0)[0] * (fx - 1) + g(x1, y0)[1] * fy;
    const n01 = g(x0, y1)[0] * fx + g(x0, y1)[1] * (fy - 1);
    const n11 = g(x1, y1)[0] * (fx - 1) + g(x1, y1)[1] * (fy - 1);
    return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
  }

  fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
    let sum = 0, amp = 1, freq = 1;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise(x * freq, y * freq) * amp;
      amp *= gain; freq *= lacunarity;
    }
    return sum;
  }
}
