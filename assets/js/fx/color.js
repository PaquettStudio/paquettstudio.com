// Comet hue drifting gold (40) → pink (330) → cyan (190), from the approved "Prism Ember" mockup.
export function hueAt(t) {
  const k = (Math.sin(t) + 1) / 2, k2 = (Math.sin(t * 0.63 + 2) + 1) / 2;
  return k < 0.5 ? 40 + k * 2 * 290 : 330 - (k - 0.5) * 2 * 140 * k2;
}
