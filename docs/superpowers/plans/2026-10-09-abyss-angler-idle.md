# Abyss Angler Idle (web) — plan de implementare

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un joc idle de pescuit, mic și relaxat, la `paquettstudio.com/play/`. Are 36 de specii din Abyss Angler, 8 upgrade-uri și câștiguri idle. Salvarea e locală, iar îndemnul spre aplicație e discret.

**Architecture:**
- Logica e pură, fără DOM, deci se testează în Node: `state.js` (economie, salvare, idle) și `sim.js` (o aruncare).
- Peste ea vin straturile de browser: `render.js` (canvas), `input.js` (deget, mouse, tastatură), `ui.js` (panouri DOM) și `main.js` (bucla).
- Datele (`fish.json`) și arta (WebP) se generează o singură dată din proiectul Unity, **doar prin citire**, apoi se versionează în repository-ul site-ului.
- Pagina e construită de `build.mjs`-ul existent și se publică prin același workflow.

**Tech Stack:** HTML, CSS și JavaScript (ES modules), Canvas 2D, WebAudio (prin `sfx.js`), `localStorage`. Node 24 (`node:test`), zero dependențe.

**Spec:** `docs/superpowers/specs/2026-10-09-abyss-angler-idle-web-design.md`

## Global Constraints

- **Dependențe și resurse:** zero dependențe npm. Pagina nu încarcă nimic de pe alte domenii.
- **Proiectul jocului:** `E:\Games\Abyss` este **doar citit**. Nimic nu se scrie acolo.
- **Mărimea:** pagina `/play/`, cu toate resursele ei, are **sub 2.000.000 de bytes**.
- **Limba:** doar engleză publicată. O pereche RO „adormită” există ca să rămână valid build-ul bilingv din teste.
- **Salvarea:** cheia `paquett.idle.v1`, copia de rezervă `paquett.idle.v1.bak`. Orice acces la stocare trece prin `try/catch`, iar dacă stocarea e blocată jocul merge doar în memorie.
- **Câștiguri idle:** plafonul e de **8 h (480 min)**. O diferență de timp negativă dă 0. Echipajul nu descoperă specii noi.
- **Zonele** (din `Biomes.cs`):
  - `sunlit` „Sunlit Lagoon”, 0–320 m;
  - `twilight` „Twilight Trench”, 320–1300 m;
  - `abyss` „The Abyss”, 1300–2500 m;
  - linia are maximum **2500 m**.
- **Specii:** 12 pe zonă, 36 în total.
- **Raritate** (enum-ul din joc): 0 Common, 1 Uncommon, 2 Rare, 3 Epic, 4 Legendary, 5 Mythic.
- **Rechinii** nu scad niciodată numărul de pești din captură.
- **Sunetul** e oprit implicit și folosește preferința `paquett.sound` prin `sfx.js`.
- **Reduce motion:** cu `prefers-reduced-motion` sau `?reduced-motion` nu există particule, valuri animate sau inerție.
- **Efectele site-ului** (aurora și cometa) **nu pornesc** pe pagina cu layout `play`.
- **Texte exacte:**
  - Îndemnul: „The deep goes on — 245+ more species, sharks that bite back, a boat worth building.”
  - Rândul blocat din colecție: „+245 more species in the full game”.
  - Cartonașul idle: „Your crew caught {N} fish worth {X} coins while you were away”.
- **Ținte:**
  - zone tactile de minimum 44 px;
  - fără scroll orizontal pe pagină între 320 și 1920 px;
  - focus vizibil;
  - o zonă `aria-live` pentru capturi.

## Review Focus

1. **Tab ascuns sau telefon blocat în mijlocul unei aruncări.** La revenire, cârligul nu „teleportează”: `dt` e plafonat. Câștigurile idle nu se numără de două ori pentru timpul în care pagina a stat deschisă. Testul e în Task 3: după `collectIdle`, `idleEarnings` întoarce 0 pentru același moment.
2. **Ceasul dispozitivului schimbat** (înapoi sau cu zile înainte): câștigul e 0, respectiv plafonat la 8 h. Testul e în Task 3.
3. **Stocare blocată, salvare coruptă sau versiune necunoscută:** jocul pornește fără erori, iar salvarea veche e păstrată în `.bak`. Testul e în Task 3.
4. **Apăsări repetate rapid pe Buy sau pe Cast:** nu se cumpără de două ori cu banii pentru un singur nivel și nu pornesc două aruncări. Testele sunt în Task 3 (`buy`) și Task 4 (`requestCast`).
5. **Telefon îngust (320 px) sau ținut orizontal (înălțime ~360 px):** canvas-ul și panourile încap, fără scroll orizontal. Verificarea în browser e în Task 7.

---

### Task 1: Extragerea speciilor din proiectul Unity

**Files:**
- Create: `scripts/extract-fish.mjs`
- Create: `tests/extract-fish.test.mjs`, cu fixture-uri inline: șiruri `.asset` și un fragment `Roster.cs`
- Generate: `assets/data/fish.json`, rulând `node scripts/extract-fish.mjs --src "E:/Games/Abyss/Abyss 2D/Assets"`

**Interfaces:**
- Produces:
  - `parseFishAsset(text: string): FishRecord | null`, cu `FishRecord = { fishName, rarity, baseValue, weightMin, weightMax, depthMin, depthMax, swimSpeed, tint: '#rrggbb' }`. Întoarce `null` dacă nu e un `FishData` (lipsește `fishName`).
  - `parseHeld(rosterCs: string): Set<string>`, adică numele din blocul `Held = new() { { "Nume", "motiv" }, … }`.
  - `selectSpecies(records: FishRecord[], { zones, held: Set<string>, hasArt: (name) => boolean }): Species[]`.
    - Exact 12 specii pe zonă.
    - O specie aparține zonei dacă `(depthMin + depthMax) / 2` cade în `[top, bottom)`.
    - Se exclud speciile din `held` și cele fără artă.
    - Mixul pe zonă: 5 cu rarity 0, 4 cu rarity 1, 2 cu rarity 2–3, 1 cu rarity 4–5. Dacă un grup nu are destule, golul se completează din grupul imediat inferior, apoi din cel superior.
    - În fiecare grup se aleg exemplare distanțate egal după adâncimea medie, deci rezultatul e determinist.
  - `Species = { id: slug(fishName), name, zone, rarity, value: baseValue, weightMin, weightMax, depthMin: max(depthMin, zone.top), depthMax: min(depthMax, zone.bottom), swimSpeed, tint, art: 'assets/img/play/fish/<id>.webp' }`.
  - `ZONES`, exportat: cele 3 zone din Global Constraints.
  - Pe disc, `fish.json` = `{ zones: ZONES, species: Species[] }`.

- [ ] **Step 1: Scrie testele:**
  - `parseFishAsset` citește câmpurile din fragmentul real (`Vent Anemone`, rarity 1, baseValue 3959, depth 937.8–979.8, tint `#26a69a`);
  - întoarce `null` pentru un `.asset` fără `fishName`;
  - `parseHeld` găsește `Hagfish` și `Vampire Squid`;
  - `selectSpecies`, pe un set generat de 120 de înregistrări:
    - întoarce 36 de specii, 12 pe zonă;
    - mixul e 5/4/2/1;
    - nicio specie din `held` sau fără artă;
    - rulat de două ori, rezultatul e identic;
  - golul din grupul legendar se completează din grupul rar.
- [ ] **Step 2:** `node --test tests/extract-fish.test.mjs` → FAIL.
- [ ] **Step 3: Implementează.**
  - Parsare cu regex pe liniile `  key: value`.
  - `tint` din `{r,g,b}` convertit în hex.
  - CLI-ul citește `Resources/Fish/*.asset`, `Scripts/Core/Roster.cs` și lista `Resources/FishArt/*.png`, apoi scrie `assets/data/fish.json` (JSON cu 2 spații).
- [ ] **Step 4:** Rulează → PASS. Apoi rulează CLI-ul pe proiectul real. Verifică că `fish.json` are 3 zone, 36 de specii și că niciun câmp nu e `null`.
- [ ] **Step 5: Commit:** `feat(play): extract 36 species from the game data`

### Task 2: Arta peștilor și a vasului

**Files:**
- Modify: `scripts/icon-studio.mjs`, cu rute noi:
  - `GET /fish` servește `scripts/render-fish.html`;
  - `GET /data/fish.json`;
  - `GET /src/fish/<id>`, care citește `FishArt/<name>.png` doar pentru id-urile din `fish.json`;
  - `POST /save?name=fish/<id>.webp`, care scrie în `assets/img/play/fish/` doar pentru id-urile din `fish.json`.
- Create: `scripts/render-fish.html`.
- Create: `assets/img/play/fish/*.webp`, 36 de fișiere.

**Interfaces:**
- Produces: imagini WebP pe fundal transparent, decupate la conținut (bounding box după alpha > 8), cu latura mare de maximum **256 px**, calitate 0,85. Ținta e ≤ 25 KB per imagine.
- Vasul și cârligul: caută, doar citind, în `Assets/Resources/Special`, `Assets/Resources/Char` și `E:/Games/Abyss/backup_vessel`. Dacă găsești PNG-uri potrivite (colac, barcă mică, barcă, cârlig), exportă-le la fel în `assets/img/play/vessel-{0,1,2}.webp` și `hook.webp`. **Altfel**, `render.js` le desenează procedural (Task 6). Decizia se trece în ledger.

- [ ] **Step 1:** Extinde studio-ul. Pentru `/save`, whitelist-ul se construiește din `fish.json` la pornire. Pornește-l cu `--src "E:/Games/Abyss/Abyss 2D/Assets/Resources"`, deschide `/fish` în panoul de browser și așteaptă „done”.
- [ ] **Step 2:** Verifică:
  - există 36 de fișiere;
  - fiecare începe cu `RIFF` și are `WEBP` la offset-ul 8;
  - totalul e sub 900 KB;
  - 3 dintre ele, vizual, cu `Read`.
- [ ] **Step 3:** Caută arta pentru vas și cârlig. Exportă-o sau notează decizia procedurală.
- [ ] **Step 4: Commit:** `feat(play): web art for the 36 species`

### Task 3: Starea jocului și economia (`state.js`)

**Files:**
- Create: `assets/js/play/state.js`
- Create: `tests/play-state.test.mjs`

**Interfaces:**
- Consumes: forma `Species` din Task 1.
- Produces:
  - `ECONOMY`, toate constantele într-un singur obiect: `costBase` și `max` pe upgrade, multiplicatorul `1.6`, `valueScale`, `crewRate`, `idleCapMinutes: 480`.
  - `UPGRADE_IDS = ['line','sink','hold','reach','reel','luck','crew','vessel']`. `max` e 10 pentru toate, cu excepția lui `vessel`, care are 2.
  - `createState(): State`, cu `{ version: 1, coins: 0, levels: {…: 0}, collection: {}, lastSeen: null, stats: { casts: 0, caught: 0 } }`.
  - `upgradeCost(id, level): number`, adică `Math.round(costBase[id] * 1.6 ** level)`.
  - `derived(state): { maxDepth, sinkSpeed, holdSize, reach, reelSpeed, luck, crewPerMinute, vessel }`.
    - `maxDepth` după nivel: `[120,220,320,500,750,1000,1300,1650,2000,2250,2500]`.
    - `holdSize`: `Math.round(3 + 0.9 * level)`, adică de la 3 la 12.
    - `reach` (metri): `4 + 0.6 * level`.
    - `sinkSpeed` (m/s): `40 + 12 * level`.
    - `reelSpeed` (m/s): `80 + 20 * level`.
    - `luck`: `level`.
    - `crewPerMinute`: 0 la nivelul 0, apoi crește după `ECONOMY.crewRate`.
    - `vessel`: `level`.
  - `unlockedZoneIds(state): string[]`, zonele cu `top < maxDepth`.
  - `fishValue(species, weight): number`, adică `max(1, round(sqrt(species.value) * valueScale * (0.8 + 0.4 * relWeight)))`.
  - `buy(state, id): { ok: boolean, state }`. E imutabil. Eșuează la nivel maxim sau dacă nu ajung banii.
  - `sell(state, catches: {speciesId, weight}[], speciesById): { state, coins, newSpecies: string[] }`. Actualizează colecția (cea mai grea captură) și `stats`.
  - `idleEarnings(state, now: number, speciesById): { minutes, coins, fish }`. Întoarce 0 dacă `lastSeen` lipsește, dacă diferența e negativă, dacă nu există specii descoperite sau dacă `crewPerMinute` e 0. Minutele sunt plafonate la 480.
  - `collectIdle(state, now, speciesById): State`. Adaugă monedele și setează `lastSeen = now`.
  - `touch(state, now): State`, care setează `lastSeen` (chemat la ascunderea paginii, la salvare și periodic).
  - `save(storage, state)`, `load(storage): State` și `reset(storage)`, conform Global Constraints. O salvare coruptă sau cu `version !== 1` se copiază în `.bak`, iar funcția întoarce `createState()`.

- [ ] **Step 1: Scrie testele:**
  - `upgradeCost('line', 0) === costBase.line`; `upgradeCost('line', 5) === Math.round(costBase.line * 1.6 ** 5)`.
  - `derived` la nivelul 0: `maxDepth` 120, `holdSize` 3. La nivelul 10: `maxDepth` 2500, `holdSize` 12.
  - `unlockedZoneIds`: la nivelul 2 de line (320 m) întoarce doar `sunlit`; la nivelul 3 apare și `twilight`; la nivelul 7 apare și `abyss`.
  - `buy`: cu bani exacți pentru un nivel, primul apel are succes, iar al doilea întoarce `ok:false` cu banii neschimbați (Review Focus 4). La nivel maxim întoarce `ok:false`.
  - `sell` adaugă monede, marchează speciile noi o singură dată și păstrează cea mai grea captură.
  - `idleEarnings`:
    - `lastSeen` = acum minus 10 min, cu crew 3 și o specie descoperită → `minutes` 10 și `coins > 0`;
    - acum minus 3 zile → `minutes` 480 (Review Focus 2);
    - un `lastSeen` în viitor → 0;
    - fără specii descoperite → `fish` 0 și `coins` 0;
    - după `collectIdle(state, now)`, `idleEarnings(..., now)` întoarce `coins` 0 (Review Focus 1).
  - Salvarea:
    - `save` + `load` dau înapoi aceeași stare;
    - stocarea care aruncă excepție → `load` întoarce `createState()`, iar `save` nu aruncă;
    - JSON corupt → stare nouă, iar `.bak` conține textul vechi;
    - `version: 2` → stare nouă, plus `.bak` (Review Focus 3).
- [ ] **Step 2:** Rulează → FAIL.
- [ ] **Step 3:** Implementează. Constantele `costBase`, `valueScale` și `crewRate` le alegi tu, reglate în Task 4 de testul de ritm.
- [ ] **Step 4:** Rulează → PASS.
- [ ] **Step 5: Commit:** `feat(play): game state, upgrades, idle earnings and saves`

### Task 4: Simularea unei aruncări (`sim.js`) și testul de ritm

**Files:**
- Create: `assets/js/play/sim.js`
- Create: `tests/play-sim.test.mjs`

**Interfaces:**
- Consumes: `derived`, `unlockedZoneIds`, `fishValue`, `sell` și `buy` din Task 3, plus forma `Species`.
- Produces:
  - `WORLD_WIDTH = 60`, lățimea lumii în metri. `x` ia valori în `[0, 60]`, iar adâncimea e în metri, în jos.
  - `createRng(seed: number): () => number`, după algoritmul mulberry32.
  - `createSession()` → `{ cast: null }`.
  - `requestCast(session, state, species, rng): boolean`. Pornește o aruncare doar dacă `session.cast` e `null` sau are `phase === 'done'`. Altfel întoarce `false` (Review Focus 4).
  - Câmpurile aruncării: `{ phase: 'sinking'|'reeling'|'done', hook: {x: 30, depth: 0}, targetX: 30, caught: [], fish: Fish[], sharks: Shark[], limits: derived(state) }`.
  - `stepCast(cast, dt, { targetX }, species, rng): void`. Mută cârligul și peștii în loc, fără să întoarcă o copie nouă. Regulile:
    - `dt` e plafonat la 0,05 s;
    - `hook.x` urmărește `targetX`: cu inerție `x += (targetX - x) * min(1, dt * 6)`, sau direct când rulează cu reduce motion (flag `cast.instant`);
    - `hook.x` rămâne în `[2, 58]`;
    - **coborârea** crește `depth` cu `sinkSpeed * dt` până la `maxDepth`;
    - când `depth >= maxDepth` sau `caught.length >= holdSize`, aruncarea trece în **urcare** (`reeling`);
    - **urcarea** scade `depth` cu `reelSpeed * dt` până la 0, apoi `phase` devine `done`;
    - **populația de pești** acoperă fereastra `[depth - 70, depth + 70]`. Densitatea e de ~1 pește la 6 m, iar speciile eligibile sunt cele din zone deblocate, la adâncimea lor. Ponderile de raritate sunt `[60,25,10,6,3,1]`, iar pentru raritatea r ponderea se înmulțește cu `(1 + 0.15 * luck * r)`;
    - **prinderea**: dacă distanța dintre pește și cârlig e mai mică decât `reach` și `caught.length < holdSize`, se adaugă în `caught` un obiect `{ speciesId, weight }` (greutate aleatorie între `weightMin` și `weightMax`), iar peștele dispare;
    - **rechinii** apar doar sub 320 m, rar (~1 pe 150 m). Dacă un rechin trece la mai puțin de 12 m de cârlig, peștii aflați la mai puțin de 15 m de el fug timp de 1,5 s. **`caught` nu scade niciodată.**
  - `finishCast(state, cast, speciesById)` → `sell(state, cast.caught, speciesById)`.

- [ ] **Step 1: Scrie testele** (cu seed fix):
  - fără pești în cale, coborârea se oprește exact la `maxDepth`, apoi urcă și ajunge la `done`;
  - cu cala de 3 și mulți pești în cale, aruncarea trece în `reeling` imediat după a treia captură;
  - un pește aflat la `reach + 0.1` nu e prins, iar unul la `reach - 0.1` e prins;
  - cu `targetX` 999, `hook.x` rămâne ≤ 58;
  - într-o simulare de 200 de aruncări prin zona abyss, cu rechini, `caught.length` nu scade niciodată între două step-uri;
  - `requestCast` cât o aruncare e activă întoarce `false`;
  - **testul de ritm**: un jucător simulat cu seed fix aruncă continuu (fiecare aruncare durează timpul ei simulat, plus 2 s pauză), ghidează spre cel mai apropiat pește și cumpără mereu cel mai ieftin upgrade util, cu `line` pe primul loc dacă îl permite. Trebuie să ajungă la:
    - Twilight Trench deblocat între **5 și 15 min**;
    - The Abyss deblocat între **20 și 45 min**;
    - colecția 36/36 între **60 și 150 min** de timp simulat.
- [ ] **Step 2:** Rulează → FAIL.
- [ ] **Step 3:** Implementează `sim.js`. Reglează constantele din `ECONOMY` (`state.js`) până trece testul de ritm, apoi notează valorile finale în ledger.
- [ ] **Step 4:** Rulează toată suita → PASS.
- [ ] **Step 5: Commit:** `feat(play): cast simulation and pacing`

### Task 5: Pagina `/play/` și integrarea în site

**Files:**
- Create: `src/pages/en/play.html`, cu `layout: "play"`, `path: "/play/"`, titlul „Play Abyss Angler Idle | Paquett Studio” și o descriere.
- Create: `src/pages/ro/play.html`, perechea RO adormită, cu aceeași structură și titlurile în română.
- Modify:
  - `build.mjs`: `ROUTES.play = '/play/'`;
  - `src/strings/en.json` și `ro.json`: `nav.play` („Play” / „Joacă”);
  - `src/layout.html`: linkul Play în ambele navigații;
  - `assets/js/main.js`: nu pornește `startFx` când `document.body.classList.contains('page-play')`;
  - `src/pages/en/abyss-angler.html` (și RO): cardul „coming soon” devine un buton spre `{{ links.play }}`, cu textul „Play the idle edition”;
  - `src/pages/en/privacy.html` (și RO), secțiunea 2: un rând nou, „If you play Abyss Angler Idle, your progress is saved in your browser’s local storage only; it is never sent to us.”;
  - `tests/check-site.mjs`: `PAGE_PATHS` include `/play/`;
  - `tests/build-en.test.mjs`, `tests/seo.test.mjs` și `tests/build.test.mjs`: noile numărători (7 URL-uri EN, 14 în varianta bilingvă).
- Markup-ul pe care îl folosesc Task 6 și Task 7, în fragmentul paginii:
  ```html
  <link rel="stylesheet" href="/assets/css/play.css">
  <section class="play" data-play aria-label="Abyss Angler Idle">
    <div class="play-hud" data-hud></div>
    <div class="play-stage"><canvas data-canvas aria-label="…"></canvas>
      <button class="btn btn-primary play-cast" data-cast type="button">Cast</button></div>
    <p class="visually-hidden" aria-live="polite" data-live></p>
    <div class="play-panels">
      <section data-panel="upgrades">…</section>
      <section data-panel="collection">…</section>
      <section data-panel="full-game">… insigne magazine …</section></div>
    <nav class="play-tabs" data-tabs>…3 butoane…</nav>
    <noscript><p>Abyss Angler Idle needs JavaScript. Get the full game on the App Store or Google Play.</p></noscript>
  </section>
  <script type="module" src="/assets/js/play/main.js"></script>
  ```
- Test: `tests/play-page.test.mjs`. Construiește cu configurația implicită (EN) și verifică:
  - `play/index.html` există și are `page-play` pe `<body>`;
  - pagina conține `data-canvas`, `data-cast` și `aria-live`;
  - insignele duc spre `site.games.abyssAngler.appStore` și `googlePlay`;
  - pagina jocului are un link spre `/play/`;
  - Privacy conține „Abyss Angler Idle”;
  - verificatorul strict întoarce `[]`;
  - **bugetul de mărime**: suma bytes pentru `play/index.html`, toate fișierele `assets/css/*.css`, toate `assets/js/**/*.js`, `assets/data/fish.json`, `assets/img/play/**`, `assets/fonts/*.woff2` și `assets/img/badges/*` e sub 2.000.000.

- [ ] **Step 1:** Scrie `play-page.test.mjs` și actualizează numărătorile → FAIL.
- [ ] **Step 2:** Implementează pagina și integrarea. `assets/js/play/main.js` poate fi deocamdată doar un modul care importă `data.js` și încarcă `fish.json`.
- [ ] **Step 3:** Rulează toată suita → PASS. Apoi `node build.mjs && node tests/check-site.mjs site --strict`.
- [ ] **Step 4: Commit:** `feat(play): /play/ page and site integration`

### Task 6: Randare, intrări și bucla de joc

**Files:**
- Create: `assets/js/play/data.js`: `loadData(): Promise<{ zones, species, speciesById }>`, care face `fetch` pe `/assets/data/fish.json`.
- Create: `assets/js/play/input.js`
- Create: `assets/js/play/render.js`
- Modify: `assets/js/play/main.js`
- Create: `assets/css/play.css`, cu layout-ul de bază: telefon vertical pe tot ecranul sub antet; pe calculator, zona de joc de maximum 480 px în centru și panourile laterale.
- Test: `tests/play-input.test.mjs`, cu un `EventTarget` simulat, ca la `fx.test`.

**Interfaces:**
- Consumes: `sim.js`, `state.js` și `data.js`.
- Produces:
  - `createSteer(target: EventTarget, getRect: () => DOMRect): { targetX01: number, onCast(cb) }`:
    - `pointerdown` și `pointermove` cu buton apăsat setează `targetX01` în `[0,1]`;
    - ArrowLeft și ArrowRight mută cu 0,04 pe apăsare, sau continuu cât timp tasta e ținută;
    - Space sau Enter pe canvas declanșează `onCast`.
  - `createRenderer(canvas, { images, reducedMotion })` → `{ resize(), draw({ cast, state, zones, time }) }`. Desenează:
    - marea, cu gradient după adâncime și tentele din jocul original (`Biomes.cs`);
    - particulele (doar fără reduce motion);
    - vasul (artă sau procedural);
    - firul și cârligul;
    - peștii (imaginea speciei, oglindită după direcție);
    - rechinii (siluetă procedurală întunecată);
    - camera urmărește cârligul, cu 100 m vizibili pe înălțime.
  - `main.js`:
    - încarcă datele, imaginile (`new Image()`, lazy, pe zone) și starea (`load`);
    - convertește ținta din `[0,1]` în metri: `targetX = targetX01 * WORLD_WIDTH`;
    - bucla `requestAnimationFrame` cheamă `stepCast` și `draw`;
    - pauză la `visibilitychange`, unde cheamă `touch` și `save`;
    - la `phase === 'done'`: `finishCast`, apoi `save`, apoi UI-ul (Task 7).

- [ ] **Step 1: Scrie testele pentru `createSteer`:**
  - `pointerdown` la x = 75% din lățime → `targetX01` 0,75;
  - ArrowRight de 3 ori de la 0,5 → 0,62;
  - `targetX01` rămâne în `[0,1]`;
  - Space declanșează `onCast` o singură dată pe apăsare.

  Rulează → FAIL.
- [ ] **Step 2:** Implementează `input.js` → PASS. Apoi implementează `data.js`, `render.js`, `main.js` și `play.css`.
- [ ] **Step 3: Verificare în browser** (`preview_start site`), la `/play/`:
  - o aruncare completă cu mouse-ul;
  - ghidarea cu săgețile;
  - touch prin `TouchEvent` simulat, cu presetul `mobile`;
  - `?reduced-motion`;
  - consola fără erori;
  - 60 fps pe desktop (măsurat cu `requestAnimationFrame`, ca la site).
- [ ] **Step 4: Commit:** `feat(play): canvas rendering, input and game loop`

### Task 7: Panouri, cartonașe, îndemn, sunet și accesibilitate

**Files:**
- Create: `assets/js/play/ui.js`
- Modify: `assets/js/sfx.js`. Adaugă în `SOUNDS` sunetele sintetizate `cast`, `catch`, `newSpecies` și `coins`.
- Modify: `tests/sfx.test.mjs`. Un test nou: `play('cast')` construiește oscilatoare când sunetul e pornit.
- Modify: `assets/js/play/main.js`, `assets/css/play.css`.

**Interfaces:**
- Produces: `createUi(root, { species, zones, links, onBuy(id), onCast(), onCollect(), onReset() })` → `{ render(state, cast), showNewSpecies(list), showWelcomeBack({ coins, fish }), showCta('forgotten-sea' | 'complete'), announce(text) }`.
  - **HUD:** adâncimea și zona, monedele, cala `n / holdSize`.
  - **Upgrades:** câte un rând pe upgrade, cu nume, nivel `n/max`, efect și butonul Buy (cu cost, dezactivat când nu ajung banii, cu `aria-disabled`).
  - **Collection:** o grilă de 36. Speciile neprinse apar ca siluete (imaginea cu `filter: brightness(0)`) cu „???”, cele prinse au numele și cea mai grea captură. La final e rândul blocat, cu textul exact din Global Constraints.
  - **Full game:** textul exact, insignele și un link spre `/games/abyss-angler/`.
  - **Cartonașe:**
    - „New species!”, care dispare singur după 2,5 s;
    - „Welcome back”, cu butonul Collect;
    - cele două cartonașe de îndemn, cel mult o dată pe sesiune fiecare (`sessionStorage`, în `try/catch`).
  - **Reset progress** se face din setări, cu confirmare în pagină (doi pași), fără `confirm()`. Lângă el apare nota „Progress is saved in this browser only — clearing site data resets it.”
  - **Tabs pe telefon:** butoane cu `aria-selected`/`aria-controls`. Panoul se deschide ca o foaie peste canvas și se închide cu ×, cu Escape sau trăgând în jos.
  - `announce` scrie în `aria-live` textul „Caught {name}, {weight} kg” sau „New species: {name}”.

- [ ] **Step 1:** Scrie testul pentru `sfx` → FAIL. Apoi implementează sunetele → PASS.
- [ ] **Step 2:** Implementează `ui.js` și leagă-l în `main.js`. Bara de jos are minimum 44 px.
- [ ] **Step 3: Verificare în browser:**
  - 320, 390 și 768 px, plus orizontal 740×360;
  - 1440 px;
  - scroll orizontal 0 (Review Focus 5);
  - cumpără un upgrade, iar pe Buy dublu-click rapid nu se cumpără de două ori;
  - specie nouă → cartonaș;
  - setezi `lastSeen` cu 10 min în urmă din consolă, reîncarci → apare „Welcome back”;
  - forțezi `line` la nivelul 10 → la 2500 m apare cartonașul de îndemn;
  - navigare doar cu tastatura;
  - consola fără erori.
- [ ] **Step 4: Commit:** `feat(play): panels, cards, full-game prompt, sounds and a11y`

### Task 8: Verificare completă și publicare

- [ ] **Step 1:** Rulează `node --test "tests/*.test.mjs"` (totul trece), apoi `node build.mjs`, apoi `node tests/check-site.mjs site --strict` (fără erori). Bugetul de mărime trebuie să treacă.
- [ ] **Step 2:** O sesiune manuală de ~5 minute în panoul de browser: aruncări, upgrade-uri, deblocarea Twilight Trench (cu monede adăugate din consolă dacă e nevoie). Reglează mici neplăceri vizuale, fiecare cu commit `fix(play): …`.
- [ ] **Step 3: Revizuirea finală** a întregii ramuri, conform `executing-plans`.
- [ ] **Step 4:** `git push origin main` (publicarea e aprobată în spec), apoi urmărește workflow-ul până la `success`. Verifică `https://paquettstudio.com/play/` (200) și `https://paquettstudio.com/assets/data/fish.json` (200).
