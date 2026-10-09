// Abyss Angler Idle — where the player wants the lure: finger (while touching), mouse (just
// by moving), or arrow keys. Space/Enter cast or reel in. Target is a 0..1 fraction of the width.
// Pointers are read on `target` (the sea); keys on `keyTarget`, which can be the whole page.
const KEY_STEP = 0.04;
const clamp01 = v => Math.min(1, Math.max(0, v));

export function createSteer(target, getRect, keyTarget = target) {
  let targetX01 = 0.5;
  let pressed = false;
  const castListeners = [];

  const fromPointer = e => {
    const r = getRect();
    if (r.width > 0) targetX01 = clamp01((e.clientX - r.left) / r.width);
  };
  const ownedByControl = e => !!e.target?.closest?.('button, a, input, select, textarea');

  target.addEventListener('pointerdown', e => { pressed = true; fromPointer(e); });
  target.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || pressed) fromPointer(e); });
  const release = () => { pressed = false; };
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', release);

  keyTarget.addEventListener('keydown', e => {
    if (ownedByControl(e)) return;
    if (e.key === 'ArrowLeft') { targetX01 = clamp01(Math.round((targetX01 - KEY_STEP) * 1000) / 1000); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { targetX01 = clamp01(Math.round((targetX01 + KEY_STEP) * 1000) / 1000); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) castListeners.forEach(cb => cb());
    }
  });

  return {
    get targetX01() { return targetX01; },
    onCast(cb) { castListeners.push(cb); },
  };
}
