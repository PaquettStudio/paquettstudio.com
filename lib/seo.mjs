import { urlFor } from './pages.mjs';

// One <url> per indexable page, each listing every language version plus x-default.
export function sitemapXml(pages, site) {
  const indexable = pages.filter(p => !p.meta.single && !p.meta.noindex);
  const multilingual = site.languages.length > 1;
  const urls = indexable.map(page => {
    if (!multilingual) return `<url><loc>${site.baseUrl}${urlFor(page.lang.prefix, page.meta.path)}</loc></url>`;
    const versions = site.languages
      .filter(lang => indexable.some(p => p.meta.id === page.meta.id && p.lang.code === lang.code))
      .map(lang => `<xhtml:link rel="alternate" hreflang="${lang.code}" href="${site.baseUrl}${urlFor(lang.prefix, page.meta.path)}"/>`);
    versions.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${site.baseUrl}${urlFor(site.languages[0].prefix, page.meta.path)}"/>`);
    return `<url><loc>${site.baseUrl}${urlFor(page.lang.prefix, page.meta.path)}</loc>${versions.join('')}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
