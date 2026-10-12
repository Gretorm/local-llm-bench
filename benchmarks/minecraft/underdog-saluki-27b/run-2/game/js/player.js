// Player: physics, collisions, health/hunger, swimming.

const GRAVITY = 24;
const JUMP_V = 8.2;
const WALK = 4.3, SPRINT = 5.8, SNEAK = 1.5;
const SWIM = 3.0;
const PLAYER_H = 1.8, PLAYER_R = 0.3;

class Player {
  constructor(world, x, y, z) {
    this.world = world;
    this.pos = new THREE.Vector3(x, y, z); // feet
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.onGround = false;
    this.inWater = false;
    this.health = 20;
    this.maxHealth = 20;
    this.hunger = 100;
    this.dead = false;
    this.deadTimer = 0;
    this.fallStartY = null;
    this.stepTimer = 0;
    this.hungerTimer = 0;
    this.starveTimer = 0;
    this.regenTimer = 0;
    this.spawn = new THREE.Vector3(x, y, z);
  }

  findSpawn(world) {
    for (let x = W / 2; x >= 0; x--)
      for (let z = D / 2; z < D; z++) {
        for (let y = H - 2; y >= 1; y--) {
          if (world.solid(x, y, z) && !world.solid(x, y + 1, z)) {
            return new THREE.Vector3(x + 0.5, y + 1.01, z + 0.5);
          }
        }
      }
    return new THREE.Vector3(W / 2, 30, D / 2);
  }

  update(dt, input, sounds) {
    if (this.dead) {
      this.deadTimer += dt;
      if (this.deadTimer > 3) {
        this.dead = false;
        this.deadTimer = 0;
        this.pos.copy(this.spawn);
        this.vel.set(0, 0, 0);
        this.health = this.maxHealth;
        this.hunger = 100;
      }
      return;
    }

    // look
    this.yaw += input.lookDX;
    this.pitch += input.lookDY;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

    // movement direction
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (input.keys['KeyW']) wish.add(fwd);
    if (input.keys['KeyS']) wish.sub(fwd);
    if (input.keys['KeyD']) wish.add(right);
    if (input.keys['KeyA']) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    let speed = WALK;
    if (input.keys['ControlLeft']) speed = SPRINT;
    else if (input.keys['ShiftLeft']) speed = SNEAK;
    if (this.inWater) speed = SWIM;

    // horizontal velocity (acceleration model)
    const target = wish.multiplyScalar(speed);
    const drag = this.inWater ? 4 : 8;
    this.vel.x += (target.x - this.vel.x) * Math.min(1, drag * dt);
    this.vel.z += (target.z - this.vel.z) * Math.min(1, drag * dt);

    // vertical
    if (this.inWater) {
      this.vel.y *= Math.max(0, 1 - 3 * dt);
      if (input.keys['Space']) this.vel.y = 4;
      else this.vel.y -= 3 * dt; // gentle sink
    } else {
      this.vel.y -= GRAVITY * dt;
      if (this.onGround && input.keys['Space']) {
        this.vel.y = JUMP_V;
        this.onGround = false;
      }
    }

    // integrate with collision
    const dx = this.vel.x * dt, dy = this.vel.y * dt, dz = this.vel.z * dt;
    this.moveAxis(dx, 0, 0);
    this.moveAxis(0, dy, 0);
    this.moveAxis(0, 0, dz);

    // ground check
    const below = this.world.get(Math.floor(this.pos.x), Math.floor(this.pos.y), Math.floor(this.pos.z));
    const bm = BLOCKS[below];
    this.onGround = bm ? bm.solid : false;

    // water check
    const cy = Math.floor(this.pos.y + 0.9);
    this.inWater = this.world.get(Math.floor(this.pos.x), cy, Math.floor(this.pos.z)) === B.WATER;

    // fall damage
    if (!this.onGround && !this.inWater) {
      if (this.fallStartY === null) this.fallStartY = this.pos.y;
    } else {
      if (this.fallStartY !== null && !this.inWater) {
        const fall = this.fallStartY - this.pos.y;
        if (fall > 3) {
          this.damage(Math.floor(fall - 3), 'fall');
        }
      }
      this.fallStartY = null;
    }

    // footsteps
    if (this.onGround && wish.lengthSq() > 0) {
      this.stepTimer += dt;
      if (this.stepTimer > 0.4) {
        this.stepTimer = 0;
        sounds.play('step');
      }
    }

    // hunger / health
    this.hungerTimer += dt;
    if (this.hungerTimer > 1.6) {
      this.hungerTimer = 0;
      this.hunger = Math.max(0, this.hunger - 1);
    }
    if (this.hunger <= 0) {
      this.starveTimer += dt;
      if (this.starveTimer > 20) {
        this.starveTimer = 0;
        this.damage(1, 'starve');
      }
    }
    if (this.hunger >= 60) {
      this.regenTimer += dt;
      if (this.regenTimer > 4 && this.health < this.maxHealth) {
        this.regenTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + 1);
      }
    }
  }

  moveAxis(dx, dy, dz) {
    // x
    if (dx !== 0) {
      this.pos.x += dx;
      if (this.collides()) {
        if (dx > 0) this.pos.x = Math.floor(this.pos.x + PLAYER_R) - PLAYER_R + 0.001;
        else this.pos.x = Math.floor(this.pos.x - PLAYER_R) + 1 + PLAYER_R - 0.001;
        this.vel.x = 0;
      }
    }
    // y
    if (dy !== 0) {
      this.pos.y += dy;
      if (this.collides()) {
        if (dy > 0) this.pos.y = Math.floor(this.pos.y + PLAYER_H) - PLAYER_H + 0.001;
        else {
          this.pos.y = Math.floor(this.pos.y) + 1;
          this.onGround = true;
        }
        this.vel.y = 0;
      }
    }
    // z
    if (dz !== 0) {
      this.pos.z += dz;
      if (this.collides()) {
        if (dz > 0) this.pos.z = Math.floor(this.pos.z + PLAYER_R) - PLAYER_R + 0.001;
        else this.pos.z = Math.floor(this.pos.z - PLAYER_R) + 1 + PLAYER_R - 0.001;
        this.vel.z = 0;
      }
    }
  }

  collides() {
    const x0 = Math.floor(this.pos.x - PLAYER_R), x1 = Math.floor(this.pos.x + PLAYER_R);
    const y0 = Math.floor(this.pos.y), y1 = Math.floor(this.pos.y + PLAYER_H);
    const z0 = Math.floor(this.pos.z - PLAYER_R), z1 = Math.floor(this.pos.z + PLAYER_R);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          const m = BLOCKS[this.world.get(x, y, z)];
          if (m && m.solid) return true;
        }
    return false;
  }

  damage(amount, cause) {
    if (this.dead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
      this.deadTimer = 0;
    }
  }

  eat(food) {
    this.hunger = Math.min(100, this.hunger + food);
  }

  getEyePos() {
    return new THREE.Vector3(this.pos.x, this.pos.y + 1.62, this.pos.z);
  }
}
