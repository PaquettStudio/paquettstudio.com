import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSfx } from '../assets/js/sfx.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
const blockedStorage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };

function spyAudio() {
  const stats = { created: 0, oscillators: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const node = () => ({ connect: next => next, start() {}, stop() {}, frequency: param(), gain: param(), type: '', buffer: null });
  class FakeAudioContext {
    constructor() { stats.created++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createOscillator() { stats.oscillators++; return node(); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createBufferSource() { return node(); }
    createBuffer(_c, len) { return { getChannelData: () => new Float32Array(len) }; }
    resume() { this.state = 'running'; }
  }
  return { FakeAudioContext, stats };
}

test('sound starts off when nothing is saved', () => {
  const sfx = createSfx({ storage: memoryStorage(), AudioCtx: spyAudio().FakeAudioContext });
  assert.equal(sfx.isOn(), false);
});

test('a saved preference turns sound on at load', () => {
  const sfx = createSfx({ storage: memoryStorage({ 'paquett.sound': '1' }), AudioCtx: spyAudio().FakeAudioContext });
  assert.equal(sfx.isOn(), true);
});

test('toggle turns sound on and saves the choice', () => {
  const storage = memoryStorage();
  const sfx = createSfx({ storage, AudioCtx: spyAudio().FakeAudioContext });
  assert.equal(sfx.toggle(), true);
  assert.equal(storage.data['paquett.sound'], '1');
  assert.equal(sfx.toggle(), false);
  assert.equal(storage.data['paquett.sound'], '0');
});

test('blocked storage still toggles in memory without throwing', () => {
  const sfx = createSfx({ storage: blockedStorage, AudioCtx: spyAudio().FakeAudioContext });
  assert.equal(sfx.isOn(), false);
  assert.equal(sfx.toggle(), true);
  assert.equal(sfx.isOn(), true);
});

test('playing while sound is off never creates an audio context', () => {
  const { FakeAudioContext, stats } = spyAudio();
  const sfx = createSfx({ storage: memoryStorage(), AudioCtx: FakeAudioContext });
  sfx.play('tap');
  sfx.play('hover');
  assert.equal(stats.created, 0);
});

test('the audio context is created once and reused', () => {
  const { FakeAudioContext, stats } = spyAudio();
  const sfx = createSfx({ storage: memoryStorage(), AudioCtx: FakeAudioContext });
  sfx.toggle();
  sfx.play('tap');
  sfx.play('lang');
  sfx.toggle();
  sfx.toggle();
  sfx.play('hover');
  assert.equal(stats.created, 1);
  assert.ok(stats.oscillators > 0);
});

test('a browser without WebAudio stays silent without errors', () => {
  const sfx = createSfx({ storage: memoryStorage(), AudioCtx: undefined });
  assert.equal(sfx.toggle(), true);
  assert.doesNotThrow(() => sfx.play('tap'));
});
