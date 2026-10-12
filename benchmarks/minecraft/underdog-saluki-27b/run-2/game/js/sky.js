// Sky: gradient dome, sun, moon, stars, clouds. Day/night cycle.

class Sky {
  constructor(scene) {
    this.scene = scene;
    this.dayFactor = 1; // 0 = night, 1 = day
    this.time = 0;     // seconds, day = 600s
    this.build();
  }

  build() {
    // sky dome
    const geo = new THREE.SphereGeometry(400, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        dayFactor: { value: 1 },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform float dayFactor;
        uniform vec3 sunDir;
        void main() {
          float h = max(0.0, vDir.y);
          vec3 dayZen = vec3(0.45, 0.65, 1.0);
          vec3 dayHor = vec3(0.75, 0.85, 0.98);
          vec3 nightZen = vec3(0.01, 0.02, 0.06);
          vec3 nightHor = vec3(0.04, 0.06, 0.12);
          vec3 day = mix(dayHor, dayZen, smoothstep(0.0, 0.6, h));
          vec3 night = mix(nightHor, nightZen, smoothstep(0.0, 0.6, h));
          vec3 col = mix(night, day, dayFactor);
          // sun glow
          float s = max(0.0, dot(vDir, sunDir));
          col += vec3(1.0, 0.9, 0.4) * pow(s, 60.0) * dayFactor;
          col += vec3(1.0, 0.9, 0.4) * pow(s, 8.0) * 0.15 * dayFactor;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.dome = new THREE.Mesh(geo, mat);
    this.scene.add(this.dome);

    // sun disc
    const sunGeo = new THREE.CircleGeometry(12, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, fog: false });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sun);

    // moon
    const moonGeo = new THREE.CircleGeometry(10, 24);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xccddee, fog: false });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moon);

    // stars
    const starGeo = new THREE.BufferGeometry();
    const n = 400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      pos[i * 3] = Math.sin(phi) * Math.cos(theta) * 390;
      pos[i * 3 + 1] = Math.cos(phi) * 390;
      pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * 390;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0 });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // clouds
    this.clouds = new THREE.Group();
    for (let i = 0; i < 24; i++) {
      const w = 8 + Math.random() * 14;
      const l = 4 + Math.random() * 8;
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(w, 1.5, l),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, fog: false })
      );
      c.position.set(
        (Math.random() - 0.5) * 300,
        42 + Math.random() * 8,
        (Math.random() - 0.5) * 300
      );
      this.clouds.add(c);
    }
    this.scene.add(this.clouds);
  }

  update(dt) {
    this.time += dt;
    const t = (this.time % 600) / 600; // 0 = sunrise, 0.5 = sunset
    const sunY = Math.sin(t * Math.PI * 2);
    this.dayFactor = Math.max(0, Math.min(1, (sunY + 0.12) / 0.34));
    this.dome.material.uniforms.dayFactor.value = this.dayFactor;

    // sun position: moves in the XZ plane
    const ang = t * Math.PI * 2;
    const sunDir = new THREE.Vector3(Math.sin(ang), sunY, -Math.cos(ang)).normalize();
    this.dome.material.uniforms.sunDir.value.copy(sunDir);
    this.sun.position.copy(sunDir).multiplyScalar(380);
    this.sun.lookAt(new THREE.Vector3(0, 0, 0));
    this.sun.visible = sunY > -0.1;

    // moon opposite
    const moonDir = new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z).normalize();
    this.moon.position.copy(moonDir).multiplyScalar(380);
    this.moon.lookAt(new THREE.Vector3(0, 0, 0));
    this.moon.visible = -sunY > -0.1;

    this.stars.material.opacity = (1 - this.dayFactor) * 0.9;

    // clouds drift
    for (const c of this.clouds.children) {
      c.position.x += dt * 0.4;
      if (c.position.x > 160) c.position.x -= 320;
    }
  }
}
