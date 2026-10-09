const MIN_FPS = 45;
const LOW_SECONDS = 2;

// After 2 s below 45 fps, cut quality by 30% (never below 0.4).
export function nextQuality(s, fps, dt) {
  if (fps >= MIN_FPS) return { q: s.q, lowFor: 0 };
  const lowFor = s.lowFor + dt;
  if (lowFor >= LOW_SECONDS) return { q: Math.max(0.4, Math.round(s.q * 0.7 * 1000) / 1000), lowFor: 0 };
  return { q: s.q, lowFor };
}

export function dprCap(coarse) {
  return coarse ? 1.5 : 2;
}

export function particleBudget(w, h, q) {
  return Math.round(Math.min(600, (w * h) / 2500) * q);
}
