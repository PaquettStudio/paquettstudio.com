// Abyss Angler Idle — wires data, state, simulation, input, drawing and panels into one loop.
import { loadData } from './data.js';
import { load, save, touch, buy, reset, arrive, bank, keepPending, SAVE_KEY, ECONOMY } from './state.js';
import { WORLD_WIDTH, createRng, createSession, requestCast, stepCast, finishCast, reelIn } from './sim.js';
import { createSteer } from './input.js';
import { createRenderer } from './render.js';
import { createUi, caughtText, newSpeciesText } from './ui.js';

const root = document.querySelector('[data-play]');
const canvas = root?.querySelector('[data-canvas]');
const stage = root?.querySelector('[data-stage]');
const hud = root?.querySelector('[data-hud]');

let storage = null;
try { storage = window.localStorage; } catch { storage = null; }
let sessionStore = null;
try { sessionStore = window.sessionStorage; } catch { sessionStore = null; }

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  || new URLSearchParams(location.search).has('reduced-motion');
const MAX_LINE = ECONOMY.lineDepths[ECONOMY.lineDepths.length - 1];

// The site's main.js owns the sound switch in the header; play through its instance.
const sound = name => window.paquettSfx?.play(name);

function loadImage(src) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img;
}

async function start() {
  const { zones, species, speciesById } = await loadData();
  let state = load(storage);
  const session = createSession();
  const rng = createRng((Date.now() ^ 0x5eed) >>> 0);

  // Crew earnings wait on a card until banked; meanwhile lastSeen stays put (see arrive in state.js).
  let pending = null;
  let hideWelcome = null;
  const stamp = s => (pending ? s : touch(s, Date.now()));

  const images = {
    vessel: [0, 1, 2].map(i => loadImage(`/assets/img/play/vessel-${i}.webp`)),
    lure: loadImage('/assets/img/play/lure.webp'),
    shark: loadImage('/assets/img/play/shark.webp'),
    fish: Object.fromEntries(species.map(s => [s.id, loadImage(`/${s.art}`)])),
  };
  const renderer = createRenderer(canvas, { images, speciesById, reducedMotion });

  function commit(next) {
    state = stamp(next);
    save(storage, state);
    ui.render(state, session.cast);
  }

  // Called when the page opens and every time it is shown again.
  function arriveNow() {
    if (pending) return;
    const visit = arrive(state, Date.now(), speciesById);
    state = visit.state;
    pending = visit.pending;
    save(storage, state);
    if (pending) hideWelcome = ui.showWelcomeBack(pending);
  }

  function dropWelcome() {
    hideWelcome?.();
    hideWelcome = null;
  }

  function collect({ quiet = false } = {}) {
    if (!pending) return;
    const { coins } = pending;
    const banked = bank(state, pending, Date.now());
    pending = null;
    dropWelcome();
    commit(banked);
    if (quiet) return;
    sound('coins');
    ui.announce(`Collected ${coins.toLocaleString('en-GB')} coins`);
  }

  function castOrReel() {
    if (requestCast(session, state, species, rng, { instant: reducedMotion })) {
      sound('cast');
    } else {
      reelIn(session.cast);
    }
    ui.render(state, session.cast);
  }

  const ui = createUi(root, {
    species, zones, speciesById, sessionStore,
    onCast: castOrReel,
    onBuy(id) {
      const result = buy(state, id);
      if (!result.ok) return;
      commit(result.state);
      sound('coins');
    },
    onCollect: () => collect(),
    onReset() {
      reset(storage);
      pending = null;
      dropWelcome();
      session.cast = null;
      commit(load(storage));
    },
  });

  const steer = createSteer(stage, () => canvas.getBoundingClientRect(), document);
  steer.onCast(castOrReel);

  function finish(cast) {
    const result = finishCast(state, cast, speciesById);
    commit(result.state);
    if (result.coins > 0) sound('coins');
    if (result.newSpecies.length) {
      const list = result.newSpecies.map(id => speciesById[id]);
      ui.showNewSpecies(list);
      ui.announce(list.map(newSpeciesText).join('. '));
      sound('newSpecies');
    }
    if (Object.keys(state.collection).length >= species.length) ui.showCta('complete');
  }

  const drawScene = time => renderer.draw({ cast: session.cast && session.cast.phase !== 'done' ? session.cast : null, state, time });

  let prev = 0;
  let running = false;
  let lastUi = 0;
  let seenCatches = 0;
  function frame(time) {
    if (!running) return;
    const dt = prev ? (time - prev) / 1000 : 1 / 60;
    prev = time;
    const cast = session.cast;
    if (cast && cast.phase !== 'done') {
      if (cast.caught.length === 0) seenCatches = 0;
      stepCast(cast, dt, { targetX: steer.targetX01 * WORLD_WIDTH }, rng);
      while (seenCatches < cast.caught.length) {
        const { speciesId, weight } = cast.caught[seenCatches++];
        ui.announce(caughtText(speciesById[speciesId], weight));
        sound('catch');
      }
      if (cast.hook.depth >= MAX_LINE) ui.showCta('forgotten-sea');
      if (cast.phase === 'done') { seenCatches = 0; finish(cast); }
    }
    if (time - lastUi > 100) { ui.render(state, session.cast); lastUi = time; }
    drawScene(time);
    requestAnimationFrame(frame);
  }
  const resume = () => { if (running) return; running = true; prev = 0; requestAnimationFrame(frame); };
  const persist = () => { state = stamp(state); save(storage, state); };
  // Leaving with the welcome card still open banks the coins, so open time never counts as idle.
  const pause = () => { running = false; collect({ quiet: true }); persist(); };

  const show = () => { arriveNow(); resume(); };
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : show()));
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', e => { if (e.persisted) show(); });
  // Another tab saved (or reset): take its progress rather than later writing stale progress over it.
  window.addEventListener('storage', e => {
    if ((e.key !== SAVE_KEY && e.key !== null) || !storage || e.storageArea !== storage) return;
    const saved = load(storage);
    pending = keepPending(pending, saved);
    if (!pending) dropWelcome();
    state = saved;
    ui.render(state, session.cast);
  });
  // Resizing clears the canvas; redraw at once so a paused sea never goes blank.
  window.addEventListener('resize', () => { renderer.resize(); drawScene(performance.now()); });
  setInterval(() => { if (running) persist(); }, 30_000);

  renderer.resize();
  drawScene(performance.now());
  ui.render(state, null);
  arriveNow();
  ui.render(state, null);
  if (!document.hidden) resume();
  return { get state() { return state; }, get cast() { return session.cast; }, ui };
}

if (root && canvas) {
  window.abyssIdle = start().catch(err => {
    console.error(err);
    if (hud) hud.textContent = 'The sea is not loading right now. Please refresh the page.';
  });
}
