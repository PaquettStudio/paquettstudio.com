import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initMenu, initReveal } from '../assets/js/ui.js';

function fakeElement(attrs = {}) {
  const el = new EventTarget();
  const attributes = { ...attrs };
  const classes = new Set();
  Object.assign(el, {
    inert: false,
    hidden: false,
    dataset: {},
    getAttribute: k => (k in attributes ? attributes[k] : null),
    setAttribute: (k, v) => { attributes[k] = String(v); },
    classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
      contains: c => classes.has(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    focus() {},
  });
  return el;
}

function fakeDoc(elements) {
  const doc = new EventTarget();
  doc.documentElement = fakeElement();
  doc.getElementById = id => elements[id] ?? null;
  doc.querySelector = sel => elements[sel] ?? null;
  doc.querySelectorAll = sel => elements[`all:${sel}`] ?? [];
  doc.defaultView = { matchMedia: () => ({ matches: false, addEventListener() {} }) };
  return doc;
}

test('opening the mobile menu makes the page behind it inert, closing restores it', () => {
  const button = fakeElement({ 'aria-expanded': 'false' });
  const menu = fakeElement();
  const main = fakeElement();
  const footer = fakeElement();
  const doc = fakeDoc({ 'menu-toggle': button, 'site-menu': menu, main, '.site-footer': footer });
  initMenu(doc);
  button.dispatchEvent(new Event('click'));
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(main.inert, true);
  assert.equal(footer.inert, true);
  button.dispatchEvent(new Event('click'));
  assert.equal(main.inert, false);
  assert.equal(footer.inert, false);
});

test('reveal animations are armed only by the reveal script itself', () => {
  const doc = fakeDoc({});
  doc.defaultView = {};
  initReveal(doc);
  assert.equal(doc.documentElement.classList.contains('reveal-ready'), true);
});

test('without IntersectionObserver every reveal element is shown at once', () => {
  const items = [fakeElement(), fakeElement()];
  const doc = fakeDoc({ 'all:.reveal': items });
  doc.defaultView = {};
  initReveal(doc);
  assert.ok(items.every(el => el.classList.contains('is-in')));
});
