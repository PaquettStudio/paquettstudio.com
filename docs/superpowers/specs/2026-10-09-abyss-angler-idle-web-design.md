# Abyss Angler Idle (ediția web): specificație de design

- **Data:** 2026-10-09
- **Unde:** `https://paquettstudio.com/play/`, în același repository cu site-ul (`PaquettStudio/paquettstudio.com`)
- **Status:** aprobat în conversație pe secțiuni (rol, salvare, interacțiune, conținut, tehnologie, cele 4 părți de design); în așteptarea revizuirii acestui document

## 1. Scop și criterii de succes

### Rolul jocului

O versiune **idle, relaxată**, a Abyss Angler, care se joacă direct în browser. Are două roluri:

- e distractivă în sine;
- trimite discret spre jocul complet, pe App Store și Google Play.

Nu are plăți, nu are reclame și nu concurează cu jocul de pe telefon.

### Criterii de succes

- Pagina `/play/` se încarcă repede: **sub 2 MB în total**, iar prima aruncare e posibilă în câteva secunde, inclusiv pe telefon.
- O aruncare durează **20–40 s** și se joacă cu un singur deget, cu mouse-ul sau de la tastatură.
- Colecția de 36 de specii se completează în aproximativ **1–2 ore** de joc relaxat.
- Progresul se păstrează în browser între vizite, iar câștigurile idle se acumulează **maximum 8 ore**.
- Îndemnul spre aplicație e vizibil, dar **nu întrerupe niciodată jocul**.
- Jocul live de pe telefon și serverul lui **nu se ating deloc**. Proiectul de pe `E:\Games\Abyss` se folosește **doar pentru citire**.

### În afara scopului

- Cont, cross-play, sincronizare cu jocul de pe telefon.
- Plăți, reclame, analytics.
- Speciile din The Forgotten Sea, prietenii, cuferele, vremea și evenimentele din jocul mare.
- Alte limbi în afară de engleză (site-ul e publicat doar în engleză).

## 2. Ecranul

### Pe telefon

- Format vertical, pe tot ecranul, sub antetul site-ului.
- Jos sunt trei file: **Upgrades**, **Collection** și **Get the full game**. Se deschid ca o foaie care urcă peste joc și se închid trăgând în jos sau apăsând ×.

### Pe calculator

- Zona de joc verticală, lată de cel mult ~480 px, stă în centru.
- În stânga e panoul **Upgrades**, în dreapta **Collection**. Fila **Get the full game** devine un card sub colecție.

### Bara de sus a jocului

- adâncimea curentă, de exemplu `412 m · Twilight Trench`;
- monedele;
- cala, de exemplu `3 / 8`;
- butonul de sunet, comun cu site-ul (aceeași preferință `paquett.sound`).

### Marea

- Culoarea depinde de adâncime: albastru deschis la suprafață, indigo la mijloc, apoi un albastru-violet foarte închis, dar citibil (după tentele din jocul original).
- În adânc apar particule luminoase.
- Peștii înoată orizontal, fiecare în banda lui de adâncime, cu ilustrațiile reale din joc.
- Sus stă vasul: colacul de salvare sau o barcă, în funcție de upgrade-ul **Vessel**.

## 3. O aruncare

> **Modificat la implementare (2026-10-09).** Simularea de ritm a arătat că, dacă se prinde la coborâre, cala se umple mereu la suprafață și speciile din adânc nu pot fi prinse niciodată. Peștii se prind acum **doar la urcare**, iar urcarea poate începe mai devreme cu încă o apăsare.

1. **Cast**: butonul mare de jos, tasta Space sau un tap pe apă cât ești la suprafață. Năluca pleacă de la vas.
2. **Coborârea** se face automat, cu viteza dată de **Sink speed**, până la adâncimea maximă dată de **Line length**. În cădere, năluca nu prinde nimic, fiindcă e prea rapidă ca să muște ceva.
3. **Reel in**: cât năluca coboară, butonul devine „Reel in”. O nouă apăsare (sau Space) o întoarce de unde e. Altfel se întoarce singură la capătul firului.
4. **Ghidarea**:
   - pe telefon, ții degetul pe ecran și îl tragi stânga-dreapta;
   - pe calculator, mouse-ul sau săgețile ←/→.

   Năluca urmărește ținta cu o inerție ușoară și rămâne în lățimea zonei de joc.
5. **Prinderea**, doar la urcare: un pește care intră în raza nălucii (**Hook reach**) e prins, cât timp mai e loc în cală (**Hold size**). Urcarea se face cu **Reel speed**.
6. **Rechinii** apar doar în zonele 2 și 3. Când un rechin trece pe lângă nălucă, peștii din apropiere fug: își schimbă direcția și accelerează scurt. **Rechinii nu fură niciodată captura.**
7. **La suprafață**:
   - captura se vinde automat, cu monedele animate spre bara de sus;
   - fiecare specie nouă primește un cartonaș scurt, „New species!”, cu ilustrația și greutatea;
   - butonul Cast reapare.

**Ritmul** (testul de ritm cu seed fix, jucător mediu): Twilight Trench se deblochează la ~8 min, The Abyss la ~31 min, iar colecția e completă la ~2 h. Speciile Rare și peste apar doar în intervalul lor de adâncime.

## 4. Zone, specii, economie

### Zonele

Numele și adâncimile vin din zonele jocului (`Biomes.cs`), grupate:

| Zonă | Grupează zonele din joc | Adâncime | Specii | Deblocare |
|---|---|---|---|---|
| **Sunlit Lagoon** | Sunlit Lagoon, Coral Reef, Misty Estuary, Open Sea | 0–320 m | 12 | de la început |
| **Twilight Trench** | Northern Fjords, Twilight Trench, Kelp Forest | 320–1.300 m | 12 | Line length ajunge la 320 m |
| **The Abyss** | Volcanic Vents, The Abyss | 1.300–2.500 m | 12 | Line length ajunge la 1.300 m |
| **The Forgotten Sea** | — | 2.500 m+ | 🔒 | doar în jocul complet (vezi §6) |

Linia nu trece niciodată de 2.500 m. La 2.500 m se vede o „cortină” a The Forgotten Sea, cu cartonașul de îndemn spre aplicație.

### Speciile

- Sunt 36, câte 12 pe zonă.
- Se aleg automat din fișele jocului (`Assets/Resources/Fish/*.asset`), după:
  - adâncimea (`depthMin`/`depthMax`), care trebuie să cadă în zonă;
  - raritatea (`rarity`), cu acoperire de la comun la legendar: 5 comune, 4 neobișnuite, 2 rare, 1 legendar pe zonă, cât permit datele;
  - existența unei ilustrații.
- Câmpuri preluate: `fishName`, `rarity`, `baseValue`, `weightMin`/`weightMax`, `depthMin`/`depthMax`, `swimSpeed`, `tint`.

### Economia

- Valoarea de vânzare = `baseValue` scalat pentru ritmul web × greutatea relativă.
- Ritmul-țintă, de verificat prin simulare în teste:
  - prima zonă completată în ~20 min;
  - deblocarea Twilight Trench în ~10 min;
  - deblocarea The Abyss în ~30 min;
  - colecția completă în 1–2 h.

### Cele 8 upgrade-uri

Fiecare are 10 niveluri. Costul e `bază × 1,6^nivel`.

| Upgrade | Efect |
|---|---|
| Line length | Adâncimea maximă. Pragurile 320 m și 1.300 m deblochează zonele; maximum 2.500 m |
| Sink speed | Viteza de coborâre |
| Hold size | Locuri în cală, de la 3 la 12 |
| Hook reach | Raza de prindere |
| Reel speed | Viteza de urcare |
| Lucky lure | Crește ponderea peștilor rari la apariție |
| Crew nets | Monede pe minut în modul idle (de la 0 la nivelul 0) |
| Vessel | Doar aspect: colac, barcă mică, barcă (după arta din joc) |

### Colecția

- 36 de cartonașe. Cele neprinse apar ca siluete cu „???”, cele prinse au numele și cea mai grea captură.
- La final e un rând blocat: „**+245 more species in the full game**”, cu link spre fila de îndemn.

## 5. Câștiguri idle și salvare

### Câștigurile idle

- `câștig = rataCrew(nivel) × min(timp absent, 8 h)`, adică monede plus un număr de pești prinși de echipaj.
- Echipajul prinde **doar specii deja descoperite**. Speciile noi se descoperă doar aruncând tu undița.
- La revenire, dacă lipsa a fost de peste 1 minut și câștigul e peste 0, apare cartonașul „*Your crew caught N fish worth X coins while you were away*” cu butonul **Collect**.
- Timpul se măsoară cu ceasul browserului. Un ceas dat înapoi (diferență negativă) dă 0.

### Salvarea

- Totul stă în `localStorage`, sub cheia `paquett.idle.v1`. Conținutul:
  - `version`;
  - monedele;
  - nivelurile upgrade-urilor;
  - colecția (specie → cea mai grea captură);
  - `lastSeen`;
  - statistici simple.
- Se salvează după fiecare aruncare, după fiecare cumpărare și la `visibilitychange` sau `pagehide`.
- Dacă stocarea e blocată sau aruncă excepție, jocul merge doar în memorie, fără erori.
- Dacă salvarea e coruptă sau are o versiune necunoscută, jocul pornește de la zero. Salvarea veche se păstrează sub `paquett.idle.v1.bak`.
- **Reset progress** se face din setări, cu confirmare în pagină, nu cu `confirm()`.

## 6. Îndemnul spre aplicație

- **Fila sau cardul „Get the full game”** conține:
  - o frază: „*The deep goes on — 245+ more species, sharks that bite back, a boat worth building.*”;
  - insignele App Store și Google Play (linkurile din `site.json`);
  - un link spre pagina Abyss Angler de pe site.
- **Cartonașe ocazionale**, de cel mult o dată pe sesiune fiecare, care nu opresc jocul și se închid cu ×:
  - la prima atingere a adâncimii de 2.500 m (The Forgotten Sea);
  - la completarea colecției de 36 de specii.

## 7. Sunet și accesibilitate

### Sunetul

- Folosește `assets/js/sfx.js` de pe site, cu aceeași preferință, oprit implicit.
- Sunete noi sintetizate: `cast`, `catch`, `newSpecies`, `coins`. Fără fișiere audio.

### Accesibilitatea

- Tastatură completă: Space pentru Cast, ←/→ pentru ghidare, Tab prin panouri.
- Panourile sunt HTML real, nu desenate pe canvas, deci au focus vizibil și ARIA.
- Canvas-ul are o descriere (`aria-label`) și o zonă `aria-live` care anunță capturile și speciile noi.
- Cu `prefers-reduced-motion`: fără particule, fără valuri animate, iar cârligul se mișcă fără inerție.
- Pe `/play/` efectele de fundal ale site-ului (aurora și cometa) **nu pornesc**.

## 8. Arhitectură

```
src/pages/en/play.html            # pagina /play/ (layout "play"): container, panouri, texte
assets/js/play/
  data.js                         # încarcă assets/data/fish.json
  state.js                        # PUR: economie, upgrade-uri, salvare, idle
  sim.js                          # PUR: o aruncare, cârlig, apariția peștilor, prindere, rechini
  render.js                       # canvas: mare, pești, fir, vas, particule
  input.js                        # deget / mouse / tastatură → ținta cârligului
  ui.js                           # panouri DOM, cartonașe, colecție, îndemn
  main.js                         # legături, bucla rAF (pauză când tab-ul e ascuns)
assets/css/play.css
assets/data/fish.json             # generat, versionat în git
assets/img/play/                  # 36 de pești + cârlig, colac, bărci (WebP)
scripts/extract-fish.mjs          # --src <proiect joc>: citește .asset Unity, alege 36 de specii
scripts/icon-studio.mjs           # extins: exportă arta peștilor în WebP
```

- `state.js` și `sim.js` nu ating DOM-ul sau canvas-ul. Primesc timpul și intrările ca parametri, deci sunt testabile în Node.
- `sim.js` folosește un generator aleator cu seed, injectat, pentru teste deterministe.
- `main.js` de pe site nu pornește `startFx` pe pagini cu layout `play`.
- **Modificări pe site:**
  - linkul „Play” în meniu;
  - pagina Abyss Angler: „Play the idle edition” în loc de „coming soon”;
  - Privacy Policy, secțiunea 2: progresul jocului web se salvează doar local, în browser;
  - verificatorul și sitemap-ul includ `/play/`.

## 9. Testare

### Automat (`node --test`)

- **state:**
  - costurile upgrade-urilor;
  - pragurile care deblochează zonele;
  - plafonul `Hold size`;
  - idle-ul plafonat la 8 h;
  - ceasul dat înapoi dă 0;
  - echipajul nu descoperă specii noi;
  - salvare și încărcare cu stocare blocată, salvare coruptă, versiune necunoscută, iar resetarea păstrează `.bak`.
- **sim:**
  - coborârea se oprește la Line length;
  - urcarea pornește când cala e plină;
  - prinderea respectă raza și locurile libere;
  - rechinii nu scad niciodată captura;
  - cârligul nu iese din lățimea zonei;
  - un test de ritm pe economie: o simulare de 30 de minute de joc „mediu” deblochează The Abyss.
- **extract-fish:** parsează un `.asset` de test; alege 12 specii pe zonă cu acoperire de raritate; exclude speciile fără ilustrație.
- **build și verificator:**
  - `/play/` există;
  - nu încarcă resurse externe;
  - insignele duc la linkurile oficiale;
  - pagina are mai puțin de 2 MB în total.

### Manual (browser)

- 320, 390, 768 și 1440 px, fără scroll orizontal pe pagină.
- Ghidare cu degetul (emulare touch), cu mouse-ul și cu tastatura.
- Cartonașele „Welcome back” și „New species”.
- `?reduced-motion`.
- Consola fără erori.

## 10. Riscuri

- **Arta din joc** e ilustrată pentru Unity. Unele ilustrații pot avea alt raport sau fundal, iar exportul le normalizează (decupare, ~256 px).
- **Echilibrul economiei** se ajustează după prima rundă de joc. Constantele stau într-un singur loc, în `state.js`.
- **iOS Safari** poate șterge `localStorage` după 7 zile fără vizite (ITP). E acceptabil pentru un joc idle de browser și se menționează în setări.
