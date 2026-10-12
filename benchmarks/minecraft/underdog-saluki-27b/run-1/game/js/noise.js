// Deterministic 2D value noise / fbm helpers.
export function hash2(x, z, seed) {
  // multiplicative hashing: invertible mod 2^32, good avalanche
  let h = Math.imul(x, 374761329) + Math.imul(z, 668265003) + Math.imul(seed, 14426950408);
  h = Math.imul(h | 0, 2654435761);
  h = Math.imul(h | 0, 2296238251);
  h ^= h >>> 15;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x, z, seed) {
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const tx = smooth(x - x0), tz = smooth(z - z0);
  const a = hash2(x0, z0, seed);
  const b = hash2(x0 + 1, z0, seed);
  const c = hash2(x0, z0 + 1, seed);
  const d = hash2(x0 + 1, z0 + 1, seed);
  const ab = a + (b - a) * tx;
  const cd = c + (d - c) * tx;
  return ab + (cd - ab) * tz;
}

export function fbm(x, z, seed, octaves = 5, persistence = 0.5) {
  let sum = 0, amp = 1, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, z * freq, seed + i * 1013) * amp;
    amp *= persistence;
    freq *= 2;
  }
  return sum / ((1 - Math.pow(persistence, octaves)) / (1 - persistence));
}
