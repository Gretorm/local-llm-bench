// Save/load via localStorage with RLE-compressed world data.
const KEY = 'blockcraft_save_v1';

export function hasSave() {
  try { return localStorage.getItem(KEY) !== null; } catch (e) { return false; }
}

function rleEncode(layer) {
  const out = [];
  let i = 0;
  while (i < layer.length) {
    const v = layer[i];
    let j = i + 1;
    while (j < layer.length && layer[j] === v) j++;
    out.push(v, j - i);
    i = j;
  }
  return out;
}

function rleDecode(out, length) {
  const arr = new Uint8Array(length);
  let i = 0;
  for (let k = 0; k < out.length; k += 2) {
    const v = out[k], n = out[k + 1];
    arr.set(new Uint8Array(new Array(n).fill(v)), i);
    i += n;
  }
  return arr;
}

export function saveGame(state) {
  try {
    const { world, player, inventory, hotbar, selected, time } = state;
    const layers = [];
    for (let y = 0; y < world.height; y++) {
      const layer = new Uint8Array(world.size * world.size);
      for (let z = 0; z < world.size; z++) {
        for (let x = 0; x < world.size; x++) {
          layer[z * world.size + x] = world.blocks[(y * world.size + z) * world.size + x];
        }
      }
      layers.push(rleEncode(layer));
    }
    const data = {
      version: 1,
      world: { size: world.size, height: world.height, layers },
      player: { pos: [player.pos.x, player.pos.y, player.pos.z], yaw: player.yaw, pitch: player.pitch, fly: player.fly },
      inventory, hotbar, selected, time,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('save failed', e);
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== 1) return null;
    const { world: wd, player: pl, inventory, hotbar, selected, time } = data;
    const w = { size: wd.size, height: wd.height, blocks: new Uint8Array(wd.size * wd.size * wd.height) };
    for (let y = 0; y < wd.height; y++) {
      const layer = rleDecode(wd.layers[y], wd.size * wd.size);
      for (let z = 0; z < wd.size; z++) {
        for (let x = 0; x < wd.size; x++) {
          w.blocks[(y * wd.size + z) * wd.size + x] = layer[z * wd.size + x];
        }
      }
    }
    return {
      world: w,
      player: { pos: { x: pl.pos[0], y: pl.pos[1], z: pl.pos[2] }, yaw: pl.yaw, pitch: pl.pitch, fly: pl.fly },
      inventory, hotbar, selected, time,
    };
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}
