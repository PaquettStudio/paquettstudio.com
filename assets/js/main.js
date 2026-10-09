import { initMenu, initReveal, initTilt, initGlitchTap, initGallery } from './ui.js';
import { initLangSwitch } from './i18n.js';
import { createSfx } from './sfx.js';
import { createInput } from './fx/input.js';
import { startFx } from './fx/engine.js';

let storage = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

initMenu(document);
initLangSwitch(document, storage);
initReveal(document);
initTilt(document);
initGlitchTap(document);
initGallery(document);

const sfx = createSfx({ storage, AudioCtx: window.AudioContext ?? window.webkitAudioContext });
const soundButtons = [...document.querySelectorAll('[data-sound-toggle]')];
const syncSound = () => soundButtons.forEach(b => b.setAttribute('aria-pressed', String(sfx.isOn())));
soundButtons.forEach(b => {
  b.hidden = false;
  b.addEventListener('click', () => {
    sfx.toggle();
    syncSound();
    sfx.play('tap');
  });
});
syncSound();

const HOVER_TARGETS = '.btn, .nav-links a, .lang-switch a, .icon-btn';
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest?.(HOVER_TARGETS);
  if (el && !el.contains(e.relatedTarget)) sfx.play('hover');
});
document.addEventListener('click', e => {
  if (e.target.closest?.('[data-lang-link]')) sfx.play('lang');
});

const bg = document.getElementById('fx-bg');
const top = document.getElementById('fx-top');
if (bg?.getContext && top?.getContext) {
  const reducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    new URLSearchParams(location.search).has('reduced-motion');
  startFx({
    doc: document,
    win: window,
    bg,
    top,
    input: createInput(window, () => performance.now()),
    reducedMotion,
    onTap: () => {
      if (!document.activeElement?.closest?.('[data-sound-toggle]')) sfx.play('tap');
    },
  });
}
