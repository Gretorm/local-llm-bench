// Procedural sound effects via WebAudio (no audio assets).
export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.windGain = null;
    this.waterGain = null;
    this.underwater = false;
    this.under = 0;
  }

  // Must be called from a user gesture (click) to satisfy autoplay policy.
  init() {
    if (this.ready) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      // 2s white noise buffer
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // wind loop
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = this.noise;
      windSrc.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 300;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0;
      windSrc.connect(windFilter).connect(this.windGain).connect(this.master);
      windSrc.start();
      // water rumble loop
      const waterSrc = this.ctx.createBufferSource();
      waterSrc.buffer = this.noise;
      waterSrc.loop = true;
      const waterFilter = this.ctx.createBiquadFilter();
      waterFilter.type = 'lowpass';
      waterFilter.frequency.value = 180;
      this.waterGain = this.ctx.createGain();
      this.waterGain.gain.value = 0;
      waterSrc.connect(waterFilter).connect(this.waterGain).connect(this.master);
      waterSrc.start();
      this.ready = true;
    } catch (e) {
      this.ready = false;
    }
  }

  resume() {
    if (this.ready && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // one-shot noise burst
  burst(dur, filterFreq, gain, pitch = 1) {
    if (!this.ready) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = pitch;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur);
  }

  // one-shot sine blip
  blip(freq, dur, gain, type = 'sine') {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }

  playBreak(material) {
    const m = {
      stone: [500, 0.5], dirt: [700, 0.4], sand: [1600, 0.35], wood: [900, 0.45], leaves: [1200, 0.3],
      grass: [1000, 0.35], glass: [2200, 0.4], cobblestone: [400, 0.5], bedrock: [200, 0.6],
    }[material] || [800, 0.4];
    this.burst(0.18, m[0], 0.45, 0.6 + Math.random() * 0.4);
  }

  playPlace(material) {
    const m = {
      stone: [300, 0.25], dirt: [350, 0.25], sand: [800, 0.2], wood: [500, 0.25], leaves: [700, 0.2],
      grass: [600, 0.2], glass: [1500, 0.2], cobblestone: [250, 0.25],
    }[material] || [400, 0.25];
    this.burst(0.08, m[0], 0.3, 0.7 + Math.random() * 0.3);
  }

  playStep(material) {
    const m = {
      stone: [200, 0.12], dirt: [260, 0.12], sand: [500, 0.1], wood: [350, 0.12], grass: [300, 0.1],
    }[material] || [250, 0.12];
    this.burst(0.07, m[0], 0.12, 0.8 + Math.random() * 0.4);
  }

  playJump() { this.burst(400, 0.15, 0.15, 1.2); }
  playLand(material) { this.playStep(material); this.burst(300, 0.1, 0.2); }
  playSplash() { this.burst(900, 0.3, 0.4, 0.5); }
  playSwim() { this.burst(700, 0.1, 0.15, 0.6); }
  playEat() { this.burst(1200, 0.12, 0.25, 1.5); }
  playCraft() { this.blip(880, 0.08, 0.2, 'triangle'); }
  playClick() { this.blip(660, 0.05, 0.15, 'triangle'); }
  playBreakTool() { this.blip(180, 0.1, 0.25, 'square'); }
  playDenied() { this.blip(120, 0.15, 0.25, 'square'); }
  playDay() { this.blip(440, 0.3, 0.1, 'sine'); }
  playNight() { this.blip(220, 0.3, 0.1, 'sine'); }

  // ambient: wind, birds, underwater
  update(dt, { dayF, inWater, eyeInWater, moving, onGround } = {}) {
    if (!this.ready) return;
    // wind: louder at night
    if (this.windGain) {
      const target = 0.02 + (1 - Math.max(0, dayF)) * 0.06 + (moving ? 0.02 : 0);
      this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.3);
    }
    // birds: daytime, random chirps
    if (dayF > 0.2 && Math.random() < dt * 0.12) {
      const f = 1800 + Math.random() * 1600;
      this.blip(f, 0.09 + Math.random() * 0.08, 0.08, 'sine');
      if (Math.random() < 0.3) setTimeout(() => this.blip(f * 0.8, 0.06, 0.05, 'sine'), 90);
    }
    // underwater
    if (this.waterGain) {
      const target = eyeInWater ? 0.25 : (inWater ? 0.06 : 0);
      this.waterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);
    }
    if (eyeInWater && Math.random() < dt * 2.5) this.blip(200 + Math.random() * 400, 0.05, 0.05, 'sine');
  }
}
