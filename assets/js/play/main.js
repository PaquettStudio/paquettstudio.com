// Abyss Angler Idle — wires data, state, simulation, input and drawing into one loop.
import { loadData } from './data.js';
import { load, save, touch, derived } from './state.js';
import { WORLD_WIDTH, createRng, createSession, requestCast, stepCast, finishCast, reelIn } from './sim.js';
import { createSteer } from './input.js';
import { createRenderer } from './render.js';

const root = document.querySelector('[data-play]');
const canvas = root?.querySelector('[data-canvas]');
const castButton = root?.querySelector('[data-cast]');
const hud = root?.querySelector('[data-hud]');

let storage = null;
try { storage = window.localStorage; } catch { storage = null; }

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  || new URLSearchParams(location.search).has('reduced-motion');

function loadImage(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
}

function zoneName(zones, depth) {
  return (zones.find(z => depth >= z.top && depth < z.bottom) ?? zones[zones.length - 1]).name;
}

async function start() {
  const { zones, species, speciesById } = await loadData();
  let state = load(storage);
  const session = createSession();
  const rng = createRng((Date.now() ^ 0x5eed) >>> 0);

  const images = {
    vessel: [0, 1, 2].map(i => loadImage(`/assets/img/play/vessel-${i}.webp`)),
    lure: loadImage('/assets/img/play/lure.webp'),
    shark: loadImage('/assets/img/play/shark.webp'),
    fish: Object.fromEntries(species.map(s => [s.id, loadImage(`/${s.art}`)])),
  };
  const renderer = createRenderer(canvas, { images, speciesById, reducedMotion });
  const steer = createSteer(root, () => canvas.getBoundingClientRect());

  const hooks = { onCastFinished: () => {}, onStateChanged: () => {} };
  const api = {
    get state() { return state; },
    setState(next) { state = next; save(storage, state); hooks.onStateChanged(state); renderHud(); },
    get cast() { return session.cast; },
    hooks, zones, species, speciesById, storage,
  };

  function renderHud() {
    const cast = session.cast;
    const depth = cast && cast.phase !== 'done' ? cast.hook.depth : 0;
    const { holdSize } = derived(state);
    const caught = cast && cast.phase !== 'done' ? cast.caught.length : 0;
    hud.innerHTML = `<span class="play-pill">${Math.round(depth)} m · ${zoneName(zones, depth)}</span>`
      + `<span class="play-pill play-coins">🪙 ${state.coins.toLocaleString('en-GB')}</span>`
      + `<span class="play-pill">Hold ${caught} / ${holdSize}</span>`;
    const active = cast && cast.phase !== 'done';
    castButton.textContent = !active ? 'Cast' : cast.phase === 'sinking' ? 'Reel in' : 'Reeling…';
    castButton.disabled = !!active && cast.phase === 'reeling';
  }

  function castOrReel() {
    if (requestCast(session, state, species, rng, { instant: reducedMotion })) {
      hooks.onCast?.();
    } else {
      reelIn(session.cast);
    }
    renderHud();
  }
  castButton.addEventListener('click', castOrReel);
  steer.onCast(castOrReel);

  const drawScene = time => renderer.draw({ cast: session.cast && session.cast.phase !== 'done' ? session.cast : null, state, time });

  let prev = 0;
  let running = false;
  let lastHud = 0;
  function frame(time) {
    if (!running) return;
    const dt = prev ? (time - prev) / 1000 : 1 / 60;
    prev = time;
    const cast = session.cast;
    if (cast && cast.phase !== 'done') {
      stepCast(cast, dt, { targetX: steer.targetX01 * WORLD_WIDTH }, rng);
      if (cast.phase === 'done') {
        const result = finishCast(state, cast, speciesById);
        state = touch(result.state, Date.now());
        save(storage, state);
        hooks.onCastFinished(result, cast);
        hooks.onStateChanged(state);
      }
    }
    if (time - lastHud > 100) { renderHud(); lastHud = time; }
    drawScene(time);
    requestAnimationFrame(frame);
  }
  const resume = () => { if (running) return; running = true; prev = 0; requestAnimationFrame(frame); };
  const pause = () => { running = false; state = touch(state, Date.now()); save(storage, state); };

  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
  window.addEventListener('pagehide', pause);
  // Resizing clears the canvas; redraw at once so a paused sea never goes blank.
  window.addEventListener('resize', () => { renderer.resize(); drawScene(performance.now()); });
  setInterval(() => { if (running) { state = touch(state, Date.now()); save(storage, state); } }, 30_000);

  renderer.resize();
  drawScene(performance.now());
  renderHud();
  if (!document.hidden) resume();
  return api;
}

if (root && canvas) {
  window.abyssIdle = start().catch(err => {
    console.error(err);
    if (hud) hud.textContent = 'The sea is not loading right now. Please refresh the page.';
  });
}
