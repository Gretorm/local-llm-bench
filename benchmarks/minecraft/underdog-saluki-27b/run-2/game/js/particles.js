// Simple particle system for block breaks and splashes.

class Particles {
  constructor(scene) {
    this.scene = scene;
    this.parts = [];
    this.max = 600;
    const geo = new THREE.BufferGeometry();
    const max = this.max;
    geo.setAttribute('position', new THREE.Float32Array(max * 3));
    geo.setAttribute('color', new THREE.Float32Array(max * 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1000);
    const mat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
    this.count = 0;
  }

  spawnBurst(pos, color, n, spread = 2) {
    for (let i = 0; i < n; i++) {
      if (this.count >= this.max) return;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        Math.random() * spread * 0.8 + 0.5,
        (Math.random() - 0.5) * spread
      );
      this.parts.push({
        pos: new THREE.Vector3(pos.x + (Math.random() - 0.5) * 0.3, pos.y + (Math.random() - 0.5) * 0.3, pos.z + (Math.random() - 0.5) * 0.3),
        vel,
        life: 0.6 + Math.random() * 0.5,
        color,
      });
      this.count++;
    }
  }

  update(dt) {
    const pos = this.points.geometry.attributes.position.array;
    const col = this.points.geometry.attributes.color.array;
    let i = 0;
    for (let j = 0; j < this.parts.length; j++) {
      const p = this.parts[j];
      p.life: {
        p.life -= dt;
        if (p.life <= 0) {
          this.parts.splice(j, 1);
          continue;
        }
        p.vel.y -= 20 * dt;
        p.pos.addScaledVector(p.vel, dt);
        pos[i * 3] = p.pos.x;
        pos[i * 3 + 1] = p.pos.y;
        pos[i * 3 + 2] = p.pos.z;
        col[i * 3] = p.color.r;
        col[i * 3 + 1] = p.color.g;
        col[i * 3 + 2] = p.color.b;
        i++;
      }
    }
    this.count = i;
    this.points.geometry.setDrawRange(0, this.count);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}
