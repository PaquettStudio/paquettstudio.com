export const SOUND_KEY = 'paquett.sound';

// Synthesised UI sounds (no audio files). Off by default; the AudioContext is only
// created after the visitor turns sound on, which is itself a user gesture.
export function createSfx({ storage, AudioCtx }) {
  let on = false;
  try {
    on = storage?.getItem(SOUND_KEY) === '1';
  } catch {
    on = false;
  }
  let ctx = null;

  const context = () => {
    if (!AudioCtx) return null;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume?.();
    return ctx;
  };

  function tone(ac, freq, start, dur, type, gain, freqEnd) {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  const SOUNDS = {
    tap(ac, t) {
      tone(ac, 220, t, 0.45, 'sawtooth', 0.05, 880);
      [880, 1109, 1319, 1760].forEach((f, i) => tone(ac, f, t + 0.05 + i * 0.045, 0.5, 'triangle', 0.05));
    },
    hover(ac, t) {
      tone(ac, 1760, t, 0.06, 'triangle', 0.02);
    },
    lang(ac, t) {
      tone(ac, 988, t, 0.3, 'sine', 0.05);
      tone(ac, 1319, t + 0.08, 0.3, 'sine', 0.05);
    },
  };

  return {
    isOn: () => on,
    toggle() {
      on = !on;
      try {
        storage?.setItem(SOUND_KEY, on ? '1' : '0');
      } catch {
        // Storage blocked: keep the choice for this page view only.
      }
      if (on) context();
      return on;
    },
    play(name) {
      if (!on) return;
      const ac = context();
      if (ac) SOUNDS[name]?.(ac, ac.currentTime);
    },
  };
}
