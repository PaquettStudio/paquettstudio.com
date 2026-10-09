import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sitemapXml } from '../lib/seo.mjs';

const site = {
  baseUrl: 'https://paquettstudio.com',
  languages: [
    { code: 'en', label: 'EN', name: 'English', prefix: '' },
    { code: 'ro', label: 'RO', name: 'Română', prefix: '/ro' },
  ],
};
const PATHS = { home: '/', game: '/games/abyss-angler/', terms: '/legal/terms/', privacy: '/legal/privacy/', copyright: '/legal/copyright/', report: '/report/' };
const pages = [
  ...site.languages.flatMap(lang => Object.entries(PATHS).map(([id, path]) => ({ lang, meta: { id, path } }))),
  { lang: site.languages[0], meta: { id: '404', path: '/404.html', single: true, noindex: true } },
];

test('the sitemap lists every page in both languages, without the 404', () => {
  const xml = sitemapXml(pages, site);
  assert.equal(xml.match(/<url>/g).length, 12);
  assert.equal(xml.match(/<xhtml:link /g).length, 36);
  assert.ok(!xml.includes('404'));
});

test('each sitemap entry links its language versions and the default', () => {
  const xml = sitemapXml(pages, site);
  const ro = xml.match(/<url><loc>https:\/\/paquettstudio\.com\/ro\/legal\/terms\/<\/loc>[\s\S]*?<\/url>/)[0];
  assert.ok(ro.includes('hreflang="en" href="https://paquettstudio.com/legal/terms/"'));
  assert.ok(ro.includes('hreflang="ro" href="https://paquettstudio.com/ro/legal/terms/"'));
  assert.ok(ro.includes('hreflang="x-default" href="https://paquettstudio.com/legal/terms/"'));
});

test('the sitemap is a valid urlset document', () => {
  const xml = sitemapXml(pages, site);
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  assert.ok(xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
});

test('a single-language sitemap has no alternate links', () => {
  const en = { ...site, languages: [site.languages[0]] };
  const xml = sitemapXml(pages.filter(p => p.lang.code === 'en'), en);
  assert.equal(xml.match(/<url>/g).length, 6);
  assert.ok(!xml.includes('<xhtml:link'));
});
