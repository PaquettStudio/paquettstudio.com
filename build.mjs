import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderTemplate, escapeHtml } from './lib/template.mjs';
import { collectPages, outputPathFor, urlFor } from './lib/pages.mjs';

const ROUTES = {
  home: '/',
  game: '/games/abyss-angler/',
  terms: '/legal/terms/',
  privacy: '/legal/privacy/',
  copyright: '/legal/copyright/',
  report: '/report/',
};

const readJson = async path => JSON.parse(await readFile(path, 'utf8'));

function alternatesHtml(page, pages, site) {
  if (page.meta.single) return '';
  const links = site.languages
    .filter(lang => pages.some(p => p.meta.id === page.meta.id && p.lang.code === lang.code))
    .map(lang => `<link rel="alternate" hreflang="${lang.code}" href="${site.baseUrl}${urlFor(lang.prefix, page.meta.path)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${site.baseUrl}${urlFor(site.languages[0].prefix, page.meta.path)}">`);
  return links.join('\n');
}

function langSwitchHtml(page, pages, site, t) {
  const items = site.languages.map(lang => {
    const target = pages.find(p => p.meta.id === page.meta.id && p.lang.code === lang.code);
    const href = urlFor(lang.prefix, target && !page.meta.single ? target.meta.path : '/');
    const current = lang.code === page.lang.code;
    return `<a href="${href}" hreflang="${lang.code}" lang="${lang.code}" data-lang-link="${lang.code}" aria-current="${current}">${escapeHtml(lang.label)}</a>`;
  });
  return `<nav class="lang-switch" aria-label="${escapeHtml(t.nav.language)}">${items.join('')}</nav>`;
}

function headExtraHtml(page, site, partials) {
  const isDefaultHome = page.meta.id === 'home' && page.lang.code === site.languages[0].code;
  return isDefaultHome ? `<script data-lang-redirect>${partials.langRedirect.trim()}</script>` : '';
}

function contextFor(page, pages, site, strings, partials) {
  const { lang, meta } = page;
  const links = Object.fromEntries(Object.entries(ROUTES).map(([k, path]) => [k, urlFor(lang.prefix, path)]));
  return {
    lang,
    t: strings[lang.code],
    site,
    page: meta,
    layoutName: meta.layout ?? 'default',
    year: new Date().getFullYear(),
    url: urlFor(lang.prefix, meta.path),
    links,
    alternatesHtml: alternatesHtml(page, pages, site),
    langSwitchHtml: langSwitchHtml(page, pages, site, strings[lang.code]),
    jsonLdHtml: '',
    headExtraHtml: headExtraHtml(page, site, partials),
    noticeHtml: '',
  };
}

function assertSafeOutDir(root, outDir) {
  const rel = relative(resolve(outDir), resolve(root));
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    throw new Error(`Refusing to build into ${outDir}: it contains the project root`);
  }
}

export async function build({ root = process.cwd(), outDir } = {}) {
  outDir = outDir ?? join(root, 'site');
  assertSafeOutDir(root, outDir);
  const site = await readJson(join(root, 'src/data/site.json'));
  const layout = await readFile(join(root, 'src/layout.html'), 'utf8');
  const strings = {};
  for (const lang of site.languages) strings[lang.code] = await readJson(join(root, `src/strings/${lang.code}.json`));
  const pages = await collectPages(join(root, 'src/pages'), site.languages);
  const partials = { langRedirect: await readFile(join(root, 'src/partials/lang-redirect.js'), 'utf8') };

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(join(root, 'assets'), join(outDir, 'assets'), { recursive: true });

  const files = [];
  for (const page of pages) {
    const ctx = contextFor(page, pages, site, strings, partials);
    const content = renderTemplate(page.body, ctx);
    const html = renderTemplate(layout, { ...ctx, content });
    const rel = outputPathFor(page.lang.prefix, page.meta.path);
    await mkdir(dirname(join(outDir, rel)), { recursive: true });
    await writeFile(join(outDir, rel), html);
    files.push(rel);
  }
  return { files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = dirname(fileURLToPath(import.meta.url));
  const { files } = await build({ root });
  console.log(`Built ${files.length} pages into site/`);
}
