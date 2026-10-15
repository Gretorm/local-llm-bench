/* player.js - first-person controller: movement, physics, swimming, raycast */
(function () {
  'use strict';

  var GRAV = 26, JUMP_V = 8.4, WALK = 4.3, SPRINT = 5.7, FLY_SPD = 11, FLY_SPRINT = 22;
  var W = 0.3, H = 1.8, EYE = 1.62;

  function Player(x, y, z) {
    this.pos = new THREE.Vector3(x, y, z);
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.grounded = false;
    this.flying = false;
    this.sprinting = false;
    this.fallStartY = null;
    this.lastSplash = 0;
    this.inWater = false;
    this.eyeInWater = false;
    this.air = 10;
    this.airTimer = 0;
    this.hunger = 20;
    this.health = 20;
    this.regenTimer = 0;
    this.hurtTimer = 0;
    this.stepTimer = 0;
  }

  Player.prototype.eyePos = function () {
    var e = this.pos.clone();
    e.y += this.flying ? EYE + 0.2 : EYE;
    return e;
  };

  Player.prototype.lookDir = function () {
    var cp = Math.cos(this.pitch);
    return new THREE.Vector3(
      -Math.sin(this.yaw) * cp,
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * cp
    );
  };

  function aabbIntersectsBlock(world, minX, minY, minZ, maxX, maxY, maxZ) {
    var x0 = Math.floor(minX), x1 = Math.floor(maxX);
    var y0 = Math.floor(minY), y1 = Math.floor(maxY);
    var z0 = Math.floor(minZ), z1 = Math.floor(maxZ);
    for (var y = y0; y <= y1; y++) for (var z = z0; z <= z1; z++) for (var x = x0; x <= x1; x++) {
      var b = world.peek(x, y, z);
      if (b === 0 || b === 7) continue;
      if (Blocks.def[b].plant) continue;
      return true;
    }
    return false;
  }

  Player.prototype.collides = function (px, py, pz) {
    return aabbIntersectsBlock(this._world, px - W, py, pz - W, px + W, py + H, pz + W);
  };

  Player.prototype.update = function (dt, world, input, gameMode) {
    var self = this;
    this._world = world;
    var p = this.pos;
    var inWaterFeet = world.peek(Math.floor(p.x), Math.floor(p.y + 0.4), Math.floor(p.z)) === 7;
    var eye = this.eyePos();
    var eyeInWater = world.peek(Math.floor(eye.x), Math.floor(eye.y), Math.floor(eye.z)) === 7;
    this.inWater = inWaterFeet;
    this.eyeInWater = eyeInWater;

    // ---------- input -> wish direction ----------
    var fwd = (input.keys['KeyW'] ? 1 : 0) - (input.keys['KeyS'] ? 1 : 0);
    var strafe = (input.keys['KeyD'] ? 1 : 0) - (input.keys['KeyA'] ? 1 : 0);
    var sneak = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
    var ctrl = input.keys['ControlLeft'] || input.keys['ControlRight'];

    // double-tap W sprint
    if (input.wTapTime !== undefined && input.keys['KeyW']) {
      var now = performance.now();
      if (now - input._lastWTap < 280) { this.sprinting = true; input._lastWTap = 0; }
      else input._lastWTap = now;
    }
    if (this.sprinting && !input.keys['KeyW'] && !ctrl) this.sprinting = false;
    this.sprinting = this.sprinting || (ctrl && fwd > 0 && !sneak);

    var wishX = 0, wishZ = 0;
    var sy = this.yaw;
    var sinY = Math.sin(sy), cosY = Math.cos(sy);
    // forward is -z rotated by yaw
    var fx = -sinY, fz = -cosY;
    var rx = cosY, rz = -sinY;
    wishX = (fx * fwd + rx * strafe);
    wishZ = (fz * fwd + rz * strafe);
    var wl = Math.sqrt(wishX * wishX + wishZ * wishZ);
    if (wl > 0) { wishX /= wl; wishZ /= wl; }

    var speed = this.flying ? (this.sprinting ? FLY_SPRINT : FLY_SPD) : (this.sprinting && fwd > 0 ? SPRINT : WALK);
    if (sneak && !this.flying) speed = 1.4;
    if (inWaterFeet) speed *= 0.65;

    // ---------- horizontal accel ----------
    var targetVX = wishX * speed, targetVZ = wishZ * speed;
    var accel = this.grounded ? 12 : (this.flying ? 12 : 4);
    if (inWaterFeet) accel = 6;
    var t = Math.min(1, accel * dt);
    this.vel.x += (targetVX - this.vel.x) * t;
    this.vel.z += (targetVZ - this.vel.z) * t;

    // ---------- vertical ----------
    if (this.flying) {
      var vy = 0;
      if (input.keys['Space']) vy = speed * 0.9;
      if (sneak) vy = -speed * 0.9;
      var t2 = Math.min(1, 12 * dt);
      this.vel.y += (vy - this.vel.y) * t2;
    } else if (inWaterFeet) {
      this.vel.y -= 6 * dt;
      if (input.keys['Space']) this.vel.y = Math.min(this.vel.y + 22 * dt, 4);
      this.vel.y *= (1 - Math.min(1, 3 * dt));
    } else {
      this.vel.y -= GRAV * dt;
      if (this.vel.y < -50) this.vel.y = -50;
      if (input.keys['Space'] && this.grounded) {
        this.vel.y = JUMP_V;
        this.grounded = false;
      }
    }

    // splash sound
    if (this.inWater && !this._wasInWater && this.vel.y < -4) {
      if (performance.now() - this.lastSplash > 500) Audio.splash();
      this.lastSplash = performance.now();
    }
    if (!this.inWater && this._wasInWater && this.vel.y > 3) Audio.splash();
    this._wasInWater = this.inWater;

    // ---------- integrate + collide (per axis) ----------
    var wasGrounded = this.grounded;
    this.grounded = false;
    this._fallV = this.vel.y;

    // X
    p.x += this.vel.x * dt;
    if (this.collides(p.x, p.y, p.z)) {
      var pushX = Math.sign(this.vel.x);
      // resolve: move back to face
      var step = 0.05;
      while (pushX !== 0 && this.collides(p.x, p.y, p.z)) {
        p.x -= step * pushX;
      }
      this.vel.x = 0;
    }
    // Z
    p.z += this.vel.z * dt;
    if (this.collides(p.x, p.y, p.z)) {
      var pushZ = Math.sign(this.vel.z);
      var step2 = 0.05;
      while (pushZ !== 0 && this.collides(p.x, p.y, p.z)) {
        p.z -= step2 * pushZ;
      }
      this.vel.z = 0;
    }
    // Y
    var fallDist = 0;
    if (this.fallStartY != null && this.vel.y <= 0) fallDist = this.fallStartY - p.y;
    p.y += this.vel.y * dt;
    if (this.collides(p.x, p.y, p.z)) {
      // resolve: step back along Y until clear of the solid block
      var pushY = this.vel.y < 0 ? 1 : -1;
      var stepY = 0.05;
      while (this.collides(p.x, p.y, p.z)) {
        p.y += stepY * pushY;
      }
    }
    if (this.collides(p.x, p.y, p.z)) {
      if (this.vel.y < 0) {
        this.grounded = true;
        if (this.fallStartY != null) {
          var fd = this.fallStartY - p.y;
          if (fd > 3.5 && !this.flying && !inWaterFeet) {
            var dmg = Math.floor(fd - 3) + 1;
            this.damage(dmg, 'fall');
          }
        }
        this.vel.y = 0;
        this.fallStartY = null;
      } else {
        this.vel.y = 0;
      }
    } else if (this.vel.y < 0 && !this.grounded) {
      if (this.fallStartY == null) this.fallStartY = p.y;
    }
    if (!this.grounded && this.vel.y <= 0 && this.fallStartY == null && !this.flying) {
      this.fallStartY = p.y;
    }
    if (this.grounded && this.fallStartY != null) this.fallStartY = null;

    // footsteps
    var moving = Math.abs(this.vel.x) > 1 || Math.abs(this.vel.z) > 1;
    if (this.grounded && moving && !this._wasGrounded) {
      this.stepTimer = 0.3;
    }
    if (this.stepTimer > 0) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0 && this.grounded && moving) {
        var under = world.peek(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z));
        Audio.step(Blocks.def[under].dig || 'dirt');
        this.stepTimer = this.sprinting ? 0.27 : 0.42;
      }
    }
    this._wasGrounded = this.grounded;

    // ---------- drowning ----------
    if (this.eyeInWater) {
      this.airTimer += dt;
      if (this.airTimer >= 1.2) {
        this.airTimer = 0;
        this.air = Math.max(0, this.air - 1);
        if (this.air === 0) this.damage(2, 'drown');
      }
    } else if (this.air < 10) {
      this.airTimer += dt;
      if (this.airTimer >= 0.25) {
        this.airTimer = 0;
        this.air = Math.min(10, this.air + 1);
      }
    } else this.airTimer = 0;

    // ---------- hunger & regen ----------
    if (gameMode === 'survival') {
      var drain = 0;
      if (moving) drain += 0.012;
      if (this.sprinting) drain += 0.02;
      if (input.keys['Space'] && this.grounded) drain += 0.05;
      this.hunger = Math.max(0, this.hunger - drain * dt * 10 * 0.1);
      if (this.hunger >= 18 && this.health < 20) {
        this.regenTimer += dt;
        if (this.regenTimer >= 0.8) {
          this.regenTimer = 0;
          this.health = Math.min(20, this.health + 1);
        }
      }
      this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    }
  };

  Player.prototype.damage = function (n, type) {
    if (this.health <= 0) return;
    if (this.hurtTimer > 0) return; // brief invulnerability
    this.hurtTimer = 0.5;
    this.health = Math.max(0, this.health - n);
    Audio.hurt();
    if (window.onPlayerHurt) window.onPlayerHurt(n, type);
    if (this.health <= 0 && window.onPlayerDeath) window.onPlayerDeath();
  };

  Player.prototype.heal = function (n) {
    this.health = Math.min(20, this.health + n);
  };

  // DDA voxel raycast
  Player.prototype.raycast = function (world, maxDist) {
    var origin = this.eyePos();
    var dir = this.lookDir();
    var x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
    var stepX = Math.sign(dir.x), stepY = Math.sign(dir.y), stepZ = Math.sign(dir.z);
    var tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    var tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    var tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;
    var tMaxX = dir.x > 0 ? (x + 1 - origin.x) * tDeltaX : dir.x < 0 ? (origin.x - x) * tDeltaX : Infinity;
    var tMaxY = dir.y > 0 ? (y + 1 - origin.y) * tDeltaY : dir.y < 0 ? (origin.y - y) * tDeltaY : Infinity;
    var tMaxZ = dir.z > 0 ? (z + 1 - origin.z) * tDeltaZ : dir.z < 0 ? (origin.z - z) * tDeltaZ : Infinity;
    var px = x, py = y, pz = z;
    var t = 0;
    for (var i = 0; i < 128; i++) {
      px = x; py = y; pz = z;
      if (tMaxX < tMaxY) { if (tMaxX < tMaxZ) { x += stepX; t = tMaxX; tMaxX += tDeltaX; } else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; } }
      else { if (tMaxY < tMaxZ) { y += stepY; t = tMaxY; tMaxY += tDeltaY; } else { z += stepZ; t = tMaxZ; tMaxZ += tDeltaZ; } }
      if (t > maxDist) break;
      var b = world.peek(x, y, z);
      if (b !== 0 && b !== 7) {
        var bd = Blocks.def[b];
        if (bd.plant) {
          // plants: target them but placement replaces
          return { x: x, y: y, z: z, id: b, prev: [px, py, pz], plant: true, dist: t };
        }
        return { x: x, y: y, z: z, id: b, prev: [px, py, pz], plant: false, dist: t };
      }
      if (b === 7) {
        // water: remember as potential place cell
        px = x; py = y; pz = z;
      }
    }
    return null;
  };

  window.Player = Player;
})();
