import { initMenu } from './ui.js';
import { initLangSwitch } from './i18n.js';

let storage = null;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

initMenu(document);
initLangSwitch(document, storage);
