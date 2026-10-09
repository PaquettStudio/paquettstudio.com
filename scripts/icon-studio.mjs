// Dev tool: renders icons, the OG image and web-ready game images in a browser canvas,
// then saves them into assets/img. Nothing here ships with the site.
//
//   node scripts/icon-studio.mjs [--src <game project folder>]
//   open http://localhost:4174/          → icons + OG image
//   open http://localhost:4174/images    → game images (needs --src)
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'assets');
const srcFlag = process.argv.indexOf('--src');
const gameRoot = srcFlag > 0 ? resolve(process.argv[srcFlag + 1]) : null;

// Output name → path inside assets/img. Anything else is refused.
const OUTPUTS = {
  'icon-32.png': 'icon-32.png',
  'apple-touch-icon.png': 'apple-touch-icon.png',
  'icon-192.png': 'icon-192.png',
  'icon-512.png': 'icon-512.png',
  'og-image.png': 'og-image.png',
  'key-art.webp': 'abyss/key-art.webp',
  'app-icon.webp': 'abyss/app-icon.webp',
  'shot-1.webp': 'abyss/shot-1.webp',
  'shot-2.webp': 'abyss/shot-2.webp',
  'shot-3.webp': 'abyss/shot-3.webp',
  'shot-4.webp': 'abyss/shot-4.webp',
};
// Source key → file inside the game project (read only).
const SOURCES = {
  icon: 'Abyss 2D/Store/abyss-icon-ios-1024.png',
  'shot-1': 'poze-2.0/iphone_6.9in_1320x2868/01.png',
  'shot-2': 'poze-2.0/iphone_6.9in_1320x2868/02.png',
  'shot-3': 'poze-2.0/iphone_6.9in_1320x2868/03.png',
  'shot-4': 'poze-2.0/iphone_6.9in_1320x2868/04.png',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'POST' && url.pathname === '/save') {
      const out = OUTPUTS[url.searchParams.get('name')];
      if (!out) { res.writeHead(400); return res.end('unknown output'); }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await writeFile(join(assets, 'img', out), Buffer.concat(chunks));
      console.log(`saved assets/img/${out}`);
      res.writeHead(204);
      return res.end();
    }
    if (url.pathname === '/' || url.pathname === '/images') {
      const page = url.pathname === '/' ? 'render-icons.html' : 'render-images.html';
      res.writeHead(200, { 'content-type': TYPES['.html'] });
      return res.end(await readFile(join(root, 'scripts', page)));
    }
    if (url.pathname.startsWith('/src/')) {
      const rel = SOURCES[url.pathname.slice(5)];
      if (!rel || !gameRoot) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' });
      return res.end(await readFile(join(gameRoot, rel)));
    }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(assets + sep)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(4174, () => console.log('Icon studio on http://localhost:4174/'));
