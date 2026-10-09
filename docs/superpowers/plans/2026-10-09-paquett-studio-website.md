# Site Paquett Studio — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site static bilingv (EN/RO) pentru Paquett Studio Ltd, în stilul „Prism Ember”, publicat pe `paquettstudio.com` prin GitHub Pages.

**Architecture:** Un script Node fără dependențe (`build.mjs`) asamblează paginile în `site/`. Pentru asta folosește:
- `src/layout.html`
- fragmentele de conținut din `src/pages/<lang>/`
- textele de interfață din `src/strings/<lang>.json`
- datele firmei și ale jocului din `src/data/site.json`

În browser rulează ES modules simple: efectele pe două canvas-uri, sunetul generat cu WebAudio, comutatorul de limbă și meniul. Un verificator (`tests/check-site.mjs`) blochează publicarea dacă lipsesc pagini, dacă un link e stricat sau dacă a rămas vreun marcaj `[[DE COMPLETAT]]`.

**Tech Stack:**
- Node 24, doar module incluse în Node (`node:test`, `node:fs`, `node:http`, `node:vm`);
- HTML, CSS și JavaScript (ES modules);
- Canvas 2D și WebAudio;
- GitHub Actions și GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-07-paquett-studio-website-design.md`

**Machetă de referință pentru efecte:** `.superpowers/brainstorm/1361-1791401146/content/visual-style-v2.html`, funcția `fxE` și CSS-ul `.sE`. Fișierul e local și nu e versionat.

## Global Constraints

- **Dependențe:** zero dependențe npm; doar module incluse în Node ≥ 24.
- **Fără resurse externe încărcate de pagini:**
  - fără CDN, Google Fonts sau analytics;
  - linkurile `<a>` spre magazine și rețele sociale sunt permise.
- **Limbi:**
  - `en` la rădăcină (`prefix: ""`), `ro` sub `/ro` (`prefix: "/ro"`);
  - căile paginilor sunt identice în ambele limbi.
- **Pagini:** `/`, `/games/abyss-angler/`, `/legal/terms/`, `/legal/privacy/`, `/legal/copyright/`, `/report/`, în ambele limbi, plus `/404.html` (bilingv, o singură pagină).
- **Bază URL:** `https://paquettstudio.com`.
- **Marcaj pentru date lipsă:** exact `[[DE COMPLETAT]]`.
- **Chei `localStorage`:** `paquett.lang` (`"en"` sau `"ro"`) și `paquett.sound` (`"1"` sau `"0"`). Orice acces se face prin `try/catch`.
- **Culori:**
  - fundal `#040308`;
  - auroră `#ff3fa4`, `#7b5cff`, `#22c8ff`;
  - accent auriu `#ffcf7a`.
- **Fonturi:** Syne 700/800 pentru titluri și Inter 400/500/600 pentru text. WOFF2 găzduite local, subseturile `latin` și `latin-ext` (diacriticele românești sunt în `latin-ext`).
- **Subsol, pe fiecare pagină:** `© {an} Paquett Studio Ltd · Registered in {jurisdiction} · Company No. {number} · Registered office: {office}`, plus linkurile Terms, Privacy, Copyright & IP și Report a copy.
- **Simbolul mărcii:** numele jocului apare ca **Abyss Angler™**. Simbolul `®` nu apare nicăieri pe site.
- **Juridic:**
  - textele EN sunt autoritative;
  - paginile juridice RO au bannerul exact: „Traducere informativă; versiunea în engleză prevalează.”;
  - fiecare pagină juridică afișează „Last updated: …” (în RO: „Ultima actualizare: …”).
- **Textul exact al casetei „Official releases” (EN):** „Abyss Angler is developed and published exclusively by Paquett Studio Ltd. The only official versions are listed here. Any other listing is unauthorised — please report it.”
- **Sunet:** oprit implicit.
- **Efecte:**
  - DPR maxim 2, sau 1,5 pe dispozitive cu `(pointer: coarse)`;
  - dacă media FPS e sub 45 timp de 2 s, calitatea scade (×0,7, minimum 0,4);
  - animația se oprește când tab-ul e ascuns;
  - cu `prefers-reduced-motion`: un singur cadru static, fără particule, glitch sau warp.
- **Layout:**
  - fără scroll orizontal la lățimi între 320 și 1920 px;
  - zonele atingibile au minimum 44 × 44 px;
  - nimic nu depinde de hover;
  - fără JavaScript, tot conținutul e vizibil (stările ascunse de animație există doar sub `html.js`).
- **Descărcări:** fonturile și insignele oficiale de magazin se descarcă **doar cu acordul explicit al utilizatorului**. Când cerem acordul, spunem ce fișiere, de unde și ce mărime au.

## Review Focus

1. **Atingere urmată de scroll pe iOS sau Android.** Browserul emite `pointercancel`, dar cometa trebuie să urmeze în continuare degetul prin `touchmove`. Testul e în Task 5.
2. **`localStorage` blocat** (Safari privat, cookies dezactivate). Comutatorul de limbă, redirecționarea și sunetul funcționează fără excepții, iar preferința e considerată absentă. Testele sunt în Task 4 și Task 6.
3. **JavaScript dezactivat sau eșuat.** Secțiunile cu animație de apariție rămân vizibile, pentru că starea ascunsă există doar sub `.js`. Testul e în Task 7.
4. **Ecran de 320 px.** Titlul „PAQUETT STUDIO”, meniul și butoanele nu produc scroll orizontal. Verificarea în browser e în Task 3, iar matricea completă în Task 12.
5. **Tab ascuns sau telefon blocat.** Bucla de animație se oprește și pornește din nou la revenire. Testul e în Task 5.

---

### Task 1: Pipeline de build, layout schelet și server local

**Files:**
- Create: `package.json`. Conține `"type": "module"`, `"private": true` și scripturile:
  - `build`: `node build.mjs`
  - `test`: `node --test tests/`
  - `check`: `node tests/check-site.mjs site --strict`
  - `serve`: `node scripts/serve.mjs`
- Create: `lib/template.mjs`, `lib/pages.mjs`, `build.mjs`, `scripts/serve.mjs`
- Create: `src/layout.html`, `src/data/site.json`, `src/strings/en.json`, `src/strings/ro.json`
- Create: `src/pages/en/home.html`, `src/pages/ro/home.html` (fragmente minime)
- Create: `assets/.gitkeep`, `.claude/launch.json` (configurația `site`: `node scripts/serve.mjs`, port 4173)
- Test: `tests/template.test.mjs`, `tests/pages.test.mjs`, `tests/build.test.mjs`

**Interfaces:**
- Produces:
  - `renderTemplate(tpl: string, ctx: object): string`
    - `{{ a.b }}` → valoare cu escape HTML;
    - `{{{ a.b }}}` → valoare brută;
    - o cheie lipsă aruncă `Error("Missing template key: a.b")`.
  - `parsePage(source: string, file: string): { meta: PageMeta, body: string }`
    - antetul e `<!--page {JSON} -->` pe prima linie;
    - `PageMeta = { id, path, title, description, layout?: "home"|"default"|"legal", single?: boolean, updated?: string, noindex?: boolean }`;
    - dacă antetul lipsește, aruncă `Error` care conține numele fișierului.
  - `outputPathFor(prefix: string, pagePath: string): string`
    - `("", "/")` → `"index.html"`
    - `("/ro", "/legal/terms/")` → `"ro/legal/terms/index.html"`
    - `("", "/404.html")` → `"404.html"`
  - `urlFor(prefix: string, pagePath: string): string`, de exemplu `("/ro", "/")` → `"/ro/"`.
  - `collectPages(srcDir: string, languages: Lang[]): Promise<Page[]>`
    - `Page = { lang: Lang, meta, body }`;
    - aruncă `Error('Page "<id>" missing in <code>')` când o pagină care nu e `single` lipsește într-o limbă.
  - `build({ root?: string, outDir?: string }): Promise<{ files: string[] }>`
    - copiază `assets/` în `<outDir>/assets/`;
    - pentru fiecare pagină: întâi randează `body` cu contextul, apoi `layout` cu `content`;
    - rulat direct (`node build.mjs`), scrie în `site/`.
  - Contextul șablonului:
    - `{ lang, t, site, page, year, url, alternatesHtml, langSwitchHtml, jsonLdHtml, headExtraHtml, noticeHtml }`;
    - `t` = obiectul `strings/<lang>.json`, iar `site` = `site.json`.
  - `serve({ dir: string, port: number })`
    - `/x/` → `x/index.html`;
    - un fișier inexistent → `404.html` cu statusul 404;
    - content-type corect pentru html, css, js, svg, png, webp, woff2, xml și txt.
- `site.json` începe exact cu această structură:
  ```json
  {
    "baseUrl": "https://paquettstudio.com",
    "languages": [
      { "code": "en", "label": "EN", "name": "English", "prefix": "" },
      { "code": "ro", "label": "RO", "name": "Română", "prefix": "/ro" }
    ],
    "company": { "legalName": "Paquett Studio Ltd", "number": "[[DE COMPLETAT]]", "jurisdiction": "[[DE COMPLETAT]]",
                 "office": "[[DE COMPLETAT]]", "emailContact": "[[DE COMPLETAT]]", "emailLegal": "[[DE COMPLETAT]]" },
    "games": { "abyssAngler": { "name": "Abyss Angler", "appStore": "[[DE COMPLETAT]]", "googlePlay": "[[DE COMPLETAT]]",
               "releaseIos": "[[DE COMPLETAT]]", "releaseAndroid": "[[DE COMPLETAT]]" } },
    "social": []
  }
  ```
- `alternatesHtml` conține câte un `<link rel="alternate" hreflang="{code}" href="{baseUrl}{url}">` pentru fiecare limbă, plus `hreflang="x-default"` spre varianta EN.

- [ ] **Step 1: Scrie testele care pică**
  - `template.test.mjs`:
    - `renderTemplate('<p>{{ a.b }}</p>', {a:{b:'<x>'}})` === `'<p>&lt;x&gt;</p>'`;
    - `{{{ h }}}` cu `'<b>'` → `'<b>'`;
    - o cheie lipsă aruncă `/Missing template key: nope/`;
    - numerele sunt convertite la string.
  - `pages.test.mjs`:
    - cele trei cazuri `outputPathFor` de mai sus și cazul `urlFor`;
    - `parsePage` citește meta și body;
    - `parsePage` aruncă o eroare care conține numele fișierului când antetul lipsește;
    - `collectPages`, rulat pe un director temporar cu `en/terms.html` fără `ro/terms.html`, aruncă `/Page "terms" missing in ro/`.
  - `build.test.mjs` construiește în `os.tmpdir()` și verifică:
    - există `index.html` și `ro/index.html`;
    - `ro/index.html` conține `<html lang="ro"`;
    - ambele conțin `hreflang="en" href="https://paquettstudio.com/"`, `hreflang="ro" href="https://paquettstudio.com/ro/"` și `hreflang="x-default" href="https://paquettstudio.com/"`;
    - ambele conțin `Paquett Studio Ltd` și `Company No.`.
- [ ] **Step 2:** `node --test tests/` → FAIL (modulele nu există).
- [ ] **Step 3: Implementează** `lib/template.mjs`, `lib/pages.mjs`, `build.mjs`, `scripts/serve.mjs`, layout-ul schelet (head, meta description, alternates, `<main>{{{ content }}}</main>`, subsolul conform Global Constraints) și cele două pagini home minime.
- [ ] **Step 4:** `node --test tests/` → PASS. Apoi `node build.mjs`. Apoi `preview_start` cu `site` și `/` și `/ro/` se încarcă fără erori în consolă.
- [ ] **Step 5: Commit:** `feat: build pipeline, layout skeleton, dev server`

### Task 2: Verificatorul site-ului și CI

**Files:**
- Create: `tests/check-site.mjs`, `tests/check-site.test.mjs`, `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: structura `site/` produsă de `build()`.
- Produces:
  - `checkSite(dir: string, opts: { strict: boolean }): Promise<string[]>`, care returnează lista de erori, goală dacă totul e în regulă.
  - CLI: `node tests/check-site.mjs <dir> [--strict]` afișează erorile și iese cu codul 1 dacă există.
  - `EXPECTED_PATHS`, exportat: cele 6 căi × prefixele `""` și `/ro`, plus `/404.html`.
- Mesajele de eroare au formatul exact:
  - `Missing page: <url>`
  - `Broken link in <file>: <href>`
  - `Missing <title> in <file>`
  - `Missing meta description in <file>`
  - `Missing hreflang <code> in <file>`
  - `Footer incomplete in <file>`, când lipsește oricare dintre `legalName`, `Company No.` sau `Registered office`
  - `External resource in <file>: <url>`, pentru `src=`, pentru `<link rel=stylesheet|preload|icon|modulepreload href=` și pentru `url(` din CSS spre `http(s)://`
  - `Registered mark ® in <file>`
  - doar în modul strict: `Unfinished marker [[DE COMPLETAT]] in <file>`
- `404.html` e scutit de verificarea hreflang.

- [ ] **Step 1: Scrie testele.** Fiecare test creează fixture-uri minime într-un director temporar, printr-o funcție `writeFixture(files: Record<string,string>)`. Câte un test pentru fiecare mesaj de mai sus, plus:
  - un fixture valid complet → `[]`;
  - `<a href="https://apps.apple.com/x">` → nicio eroare;
  - un marcaj în modul ne-strict → nicio eroare.
- [ ] **Step 2:** `node --test tests/check-site.test.mjs` → FAIL.
- [ ] **Step 3: Implementează `checkSite`.** Folosește regex peste HTML și CSS, fără parser. Linkurile interne (`href`/`src` care încep cu `/` sau sunt relative, fără `#` și fără `mailto:`/`tel:`) se rezolvă așa: `x/` → `x/index.html`.
- [ ] **Step 4: Scrie `pages.yml`.**
  - Rulează la `push` pe `main` și la `workflow_dispatch`.
  - `permissions`: `contents: read`, `pages: write`, `id-token: write`.
  - `concurrency`: `pages`.
  - Pașii, în ordine:
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` cu `node-version: 24`
    3. `node --test tests/`
    4. `node build.mjs`
    5. `node tests/check-site.mjs site --strict`
    6. `actions/upload-pages-artifact@v3` cu `path: site`
    7. `actions/deploy-pages@v4`
- [ ] **Step 5:** `node --test tests/` → PASS. Apoi `node tests/check-site.mjs site` (ne-strict) trebuie să afișeze doar `Missing page: …` pentru paginile încă neconstruite.
- [ ] **Step 6: Commit:** `feat: site checker and Pages workflow`

### Task 3: Fundația vizuală (fonturi, CSS, navigare, meniu mobil, subsol)

**Files:**
- Create: `assets/fonts/`. Conține 10 fișiere WOFF2 de la Fontsource prin jsDelivr:
  - `syne-{latin,latin-ext}-{700,800}-normal.woff2`
  - `inter-{latin,latin-ext}-{400,500,600}-normal.woff2`
  - `OFL.txt`

  **Cere întâi acordul utilizatorului** și precizează sursa: `cdn.jsdelivr.net/npm/@fontsource/<font>/files/…`, ~250 KB în total.
- Create: `assets/css/base.css`:
  - `@font-face` cu `unicode-range` pentru `latin` și `latin-ext`;
  - token-urile `:root` cu culorile din Global Constraints;
  - reset, tipografie și `:focus-visible`.
- Create: `assets/css/layout.css`:
  - nav fix;
  - meniul ☰ pe tot ecranul sub 860 px;
  - hero cu `100svh` și `env(safe-area-inset-*)`;
  - secțiuni;
  - subsol.
- Create: `assets/css/components.css`: butoanele (gradient principal roz → violet → cyan, iar cel secundar cu efect de sticlă), cu minimum 44 px înălțime.
- Create: `assets/js/main.js`, `assets/js/ui.js`
- Modify: `src/layout.html`:
  - `<html class="no-js">`, cu un script inline în head care setează `js`;
  - logo din text (romb și „PAQUETT”);
  - linkuri;
  - sloturile `{{{ langSwitchHtml }}}` și butonul `#sound-toggle` (ascuns până la Task 6);
  - butonul `#menu-toggle`, cu `aria-controls="site-menu"` și `aria-expanded="false"`;
  - `<canvas id="fx-bg">` și `<canvas id="fx-top">`, ambele cu `aria-hidden="true"`;
  - `<script type="module" src="/assets/js/main.js">`.
- Modify: `src/strings/*.json`: `nav.*`, `menu.open`, `menu.close`, `footer.*`.
- Test: `tests/build.test.mjs`. Layout-ul randat conține `class="no-js"`, `aria-controls="site-menu"` și `aria-expanded="false"`.

**Interfaces:**
- Produces:
  - `initMenu(doc: Document): void`
    - butonul comută `aria-expanded` și clasa `menu-open` pe `<html>`;
    - `Esc` închide meniul și mută focusul înapoi pe buton;
    - un click pe un link din meniu închide meniul.
  - `main.js` importă și inițializează modulele. Task-urile următoare adaugă importuri aici.

- [ ] **Step 1:** Adaugă testele de build pentru markup. Rulează → FAIL.
- [ ] **Step 2:** Cere acordul și descarcă fonturile. Verifică că fiecare fișier începe cu semnătura `wOF2`.
- [ ] **Step 3: Implementează** CSS-ul, layout-ul și `initMenu`. Aspectul se ia din macheta `.sE`: nav, butoane și titlul Syne cu gradient alb → lavandă.
- [ ] **Step 4:** `node --test tests/` → PASS. Apoi `node build.mjs`.
- [ ] **Step 5: Verificare în browser.** La 320, 360, 390, 768 și 1440 px, `document.documentElement.scrollWidth <= innerWidth` trebuie să fie `true`. Meniul ☰ se deschide și se închide la click și la `Esc`. Focusul e vizibil când navighezi cu tastatura.
- [ ] **Step 6: Commit:** `feat: visual foundation, nav, mobile menu, footer`

### Task 4: Limbi (comutator și redirecționare la prima vizită)

**Files:**
- Create: `src/partials/lang-redirect.js`. E un script clasic, IIFE care primește `window`, inserat inline de build **doar** în `<head>` al paginii EN `home`.
- Create: `assets/js/i18n.js`
- Modify: `build.mjs`. Generează `langSwitchHtml` și `headExtraHtml`.
- Test: `tests/lang.test.mjs`

**Interfaces:**
- Produces:
  - **Logica de redirecționare** (în `lang-redirect.js`):
    - `pref = stored ?? (primaLimbăBrowser.startsWith("ro") ? "ro" : "en")`;
    - dacă `pref === "ro"` și `location.pathname === "/"`, apelează `location.replace("/ro/" + search + hash)`;
    - `stored` e citit din `paquett.lang` prin `try/catch`; dacă apare o excepție, se consideră `null`;
    - prima limbă a browserului este `navigator.languages?.[0] ?? navigator.language ?? ""`.
  - `rememberLang(storage: Storage | null, code: string): void` nu aruncă niciodată.
  - `initLangSwitch(doc: Document, storage: Storage | null): void`. La click pe `[data-lang-link]`, apelează `rememberLang(storage, code)`, iar navigarea continuă normal.
  - `langSwitchHtml`:
    ```html
    <nav class="lang-switch" aria-label="{t.nav.language}">
      <a href="{urlFor}" hreflang="{code}" lang="{code}" data-lang-link="{code}" aria-current="true|false">{label}</a>…
    </nav>
    ```
    Merge și fără JavaScript.

- [ ] **Step 1: Scrie testele.** Ele rulează `lang-redirect.js` în `node:vm` cu `window`, `localStorage`, `navigator` și `location` simulate. Cazurile:

  | Cale | Preferință salvată | Limbi browser | Rezultat |
  |---|---|---|---|
  | `/` | `null` | `["ro-RO"]` | `replace("/ro/")` |
  | `/` | `"en"` | `["ro"]` | nimic |
  | `/` | `"ro"` | `["en-GB"]` | `replace("/ro/")` |
  | `/` | `localStorage` aruncă excepție | `["ro"]` | `replace("/ro/")`, fără excepție |
  | `/` | `null` | `["en-US"]` | nimic |
  | `/` | `null` | `languages` nedefinit, `language: "ro"` | `replace("/ro/")` |
  | `/` + `?x=1#a` | `null` | `["ro"]` | `replace("/ro/?x=1#a")` |
  | `/legal/terms/` | `null` | `["ro"]` | nimic |

  Pe lângă acestea:
  - `rememberLang` cu un storage care aruncă excepție nu aruncă la rândul lui;
  - testul de build verifică:
    - `/ro/index.html` conține `data-lang-link="en"` cu `href="/"`;
    - linkul RO are `aria-current="true"`;
    - scriptul de redirecționare apare doar în `index.html` (EN).
- [ ] **Step 2:** Rulează → FAIL.
- [ ] **Step 3:** Implementează. Stilul comutatorului e cel segmentat „EN | RO” din machetă (`.sE .lang`).
- [ ] **Step 4:** Rulează → PASS. Apoi, în browser: comutatorul duce la pagina-pereche, iar întoarcerea pe `/` respectă alegerea făcută.
- [ ] **Step 5: Commit:** `feat: language switch and first-visit redirect`

### Task 5: Motorul de efecte

**Files:**
- Create: `assets/js/fx/input.js`, `fx/color.js`, `fx/quality.js`, `fx/background.js`, `fx/particles.js`, `fx/engine.js`
- Modify: `assets/js/main.js` pornește efectele.
- Test: `tests/fx.test.mjs`. Contextul canvas e simulat cu un `Proxy` ale cărui metode nu fac nimic, iar `createLinearGradient` și `createRadialGradient` returnează `{ addColorStop(){} }`.

**Interfaces:**
- Produces:
  - `stepScrollVelocity(prev: number, deltaY: number, dt: number): number`. Netezire exponențială: `decay = Math.exp(-dt*8)`, `v = prev*decay + (deltaY/dt)*(1-decay)`.
  - `createInput(target: EventTarget, now: () => number): InputState`
    - `InputState = { x, y, active: boolean, taps: {x,y}[], scrollV: number, lastInputAt: number, isIdle(t: number): boolean }`.
    - Ascultă `pointermove`, `pointerdown` (adaugă în `taps`), `pointerup`, `pointercancel` și `pointerleave`.
    - Ascultă `touchstart` și `touchmove`, `passive: true`. Acestea actualizează `x`/`y` și setează `active = true` chiar și după `pointercancel` (Review Focus 1). `touchend` setează `active = false`.
    - Ascultă `scroll`, care actualizează `scrollV`.
    - `isIdle(t)` întoarce `t - lastInputAt > 3000`.
  - `hueAt(t: number): number`, copiată exact din machetă:
    ```js
    const k = (Math.sin(t) + 1) / 2, k2 = (Math.sin(t * 0.63 + 2) + 1) / 2;
    return k < 0.5 ? 40 + k * 2 * 290 : 330 - (k - 0.5) * 2 * 140 * k2;
    ```
  - `nextQuality(s: {q: number, lowFor: number}, fps: number, dt: number): {q, lowFor}`
    - dacă `fps < 45`, `lowFor` crește cu `dt`;
    - când `lowFor ≥ 2`, `q = max(0.4, q*0.7)` și `lowFor = 0`;
    - dacă `fps ≥ 45`, `lowFor = 0`.
  - `dprCap(coarse: boolean): number` → `1.5` sau `2`.
  - `particleBudget(w, h, q): number` → `Math.round(Math.min(600, w*h/2500) * q)`.
  - `createParticles(ctx, { max: number })` → `{ trail(x, y, hue), burst(x, y), ring(x, y), step(dt), size(): number }`. `size()` nu depășește niciodată `max`.
  - `createBackground(ctx)` → `{ resize(w, h), draw({ t, dt, scrollV, heroVisible: boolean }) }`
    - aurora în 3 benzi și stelele;
    - la viteză mare de scroll, stelele se alungesc (warp) proporțional cu `scrollV`;
    - grila și ceața se desenează doar când `heroVisible`.
  - `startFx({ doc, win, bg, top, input, reducedMotion, raf, caf, onTap })` → `{ stop(), isRunning(): boolean }`
    - cu `reducedMotion`, desenează un singur cadru static și `isRunning()` întoarce `false`;
    - la `visibilitychange` cu `doc.hidden`, oprește bucla; la revenire, o repornește (Review Focus 5);
    - când utilizatorul nu interacționează, o scânteie autonomă se plimbă prin hero (autopilotul din machetă);
    - un tap produce `ring` și `burst` și apelează `onTap?.(x, y)`, pe care îl folosește Task 6;
    - cursorul sistemului rămâne vizibil: nicăieri pe site nu se folosește `cursor: none`.
  - În `main.js`, `reducedMotion` vine din `matchMedia('(prefers-reduced-motion: reduce)').matches` **sau** din parametrul URL `?reduced-motion` (pentru verificare).

- [ ] **Step 1: Scrie testele:**
  - `stepScrollVelocity` scade spre 0 când `deltaY` e 0 și e pozitivă la scroll în jos;
  - `nextQuality`: la 30 fps, după 2,1 s cumulate, `q` devine 0,7; la 60 fps `q` nu se schimbă; `q` nu scade sub 0,4;
  - `particleBudget(390, 844, 1)` e între 1 și 600 și scade odată cu `q`;
  - `createParticles` cu `max: 100`, după 10 apeluri `burst`, are `size() <= 100`;
  - `createInput`: `pointerdown` (atingere), apoi `pointercancel`, apoi `touchmove` cu `touches[0] = {clientX:100, clientY:200}` duce la `x === 100`, `y === 200` și `active === true`;
  - `startFx`, cu un `doc` simulat: după `hidden = true` și `visibilitychange`, `isRunning()` e `false`; după `hidden = false`, e `true`;
  - cu `reducedMotion: true`, `isRunning()` e `false`.
- [ ] **Step 2:** Rulează → FAIL.
- [ ] **Step 3:** Implementează, portând algoritmii de desen din `fxE`.
- [ ] **Step 4:** Rulează → PASS. Apoi verifică în browser:
  - pe desktop, mouse și click;
  - cu presetul `mobile`, atingerile simulate prin `TouchEvent` din JS;
  - scroll-ul produce warp;
  - `?reduced-motion` arată un fundal static;
  - consola nu are erori.
- [ ] **Step 5: Commit:** `feat: Prism Ember effects engine (pointer, touch, scroll)`

### Task 6: Sunetul

**Files:**
- Create: `assets/js/sfx.js`
- Modify: `src/layout.html` afișează `#sound-toggle` (`aria-pressed`, etichete din `t.sound.on` și `t.sound.off`). `assets/js/main.js` leagă evenimentele.
- Test: `tests/sfx.test.mjs`

**Interfaces:**
- Produces: `createSfx({ storage: Storage | null, AudioCtx: typeof AudioContext | undefined })` → `{ isOn(): boolean, toggle(): boolean, play(name: "tap" | "hover" | "lang"): void }`
  - pornește oprit, dacă `paquett.sound` nu e `"1"`;
  - `toggle` salvează `"1"` sau `"0"`, prin `try/catch`;
  - `AudioContext` se creează leneș, la primul `toggle` pe pornit, care e un gest al utilizatorului;
  - `play` nu face nimic dacă sunetul e oprit.
- **Sunetele**, sintetizate ca în macheta E:
  - `tap`: un sweep sawtooth 220→880 Hz, plus un arpegiu triangle 880/1109/1319/1760 Hz;
  - `hover`: tonul triangle 1760 Hz, 60 ms, câștig 0,02;
  - `lang`: două tonuri sine 988 și 1319 Hz.
- **Când se aud:**
  - `tap` la callback-ul `onTap` din Task 5;
  - `hover` la `pointerenter` cu `pointerType === "mouse"` pe `.btn`;
  - `lang` la click pe `[data-lang-link]`.

- [ ] **Step 1: Scrie testele:**
  - cu storage gol, sunetul e oprit;
  - `toggle()` întoarce `true` și salvează `"1"`;
  - cu un storage care aruncă excepție, `toggle` merge doar în memorie, fără excepție;
  - `play` cât sunetul e oprit nu construiește `AudioCtx` (spion);
  - `AudioCtx` e construit o singură dată.
- [ ] **Step 2:** Rulează → FAIL.
- [ ] **Step 3:** Implementează.
- [ ] **Step 4:** Rulează → PASS. Apoi, în browser, butonul comută `aria-pressed`, iar preferința rămâne după reîncărcarea paginii.
- [ ] **Step 5: Commit:** `feat: synthesized sound effects with persistent toggle`

### Task 7: Pagina Home (EN și RO)

**Files:**
- Modify: `src/pages/en/home.html` și `src/pages/ro/home.html`, cu `layout: "home"`. Secțiunile, în ordine:
  1. **Hero**: kickerul „Independent Game Studio” / „Studio independent de jocuri”, `<h1 data-t="PAQUETT STUDIO">`, sloganul „Small studio. Big worlds. Games made with obsession.” / „Studio mic. Lumi mari. Jocuri făcute cu obsesie.” și butoanele „Explore our games” (spre `#games`) și „Get Abyss Angler” (spre pagina jocului).
  2. **`#games`**: cardul Abyss Angler™ cu `data-tilt`, butoanele de magazin și sigiliul „Official”.
  3. **Coming next**: „??? — in development” / „??? — în dezvoltare”, cu clasa `glitch-on-hover` (se activează și la atingere).
  4. **`#studio`**: 2–3 fraze generice, fără date care nu au fost confirmate.
  5. **`#contact`**: `site.company.emailContact` ca link `mailto:` mare, plus `site.social`, dacă există.
- Modify: `assets/css/components.css` (hero, carduri, `.reveal`, `.tilt`, glitch-ul titlului din machetă cu perioada de 5,5 s), `assets/js/ui.js`.
- Modify: `build.mjs`. Adaugă `jsonLdHtml` pe toate paginile: `Organization`, cu `legalName`, `url`, `logo`, `email` și `address` = `office`.
- Test: `tests/build.test.mjs` și `tests/css.test.mjs`

**Interfaces:**
- Produces:
  - `initReveal(doc: Document)`. Un `IntersectionObserver` adaugă `.is-in` pe elementele `.reveal`.
  - `initTilt(doc: Document)`. La `pointermove` pe `[data-tilt]`, rotește elementul cu maximum 8°. La `pointerleave`, resetează rotirea.
  - Starea ascunsă `.reveal { opacity: 0 }` apare **doar** în selectori care încep cu `.js `.

- [ ] **Step 1: Scrie testele:**
  - `css.test.mjs` citește toate fișierele `assets/css/*.css` și verifică că orice regulă care conține `.reveal` și `opacity: 0` are selectorul prefixat de `.js ` (Review Focus 3);
  - testul de build verifică, pentru `/` și `/ro/`:
    - există `id="games"`, `data-tilt` și `<script type="application/ld+json">`;
    - JSON-LD-ul se parsează și are `legalName === "Paquett Studio Ltd"`.
- [ ] **Step 2:** Rulează → FAIL.
- [ ] **Step 3:** Implementează.
- [ ] **Step 4:** Rulează → PASS. Apoi, în browser, la 360 și la 1440 px: secțiunile apar la scroll, cardul se înclină, iar „Coming next” face glitch la atingere.
- [ ] **Step 5: Commit:** `feat: home page (EN/RO)`

### Task 8: Pagina Abyss Angler (EN și RO)

**Files:**
- Create: `src/pages/{en,ro}/abyss-angler.html`, cu `path: "/games/abyss-angler/"`.
- Create: `assets/img/badges/`. Conține insignele oficiale „Download on the App Store” (EN și RO, SVG, de pe `tools.applemarketingtools.com`) și „Get it on Google Play” (EN și RO, PNG, de pe `play.google.com/intl/*/badges/`). **Cere acordul pentru descărcare.**
- Create: `assets/img/abyss/`, cu placeholdere SVG pentru imaginea reprezentativă și 4 capturi de ecran. Textul `alt` al fiecăruia conține `[[DE COMPLETAT]]`.
- Modify: `assets/js/ui.js`, `assets/css/components.css`.

**Interfaces:**
- Consumes: `site.games.abyssAngler.*`, `urlFor`.
- Produces: `initGallery(doc: Document)`. Pe telefon galeria e nativă (`scroll-snap`). Pe desktop are butoanele ‹ ›, cu `aria-label`, care derulează cu lățimea unui slide.
- Conținutul, de sus în jos:
  - hero cu titlul „Abyss Angler™”;
  - descrierea (`[[DE COMPLETAT]]` până la Task 11);
  - galeria;
  - butoanele de magazin, cu datele lansărilor;
  - caseta `.official` cu textul exact din Global Constraints, cu un link spre `urlFor(lang.prefix, "/report/")`;
    - în RO: „Abyss Angler este dezvoltat și publicat exclusiv de Paquett Studio Ltd. Singurele versiuni oficiale sunt cele listate aici. Orice altă listare este neautorizată — te rugăm să o raportezi.”;
  - „Play in browser — coming soon” / „Joacă în browser — în curând”;
  - JSON-LD `VideoGame`, cu `name`, `author` și `publisher` = `Organization` Paquett Studio Ltd și `gamePlatform` `["iOS","Android"]`.

- [ ] **Step 1:** Testul de build verifică, pentru ambele limbi:
  - textul exact al casetei;
  - linkul de raportare corect pentru limba respectivă (`/report/` sau `/ro/report/`);
  - JSON-LD `VideoGame` cu `publisher.legalName === "Paquett Studio Ltd"`.

  Rulează → FAIL.
- [ ] **Step 2:** Cere acordul și descarcă insignele. Implementează pagina și galeria.
- [ ] **Step 3:** Rulează → PASS. Apoi, în browser, galeria se derulează cu degetul (preset `mobile`) și cu butoanele pe desktop.
- [ ] **Step 4: Commit:** `feat: Abyss Angler game page (EN/RO)`

### Task 9: Paginile juridice și Report a copy

**Files:**
- Create: `src/pages/{en,ro}/terms.html`, `privacy.html`, `copyright.html`, cu `layout: "legal"` și `updated: "2026-10-09"`.
- Create: `src/pages/{en,ro}/report.html`.
- Modify: `src/layout.html` și `build.mjs`:
  - `noticeHtml` = bannerul exact din Global Constraints, când `layout === "legal"` și `lang !== "en"`;
  - linia „Last updated” / „Ultima actualizare”.
- Modify: `assets/css/components.css`. Stilul `.prose`: lățime maximă 72ch și panou semi-opac. Cuprinsul e un `<details>` pe telefon.

**Conținut** (EN autoritativ, RO tradus). Secțiunile, exact ca în spec §7:
- **Terms of Use:**
  - cine suntem;
  - folosirea site-ului;
  - licența jocurilor (limitată, neexclusivă, revocabilă, personală și necomercială; se adaugă la termenii Apple și Google);
  - proprietatea intelectuală;
  - interdicțiile (copiere, clonare, republicare, decompilare, folosirea numelui sau a logo-ului, distribuirea de versiuni modificate);
  - limitarea răspunderii (fără excluderea răspunderii pentru deces, vătămare din neglijență sau fraudă);
  - legea aplicabilă, a Angliei și Țării Galilor;
  - modificările termenilor;
  - contactul.
- **Privacy Policy:**
  - operatorul și adresa;
  - site-ul nu folosește cookies, nu are analytics și colectează doar emailurile primite;
  - secțiunea despre datele colectate de joc, cu `[[DE COMPLETAT]]` până la Task 11;
  - temeiurile legale, păstrarea datelor, terții, transferurile, drepturile, plângerea la ICO, protecția copiilor.
- **Copyright & IP:**
  - proprietatea asupra codului, graficii, sunetului, textelor, numelui și logo-ului;
  - simbolul ™ și faptul că marca nu e înregistrată;
  - canalele oficiale (linkurile din `site.json`);
  - cum acționăm împotriva copiilor;
  - **politica pentru creatorii de conținut:** streaming-ul și videoclipurile cu gameplay sunt permise, inclusiv monetizate, cu mențiunea jocului și un link spre site.
- **Report a copy:**
  - ce trebuie inclus: linkul, capturi de ecran, numele dezvoltatorului, ID-ul pachetului;
  - adresa de raportare: `site.company.emailLegal`, ca link `mailto:` cu subiectul precompletat „Report a copy”;
  - ce urmează după raport;
  - termenul indicativ de răspuns: 5 zile lucrătoare.

- [ ] **Step 1:** Testul de build verifică:
  - fiecare pagină RO `legal/*` conține bannerul exact, iar paginile EN nu îl conțin;
  - fiecare pagină juridică conține „Last updated” sau „Ultima actualizare”;
  - `report` conține `mailto:` și `Report%20a%20copy`.

  Rulează → FAIL.
- [ ] **Step 2:** Scrie conținutul și implementează bannerul.
- [ ] **Step 3:** Rulează → PASS. Apoi `node tests/check-site.mjs site` (ne-strict) trebuie să afișeze o singură eroare: `Missing page: /404.html`. Pagina 404 se adaugă în Task 10.
- [ ] **Step 4: Commit:** `feat: legal pages and report-a-copy (EN/RO)`

### Task 10: SEO, iconițe, 404 și fișiere de bază

**Files:**
- Create: `lib/seo.mjs`.
- Modify: `build.mjs`. Scrie `sitemap.xml`, `robots.txt` și `CNAME`.
- Create: `src/pages/en/404.html`, cu `single: true`, `path: "/404.html"` și `noindex: true`. Pagina e bilingvă, cu linkuri spre `/` și `/ro/`.
- Create: `scripts/render-icons.html` și `scripts/save-dataurl.mjs`. Iconițele se desenează pe un canvas în panoul de browser, sunt exportate prin `toDataURL`, iar Node le salvează ca fișiere. Rezultatul este:
  - `assets/img/favicon.svg`
  - `apple-touch-icon.png` (180 px)
  - `icon-192.png`, `icon-512.png`
  - `og-image.png` (1200 × 630, în stilul Prism Ember)
- Create: `LICENSE` cu textul exact: `Copyright (c) 2026 Paquett Studio Ltd. All rights reserved.`
- Modify: `src/layout.html`:
  - `og:title`, `og:description`, `og:url`, `og:image` (URL absolut);
  - `twitter:card=summary_large_image`;
  - `theme-color #040308`;
  - iconițele;
  - `<meta name="robots" content="noindex">` când `page.noindex`.
- Test: `tests/seo.test.mjs` și `tests/build.test.mjs`

**Interfaces:**
- Produces: `sitemapXml(pages: Page[], site): string`
  - un `<url>` pentru fiecare pagină care nu e `single`, adică 12;
  - fiecare are 3 `<xhtml:link rel="alternate">` (en, ro, x-default);
  - fără 404.

- [ ] **Step 1: Scrie testele:**
  - `sitemapXml` produce 12 `<url>` și 36 de `xhtml:link`, fără `404`;
  - build-ul scrie `robots.txt` exact așa:
    ```
    User-agent: *
    Allow: /
    Sitemap: https://paquettstudio.com/sitemap.xml
    ```
  - build-ul scrie `CNAME` cu conținutul exact `paquettstudio.com`;
  - `404.html` conține `noindex`.

  Rulează → FAIL.
- [ ] **Step 2:** Implementează. Generează iconițele în panoul de browser.
- [ ] **Step 3:** Rulează → PASS. Apoi `node tests/check-site.mjs site` (ne-strict) → nicio eroare, cod de ieșire 0. Marcajele rămase sunt semnalate doar în modul `--strict`, după Task 11.
- [ ] **Step 4: Commit:** `feat: SEO files, icons, OG image, 404, license`

### Task 11: Date reale și completarea conținutului

**Fiecare sursă cere acordul explicit al utilizatorului înainte de folosire:**
1. Companies House (pagina publică a firmei, în panoul de browser): `number`, `jurisdiction`, `office`.
2. Utilizatorul confirmă adresele `emailContact` și `emailLegal`.
3. Paginile publice App Store și Google Play: linkurile, datele de lansare și descrierea publicată, care e reformulată pentru site, nu copiată identic.
4. Proiectul `E:\Games\Abyss`, **doar citire**:
   - `Packages/manifest.json`;
   - `Assets/Plugins/**` și orice SDK-uri (reclame, analytics, cumpărături, conturi, rețea/server);
   - identificatorul pachetului (`ProjectSettings/ProjectSettings.asset`);
   - capturi de ecran și imaginea reprezentativă, dacă există.

**Files:**
- Modify: `src/data/site.json`, `src/pages/{en,ro}/abyss-angler.html`, `src/pages/{en,ro}/privacy.html`, `assets/img/abyss/*`.

  Imaginile se convertesc în WebP prin canvas în panoul de browser și `save-dataurl.mjs`. Ținta e sub 200 KB pe imagine.

- [ ] **Step 1:** Adună datele, cu acord pentru fiecare sursă.
- [ ] **Step 2:** Completează datele. Scrie secțiunea despre datele colectate de joc în Privacy Policy, pe baza SDK-urilor găsite (furnizor, ce date, scop, link spre politica furnizorului).
- [ ] **Step 3:** `node build.mjs`, apoi `node tests/check-site.mjs site --strict` → `[]`, apoi `node --test tests/` → PASS.
- [ ] **Step 4: Commit:** `content: real company, store and game data`

### Task 12: Verificare completă

- [ ] **Step 1:** Pentru fiecare pagină, în ambele limbi, la 320, 360, 390, 768 și 1440 px:
  - `scrollWidth <= innerWidth`;
  - consola nu are erori;
  - captură de ecran, cu o privire asupra contrastului și a textului tăiat.
- [ ] **Step 2:** Navigarea doar cu tastatura prin Home, cu focus vizibil:
  - meniul se deschide și se închide la tastatură;
  - comutatorul de limbă și `#sound-toggle` pot fi activate.
- [ ] **Step 3:**
  - cu `?reduced-motion`, fundalul e static;
  - după 10 secunde pe Home, `performance` nu arată bucla blocată;
  - în `document.querySelectorAll('img')`, fiecare imagine are `alt`.
- [ ] **Step 4:** Repară ce iese la verificare. Fiecare reparație are commitul ei, `fix: …`.

### Task 13: Lansarea (fiecare pas se face cu acordul explicit al utilizatorului)

- [ ] **Step 1:** Utilizatorul se autentifică singur pe GitHub în panoul de browser. Se citește adresa noreply a contului (Settings → Emails). Apoi:
  - `git config user.email <noreply>`;
  - `git rebase -r --root --exec "git commit --amend --no-edit --reset-author"`.
- [ ] **Step 2:** Se creează un repository public, numele propus fiind `paquett-website`. Apoi `git remote add origin …` și `git push -u origin main`. Autentificarea o face Git Credential Manager, iar utilizatorul o completează singur.
- [ ] **Step 3:** Repo → Settings → Pages → Source: „GitHub Actions”. Workflow-ul trebuie să termine cu verde.
- [ ] **Step 4:** Profilul GitHub → Settings → Pages → Add verified domain `paquettstudio.com`. Rezultă înregistrarea TXT `_github-pages-challenge-<user>`.
- [ ] **Step 5:** În Squarespace → Domains → `paquettstudio.com` → DNS se adaugă, **fără a modifica MX**:
  - înregistrarea TXT de la pasul 4;
  - `A @` spre `185.199.108.153`, `185.199.109.153`, `185.199.110.153` și `185.199.111.153`;
  - `CNAME www` spre `<user>.github.io`.

  Apoi domeniul se verifică pe GitHub.
- [ ] **Step 6:** Repo → Settings → Pages → Custom domain: `paquettstudio.com`. După emiterea certificatului, se bifează „Enforce HTTPS”.
- [ ] **Step 7:** Verificări după lansare:
  - `https://paquettstudio.com` și `https://www.paquettstudio.com` (care redirecționează) se încarcă;
  - PageSpeed Insights pe mobil, cu țintele din spec (Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95). Dacă nu sunt atinse, se repară și se face un push nou.
- [ ] **Step 8:** Utilizatorul actualizează, sau ne dă voie să actualizăm, Privacy Policy URL și Marketing URL în App Store Connect și Website și Privacy Policy în Google Play Console. Apoi îi răspunde celor de la Apple cu linkul.
