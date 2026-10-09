import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepScrollVelocity, createInput } from '../assets/js/fx/input.js';
import { nextQuality, dprCap, particleBudget } from '../assets/js/fx/quality.js';
import { hueAt } from '../assets/js/fx/color.js';
import { createParticles } from '../assets/js/fx/particles.js';
import { createBackground } from '../assets/js/fx/background.js';
import { startFx } from '../assets/js/fx/engine.js';

// A 2D context that accepts every call and property write.
function stubContext() {
  const gradient = { addColorStop() {} };
  const target = { createLinearGradient: () => gradient, createRadialGradient: () => gradient };
  return new Proxy(target, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
}
const stubCanvas = () => ({ width: 0, height: 0, style: {}, getContext: () => stubContext() });

function event(type, props = {}) {
  const e = new Event(type);
  for (const [k, v] of Object.entries(props)) Object.defineProperty(e, k, { value: v });
  return e;
}

test('scroll velocity decays toward zero when scrolling stops', () => {
  let v = 1000;
  for (let i = 0; i < 60; i++) v = stepScrollVelocity(v, 0, 1 / 60);
  assert.ok(Math.abs(v) < 5, `v=${v}`);
});

test('scrolling down gives a positive velocity', () => {
  assert.ok(stepScrollVelocity(0, 40, 1 / 60) > 0);
});

test('quality drops to 0.7 after 2 seconds below 45 fps', () => {
  let s = { q: 1, lowFor: 0 };
  for (let i = 0; i < 63; i++) s = nextQuality(s, 30, 1 / 30);
  assert.equal(s.q, 0.7);
});

test('quality holds at 60 fps', () => {
  let s = { q: 1, lowFor: 0 };
  for (let i = 0; i < 300; i++) s = nextQuality(s, 60, 1 / 60);
  assert.deepEqual(s, { q: 1, lowFor: 0 });
});

test('quality never drops below 0.4', () => {
  let s = { q: 1, lowFor: 0 };
  for (let i = 0; i < 3000; i++) s = nextQuality(s, 10, 1 / 10);
  assert.equal(s.q, 0.4);
});

test('device pixel ratio is capped lower on touch devices', () => {
  assert.equal(dprCap(true), 1.5);
  assert.equal(dprCap(false), 2);
});

test('particle budget fits a phone screen and scales with quality', () => {
  const full = particleBudget(390, 844, 1);
  assert.ok(full >= 1 && full <= 600, `budget=${full}`);
  assert.ok(particleBudget(390, 844, 0.5) < full);
  assert.equal(particleBudget(3840, 2160, 1), 600);
});

test('hue cycles within the gold → pink → cyan band', () => {
  for (let t = 0; t < 20; t += 0.1) {
    const h = hueAt(t);
    assert.ok(h >= 40 && h <= 330, `t=${t} h=${h}`);
  }
});

test('particles never exceed their maximum', () => {
  const p = createParticles(stubContext(), { max: 100 });
  for (let i = 0; i < 10; i++) p.burst(100, 100);
  assert.ok(p.size() <= 100, `size=${p.size()}`);
  p.step(1 / 60);
  assert.ok(p.size() <= 100);
});

test('particles fade out over time', () => {
  const p = createParticles(stubContext(), { max: 500 });
  p.burst(10, 10);
  for (let i = 0; i < 300; i++) p.step(1 / 60);
  assert.equal(p.size(), 0);
});

test('background draws without throwing, with and without the hero', () => {
  const b = createBackground(stubContext());
  b.resize(390, 844);
  b.draw({ t: 1, dt: 1 / 60, scrollV: 1500, heroVisible: true });
  b.draw({ t: 2, dt: 1 / 60, scrollV: 0, heroVisible: false });
});

test('a finger that starts a scroll keeps steering the comet after pointercancel', () => {
  const target = new EventTarget();
  const input = createInput(target, () => 0);
  target.dispatchEvent(event('pointerdown', { pointerType: 'touch', clientX: 10, clientY: 10 }));
  target.dispatchEvent(event('pointercancel', { pointerType: 'touch' }));
  target.dispatchEvent(event('touchmove', { touches: [{ clientX: 100, clientY: 200 }] }));
  assert.equal(input.x, 100);
  assert.equal(input.y, 200);
  assert.equal(input.active, true);
  target.dispatchEvent(event('touchend', { touches: [] }));
  assert.equal(input.active, false);
});

test('a touch tap registers once, a cancelled touch does not', () => {
  const target = new EventTarget();
  const input = createInput(target, () => 0);
  target.dispatchEvent(event('pointerdown', { pointerType: 'touch', clientX: 50, clientY: 60 }));
  target.dispatchEvent(event('pointerup', { pointerType: 'touch', clientX: 52, clientY: 61 }));
  assert.deepEqual(input.taps, [{ x: 52, y: 61 }]);
  input.taps.length = 0;
  target.dispatchEvent(event('pointerdown', { pointerType: 'touch', clientX: 50, clientY: 60 }));
  target.dispatchEvent(event('pointercancel', { pointerType: 'touch' }));
  target.dispatchEvent(event('pointerup', { pointerType: 'touch', clientX: 50, clientY: 300 }));
  assert.deepEqual(input.taps, []);
});

test('a mouse click registers on press', () => {
  const target = new EventTarget();
  const input = createInput(target, () => 0);
  target.dispatchEvent(event('pointerdown', { pointerType: 'mouse', clientX: 5, clientY: 6 }));
  assert.deepEqual(input.taps, [{ x: 5, y: 6 }]);
});

test('input becomes idle 3 seconds after the last interaction', () => {
  let clock = 1000;
  const target = new EventTarget();
  const input = createInput(target, () => clock);
  target.dispatchEvent(event('pointermove', { pointerType: 'mouse', clientX: 1, clientY: 1 }));
  assert.equal(input.isIdle(3500), false);
  assert.equal(input.isIdle(4100), true);
});

test('input turns scroll events into velocity on update', () => {
  const target = new EventTarget();
  target.scrollY = 0;
  const input = createInput(target, () => 0);
  target.scrollY = 50;
  target.dispatchEvent(event('scroll'));
  input.update(1 / 60);
  assert.ok(input.scrollV > 0);
});

function fakeEnv() {
  const doc = new EventTarget();
  doc.hidden = false;
  doc.querySelector = () => null;
  const win = new EventTarget();
  Object.assign(win, { innerWidth: 800, innerHeight: 600, devicePixelRatio: 1, matchMedia: () => ({ matches: false }) });
  return { doc, win };
}

test('the loop stops while the tab is hidden and resumes when visible', () => {
  const { doc, win } = fakeEnv();
  const input = createInput(new EventTarget(), () => 0);
  const fx = startFx({ doc, win, bg: stubCanvas(), top: stubCanvas(), input, reducedMotion: false, raf: () => 1, caf: () => {} });
  assert.equal(fx.isRunning(), true);
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(fx.isRunning(), false);
  doc.hidden = false;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(fx.isRunning(), true);
  fx.stop();
  assert.equal(fx.isRunning(), false);
});

test('reduced motion draws a still frame and never starts the loop', () => {
  const { doc, win } = fakeEnv();
  let frames = 0;
  const input = createInput(new EventTarget(), () => 0);
  const fx = startFx({ doc, win, bg: stubCanvas(), top: stubCanvas(), input, reducedMotion: true, raf: () => { frames++; return 1; }, caf: () => {} });
  assert.equal(fx.isRunning(), false);
  assert.equal(frames, 0);
});
