const AURORA = ['255,63,164', '123,92,255', '34,200,255'];
const rand = (a, b) => a + Math.random() * (b - a);

// Aurora bands, twinkling stars that streak with scroll speed ("warp"), and a
// perspective grid fading into fog at the bottom of the hero.
export function createBackground(ctx) {
  let w = 0, h = 0, stars = [], flow = 0;

  function resize(nw, nh) {
    w = nw;
    h = nh;
    stars = Array.from({ length: Math.round((w * h) / 4200) }, () => ({
      x: rand(0, w), y: rand(0, h), r: rand(0.3, 1.2), ph: rand(0, 6.28), depth: rand(0.3, 1),
    }));
  }

  function drawAurora() {
    for (let i = 0; i < AURORA.length; i++) {
      const y0 = h * (0.2 + i * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w + 1; x += w / 24) {
        ctx.lineTo(x, y0 + Math.sin((x / w) * 5 + flow * (1 + i * 0.4) + i) * h * 0.08 + Math.sin((x / w) * 11 - flow * 1.6) * h * 0.025);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      // The ramp spans the wave amplitude so the crest fades in softly instead of a hard edge.
      const g = ctx.createLinearGradient(0, y0 - h * 0.12, 0, y0 + h * 0.45);
      g.addColorStop(0, `rgba(${AURORA[i]},0)`);
      g.addColorStop(0.35, `rgba(${AURORA[i]},0.17)`);
      g.addColorStop(1, `rgba(${AURORA[i]},0)`);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  function drawStars(t, dt, scrollV) {
    const speed = Math.min(1, Math.abs(scrollV) / 2500);
    const dir = Math.sign(scrollV);
    for (const s of stars) {
      s.y -= scrollV * dt * 0.06 * s.depth;
      if (s.y < -40) { s.y = h + 40; s.x = rand(0, w); }
      if (s.y > h + 40) { s.y = -40; s.x = rand(0, w); }
      const a = 0.2 + 0.45 * Math.sin(t * 1.7 + s.ph) ** 2;
      if (speed > 0.03) {
        ctx.strokeStyle = `rgba(255,255,255,${a + speed * 0.3})`;
        ctx.lineWidth = s.r;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x, s.y + dir * speed * 70 * s.depth);
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
    }
  }

  function drawGrid(t, heroBottom) {
    const top = heroBottom * 0.7, depth = heroBottom - top;
    if (depth <= 0) return;
    ctx.strokeStyle = 'rgba(160,140,255,0.16)';
    ctx.lineWidth = 1;
    for (let i = -16; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * 6, top);
      ctx.lineTo(w * 0.5 + i * w * 0.1, heroBottom);
      ctx.stroke();
    }
    const off = (t * 0.35) % 1;
    for (let i = 0; i < 12; i++) {
      const z = (i + off) / 12, y = top + depth * z * z;
      ctx.globalAlpha = z * 0.9;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const fog = ctx.createLinearGradient(0, top - 30, 0, top + 40);
    fog.addColorStop(0, 'rgba(4,3,8,0)');
    fog.addColorStop(0.5, 'rgba(60,30,90,0.35)');
    fog.addColorStop(1, 'rgba(4,3,8,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, top - 30, w, 70);
    const fade = ctx.createLinearGradient(0, heroBottom - depth * 0.35, 0, heroBottom);
    fade.addColorStop(0, 'rgba(4,3,8,0)');
    fade.addColorStop(1, 'rgba(4,3,8,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, heroBottom - depth * 0.35, w, depth * 0.35 + 1);
  }

  function draw({ t, dt, scrollV, heroVisible, heroBottom }) {
    flow += dt * (0.25 + Math.min(1, Math.abs(scrollV) / 2500) * 2.5);
    ctx.fillStyle = '#040308';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawAurora();
    drawStars(t, dt, scrollV);
    ctx.restore();
    if (heroVisible) drawGrid(t, Math.min(h, heroBottom ?? h));
  }

  return { resize, draw };
}
