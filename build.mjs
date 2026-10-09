import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderTemplate, escapeHtml } from './lib/template.mjs';
import { collectPages, outputPathFor, urlFor } from './lib/pages.mjs';
import { sitemapXml } from './lib/seo.mjs';

const DOMAIN = 'paquettstudio.com';
const OG_LOCALES = { en: 'en_GB', ro: 'ro_RO' };

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
  if (page.meta.single || site.languages.length < 2) return '';
  const links = site.languages
    .filter(lang => pages.some(p => p.meta.id === page.meta.id && p.lang.code === lang.code))
    .map(lang => `<link rel="alternate" hreflang="${lang.code}" href="${site.baseUrl}${urlFor(lang.prefix, page.meta.path)}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${site.baseUrl}${urlFor(site.languages[0].prefix, page.meta.path)}">`);
  return links.join('\n');
}

function langSwitchHtml(page, pages, site, t) {
  if (site.languages.length < 2) return '';
  const items = site.languages.map(lang => {
    const target = pages.find(p => p.meta.id === page.meta.id && p.lang.code === lang.code);
    const href = urlFor(lang.prefix, target && !page.meta.single ? target.meta.path : '/');
    const current = lang.code === page.lang.code;
    return `<a href="${href}" hreflang="${lang.code}" lang="${lang.code}" data-lang-link="${lang.code}" aria-current="${current}">${escapeHtml(lang.label)}</a>`;
  });
  return `<nav class="lang-switch" aria-label="${escapeHtml(t.nav.language)}">${items.join('')}</nav>`;
}

function headExtraHtml(page, site, partials) {
  const isDefaultHome = site.languages.length > 1 && page.meta.id === 'home' && page.lang.code === site.languages[0].code;
  return isDefaultHome ? `<script data-lang-redirect>${partials.langRedirect.trim()}</script>` : '';
}

// JSON inside <script> must not be able to close the tag.
const jsonLd = data => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

export function organizationLd(site) {
  const c = site.company;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Paquett Studio',
    legalName: c.legalName,
    url: site.baseUrl,
    logo: `${site.baseUrl}/assets/img/icon-512.png`,
    email: c.emailContact,
    address: { '@type': 'PostalAddress', streetAddress: c.office },
  };
}

export function videoGameLd(site, gameKey, url) {
  const g = site.games[gameKey];
  const org = organizationLd(site);
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: g.name,
    url: `${site.baseUrl}${url}`,
    gamePlatform: ['iOS', 'Android'],
    operatingSystem: 'iOS, Android',
    applicationCategory: 'GameApplication',
    author: { '@type': 'Organization', name: org.name, legalName: org.legalName, url: org.url },
    publisher: { '@type': 'Organization', name: org.name, legalName: org.legalName, url: org.url },
    sameAs: [g.appStore, g.googlePlay],
  };
}

function socialHtml(site) {
  if (!site.social?.length) return '';
  const items = site.social.map(s => `<li><a href="${escapeHtml(s.url)}" rel="me noopener">${escapeHtml(s.name)}</a></li>`);
  return `<ul class="social">${items.join('')}</ul>`;
}

function noticeHtml(page, site, t) {
  const isTranslation = page.lang.code !== site.languages[0].code;
  return page.meta.layout === 'legal' && isTranslation
    ? `<p class="translation-notice section" role="note">${escapeHtml(t.legal.translationNotice)}</p>`
    : '';
}

function updatedHtml(page, t) {
  if (!page.meta.updated) return '';
  const date = new Date(`${page.meta.updated}T12:00:00Z`);
  const label = new Intl.DateTimeFormat(page.lang.code === 'en' ? 'en-GB' : page.lang.code, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
  return `<p class="updated">${escapeHtml(t.legal.updated)} <time datetime="${page.meta.updated}">${label}</time></p>`;
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
    ogLocale: OG_LOCALES[lang.code] ?? lang.code,
    robotsHtml: meta.noindex ? '<meta name="robots" content="noindex">' : '',
    links,
    alternatesHtml: alternatesHtml(page, pages, site),
    langSwitchHtml: langSwitchHtml(page, pages, site, strings[lang.code]),
    jsonLdHtml: [organizationLd(site), meta.game && videoGameLd(site, meta.game, urlFor(lang.prefix, meta.path))]
      .filter(Boolean).map(jsonLd).join('\n'),
    socialHtml: socialHtml(site),
    headExtraHtml: headExtraHtml(page, site, partials),
    noticeHtml: noticeHtml(page, site, strings[lang.code]),
    updatedHtml: updatedHtml(page, strings[lang.code]),
  };
}

function assertSafeOutDir(root, outDir) {
  const rel = relative(resolve(outDir), resolve(root));
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) {
    throw new Error(`Refusing to build into ${outDir}: it contains the project root`);
  }
}

// `languages` (codes) overrides site.json's enabledLanguages, e.g. to build a dormant translation.
export async function build({ root = process.cwd(), outDir, languages } = {}) {
  outDir = outDir ?? join(root, 'site');
  assertSafeOutDir(root, outDir);
  const config = await readJson(join(root, 'src/data/site.json'));
  const enabled = languages ?? config.enabledLanguages ?? config.languages.map(l => l.code);
  const site = { ...config, languages: config.languages.filter(l => enabled.includes(l.code)) };
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

  await writeFile(join(outDir, 'sitemap.xml'), sitemapXml(pages, site));
  await writeFile(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.baseUrl}/sitemap.xml\n`);
  await writeFile(join(outDir, 'CNAME'), `${DOMAIN}\n`);
  return { files };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = dirname(fileURLToPath(import.meta.url));
  const { files } = await build({ root });
  console.log(`Built ${files.length} pages into site/`);
}
