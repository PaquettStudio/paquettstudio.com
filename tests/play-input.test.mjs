import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSteer } from '../assets/js/play/input.js';

const rect = () => ({ left: 100, width: 400 });
function event(type, props = {}) {
  const e = new Event(type, { cancelable: true });
  for (const [k, v] of Object.entries(props)) Object.defineProperty(e, k, { value: v });
  return e;
}

test('a finger on the water sets the target under it', () => {
  const target = new EventTarget();
  const steer = createSteer(target, rect);
  target.dispatchEvent(event('pointerdown', { pointerType: 'touch', clientX: 400 }));
  assert.equal(steer.targetX01, 0.75);
  target.dispatchEvent(event('pointermove', { pointerType: 'touch', clientX: 200 }));
  assert.equal(steer.targetX01, 0.25);
});

test('a finger that is lifted no longer steers', () => {
  const target = new EventTarget();
  const steer = createSteer(target, rect);
  target.dispatchEvent(event('pointerdown', { pointerType: 'touch', clientX: 400 }));
  target.dispatchEvent(event('pointerup', { pointerType: 'touch', clientX: 400 }));
  target.dispatchEvent(event('pointermove', { pointerType: 'touch', clientX: 100 }));
  assert.equal(steer.targetX01, 0.75);
});

test('the mouse steers just by moving', () => {
  const target = new EventTarget();
  const steer = createSteer(target, rect);
  target.dispatchEvent(event('pointermove', { pointerType: 'mouse', clientX: 300 }));
  assert.equal(steer.targetX01, 0.5);
});

test('arrow keys nudge the target and stay inside the water', () => {
  const target = new EventTarget();
  const steer = createSteer(target, rect);
  for (let i = 0; i < 3; i++) target.dispatchEvent(event('keydown', { key: 'ArrowRight' }));
  assert.ok(Math.abs(steer.targetX01 - 0.62) < 1e-9, String(steer.targetX01));
  for (let i = 0; i < 100; i++) target.dispatchEvent(event('keydown', { key: 'ArrowLeft' }));
  assert.equal(steer.targetX01, 0);
  target.dispatchEvent(event('pointermove', { pointerType: 'mouse', clientX: 9999 }));
  assert.equal(steer.targetX01, 1);
});

test('Space casts once per press and does not scroll the page', () => {
  const target = new EventTarget();
  const steer = createSteer(target, rect);
  let casts = 0;
  steer.onCast(() => casts++);
  const press = event('keydown', { key: ' ' });
  target.dispatchEvent(press);
  target.dispatchEvent(event('keydown', { key: ' ', repeat: true }));
  assert.equal(casts, 1);
  assert.equal(press.defaultPrevented, true);
});

test('keys typed into buttons are left to the buttons', () => {
  const target = new EventTarget();
  const steer = createSteer(target, rect);
  let casts = 0;
  steer.onCast(() => casts++);
  target.dispatchEvent(event('keydown', { key: ' ', target: { closest: sel => (sel.includes('button') ? {} : null) } }));
  assert.equal(casts, 0);
});
