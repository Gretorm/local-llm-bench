// Player entity, voxel collision, and block raycasting.
import { BLOCKS } from './blocks.js';

// Minecraft-like constants
export const GRAVITY = 30;
export const JUMP_SPEED = 8.2;
export const WALK_SPEED = 4.317;
export const SNEAK_SPEED = 1.3;
export const FLY_SPEED = 10;
export const PLAYER_HALF = 0.3; // x/z half-extent
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.62;

export class Player {
  constructor(x, y, z, yaw, pitch) {
    this.pos = { x, y, z }; // feet center
    this.vel = { x: 0, y: 0, z: 0 };
    this.yaw = yaw;
    this.pitch = pitch;
    this.onGround = false;
    this.inWater = false;
    this.eyeInWater = false;
    this.fly = false;
  }

  eye() {
    return { x: this.pos.x, y: this.pos.y + EYE_HEIGHT, z: this.pos.z };
  }

  aabb() {
    return {
      minX: this.pos.x - PLAYER_HALF, maxX: this.pos.x + PLAYER_HALF,
      minY: this.pos.y, maxY: this.pos.y + PLAYER_HEIGHT,
      minZ: this.pos.z - PLAYER_HALF, maxZ: this.pos.z + PLAYER_HALF,
    };
  }

  update(dt, input, world) {
    const p = this.pos, v = this.vel;

    // debug
    if (window.__debugInput) window.__debugInput({ input: { ...input }, yaw: this.yaw });

    // desired horizontal velocity from keys relative to yaw
    let wx = 0, wz = 0;
    if (input.forward) wz += 1;
    if (input.back) wz -= 1;
    if (input.left) wx -= 1;
    if (input.right) wx += 1;
    const len = Math.hypot(wx, wz);
    if (len > 0) { wx /= len; wz /= len; }
    // forward = (sin(yaw), 0, -cos(yaw)); yaw 0 faces -z
    const fx = Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = Math.sin(this.yaw);
    let speed = WALK_SPEED;
    if (input.sneak) speed = SNEAK_SPEED;
    if (this.fly) speed = FLY_SPEED;
    const wishX = fx * wx + rx * wz;
    const wishZ = fz * wx + rz * wz;

    // horizontal: accelerate toward wish velocity
    const accel = 18;
    v.x += (wishX * speed - v.x) * Math.min(1, accel * dt);
    v.z += (wishZ * speed - v.z) * Math.min(1, accel * dt);

    // vertical
    if (this.fly) {
      v.y += (0 - v.y) * Math.min(1, 8 * dt);
    } else if (this.inWater) {
      v.y -= GRAVITY * 0.5 * dt;
      v.y *= Math.pow(0.9, dt * 10);
      if (input.jump && v.y < 4) v.y = 4;
    } else {
      v.y -= GRAVITY * dt;
      if (input.jump && this.onGround) v.y = JUMP_SPEED;
    }

    // move with collision
    this.onGround = false;
    moveAxis(world, p, v, 0, dt, PLAYER_HALF, PLAYER_HEIGHT, false, this);
    moveAxis(world, p, v, 2, dt, PLAYER_HALF, PLAYER_HEIGHT, false, this);
    moveAxis(world, p, v, 1, dt, PLAYER_HALF, PLAYER_HEIGHT, true, this);

    // water check
    const a = this.aabb();
    this.inWater = false;
    for (let x = Math.floor(a.minX); x <= Math.floor(a.maxX); x++) {
      for (let y = Math.floor(a.minY); y <= Math.floor(a.maxY); y++) {
        for (let z = Math.floor(a.minZ); z <= Math.floor(a.maxZ); z++) {
          if (BLOCKS[world.get(x, y, z)].liquid) { this.inWater = true; break; }
        }
        if (this.inWater) break;
      }
      if (this.inWater) break;
    }
    const e = this.eye();
    this.eyeInWater = BLOCKS[world.get(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z))].liquid;

    // ground contact: any solid directly under the feet
    const fy = Math.floor(p.y) - 1;
    for (let x = Math.floor(p.x - PLAYER_HALF); x <= Math.floor(p.x + PLAYER_HALF); x++) {
      for (let z = Math.floor(p.z - PLAYER_HALF); z <= Math.floor(p.z + PLAYER_HALF); z++) {
        if (world.solid(x, fy, z)) { this.onGround = true; return; }
      }
    }
  }
}

function moveAxis(world, pos, vel, axis, dt, half, height, isY, player) {
  const key = ['x', 'y', 'z'][axis];
  const d = vel[key] * dt;
  if (d === 0) return;
  const eps = 1e-6;
  const p = pos[key];
  const lo0 = Math.min(p, p + d) - (isY ? 0 : half);
  const hi0 = Math.max(p, p + d) + (isY ? height : half);
  const min0 = Math.floor(lo0 - eps);
  const max0 = Math.floor(hi0 + eps);

  const xMin = Math.floor(pos.x - half - eps), xMax = Math.floor(pos.x + half + eps);
  const zMin = Math.floor(pos.z - half - eps), zMax = Math.floor(pos.z + half + eps);
  const yMin = Math.floor(pos.y - eps), yMax = Math.floor(pos.y + height + eps);

  let blocked = null;
  if (axis === 0) {
    for (let x = min0; x <= max0; x++) {
      for (let y = yMin; y <= yMax; y++) {
        for (let z = zMin; z <= zMax; z++) {
          if (world.solid(x, y, z)) {
            if (d > 0) blocked = blocked === null ? x - half : Math.min(blocked, x - half);
            else blocked = blocked === null ? x + 1 + half : Math.max(blocked, x + 1 + half);
          }
        }
      }
    }
  } else if (axis === 2) {
    for (let z = min0; z <= max0; z++) {
      for (let y = yMin; y <= yMax; y++) {
        for (let x = xMin; x <= xMax; x++) {
          if (world.solid(x, y, z)) {
            if (d > 0) blocked = blocked === null ? z - half : Math.min(blocked, z - half);
            else blocked = blocked === null ? z + 1 + half : Math.max(blocked, z + 1 + half);
          }
        }
      }
    }
  } else {
    for (let y = min0; y <= max0; y++) {
      for (let x = xMin; x <= xMax; x++) {
        for (let z = zMin; z <= zMax; z++) {
          if (world.solid(x, y, z)) {
            if (d > 0) blocked = blocked === null ? y + 1 : Math.min(blocked, y + 1);
            else blocked = blocked === null ? y + 1 : Math.max(blocked, y + 1);
          }
        }
      }
    }
  }

  if (axis === 0) {
    if (blocked !== null) {
      pos.x = d > 0 ? Math.min(pos.x + d, blocked - eps) : Math.max(pos.x + d, blocked + eps);
      vel.x = 0;
    } else pos.x += d;
  } else if (axis === 2) {
    if (blocked !== null) {
      pos.z = d > 0 ? Math.min(pos.z + d, blocked - eps) : Math.max(pos.z + d, blocked + eps);
      vel.z = 0;
    } else pos.z += d;
  } else {
    if (blocked !== null) {
      pos.y = d < 0 ? Math.max(pos.y + d, blocked + eps) : Math.min(pos.y + d, blocked - eps);
      vel.y = 0;
      if (d < 0) player.onGround = true;
    } else pos.y += d;
  }
}

// DDA voxel raycast (Amanatides-Woo). Returns { x, y, z, id, px, py, pz } or null.
export function raycastVoxel(world, origin, dir, maxDist) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = dir.x >= 0 ? 1 : -1;
  const stepY = dir.y >= 0 ? 1 : -1;
  const stepZ = dir.z >= 0 ? 1 : -1;
  const invX = 1 / Math.abs(dir.x || 1e-9);
  const invY = 1 / Math.abs(dir.y || 1e-9);
  const invZ = 1 / Math.abs(dir.z || 1e-9);
  let tX = (stepX > 0 ? (x + 1 - origin.x) : (origin.x - x)) * invX;
  let tY = (stepY > 0 ? (y + 1 - origin.y) : (origin.y - y)) * invY;
  let tZ = (stepZ > 0 ? (z + 1 - origin.z) : (origin.z - z)) * invZ;

  let px = x, py = y, pz = z;
  const maxSteps = Math.ceil(maxDist * 3) + 2;
  for (let i = 0; i < maxSteps; i++) {
    const b = world.get(x, y, z);
    if (b !== 0 && !BLOCKS[b].liquid) {
      return { x, y, z, id: b, px, py, pz };
    }
    if (tX < tY && tX < tZ) {
      px = x; py = y; pz = z;
      x += stepX; tX += invX;
    } else if (tY < tZ) {
      px = x; py = y; pz = z;
      y += stepY; tY += invY;
    } else {
      px = x; py = y; pz = z;
      z += stepZ; tZ += invZ;
    }
    if (Math.min(tX, tY, tZ) > maxDist) break;
  }
  return null;
}
