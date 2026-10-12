// Minimal DOM/window stub for headless Node testing.
function makeClassList() {
  const set = new Set();
  return {
    add: (...c) => c.forEach(x => set.add(x)),
    remove: (...c) => c.forEach(x => set.delete(x)),
    toggle: (c, force) => {
      if (force === undefined) set.has(c) ? set.delete(c) : set.add(c);
      else if (force) set.add(c);
      else set.delete(c);
    },
    contains: (c) => set.has(c),
  };
}

function makeElement(tag) {
  const el = {
    tagName: tag,
    className: '',
    classList: makeClassList(),
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: {},
    children: [],
    _listeners: {},
    appendChild(c) { this.children.push(c); return c; },
    before(c) { this.children.unshift(c); },
    remove() {},
    addEventListener(type, fn) {
      (this._listeners[type] = this._listeners[type] || []).push(fn);
    },
    querySelector() { return makeElement('div'); },
    getContext(kind) {
      if (kind === '2d') {
        return {
          fillStyle: '',
          imageSmoothingEnabled: false,
          fillRect() {},
          clearRect() {},
          drawImage() {},
          createRadialGradient() { return { addColorStop() {} }; },
          getImageData() { return { data: new Uint8Array(4) }; },
        };
      }
      return null;
    },
  };
  return el;
}

const document = {
  createElement: (tag) => makeElement(tag),
  getElementById: (id) => makeElement('div'),
  body: makeElement('body'),
  pointerLockElement: null,
};

const window = {
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 720,
  addEventListener() {},
};

const performance = { now: () => Date.now() };

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
  removeItem: (k) => store.delete(k),
};
globalThis.localStorage = localStorage;

function makeAudioContext() {
  const node = {
    connect: () => node,
    gain: { value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 0, setValueAtTime() {} },
    playbackRate: { value: 1 },
    type: '',
    buffer: null,
    loop: false,
    start() {},
    stop() {},
  };
  return {
    sampleRate: 44100,
    currentTime: 0,
    destination: node,
    state: 'running',
    resume() {},
    createGain: () => node,
    createBiquadFilter: () => node,
    createBufferSource: () => node,
    createOscillator: () => node,
    createBuffer(channels, length, rate) { return { getChannelData() { return new Float32Array(length); } }; },
  };
}

globalThis.document = document;
globalThis.window = window;
globalThis.performance = performance;
globalThis.AudioContext = makeAudioContext;
globalThis.requestAnimationFrame = (fn) => fn(performance.now());
