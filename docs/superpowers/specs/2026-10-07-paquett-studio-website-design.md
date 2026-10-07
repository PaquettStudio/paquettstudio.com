# Site Paquett Studio Ltd — specificație de design

- **Data:** 2026-10-07
- **Domeniu:** paquettstudio.com (înregistrat la Squarespace, email Google Workspace activ)
- **Status:** aprobat în conversație pe secțiuni; în așteptarea revizuirii acestui document

## 1. Scop și criterii de succes

### De ce există site-ul

1. **Apple — migrarea contului de developer din „Individual” în „Organization”.** Apple cere „a publicly available organization website where the domain is officially associated with your business”. După migrare, pe App Store apare „Paquett Studio Ltd” în loc de numele persoanei.
2. **Protecția proprietății intelectuale.** Pe 2026-10-07, un cont de pe Google Play a publicat o clonă a Abyss Angler: același nume, aceeași descriere, același tip de joc și grafică asemănătoare. Clona a fost raportată deja la Google. Site-ul trebuie să stabilească public, cu dată verificabilă:
   - cine deține jocul;
   - care sunt singurele versiuni oficiale;
   - termeni clari de utilizare;
   - o cale de raportare a copiilor.
3. **Portofoliul studioului.** Site-ul prezintă jocurile lansate, ce urmează și linkurile de descărcare.

### Criterii de succes

- `https://paquettstudio.com` e online, pe HTTPS, și afișează datele legale ale firmei, conform UK Companies Act / Trading Disclosures.
- Apple acceptă site-ul pentru migrare.
- Există URL-uri stabile pentru Privacy Policy și Terms, care pot fi trecute în App Store Connect și în Google Play Console.
- Site-ul arată și funcționează impecabil pe telefon (360–430 px) și pe desktop, iar efectele răspund la mouse, atingere și scroll.
- Costul lunar este 0 €. Singurul cost este reînnoirea anuală a domeniului.

### În afara scopului (sub-proiect separat, ulterior)

- **Abyss Angler jucabil în browser** (build Unity WebGL, eventual conectat la serverul jocului). Pe site rezervăm doar locul: „Play in browser — coming soon”.
- Blog sau știri, newsletter, formular de contact, press kit, analytics.

## 2. Decizii tehnice

| Decizie | Alegere | Motiv |
|---|---|---|
| Tip de site | Static: HTML, CSS și JavaScript (ES modules), fără framework | Control total asupra efectelor, încărcare rapidă, nimic de întreținut |
| Generare | Script Node `build.mjs` fără dependențe, care asamblează paginile din layout și conținut | Fără duplicare de antet și subsol între 14 pagini; nu e nimic de instalat |
| Găzduire | GitHub Pages pe contul GitHub existent, publicat prin GitHub Actions doar din `site/` | Gratuit; adresa fără „www” merge cu DNS-ul de la Squarespace; istoricul git servește drept dovadă datată |
| Repository | Public (cerință a GitHub Pages pe planul gratuit), cu `LICENSE`: „Copyright Paquett Studio Ltd. All rights reserved.” | Codul e vizibil, dar nu are licență de reutilizare |
| DNS | Rămâne la Squarespace. Se adaugă 4 × `A` (185.199.108–111.153), `CNAME www` → `<cont>.github.io` și `TXT` pentru verificarea domeniului pe GitHub | Înregistrările MX (Google) nu se ating |
| Fonturi | Găzduite local (Syne, Inter), în format WOFF2 | Fără transfer de IP către Google; nu e nevoie de banner de cookies |
| Cookies | Niciunul. `localStorage` reține doar limba și preferința de sunet, alese de utilizator | Ambele sunt „strictly necessary” conform PECR, deci nu e nevoie de banner |
| Analytics | Niciunul | Confidențialitate maximă, politică simplă |

## 3. Limbi

- **Engleza** e limba principală, la rădăcina site-ului (`/`). **Româna** e sub `/ro/`. Fiecare pagină are pereche în cealaltă limbă.
- Comutatorul „EN | RO” din dreapta sus duce la pagina-pereche și salvează alegerea în `localStorage`.
- La prima vizită pe `/`, dacă nu există o preferință salvată și limba browserului e `ro*`, se face redirect către `/ro/`.
- Paginile au taguri `hreflang` și `<html lang>` corect.
- Textele juridice sunt **autoritative în engleză**. Versiunea română are un banner: „Traducere informativă; versiunea în engleză prevalează.”
- Structura trebuie să permită adăugarea altor limbi fără rescriere: un folder de conținut nou și o intrare în lista de limbi.

## 4. Pagini și URL-uri

| Pagina | EN | RO |
|---|---|---|
| Home | `/` | `/ro/` |
| Abyss Angler | `/games/abyss-angler/` | `/ro/games/abyss-angler/` |
| Terms of Use | `/legal/terms/` | `/ro/legal/terms/` |
| Privacy Policy | `/legal/privacy/` | `/ro/legal/privacy/` |
| Copyright & IP | `/legal/copyright/` | `/ro/legal/copyright/` |
| Report a copy | `/report/` | `/ro/report/` |
| 404 | `/404.html` (bilingv) | — |

Pe lângă pagini, site-ul mai include: `sitemap.xml`, `robots.txt`, favicon și iconițe Apple, o imagine Open Graph pentru previzualizarea pe rețelele sociale și `CNAME`.

### Home, de sus în jos

1. **Hero** (100svh):
   - kicker: „Independent Game Studio”;
   - titlul PAQUETT STUDIO, cu glitch subtil și rar;
   - sloganul;
   - butoanele „Explore our games” și „Get Abyss Angler”.
2. **Jocul principal: Abyss Angler.** Card cu înclinare 3D, imaginea reprezentativă, pitch-ul, butoanele App Store și Google Play și sigiliul „Official”.
3. **Coming next.** Card misterios, cu silueta blurată „??? — in development”, care face glitch la hover sau la atingere.
4. **Studio.** 2–3 fraze despre studio.
5. **Contact.** Emailul afișat mare; rețelele sociale, dacă există.
6. **Subsol** (vezi §7).

### Pagina Abyss Angler

- Hero cu imaginea reprezentativă și titlul **Abyss Angler™**.
- Descrierea, preluată din listările publicate.
- Galerie de capturi de ecran, care pe telefon se derulează lateral cu degetul (scroll-snap).
- Butoanele de magazin și datele de lansare pentru iOS și Android.
- **Caseta „Official releases”.** Textul: „Abyss Angler is developed and published exclusively by Paquett Studio Ltd. The only official versions are listed here. Any other listing is unauthorised — please report it.” Caseta trimite la `/report/`.
- „Play in browser — coming soon”.

## 5. Identitate vizuală: „Prism Ember” (varianta E aprobată)

- **Fundal:** aproape negru (`#040308`), cu trei benzi de auroră care se mișcă lent (roz `#ff3fa4`, violet `#7b5cff`, cyan `#22c8ff`), stele care sclipesc și o grilă în perspectivă care se pierde în ceață. Grila apare doar în zona hero.
- **Tipografie:** **Syne** 800 pentru titluri (titlu alb care trece în lavandă) și **Inter** pentru text. Accentul cald, auriu (`#ffcf7a`), e folosit pentru kickere.
- **Butonul principal:** gradient roz → violet → cyan, cu strălucire. Butoanele secundare au contur subțire și efect de sticlă (glass).
- **Logo:** dacă studioul nu are unul, folosim un logo simplu din text, un romb cu „PAQUETT”, ca în machetă.
- **Contrast:** textul respectă WCAG AA peste fundal. Textul lung stă pe panouri semi-opace.

## 6. Efecte și interacțiune

| Intrare | Desktop | Telefon |
|---|---|---|
| Mișcare | Cometa de scântei urmărește cursorul; culoarea trece prin auriu, roz și cyan | Cometa urmărește degetul cât timp acesta atinge ecranul |
| Click / atingere | Undă prismatică (RGB decalat) și explozie de scântei | La fel |
| Scroll | Stelele se întind ca la „warp”, iar aurora curge proporțional cu viteza scroll-ului | La fel; în plus, dâra de scântei urmează degetul |
| Fără interacțiune | O scânteie autonomă plutește prin hero | La fel |
| Hover / atingere pe card | Înclinare 3D după poziția mouse-ului sau a degetului | La fel |
| Intrarea unei secțiuni în ecran | Apare treptat, cu o lumină care trece peste ea | La fel |

- Cursorul sistemului rămâne vizibil; cometa e desenată în spatele lui.
- **Sunetul** e sintetizat în browser cu WebAudio, fără fișiere audio. E **oprit implicit**, are buton 🔊 în bara de navigare și preferința se salvează. Se aude la click sau atingere, la hover pe butoane (un tick discret) și la schimbarea limbii.

### Arhitectura efectelor

O singură buclă `requestAnimationFrame`, cu două canvas-uri fixe pe tot ecranul:

- `bg`: în spatele conținutului (aurora, stelele, grila);
- `fx`: peste conținut, cu `pointer-events: none` (cometa, scânteile, undele).

Modulele, fiecare cu o singură responsabilitate:

- `js/fx/input.js`: normalizează mouse-ul, touch-ul și scroll-ul într-o stare comună (poziție, apăsare, viteza scroll-ului, „inactiv”).
- `js/fx/background.js`: aurora, stelele, grila și efectul de warp.
- `js/fx/particles.js`: cometa, scânteile și undele prismatice.
- `js/fx/engine.js`: canvas-urile, DPR-ul, bucla, bugetul de performanță și pauza.
- `js/sfx.js`, `js/i18n.js`, `js/ui.js` (meniul, apariția secțiunilor, înclinarea 3D, galeria).

### Performanță și accesibilitate

- DPR maxim 2 pe desktop și 1,5 pe telefon. Numărul de particule depinde de suprafața ecranului.
- Dacă media FPS scade sub 45 timp de 2 secunde, numărul de particule scade automat.
- Animația se oprește când tab-ul e ascuns (`visibilitychange`).
- `prefers-reduced-motion`: aurora devine statică, fără particule, glitch sau warp.
- Fără JavaScript, tot conținutul și toate linkurile funcționează; dispar doar efectele.
- Navigarea se face complet de la tastatură, cu focus vizibil, ARIA corect pe meniu și pe comutatorul de limbă, și text `alt` pe imagini.
- **Ținte:**
  - Lighthouse pe mobil: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
  - Pagina Home sub 1,5 MB la prima încărcare, cu imagini în WebP sau AVIF.

### Pe telefon

- Meniul ☰ se deschide pe tot ecranul, cu aurora pe fundal. Comutatorul de limbă rămâne vizibil în bara de sus.
- Folosim `100svh` și `env(safe-area-inset-*)` (pentru iPhone cu notch și bara Safari).
- Zonele atingibile au minimum 44 × 44 px.
- Nimic nu depinde de hover.
- Nu există scroll lateral la nicio lățime între 320 și 1920 px.

## 7. Conținut juridic și identitatea firmei

### Subsolul de pe fiecare pagină

`© 2026 Paquett Studio Ltd · Registered in <jurisdicție> · Company No. <număr> · Registered office: <adresă>`, urmat de linkurile Terms, Privacy, Copyright & IP și Report a copy.

### Date structurate (JSON-LD)

- `Organization`, cu `legalName`, `url`, `logo`, `email` și `address`;
- `VideoGame` pentru Abyss Angler, cu `author` și `publisher` = Paquett Studio Ltd.

Ajută motoarele de căutare să asocieze oficial jocul cu firma.

### Terms of Use (EN autoritativ, UK)

- Cine suntem.
- Folosirea site-ului.
- **Licența jocurilor:** limitată, neexclusivă, revocabilă, pentru uz personal și necomercial. Se aplică în plus și termenii Apple și Google.
- Toată proprietatea intelectuală aparține Paquett Studio Ltd.
- **Interdicții:**
  - copierea, clonarea și republicarea;
  - decompilarea și reverse engineering-ul;
  - folosirea numelui, a logo-ului și a materialelor de prezentare;
  - distribuirea de versiuni modificate.
- **Limitarea răspunderii,** în limitele legii din UK (nu se exclude răspunderea pentru deces sau vătămare cauzată din neglijență și nici pentru fraudă).
- Legea aplicabilă este cea din Anglia și Țara Galilor.
- Cum se modifică termenii și datele de contact.

### Privacy Policy (UK GDPR și DPA 2018)

- Operatorul este Paquett Studio Ltd, cu adresa sediului.
- **Site-ul:** nu folosește cookies, nu are analytics și nu colectează date. Singura excepție sunt emailurile primite de la vizitatori.
- **Jocul:** datele colectate se stabilesc din SDK-urile reale ale proiectului, adică reclame, statistici, cumpărături în aplicație, conturi și server, după verificare (vezi §9).
- Temeiurile legale, perioada de păstrare, terții, transferurile internaționale, drepturile persoanelor vizate, dreptul de a face plângere la ICO și protecția copiilor.

### Copyright & IP

- Codul, grafica, sunetul, textele, numele și logo-ul Abyss Angler aparțin Paquett Studio Ltd.
- Folosim simbolul **™** pentru numele jocului și al studioului; **nu folosim ®** cât timp marca nu e înregistrată.
- Lista canalelor oficiale.
- Cum acționăm împotriva copiilor: notificări către Google Play, Apple și furnizorii de găzduire.
- Politica pentru creatorii de conținut. Implicit: gameplay-ul se poate transmite live sau publica în videoclipuri, inclusiv monetizate, cu mențiunea jocului. **De confirmat.**

### Report a copy

- Ce trebuie inclus într-un raport: linkul, capturile de ecran și numele dezvoltatorului.
- Adresa de email pentru raportări.
- Ce se întâmplă după raport.

### Declarații obligatorii

- Toate textele juridice au mențiunea: „Last updated: <dată>”.
- Se recomandă ca un jurist din UK să le revizuiască înainte de folosirea lor într-o dispută.

## 8. Structura proiectului

```
/
├─ src/
│  ├─ layout.html              # <head>, navigare, subsol, canvas-uri
│  ├─ strings/en.json, ro.json # textele de interfață (meniu, subsol, butoane)
│  └─ pages/en/…, pages/ro/…   # conținutul fiecărei pagini (fragmente HTML + front-matter)
├─ assets/css, assets/js, assets/fonts, assets/img
├─ build.mjs                   # src + assets → site/
├─ tests/check-site.mjs        # verificări automate (vezi §10)
├─ site/                       # generat, ignorat de git
├─ .github/workflows/pages.yml # build + check + deploy pe GitHub Pages
├─ docs/superpowers/specs/     # documentația noastră (vizibilă în repository, dar nu apare pe site)
└─ LICENSE
```

## 9. Date de intrare necesare de la studio

1. Numărul de înregistrare al firmei, adresa sediului social și jurisdicția (pot fi luate de pe Companies House).
2. Adresele de email afișate (propunere: `hello@` pentru contact și `legal@` pentru raportări).
3. Pentru Abyss Angler:
   - linkurile din App Store și Google Play;
   - datele de lansare;
   - descrierea publicată;
   - 3–6 capturi de ecran;
   - iconița;
   - imaginea reprezentativă.
4. Ce date colectează jocul. Metoda propusă: citim, fără să modificăm nimic, `Packages/manifest.json` și pluginurile din `E:\Games\Abyss`, după ce ne dați acordul.
5. Logo-ul, dacă există.
6. Opțional:
   - rețelele sociale;
   - un indiciu despre următorul joc;
   - date despre studio (anul înființării, echipa).

Până primim aceste date, construcția folosește valori marcate clar `[[DE COMPLETAT]]`. Testul din §10 **refuză publicarea** cât timp mai există vreun marcaj de acest fel.

## 10. Testare și verificare

### Automat (`node tests/check-site.mjs`, rulat local și în CI înainte de deploy)

- Toate paginile din tabelul din §4 există în ambele limbi.
- Toate linkurile interne duc la pagini existente.
- Fiecare pagină are `<title>`, `meta description`, `hreflang`, `lang` și subsolul cu numele firmei, Company No. și adresa.
- Nu mai există niciun `[[DE COMPLETAT]]` în `site/`.
- Nu se încarcă nicio resursă de pe domenii externe, în afară de linkurile spre magazine.

### Vizual (panoul de browser)

- Fiecare pagină e verificată la 360, 390, 768 și 1440 px.
- Consola nu are erori.
- Fără scroll lateral.
- Efectele reacționează la mouse, la atingere (cu emulare de telefon) și la scroll.
- Modul `prefers-reduced-motion` e verificat.

### După lansare

- HTTPS funcționează, iar `www` redirecționează către adresa fără „www”.
- Linkurile din App Store Connect și Google Play Console (Privacy Policy, Marketing/Website) sunt actualizate.
- Se trimite linkul către Apple.

## 11. Pași de lansare (cu acordul explicit al proprietarului la fiecare pas)

1. Se creează un repository public pe contul GitHub existent. Proprietarul se autentifică singur în browser.
2. Primul push, apoi Settings → Pages → Source: GitHub Actions.
3. Pe GitHub se verifică domeniul, apoi se adaugă înregistrarea `TXT` în Squarespace.
4. În Squarespace → DNS se adaugă cele 4 înregistrări `A` și înregistrarea `CNAME www`; MX-urile nu se modifică.
5. Pe GitHub se setează domeniul personalizat `paquettstudio.com` și se activează „Enforce HTTPS”.
6. Verificările de după lansare din §10.

## 12. Riscuri

- **Textele juridice nu sunt consultanță juridică.** Recomandăm revizuirea lor de către un jurist din UK.
- **Repository-ul este public.** Codul site-ului se vede, dar licența „All rights reserved” interzice reutilizarea lui. Documentele din `docs/` sunt vizibile în repository, deci nu conțin date sensibile.
- **Propagarea DNS** poate dura până la 24 de ore, de obicei sub o oră.
- **Jocul din browser (WebGL), mai târziu.** GitHub Pages nu permite headere personalizate, așa că build-ul Unity va folosi „Decompression Fallback”, sau mutăm găzduirea pe Cloudflare Pages. Decizia se ia în sub-proiectul respectiv.
