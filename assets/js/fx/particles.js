const COMET_POINTS = 22;
const COMET_LIFE = 0.35; // seconds a trail point survives
const RING_COLORS = [['255,63,164', -3], ['123,92,255', 0], ['34,230,255', 3]];
const BURST_HUES = [330, 260, 190, 40];
const rand = (a, b) => a + Math.random() * (b - a);

// Comet trail, sparks and prismatic rings, drawn on the top canvas.
export function createParticles(ctx, { max }) {
  let limit = max;
  let sparks = [];
  let rings = [];
  let comet = [];
  let w = 0, h = 0;

  const cap = () => { if (sparks.length > limit) sparks.splice(0, sparks.length - limit); };

  function trail(x, y, hue) {
    const last = comet[comet.length - 1];
    if (last && Math.hypot(last.x - x, last.y - y) > 120) comet = [];
    comet.push({ x, y, hue, age: 0 });
    if (comet.length > COMET_POINTS) comet.shift();
    if (Math.random() < 0.85) {
      sparks.push({ x, y, vx: rand(-45, 45), vy: rand(-45, 25), life: 1, decay: rand(1.1, 1.8),
        color: `hsl(${Math.round(hue + rand(-20, 20))},100%,70%)`, size: rand(0.7, 1.7), gravity: 60, tail: null });
      cap();
    }
  }

  function burst(x, y) {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2, speed = rand(80, 240);
      sparks.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, decay: rand(0.6, 1),
        color: `hsl(${BURST_HUES[i % 4]},100%,68%)`, size: rand(1, 2), gravity: 40, tail: [] });
    }
    cap();
  }

  function ring(x, y) { rings.push({ x, y, r: 0 }); }

  function drawComet(dt) {
    for (const p of comet) p.age += dt;
    comet = comet.filter(p => p.age < COMET_LIFE);
    ctx.lineCap = 'round';
    for (let i = 1; i < comet.length; i++) {
      const k = i / comet.length;
      ctx.strokeStyle = `hsla(${comet[i].hue},100%,65%,${k * 0.75})`;
      ctx.lineWidth = 1 + k * 6;
      ctx.beginPath();
      ctx.moveTo(comet[i - 1].x, comet[i - 1].y);
      ctx.lineTo(comet[i].x, comet[i].y);
      ctx.stroke();
    }
    const head = comet[comet.length - 1];
    if (head && head.age < 0.1) {
      const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 22);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.3, `hsla(${head.hue},100%,70%,0.5)`);
      g.addColorStop(1, `hsla(${head.hue},100%,60%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt * p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      p.vx *= 1 - dt * 1.4;
      p.vy = p.vy * (1 - dt * 1.4) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.tail) {
        p.tail.push(p.x, p.y);
        if (p.tail.length > 10) p.tail.splice(0, 2);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.life * 0.5;
        ctx.lineWidth = p.size * 0.8;
        ctx.beginPath();
        ctx.moveTo(p.tail[0], p.tail[1]);
        for (let k = 2; k < p.tail.length; k += 2) ctx.lineTo(p.tail[k], p.tail[k + 1]);
        ctx.stroke();
      }
      ctx.globalAlpha = p.life * (0.6 + 0.4 * Math.random());
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRings(dt) {
    const reach = Math.max(w, h, 1) * 0.7;
    rings = rings.filter(r => (r.r += dt * 380) < reach);
    ctx.lineWidth = 2.5;
    for (const r of rings) {
      const a = 1 - r.r / reach;
      for (const [rgb, offset] of RING_COLORS) {
        ctx.strokeStyle = `rgba(${rgb},${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(r.x + offset, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function step(dt) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawComet(dt);
    drawSparks(dt);
    drawRings(dt);
    ctx.restore();
  }

  return {
    trail, burst, ring, step,
    size: () => sparks.length,
    setMax(n) { limit = n; cap(); },
    resize(nw, nh) { w = nw; h = nh; },
  };
}
