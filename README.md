# JS Design · jsdesign.nl

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

Beheer en werkwijze: zie `docs/`.

## Controles en het contract met de oude webshop

- **`npm run check`** volgt `SITE_MODE` en `BASE_PATH` van de build. In de preview is elke pagina noindex. In productie mag noindex alleen op afrekenen, bedankt, gereageerd en 404 (en tot fase 3 op de pijler- en tussenpagina's), staan de 28 pagina's die de oude webshop liet indexeren in de sitemap en linkt niets in `dist/` nog naar jelgers3d.nl of jelgersieler.nl. Zolang de home de oude homepage is, slaagt de productiecheck alleen in de pull-request-controle (`OUDE_HOME_UITZONDERING=1` in `ci.yml`).
- **`npm run contract`** toetst `dist/` aan `tests/contract/referentie.json`, eenmalig gemaakt uit de build van de live webshop: de 32 pagina's, de mail- en lettertypebestanden, de beeldnamen, `winkel.json` (sleutels, producten, varianten en verkoopwijze), de basis- en introductieprijzen in `data/products.json` en de `g:id`'s van de feed. Het draait in CI en vóór elke publicatie.
- **`npm run catalogus-diff`** vergelijkt de catalogus die de Supabase-functie nu leest (https://jelgers3d.nl/js/winkel.json, alleen lezen) met `dist/js/winkel.json`; vanaf cutover-stap 2 ook met de live nieuwe site: `npm run catalogus-diff -- https://jelgers3d.nl/js/winkel.json https://jsdesign.nl/js/winkel.json`. Draai het vlak vóór stap 4: alleen bij exitcode 0 mag `SITE_URL` naar jsdesign.nl. Niet in CI, want de live webshop kan tot de content-freeze nog wijzigen.

**Bewuste afwijking van de oude webshop** (een nieuw product, een andere prijs, een nieuwe sleutel in `winkel.json` zoals `winkel.logo`): `contract` houdt dan elke publicatie tegen, ook de nachtelijke build voor introductieprijzen en deadlines. Zet in dezelfde commit het onderwerp uit de foutmelding met de reden in `AFWIJKINGEN` bovenaan `tools/contract.mjs`; daar staan voorbeelden. Vóór de cutover geldt de content-freeze, dan hoort er niets bij te komen. De referentie zelf pas je niet aan: die maak je alleen opnieuw bij een her-sync met de oude webshop (`tools/contract-referentie.mjs`), en het verschil kijk je dan apart na.
