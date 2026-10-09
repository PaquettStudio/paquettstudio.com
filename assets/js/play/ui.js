// Abyss Angler Idle — the HTML around the sea: HUD, upgrades, collection, the full-game
// prompt, cards and the phone's tab sheets. The pure helpers at the top are tested in Node.
import { ECONOMY, UPGRADE_IDS, derived, upgradeCost, unlockedZoneIds } from './state.js';

export const LOCKED_ROW_TEXT = '+245 more species in the full game';
const CTA_TEXT = 'The deep goes on — 245+ more species, sharks that bite back, a boat worth building.';
const NAMES = {
  line: 'Line length', sink: 'Sink speed', hold: 'Hold size', reach: 'Hook reach',
  reel: 'Reel speed', luck: 'Lucky lure', crew: 'Crew nets', vessel: 'Vessel',
};
const HINTS = {
  line: 'How deep the lure can go. New zones open past 320 m and 1300 m.',
  sink: 'How fast the lure drops.',
  hold: 'How many fish fit in one trip.',
  reach: 'How close a fish must swim to bite.',
  reel: 'How fast you reel back up.',
  luck: 'Rarer fish show up more often.',
  crew: 'Your crew keeps fishing while you are away.',
  vessel: 'A bigger boat. Just for looks.',
};
const VESSELS = ['Life ring', 'Rowboat', 'Fishing boat'];
const CTA_HEADINGS = {
  'forgotten-sea': { kicker: '2500 m', title: 'The Forgotten Sea lies below' },
  complete: { kicker: '36 / 36', title: 'Collection complete' },
};

const fmt = n => Math.round(n).toLocaleString('en-GB');
// Tiny fish read better in grams than as 0.0 kg.
const kg = w => (w < 0.1 ? `${Math.max(1, Math.round(w * 1000))} g` : `${w.toFixed(1)} kg`);

function effectOf(id, d) {
  switch (id) {
    case 'line': return `${d.maxDepth} m`;
    case 'sink': return `${d.sinkSpeed} m/s`;
    case 'hold': return `${d.holdSize} fish`;
    case 'reach': return `${d.reach.toFixed(1)} m`;
    case 'reel': return `${d.reelSpeed} m/s`;
    case 'luck': return `+${Math.round(d.luck * ECONOMY.luckPerLevel * 100)}% rare odds`;
    case 'crew': return `${d.crewPerMinute.toFixed(1)} fish/min`;
    default: return VESSELS[d.vessel];
  }
}

export function upgradeRows(state) {
  const now = derived(state);
  return UPGRADE_IDS.map(id => {
    const level = state.levels[id];
    const max = ECONOMY.max[id];
    const maxed = level >= max;
    const cost = maxed ? null : upgradeCost(id, level);
    const effect = maxed
      ? effectOf(id, now)
      : `${effectOf(id, now)} → ${effectOf(id, derived({ ...state, levels: { ...state.levels, [id]: level + 1 } }))}`;
    return { id, name: NAMES[id], hint: HINTS[id], level, max, maxed, cost, affordable: !maxed && state.coins >= cost, effect };
  });
}

export const welcomeText = ({ fish, coins }) => `Your crew caught ${fmt(fish)} fish worth ${fmt(coins)} coins while you were away`;
export const caughtText = (species, weight) => `Caught ${species.name}, ${kg(weight)}`;
export const newSpeciesText = species => `New species: ${species.name}`;

export function collectionView(state, species, zones) {
  const open = new Set(unlockedZoneIds(state, zones));
  return {
    total: species.length,
    caught: species.filter(s => s.id in state.collection).length,
    zones: zones.map(zone => ({
      id: zone.id,
      name: zone.name,
      top: zone.top,
      locked: !open.has(zone.id),
      cards: species.filter(s => s.zone === zone.id).map(s => {
        const weight = state.collection[s.id];
        const known = weight !== undefined;
        // Unseen species hint at where they swim, so the last few can be found.
        const depths = `${Math.round(s.depthMin)}–${Math.round(s.depthMax)} m`;
        return { id: s.id, art: s.art, known, label: known ? s.name : '???', detail: known ? kg(weight) : depths };
      }),
    })),
  };
}

// Remembers shown prompts in sessionStorage, and in memory when storage is blocked.
const memory = new WeakMap();
const noStorageMemory = new Set();
export function onceThisSession(storage, kind) {
  const key = `paquett.idle.cta.${kind}`;
  let seen = noStorageMemory;
  if (storage) {
    if (!memory.has(storage)) memory.set(storage, new Set());
    seen = memory.get(storage);
  }
  if (seen.has(key)) return false;
  seen.add(key);
  try {
    if (storage?.getItem(key)) return false;
    storage?.setItem(key, '1');
  } catch {
    // Storage blocked: the in-memory set above already remembers it for this page view.
  }
  return true;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createUi(root, { species, zones, speciesById, sessionStore, onBuy, onCast, onCollect, onReset }) {
  const $ = sel => root.querySelector(sel);
  const hud = $('[data-hud]');
  const castButton = $('[data-cast]');
  const live = $('[data-live]');
  const stage = $('[data-stage]');
  const upgradesEl = $('[data-upgrades]');
  const collectionEl = $('[data-collection]');
  const settingsEl = $('[data-settings]');
  const tabsEl = $('[data-tabs]');
  const panels = [...root.querySelectorAll('[data-panel]')];
  const tabs = [...root.querySelectorAll('[data-tab]')];
  const wide = window.matchMedia('(min-width: 960px)');

  // HUD.
  hud.innerHTML = '<span class="play-pill" data-hud-depth></span>'
    + '<span class="play-pill play-coins"><i class="play-coin" aria-hidden="true"></i><span data-hud-coins></span><span class="visually-hidden"> coins</span></span>'
    + '<span class="play-pill" data-hud-hold></span>';
  const hudDepth = hud.querySelector('[data-hud-depth]');
  const hudCoins = hud.querySelector('[data-hud-coins]');
  const hudHold = hud.querySelector('[data-hud-hold]');
  const coinsPill = hud.querySelector('.play-coins');
  const zoneAt = depth => (zones.find(z => depth >= z.top && depth < z.bottom) ?? zones[zones.length - 1]).name;
  castButton.addEventListener('click', () => onCast());
  // Holding Enter on the button would repeat clicks and reel straight back in.
  castButton.addEventListener('keydown', e => { if (e.repeat) e.preventDefault(); });

  // Upgrades: rows built once, refreshed in place so focus never jumps.
  upgradesEl.innerHTML = `<ul class="play-upgrades">${UPGRADE_IDS.map(id => `
    <li class="play-upgrade" data-row="${id}">
      <div class="play-upgrade-text">
        <p class="play-upgrade-name"><strong>${NAMES[id]}</strong> <span data-level></span></p>
        <p class="play-upgrade-hint">${HINTS[id]}</p>
        <p class="play-upgrade-effect" data-effect></p>
      </div>
      <button type="button" class="play-buy" data-buy="${id}"></button>
    </li>`).join('')}</ul>`;
  const rowEls = Object.fromEntries(UPGRADE_IDS.map(id => [id, upgradesEl.querySelector(`[data-row="${id}"]`)]));
  upgradesEl.addEventListener('click', e => {
    const button = e.target.closest('[data-buy]');
    // detail > 1 is the second click of a double click: one press buys one level.
    if (!button || e.detail > 1 || button.getAttribute('aria-disabled') === 'true') return;
    onBuy(button.dataset.buy);
  });

  // Collection (rebuilt only when what it shows changes).
  let collectionKey = '';
  collectionEl.addEventListener('click', e => {
    if (e.target.closest('[data-more]')) openPanel('full-game');
  });

  // Settings: two-step reset, no confirm().
  settingsEl.innerHTML = `
    <div class="play-reset">
      <button type="button" class="btn btn-ghost play-reset-start" data-reset>Reset progress</button>
      <div class="play-reset-confirm" data-reset-confirm hidden>
        <p>Erase all coins, upgrades and species?</p>
        <div class="play-reset-actions">
          <button type="button" class="btn btn-primary" data-reset-yes>Yes, reset</button>
          <button type="button" class="btn btn-ghost" data-reset-no>Cancel</button>
        </div>
      </div>
      <p class="play-note">Progress is saved in this browser only — clearing site data resets it.</p>
    </div>`;
  const resetStart = settingsEl.querySelector('[data-reset]');
  const resetConfirm = settingsEl.querySelector('[data-reset-confirm]');
  const showReset = asking => {
    resetStart.hidden = asking;
    resetConfirm.hidden = !asking;
    (asking ? settingsEl.querySelector('[data-reset-no]') : resetStart).focus();
  };
  resetStart.addEventListener('click', () => showReset(true));
  settingsEl.querySelector('[data-reset-no]').addEventListener('click', () => showReset(false));
  settingsEl.querySelector('[data-reset-yes]').addEventListener('click', () => {
    onReset();
    showReset(false);
    announce('Progress reset');
  });

  // Phone: tabs open one panel as a sheet over the sea; ×, Escape or a swipe down close it.
  tabsEl.setAttribute('role', 'tablist');
  tabs.forEach(t => t.setAttribute('role', 'tab'));
  let openId = null;
  const panelOf = id => panels.find(p => p.dataset.panel === id);
  function openPanel(id) {
    const panel = panelOf(id);
    if (wide.matches) {
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      panel.querySelector('h2').setAttribute('tabindex', '-1');
      panel.querySelector('h2').focus({ preventScroll: true });
      return;
    }
    openId = id;
    panels.forEach(p => p.classList.toggle('is-open', p === panel));
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === id)));
    panel.querySelector('[data-close]').focus();
  }
  function closePanel() {
    if (!openId) return;
    const tab = tabs.find(t => t.dataset.tab === openId);
    openId = null;
    panels.forEach(p => p.classList.remove('is-open'));
    tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
    tab?.focus();
  }
  tabs.forEach(t => t.addEventListener('click', () => (openId === t.dataset.tab ? closePanel() : openPanel(t.dataset.tab))));
  panels.forEach(panel => {
    panel.querySelector('[data-close]').addEventListener('click', closePanel);
    const head = panel.querySelector('.play-panel-head');
    let startY = null;
    head.addEventListener('pointerdown', e => { startY = e.clientY; });
    head.addEventListener('pointermove', e => { if (startY !== null && e.clientY - startY > 60) { startY = null; closePanel(); } });
    head.addEventListener('pointerup', () => { startY = null; });
    head.addEventListener('pointercancel', () => { startY = null; });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePanel(); });

  // Cards float over the sea and never block it.
  const cards = document.createElement('div');
  cards.className = 'play-cards';
  stage.append(cards);
  const speciesQueue = [];
  let speciesTimer = null;

  function nextSpeciesCard() {
    const s = speciesQueue.shift();
    if (!s) { speciesTimer = null; return; }
    const card = document.createElement('div');
    card.className = 'play-card play-card--species';
    const weight = lastState?.collection[s.id];
    card.innerHTML = `<img src="/${esc(s.art)}" alt="" width="72" height="48">`
      + `<div><p class="play-card-kicker">New species!</p><p class="play-card-title">${esc(s.name)}</p>`
      + `${weight !== undefined ? `<p class="play-card-text">${kg(weight)}</p>` : ''}</div>`;
    cards.append(card);
    speciesTimer = setTimeout(() => { card.remove(); nextSpeciesCard(); }, 2500);
  }

  function showNewSpecies(list) {
    speciesQueue.push(...list);
    if (!speciesTimer) nextSpeciesCard();
  }

  function showWelcomeBack(earnings) {
    const card = document.createElement('div');
    card.className = 'play-card play-card--welcome';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', 'Welcome back');
    card.innerHTML = `<p class="play-card-kicker">Welcome back</p><p class="play-card-text">${esc(welcomeText(earnings))}</p>`
      + '<button type="button" class="btn btn-primary play-card-action" data-collect>Collect</button>';
    card.querySelector('[data-collect]').addEventListener('click', () => { card.remove(); onCollect(); });
    cards.prepend(card);
    return () => card.remove();
  }

  function showCta(kind) {
    if (!CTA_HEADINGS[kind] || !onceThisSession(sessionStore, kind)) return false;
    const { kicker, title } = CTA_HEADINGS[kind];
    const card = document.createElement('div');
    card.className = 'play-card play-card--cta';
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', title);
    card.innerHTML = '<button type="button" class="play-card-close" aria-label="Close">×</button>'
      + `<p class="play-card-kicker">${kicker}</p><p class="play-card-title">${title}</p><p class="play-card-text">${CTA_TEXT}</p>`;
    const badges = $('#panel-full-game .store-badges')?.cloneNode(true);
    if (badges) card.append(badges);
    card.querySelector('.play-card-close').addEventListener('click', () => card.remove());
    cards.append(card);
    return true;
  }

  function announce(text) {
    live.textContent = '';
    // A fresh text node on the next frame makes screen readers repeat identical messages.
    requestAnimationFrame(() => { live.textContent = text; });
  }

  let lastState = null;
  let lastCoins = null;
  function renderPanels(state) {
    for (const row of upgradeRows(state)) {
      const el = rowEls[row.id];
      el.querySelector('[data-level]').textContent = `Lv ${row.level}/${row.max}`;
      el.querySelector('[data-effect]').textContent = row.effect;
      const button = el.querySelector('[data-buy]');
      button.innerHTML = row.maxed ? 'Max' : `Buy <i class="play-coin" aria-hidden="true"></i>${fmt(row.cost)}`;
      button.setAttribute('aria-disabled', String(!row.affordable));
      button.setAttribute('aria-label', row.maxed ? `${row.name} is at max level` : `Buy ${row.name} level ${row.level + 1} for ${fmt(row.cost)} coins`);
    }
    const view = collectionView(state, species, zones);
    const key = JSON.stringify([state.collection, view.zones.map(z => z.locked)]);
    if (key !== collectionKey) {
      collectionKey = key;
      collectionEl.innerHTML = `<p class="play-collection-count">${view.caught} / ${view.total} species</p>`
        + view.zones.map(z => `
          <section class="play-zone${z.locked ? ' is-locked' : ''}">
            <h3>${esc(z.name)} <span>${z.cards.filter(c => c.known).length}/${z.cards.length}</span></h3>
            ${z.locked ? `<p class="play-zone-lock">Opens when your line goes past ${z.top} m</p>` : ''}
            <ul class="play-fish-grid">${z.cards.map(c => `
              <li class="play-fish${c.known ? '' : ' is-unknown'}">
                <img src="/${esc(c.art)}" alt="" width="64" height="40" loading="lazy">
                <span class="play-fish-name">${c.known ? esc(c.label) : '<span aria-hidden="true">???</span><span class="visually-hidden">Not caught yet</span>'}</span>
                <span class="play-fish-weight">${c.detail}</span>
              </li>`).join('')}
            </ul>
          </section>`).join('')
        + `<button type="button" class="play-more" data-more><span class="play-more-lock" aria-hidden="true">🔒</span> ${LOCKED_ROW_TEXT}</button>`;
    }
  }

  function render(state, cast) {
    const active = cast && cast.phase !== 'done';
    const depth = active ? cast.hook.depth : 0;
    hudDepth.textContent = `${Math.round(depth)} m · ${zoneAt(depth)}`;
    hudCoins.textContent = fmt(state.coins);
    hudHold.textContent = `Hold ${active ? cast.caught.length : 0} / ${derived(state).holdSize}`;
    if (lastCoins !== null && state.coins > lastCoins) {
      coinsPill.classList.remove('is-bump');
      void coinsPill.offsetWidth;
      coinsPill.classList.add('is-bump');
    }
    lastCoins = state.coins;
    const label = !active ? 'Cast' : cast.phase === 'sinking' ? 'Reel in' : 'Reeling…';
    if (castButton.textContent !== label) castButton.textContent = label;
    castButton.disabled = !!active && cast.phase === 'reeling';
    if (state !== lastState) {
      lastState = state;
      renderPanels(state);
    }
  }

  return { render, showNewSpecies, showWelcomeBack, showCta, announce, closePanel };
}
