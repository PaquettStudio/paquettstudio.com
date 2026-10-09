import { createBackground } from './background.js';
import { createParticles } from './particles.js';
import { hueAt } from './color.js';
import { nextQuality, dprCap, particleBudget } from './quality.js';

// One requestAnimationFrame loop drives both canvases. It pauses while the tab is
// hidden and never starts under reduced motion (one still frame instead).
export function startFx({ doc, win, bg, top, input, reducedMotion, raf, caf, onTap, now = () => performance.now() }) {
  raf = raf ?? (cb => win.requestAnimationFrame(cb));
  caf = caf ?? (id => win.cancelAnimationFrame(id));
  const bgCtx = bg.getContext('2d');
  const topCtx = top.getContext('2d');
  const background = createBackground(bgCtx);
  const particles = createParticles(topCtx, { max: 600 });
  const coarse = !!win.matchMedia?.('(pointer: coarse)').matches;
  let w = 0, h = 0, quality = { q: 1, lowFor: 0 };
  let frameId = null, running = false, prev = 0, clock = 0, stopped = false;

  const hero = () => {
    const el = doc.querySelector('.hero');
    const bottom = el ? el.getBoundingClientRect().bottom : 0;
    return { heroVisible: bottom > 0, heroBottom: bottom };
  };

  function resize() {
    const dpr = Math.min(win.devicePixelRatio || 1, dprCap(coarse));
    w = win.innerWidth;
    h = win.innerHeight;
    for (const [canvas, ctx] of [[bg, bgCtx], [top, topCtx]]) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    background.resize(w, h);
    particles.resize(w, h);
    particles.setMax(particleBudget(w, h, quality.q));
    // The still frame sits on a fixed canvas, so it must not include the hero grid.
    if (reducedMotion) background.draw({ t: 0, dt: 0, scrollV: 0, heroVisible: false });
  }

  function frame(ts) {
    const dt = prev ? Math.min(0.05, (ts - prev) / 1000) : 1 / 60;
    prev = ts;
    clock += dt;
    input.update(dt);

    const next = nextQuality(quality, 1 / Math.max(dt, 1e-3), dt);
    if (next.q !== quality.q) particles.setMax(particleBudget(w, h, next.q));
    quality = next;

    const { heroVisible, heroBottom } = hero();
    background.draw({ t: clock, dt, scrollV: input.scrollV, heroVisible, heroBottom });

    topCtx.clearRect(0, 0, w, h);
    if (input.active) {
      particles.trail(input.x, input.y, hueAt(clock * 0.8));
    } else if (heroVisible && input.isIdle(now())) {
      // Autopilot wisp so the hero never looks dead.
      const k = clock * 1;
      const x = w * (0.5 + 0.34 * Math.sin(k * 0.9) * Math.cos(k * 0.37));
      const y = Math.min(h, heroBottom) * (0.55 + 0.27 * Math.sin(k * 1.3 + 1));
      particles.trail(x, y, hueAt(clock * 0.8));
    }
    for (const tap of input.taps.splice(0)) {
      particles.ring(tap.x, tap.y);
      particles.burst(tap.x, tap.y);
      onTap?.(tap.x, tap.y);
    }
    particles.step(dt);
    frameId = raf(frame);
  }

  function resume() {
    if (running || stopped || reducedMotion || doc.hidden) return;
    running = true;
    prev = 0;
    frameId = raf(frame);
  }

  function pause() {
    if (!running) return;
    running = false;
    if (frameId !== null) caf(frameId);
    frameId = null;
  }

  win.addEventListener('resize', resize);
  doc.addEventListener('visibilitychange', () => (doc.hidden ? pause() : resume()));
  resize();
  resume();

  return {
    stop() { stopped = true; pause(); },
    isRunning: () => running,
  };
}
