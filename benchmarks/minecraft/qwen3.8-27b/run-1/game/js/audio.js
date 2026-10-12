// Procedural sound engine: every sound is synthesized with WebAudio (no asset files).
(function (global) {
  "use strict";
  let ctx = null, master = null, noiseBuf = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  const MAT = {
    dirt:   { f: 320, q: 0.8, dur: 0.18, g: 0.50, thump: 0 },
    grass:  { f: 520, q: 0.9, dur: 0.16, g: 0.45, thump: 0 },
    stone:  { f: 950, q: 1.2, dur: 0.22, g: 0.40, thump: 0.22 },
    wood:   { f: 700, q: 0.9, dur: 0.20, g: 0.45, thump: 0.16 },
    sand:   { f: 200, q: 0.7, dur: 0.12, g: 0.50, thump: 0 },
    gravel: { f: 430, q: 1.0, dur: 0.16, g: 0.45, thump: 0 },
    glass:  { f: 2200, q: 2.0, dur: 0.14, g: 0.30, thump: 0 },
    leaves: { f: 620, q: 0.8, dur: 0.12, g: 0.40, thump: 0 }
  };

  function burst(freq, q, dur, gain, type, sweepTo) {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type || "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  function thump(freq0, freq1, dur, gain) {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq0, t);
    o.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  const Audio = {
    init: ensure,
    resume: ensure,
    available: () => !!ctx,

    dig(mat, vol) {
      if (!ctx) return;
      vol = vol == null ? 1 : vol;
      const m = MAT[mat] || MAT.stone;
      burst(m.f, m.q, m.dur, m.g * vol, "bandpass");
      burst(m.f * 0.5, m.q, m.dur * 0.7, m.g * 0.5 * vol, "lowpass");
      if (m.thump) thump(90, 45, 0.14, m.thump * vol);
    },
    place(mat, vol) {
      if (!ctx) return;
      vol = vol == null ? 0.8 : vol;
      this.dig(mat, vol);
    },
    step(mat, vol) {
      if (!ctx) return;
      vol = vol == null ? 1 : vol;
      const m = MAT[mat] || MAT.dirt;
      burst(m.f * (0.85 + Math.random() * 0.3), m.q, m.dur * 0.5, m.g * 0.45 * vol, "bandpass");
    },
    splash() {
      if (!ctx) return;
      burst(900, 1.4, 0.5, 0.35, "bandpass", 250);
      burst(2500, 1.2, 0.3, 0.2, "highpass");
      thump(120, 50, 0.3, 0.15);
    },
    hurt() {
      if (!ctx) return;
      thump(220, 90, 0.25, 0.4);
      burst(180, 1, 0.2, 0.3, "lowpass");
    },
    death() {
      if (!ctx) return;
      thump(160, 40, 0.9, 0.5);
      burst(120, 0.8, 0.8, 0.4, "lowpass");
    },
    click() {
      if (!ctx) return;
      burst(1200, 2, 0.06, 0.25, "bandpass");
    },
    pop() {
      if (!ctx) return;
      burst(500 + Math.random() * 400, 1, 0.05, 0.15, "bandpass");
    }
  };

  global.Audio = Audio;
})(window);
