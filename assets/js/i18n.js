export const LANG_KEY = 'paquett.lang';

export function rememberLang(storage, code) {
  try {
    storage?.setItem(LANG_KEY, code);
  } catch {
    // Storage blocked (private mode, cookies off): the switch still navigates, it just isn't remembered.
  }
}

// The switch is plain links (works without JS); this only remembers the choice before navigating.
export function initLangSwitch(doc, storage) {
  doc.addEventListener('click', event => {
    const link = event.target.closest?.('[data-lang-link]');
    if (link) rememberLang(storage, link.dataset.langLink);
  });
}
