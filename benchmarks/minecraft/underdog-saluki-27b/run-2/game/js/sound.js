// Synthesized WebAudio sounds — no external audio assets.

class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.ambient = null;
    this.musicTimer = 0;
    this.birdTimer = 0;
  }

  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    // shared noise buffer
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name, opts = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'break': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.loop = true;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 300 + (opts.pitch || 0) * 200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        src.connect(filt); filt.connect(g); g.connect(this.master);
        src.start(t); src.stop(t + 0.2);
        break;
      }
      case 'place': {
        this.blip(600, 0.05, 0.15);
        break;
      }
      case 'hit': {
        this.blip(200 + Math.random() * 100, 0.03, 0.2);
        break;
      }
      case 'step': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 250;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        src.connect(filt); filt.connect(g); g.connect(this.master);
        src.start(t); src.stop(t + 0.12);
        break;
      }
      case 'eat': {
        for (let i = 0; i < 4; i++) this.blip(300 + i * 80, 0.05, 0.1, t + i * 0.09);
        break;
      }
      case 'pickup': {
        this.blip(800, 0.04, 0.12);
        break;
      }
      case 'craft': {
        this.blip(500, 0.04, 0.12);
        break;
      }
      case 'furnace': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.loop = true;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = 800 + Math.random() * 400;
        const g = this.ctx.createGain();
        g.gain.value = 0.08;
        src.connect(filt); filt.connect(g); g.connect(this.master);
        src.start(t); src.stop(t + 0.15);
        break;
      }
      case 'splash': {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 600;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        src.connect(filt); filt.connect(g); g.connect(this.master);
        src.start(t); src.stop(t + 0.25);
        break;
      }
      case 'deny': {
        this.blip(150, 0.1, 0.2);
        break;
      }
    }
  }

  blip(freq, dur, vol, when) {
    const t = when || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  startAmbient() {
    const t = this.ctx.currentTime;
    // wind
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 220;
    const g = this.ctx.createGain();
    g.gain.value = 0.06;
    src.connect(filt); filt.connect(g); g.connect(this.master);
    src.start(t);
    this.ambient = { src, g };
    // gentle generative music: soft pentatonic plucks
    this.musicTimer = 1;
    this.birdTimer = 5 + Math.random() * 10;
  }

  tick(dt, dayFactor) {
    if (!this.ctx) return;
    // music
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      this.musicTimer = 2 + Math.random() * 3;
      const scale = [0, 2, 4, 5, 7, 9, 11, 12];
      const note = scale[Math.floor(Math.random() * scale.length)] + 24;
      const freq = 220 * Math.pow(2, note / 12) / 2;
      this.blip(freq, 2.5, 0.05 * (0.5 + dayFactor * 0.5));
    }
    // birds in daytime
    this.birdTimer -= dt;
    if (this.birdTimer <= 0 && dayFactor > 0.5) {
      this.birdTimer = 8 + Math.random() * 15;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + Math.random() * 600, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.04, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + 0.25);
    }
  }
}
