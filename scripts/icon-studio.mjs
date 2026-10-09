// Dev tool: renders icons / OG image in a browser canvas and saves the PNGs into assets/img.
// Run `node scripts/icon-studio.mjs`, open http://localhost:4174/ and wait for "done".
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = resolve(root, 'assets');
const OUTPUTS = new Set(['icon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-image.png']);
const TYPES = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'POST' && url.pathname === '/save') {
      const name = url.searchParams.get('name');
      if (!OUTPUTS.has(name)) { res.writeHead(400); return res.end('unknown output'); }
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      await writeFile(join(assets, 'img', name), Buffer.concat(chunks));
      console.log(`saved assets/img/${name}`);
      res.writeHead(204);
      return res.end();
    }
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': TYPES['.html'] });
      return res.end(await readFile(join(root, 'scripts/render-icons.html')));
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
