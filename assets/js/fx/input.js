const TAP_SLOP = 12; // px a finger may drift and still count as a tap
const IDLE_MS = 3000;

export function stepScrollVelocity(prev, deltaY, dt) {
  if (dt <= 0) return prev;
  const decay = Math.exp(-dt * 8);
  return prev * decay + (deltaY / dt) * (1 - decay);
}

// Normalises mouse, touch and scroll into one state the effects read every frame.
// Touch is tracked through touch* events too: browsers fire pointercancel as soon as a
// finger starts scrolling, but the comet must keep following that finger.
export function createInput(target, now) {
  let pendingScroll = 0;
  let lastScrollY = target.scrollY ?? 0;
  let press = null;

  const state = {
    x: 0,
    y: 0,
    active: false,
    taps: [],
    scrollV: 0,
    lastInputAt: -Infinity,
    isIdle: t => t - state.lastInputAt > IDLE_MS,
    update(dt) {
      state.scrollV = stepScrollVelocity(state.scrollV, pendingScroll, dt);
      pendingScroll = 0;
    },
  };
  const mark = (x, y) => {
    state.x = x;
    state.y = y;
    state.lastInputAt = now();
  };
  const opts = { passive: true };

  target.addEventListener('pointerdown', e => {
    mark(e.clientX, e.clientY);
    state.active = true;
    if (e.pointerType === 'mouse') state.taps.push({ x: e.clientX, y: e.clientY });
    else press = { x: e.clientX, y: e.clientY };
  }, opts);
  target.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' || press) {
      mark(e.clientX, e.clientY);
      state.active = true;
    }
  }, opts);
  target.addEventListener('pointerup', e => {
    if (e.pointerType !== 'mouse') {
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < TAP_SLOP) state.taps.push({ x: e.clientX, y: e.clientY });
      state.active = false;
    }
    press = null;
  }, opts);
  target.addEventListener('pointercancel', () => { press = null; }, opts);
  target.addEventListener('pointerout', e => {
    if (e.pointerType === 'mouse' && !e.relatedTarget) state.active = false;
  }, opts);

  const fromTouch = e => {
    const t = e.touches?.[0];
    if (!t) return;
    mark(t.clientX, t.clientY);
    state.active = true;
  };
  target.addEventListener('touchstart', fromTouch, opts);
  target.addEventListener('touchmove', fromTouch, opts);
  const endTouch = e => { if (!e.touches || e.touches.length === 0) state.active = false; };
  target.addEventListener('touchend', endTouch, opts);
  target.addEventListener('touchcancel', endTouch, opts);

  target.addEventListener('scroll', () => {
    const y = target.scrollY ?? 0;
    pendingScroll += y - lastScrollY;
    lastScrollY = y;
  }, opts);

  return state;
}
