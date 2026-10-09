import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const HEADER = /^\s*<!--page\s+(\{[\s\S]*?\})\s*-->\r?\n?/;

export function parsePage(source, file) {
  const match = source.match(HEADER);
  if (!match) throw new Error(`Missing <!--page {...} --> header in ${file}`);
  let meta;
  try {
    meta = JSON.parse(match[1]);
  } catch (err) {
    throw new Error(`Invalid page header JSON in ${file}: ${err.message}`);
  }
  return { meta, body: source.slice(match[0].length) };
}

// "/legal/terms/" → "legal/terms/index.html"; "/404.html" stays a file.
export function outputPathFor(prefix, pagePath) {
  const full = (prefix + pagePath).replace(/^\//, '');
  return full === '' || full.endsWith('/') ? `${full}index.html` : full;
}

export function urlFor(prefix, pagePath) {
  return prefix + pagePath;
}

export async function collectPages(srcDir, languages) {
  const pages = [];
  for (const lang of languages) {
    const dir = join(srcDir, lang.code);
    const files = (await readdir(dir).catch(() => [])).filter(f => f.endsWith('.html')).sort();
    for (const file of files) {
      const { meta, body } = parsePage(await readFile(join(dir, file), 'utf8'), join(dir, file));
      pages.push({ lang, meta, body });
    }
  }
  const ids = new Set(pages.filter(p => !p.meta.single).map(p => p.meta.id));
  for (const id of ids) {
    for (const lang of languages) {
      if (!pages.some(p => p.meta.id === id && p.lang.code === lang.code)) {
        throw new Error(`Page "${id}" missing in ${lang.code}`);
      }
    }
  }
  return pages;
}
