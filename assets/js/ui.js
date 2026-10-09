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

// Sections fade up with a light sweep the first time they enter the viewport.
export function initReveal(doc) {
  const items = [...doc.querySelectorAll('.reveal')];
  const win = doc.defaultView;
  if (!('IntersectionObserver' in win)) {
    items.forEach(el => el.classList.add('is-in'));
    return;
  }
  const observer = new win.IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => observer.observe(el));
}

const MAX_TILT = 8; // degrees

// Cards lean toward the pointer or finger.
export function initTilt(doc) {
  for (const card of doc.querySelectorAll('[data-tilt]')) {
    const lean = e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--tilt-x', `${(-y * MAX_TILT * 2).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * MAX_TILT * 2).toFixed(2)}deg`);
      card.style.setProperty('--glare-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--glare-y', `${((y + 0.5) * 100).toFixed(1)}%`);
      card.classList.add('is-tilting');
    };
    const reset = () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.classList.remove('is-tilting');
    };
    card.addEventListener('pointermove', lean);
    card.addEventListener('pointerdown', lean);
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') reset(); });
    card.addEventListener('pointercancel', reset);
  }
}

// Screenshot gallery: native swipe + scroll-snap on touch; arrow buttons for mouse users.
export function initGallery(doc) {
  const win = doc.defaultView;
  const finePointer = win.matchMedia?.('(pointer: fine)').matches;
  for (const gallery of doc.querySelectorAll('[data-gallery]')) {
    const track = gallery.querySelector('.gallery-track');
    const prev = gallery.querySelector('.gallery-btn.prev');
    const next = gallery.querySelector('.gallery-btn.next');
    if (!track || !prev || !next) continue;
    const step = () => (track.querySelector('.shot')?.getBoundingClientRect().width ?? track.clientWidth) + 16;
    const update = () => {
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };
    if (finePointer) {
      prev.hidden = false;
      next.hidden = false;
    }
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    win.addEventListener('resize', update);
    update();
  }
}

// Touch has no hover, so a tap triggers the glitch for a moment.
export function initGlitchTap(doc) {
  for (const el of doc.querySelectorAll('.glitch-on-hover')) {
    el.addEventListener('pointerdown', () => {
      el.classList.add('is-glitching');
      setTimeout(() => el.classList.remove('is-glitching'), 700);
    });
  }
}
