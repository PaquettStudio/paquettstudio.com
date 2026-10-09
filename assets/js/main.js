import { initMenu } from './ui.js';
import { initLangSwitch } from './i18n.js';
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
  });
}
