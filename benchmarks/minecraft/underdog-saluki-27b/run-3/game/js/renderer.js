// Three.js rendering: chunked voxel geometry, AO, sky, clouds, particles.
import * as THREE from 'three';
import { BLOCKS } from './blocks.js';
import { getAtlasTexture, ATLAS_TILES } from './blocks.js';
import { WORLD_SIZE, WORLD_HEIGHT, CHUNK } from './world.js';

const FACES = [
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { dir: [1, 0, 0], corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { dir: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { dir: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]] },
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
];
// uv per corner: [u, v] in 0..1
const FACE_UV = [
  [[0, 1], [1, 1], [1, 0], [0, 0]], // top: u=cx, v=cz
  [[0, 0], [1, 0], [1, 1], [0, 1]], // bottom
  [[1, 0], [0, 0], [0, 1], [1, 1]], // +x: u=cz, v=cy
  [[0, 0], [1, 0], [1, 1], [0, 1]], // -x
  [[0, 0], [1, 0], [1, 1], [0, 1]], // +z: u=cx, v=cy
  [[1, 0], [0, 0], [0, 1], [1, 1]], // -z
];

function aoCount(world, x, y, z, c, d) {
  let t1, t2;
  if (d[0] !== 0) { t1 = [0, 1, 0]; t2 = [0, 0, 1]; }
  else if (d[1] !== 0) { t1 = [1, 0, 0]; t2 = [0, 0, 1]; }
  else { t1 = [1, 0, 0]; t2 = [0, 1, 0]; }
  let count = 0;
  for (const s1 of [-1, 1]) {
    for (const s2 of [-1, 1]) {
      const sx = x + c[0] + d[0] + s1 * t1[0] + s2 * t2[0];
      const sy = y + c[1] + d[1] + s1 * t1[1] + s2 * t2[1];
      const sz = z + c[2] + d[2] + s1 * t1[2] + s2 * t2[2];
      if (world.solid(sx, sy, sz)) count++;
    }
  }
  return count;
}

function pushFace(arr, x, y, z, face, uvScale, tileIndex, ao) {
  const d = face.dir;
  const c = face.corners;
  const uv = FACE_UV[FACES.indexOf(face)];
  const tx = (tileIndex % ATLAS_TILES) / ATLAS_TILES;
  // canvas Y is flipped by three.js: row 0 of the canvas is v = 1
  const ty = (ATLAS_TILES - 1 - Math.floor(tileIndex / ATLAS_TILES)) / ATLAS_TILES;
  for (let i = 0; i < 4; i++) {
    const cx = x + c[i][0], cy = y + c[i][1] * uvScale, cz = z + c[i][2];
    arr.positions.push(cx, cy, cz);
    arr.normals.push(d[0], d[1], d[2]);
    arr.uvs.push(tx + uv[i][0] / ATLAS_TILES, ty + uv[i][1] / ATLAS_TILES);
    arr.colors.push(ao, ao, ao);
  }
  const base = arr.positions.length / 3;
  arr.indices.push(base, base + 1, base + 2);
  arr.indices.push(base, base + 2, base + 3);
}

// Build geometry for one chunk. Returns { opaque, transparent } arrays.
export function buildChunk(world, cx, cz) {
  const op = { positions: [], normals: [], uvs: [], colors: [], indices: [] };
  const tp = { positions: [], normals: [], uvs: [], colors: [], indices: [] };
  const x0 = cx * CHUNK, z0 = cz * CHUNK;

  for (let x = x0; x < x0 + CHUNK; x++) {
    for (let z = z0; z < z0 + CHUNK; z++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const b = world.get(x, y, z);
        if (b === 0) continue;
        const def = BLOCKS[b];
        if (def.deco) {
          // half-height box: 4 sides + top
          const ao = 1 - aoCount(world, x, y, z, [0, 1, 1], [0, 1, 0]) * 0.125;
          for (const f of [2, 3, 4, 5]) {
            const face = FACES[f];
            const n = world.get(x + face.dir[0], y + face.dir[1], z + face.dir[2]);
            if (n === 0 || BLOCKS[n].transparent) {
              pushFace(tp, x, y, z, face, 0.5, def.top, ao);
            }
          }
          // top face at y+0.5
          const top = world.get(x, y + 1, z);
          if (top === 0 || BLOCKS[top].transparent) {
            pushFace(tp, x, y, z, FACES[0], 0.5, def.top, ao);
          }
          continue;
        }
        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nx = x + face.dir[0], ny = y + face.dir[1], nz = z + face.dir[2];
          const n = world.get(nx, ny, nz);
          let visible;
          if (def.transparent) {
            visible = n === 0 || (BLOCKS[n].transparent && n !== b);
          } else {
            visible = n === 0 || BLOCKS[n].transparent;
          }
          if (!visible) continue;
          const ao = 1 - aoCount(world, x, y, z, face.corners[0], face.dir) * 0.125;
          const target = def.transparent ? tp : op;
          const tile = face.dir[1] > 0 ? def.top : face.dir[1] < 0 ? def.bottom : def.side;
          pushFace(target, x, y, z, face, 1, tile, ao);
        }
      }
    }
  }
  return { op, tp };
}

export function makeGeometry(arr) {
  if (arr.positions.length === 0) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr.positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(arr.normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(arr.uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(arr.colors, 3));
  g.setIndex(arr.indices);
  return g;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

    const atlas = getAtlasTexture();
    this.matOpaque = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });
    this.matTrans = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 1, depthWrite: false });

    // lights
    this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    this.scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0x88bbff, 0x443322, 0.7);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x8899ff, 0.0);
    this.scene.add(this.moon);

    // sky
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(480, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          uSun: { value: new THREE.Vector3(0, 1, 0) },
          uDay: { value: 1 },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: `
          varying vec3 vDir;
          uniform vec3 uSun;
          uniform float uDay;
          void main() {
            vec3 dir = normalize(vDir);
            float sunH = uSun.y;
            float dayF = smoothstep(-0.12, 0.25, sunH);
            vec3 dayZen = vec3(0.42, 0.62, 0.92);
            vec3 dayHor = vec3(0.78, 0.84, 0.92);
            vec3 nightZen = vec3(0.015, 0.02, 0.07);
            vec3 nightHor = vec3(0.05, 0.06, 0.12);
            vec3 col = mix(nightHor, dayHor, dayF);
            col = mix(col, mix(nightZen, dayZen, dayF), smoothstep(0.0, 0.7, dir.y));
            float sunDot = max(dot(dir, uSun), 0.0);
            col += vec3(1.0, 0.92, 0.55) * pow(sunDot, 90.0) * dayF;
            col += vec3(1.0, 0.92, 0.55) * pow(sunDot, 8.0) * 0.12 * dayF;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    this.scene.add(this.sky);

    // stars
    const starPos = [];
    for (let i = 0; i < 900; i++) {
      const v = new THREE.Vector3().randomDirection();
      starPos.push(v.x * 460, v.y * 460 + 20, v.z * 460);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
    this.scene.add(this.stars);

    // sun & moon sprites
    this.sunSprite = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({ map: makeGlowTexture(255, 220, 120), transparent: true, depthTest: false }),
    );
    this.scene.add(this.sunSprite);
    this.moonSprite = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ map: makeGlowTexture(210, 215, 225), transparent: true, depthTest: false }),
    );
    this.scene.add(this.moonSprite);

    // clouds
    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 });
    for (let i = 0; i < 36; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 11), cloudMat);
      m.position.set((Math.random() - 0.5) * WORLD_SIZE * 1.6, 46 + Math.random() * 12, (Math.random() - 0.5) * WORLD_SIZE * 1.6);
      this.clouds.add(m);
    }
    this.scene.add(this.clouds);

    // fog
    this.scene.fog = new THREE.FogExp2(0x88aacc, 0.004);

    // particles
    const pGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
    this.particleMat = new THREE.MeshBasicMaterial();
    this.particles = new THREE.InstancedMesh(pGeo, this.particleMat, 512);
    this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.particles);
    this.particles.active = [];
    const dummy = new THREE.Matrix4();
    for (let i = 0; i < 512; i++) this.particles.setMatrixAt(i, dummy);

    // highlight box
    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
    );
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    // chunks
    this.chunks = new Map();
    this.torchLights = [];

    this.onUpdate = null; // set by main
  }

  setCamera(pos, quat) {
    this.camera.position.copy(pos);
    this.camera.quaternion.copy(quat);
    this.camera.updateMatrixWorld();
  }

  resize(w, h) {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildAll(world) {
    for (let cx = 0; cx < Math.ceil(WORLD_SIZE / CHUNK); cx++) {
      for (let cz = 0; cz < Math.ceil(WORLD_SIZE / CHUNK); cz++) {
        this.rebuildChunk(world, cx, cz);
      }
    }
  }

  rebuildChunk(world, cx, cz) {
    const key = cx + ',' + cz;
    const old = this.chunks.get(key);
    if (old) {
      for (const mesh of [old.opaque, old.trans]) {
        if (mesh) {
          this.scene.remove(mesh);
          mesh.geometry.dispose();
        }
      }
    }
    const { op, tp } = buildChunk(world, cx, cz);
    const opGeo = makeGeometry(op);
    const tpGeo = makeGeometry(tp);
    const opaque = opGeo ? new THREE.Mesh(opGeo, this.matOpaque) : null;
    const trans = tpGeo ? new THREE.Mesh(tpGeo, this.matTrans) : null;
    if (opaque) { opaque.renderOrder = 0; this.scene.add(opaque); }
    if (trans) { trans.renderOrder = 10; this.scene.add(trans); }
    this.chunks.set(key, { opaque, trans });
    this.refreshTorchLights(world);
  }

  refreshTorchLights(world) {
    for (const l of this.torchLights) this.scene.remove(l);
    this.torchLights = [];
    const blocks = world.blocks;
    const size = world.size, height = world.height;
    const torchId = BLOCKS.findIndex(b => b.id === 'torch');
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i] !== torchId) continue;
      const x = i % size, y = Math.floor(i / size) % height, z = Math.floor(i / (size * height)) % size;
      if (this.torchLights.length >= 48) break;
      const light = new THREE.PointLight(0xffb060, 1.4, 10, 2);
      light.position.set(x + 0.5, y + 0.75, z + 0.5);
      this.scene.add(light);
      this.torchLights.push(light);
    }
  }

  spawnParticles(x, y, z, color) {
    const n = 24;
    for (let i = 0; i < n; i++) {
      this.particles.active.push({
        pos: new THREE.Vector3(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6),
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4),
        life: 0.6 + Math.random() * 0.4,
      });
    }
    this.particleMat.color = new THREE.Color(color);
  }

  updateParticles(dt) {
    const arr = this.particles.active;
    const dummy = new THREE.Matrix4();
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { arr.splice(i, 1); continue; }
      p.vel.y -= 30 * dt;
      p.pos.addScaledVector(p.vel, dt);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z),
        new THREE.Quaternion(),
        new THREE.Vector3(p.life, p.life, p.life),
      );
      this.particles.setMatrixAt(i, m);
    }
    for (let i = arr.length; i < 512; i++) this.particles.setMatrixAt(i, dummy);
    this.particles.instanceMatrix.needsUpdate = true;
  }

  update(dt, worldTime, player) {
    // day/night: worldTime in [0,1), 0 = dawn
    const ang = worldTime * Math.PI * 2;
    // sun rises at t=0.0 (east), sets at t=0.5 (west)
    const sunY = Math.sin(ang);
    const sunX = Math.cos(ang);
    const sunDir = new THREE.Vector3(sunX, sunY, -0.35).normalize();
    this.sun.position.copy(sunDir).multiplyScalar(100);
    this.sky.material.uniforms.uSun.value.copy(sunDir);
    this.sky.material.uniforms.uDay.value = sunY;
    const dayF = THREE.MathUtils.smoothstep(-0.12, 0.25, sunY);
    this.sun.intensity = dayF * 1.2;
    this.hemi.intensity = 0.3 + dayF * 0.6;
    this.moon.intensity = (1 - dayF) * 0.25;
    this.stars.visible = dayF < 0.15;
    this.sunSprite.visible = sunY > -0.2;
    this.moonSprite.visible = sunY < 0.2;

    const sunPos = sunDir.clone().multiplyScalar(460);
    this.sunSprite.position.copy(sunPos);
    this.sunSprite.lookAt(player ? player.eye() : this.camera.position);
    const moonDir = sunDir.clone().negate();
    this.moonSprite.position.copy(moonDir).multiplyScalar(460);
    this.moonSprite.lookAt(player ? player.eye() : this.camera.position);

    // fog color follows horizon
    const c = new THREE.Color();
    const dayHor = new THREE.Color(0x88aacc).multiplyScalar(0.9);
    const nightHor = new THREE.Color(0x101428);
    c.lerpColors(nightHor, dayHor, dayF);
    this.scene.fog.color.copy(c);
    this.renderer.setClearColor(c, 1);

    // clouds drift
    for (const cl of this.clouds.children) {
      cl.position.x += dt * 0.4;
      if (cl.position.x > WORLD_SIZE) cl.position.x -= WORLD_SIZE * 1.6;
    }

    this.updateParticles(dt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}

function makeGlowTexture(r, g, b) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.6, `rgba(${r},${g},${b},0.8)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}
