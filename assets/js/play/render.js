// Abyss Angler Idle — draws the sea, the vessel, the line, the lure, fish and sharks.
import { WORLD_WIDTH } from './sim.js';

// Water colour by depth: bright lagoon → deep blue → readable blue-violet (never pure black).
const WATER = [
  [0, [64, 164, 214]], [150, [34, 110, 170]], [600, [24, 62, 128]],
  [1300, [22, 36, 92]], [2000, [25, 24, 70]], [2500, [30, 20, 62]],
];
const VESSEL_METRES = [11, 15, 21];
const CELL = 25; // metres per particle cell

function waterAt(depth) {
  if (depth <= WATER[0][0]) return WATER[0][1];
  for (let i = 1; i < WATER.length; i++) {
    const [d1, c1] = WATER[i];
    if (depth <= d1) {
      const [d0, c0] = WATER[i - 1];
      const k = (depth - d0) / (d1 - d0);
      return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
    }
  }
  return WATER[WATER.length - 1][1];
}
const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const fishMetres = s => Math.min(10, Math.max(3, 3 + Math.sqrt(s.weightMax) * 1.2));

export function createRenderer(canvas, { images, speciesById, reducedMotion }) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawImage(img, cx, cy, widthPx, flip) {
    if (!img?.complete || !img.naturalWidth) return false;
    const hPx = widthPx * (img.naturalHeight / img.naturalWidth);
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -widthPx / 2, -hPx / 2, widthPx, hPx);
    ctx.restore();
    return true;
  }

  function draw({ cast, state, time }) {
    if (!w || !h) return;
    const scale = w / WORLD_WIDTH;
    const focus = cast ? cast.hook.depth : 0;
    const top = cast && focus > h * 0.4 / scale ? focus - (h * 0.4) / scale : -(h * 0.32) / scale;
    const y = depth => (depth - top) * scale;
    const surfaceY = y(0);
    const bottom = top + h / scale;

    // Sky at dusk above the waterline.
    if (surfaceY > 0) {
      const sky = ctx.createLinearGradient(0, 0, 0, surfaceY);
      sky.addColorStop(0, '#233a66');
      sky.addColorStop(1, '#f2a46a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, surfaceY);
    }
    const waterTop = Math.max(0, surfaceY);
    const water = ctx.createLinearGradient(0, waterTop, 0, h);
    water.addColorStop(0, rgb(waterAt(Math.max(0, top))));
    water.addColorStop(1, rgb(waterAt(Math.max(0, bottom))));
    ctx.fillStyle = water;
    ctx.fillRect(0, waterTop, w, h - waterTop);

    if (!reducedMotion) {
      // Light shafts near the surface.
      if (top < 220) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const x = w * (0.15 + i * 0.24) + Math.sin(time * 0.0003 + i) * 20;
          const g = ctx.createLinearGradient(x, waterTop, x + 40, y(200));
          g.addColorStop(0, 'rgba(180,230,255,0.10)');
          g.addColorStop(1, 'rgba(180,230,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - 18, waterTop); ctx.lineTo(x + 28, waterTop); ctx.lineTo(x + 90, y(200)); ctx.lineTo(x + 20, y(200));
          ctx.fill();
        }
        ctx.restore();
      }
      // Glowing plankton in the deep.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = Math.floor(Math.max(250, top) / CELL); k <= Math.floor(bottom / CELL); k++) {
        for (let i = 0; i < 5; i++) {
          const px = hash(k, i) * w + Math.sin(time * 0.0005 + k + i) * 6;
          const py = y(k * CELL + hash(i, k) * CELL);
          const a = Math.min(1, (k * CELL - 250) / 800) * (0.35 + 0.35 * Math.sin(time * 0.002 + i * 2 + k));
          ctx.fillStyle = `rgba(140,230,255,${Math.max(0, a)})`;
          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Waterline.
    if (surfaceY > -10 && surfaceY < h + 10) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const wave = reducedMotion ? 0 : Math.sin(x * 0.04 + time * 0.002) * 2;
        x === 0 ? ctx.moveTo(x, surfaceY + wave) : ctx.lineTo(x, surfaceY + wave);
      }
      ctx.stroke();
    }

    // Vessel and rod tip.
    const level = state.levels.vessel;
    const vesselW = VESSEL_METRES[level] * scale;
    const vesselImg = images.vessel[level];
    const vesselH = vesselImg?.naturalWidth ? vesselW * (vesselImg.naturalHeight / vesselImg.naturalWidth) : vesselW * 0.8;
    const vesselY = surfaceY - vesselH * 0.3;
    const rodTip = { x: w / 2 + vesselW * 0.05, y: vesselY - vesselH * 0.5 };
    const hook = cast ? { x: cast.hook.x * scale, y: y(cast.hook.depth) } : { x: w / 2, y: surfaceY + 2 * scale };

    // Fishing line.
    ctx.strokeStyle = 'rgba(235,245,255,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rodTip.x, rodTip.y);
    ctx.lineTo(hook.x, hook.y - 1.2 * scale);
    ctx.stroke();

    drawImage(vesselImg, w / 2, vesselY, vesselW, false);

    if (cast) {
      for (const fish of cast.fish) {
        if (fish.depth < top - 10 || fish.depth > bottom + 10) continue;
        const species = speciesById[fish.speciesId];
        const size = fishMetres(species) * scale;
        const drawn = drawImage(images.fish[fish.speciesId], fish.x * scale, y(fish.depth), size, fish.vx < 0);
        if (!drawn) {
          ctx.fillStyle = species.tint;
          ctx.beginPath();
          ctx.ellipse(fish.x * scale, y(fish.depth), size / 2, size / 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const shark of cast.sharks) drawImage(images.shark, shark.x * scale, y(shark.depth), 14 * scale, shark.vx < 0);
    }
    drawImage(images.lure, hook.x, hook.y, 2.2 * scale, false);
  }

  return { resize, draw };
}
