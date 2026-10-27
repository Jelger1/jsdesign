# JS Design · jelgersdesign.nl

Site en webshop van JS Design (voorheen JelgerS3D), de ontwerpstudio van Jelger Sieler in Kerkrade: branding, websites & interactieve verhalen, en 3D-printen.

Statische site, gegenereerd door `build.js` uit `data/*.json` en `src/`: pure HTML, CSS en JavaScript-modules, met three.js lazy voor 3D. Formulieren, bestellingen en de nieuwsbrief lopen via de Supabase-functie `formulier` (`supabase/`).

```bash
npm ci                   # afhankelijkheden
npm run build            # bouwt dist/
npm run dev              # lokale server met automatisch herbouwen
npm run check            # links, SEO, structured data en indexering controleren
npm test                 # tests van de formulierfunctie
npm run contract         # levert dist/ nog alles wat de oude webshop leverde?
npm run catalogus-diff   # catalogus van jelgers3d.nl tegen die van dist/ (poort van cutover-stap 4)
```

Beheer en werkwijze: zie `docs/`. De Supabase-functie deploy je alleen volgens `docs/deploy-functie.md`.

## Controles en het contract met de oude webshop

- **`npm run check`** volgt `SITE_MODE` en `BASE_PATH` van de build. In de preview is elke pagina noindex. In productie mag noindex alleen op afrekenen, bedankt, gereageerd en 404 (en tot fase 3 op de tussenpagina's, de contactpagina en het portfolio), staan de 28 pagina's die de oude webshop liet indexeren in de sitemap en linkt niets in `dist/` nog naar jelgers3d.nl of jelgersieler.nl.
- **`npm run contract`** toetst `dist/` aan `tests/contract/referentie.json`, eenmalig gemaakt uit de build van de live webshop: de 32 pagina's, de mail- en lettertypebestanden, de beeldnamen, `winkel.json` (sleutels, producten, varianten en verkoopwijze), de basis- en introductieprijzen in `data/products.json` en de `g:id`'s van de feed. Het draait in CI en vóór elke publicatie.
- **`npm run catalogus-diff`** vergelijkt de catalogus die de Supabase-functie nu leest (https://jelgers3d.nl/js/winkel.json, alleen lezen) met `dist/js/winkel.json`; vanaf cutover-stap 2 ook met de live nieuwe site: `npm run catalogus-diff -- https://jelgers3d.nl/js/winkel.json https://jelgersdesign.nl/js/winkel.json`. Draai het vlak vóór stap 4: alleen bij exitcode 0 mag `SITE_URL` naar jelgersdesign.nl. Niet in CI, want de live webshop kan tot de content-freeze nog wijzigen.

**Bewuste afwijking van de oude webshop** (een nieuw product, een andere prijs, een nieuwe sleutel in `winkel.json` zoals `winkel.logo`): `contract` houdt dan elke publicatie tegen, ook de nachtelijke build voor introductieprijzen en deadlines. Zet in dezelfde commit het onderwerp uit de foutmelding met de reden in `AFWIJKINGEN` bovenaan `tools/contract.mjs`; daar staan voorbeelden. Vóór de cutover geldt de content-freeze, dan hoort er niets bij te komen. De referentie zelf pas je niet aan: die maak je alleen opnieuw bij een her-sync met de oude webshop (`tools/contract-referentie.mjs`), en het verschil kijk je dan apart na.

## Sitemap

De build maakt de sitemap zelf. Een nieuwe pagina, case of product staat er bij de volgende build vanzelf in.

- **`sitemap.xml`** is een index met drie delen:
  - `sitemap-paginas.xml`: studio, diensten en praktische pagina's;
  - `sitemap-portfolio.xml`: het overzicht en de cases;
  - `sitemap-webshop.xml`: de webshop, de categorieën en de producten.

  Welk deel een pagina krijgt, volgt uit haar paginatype (`src/templates/sitemap.js`). Pagina's met noindex staan er niet in. Cases en producten noemen ook al hun foto's, voor Google Afbeeldingen.
- **`lastmod`** is de dag waarop de title, de description of de inhoud van een pagina echt veranderde. De build bewaart per pagina een vingerafdruk in `.sitemap-stand.json` (niet in git). Op GitHub bewaart de deploy-workflow dat bestand van publicatie tot publicatie met `actions/cache`. Ontbreekt het bestand, dan krijgt elke pagina eenmalig de datum van die build.
- **`sitemap.html`** is dezelfde lijst voor bezoekers, gelinkt in de footer.
- `robots.txt` noemt in productie `https://jelgersdesign.nl/sitemap.xml`. In Google Search Console dien je alleen die index in.

## Ontwerp

- **Het teken in één pijlerkleur** is een goedgekeurde variant op de huisstijlregel "het teken niet herkleuren": in de header van een pagina die bij een pijler hoort (`body data-pillar`) staan alle drie de delen in die pijlerkleur; elders, zoals in de footer, houdt het teken zijn drie kleuren.
