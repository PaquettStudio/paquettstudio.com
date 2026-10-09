// Full-screen mobile menu: toggle button, Escape to close, closes when a link is chosen.
export function initMenu(doc) {
  const button = doc.getElementById('menu-toggle');
  const menu = doc.getElementById('site-menu');
  if (!button || !menu) return;
  const root = doc.documentElement;

  const setOpen = open => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? button.dataset.labelClose : button.dataset.labelOpen);
    root.classList.toggle('menu-open', open);
  };

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (open) menu.querySelector('a')?.focus();
  });
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape' && root.classList.contains('menu-open')) {
      setOpen(false);
      button.focus();
    }
  });
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
}
