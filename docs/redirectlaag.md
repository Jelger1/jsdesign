# Draaiboek: de redirectlaag voor jelgers3d.nl en jelgersieler.nl

Na de verhuizing naar jelgersdesign.nl moeten de oude adressen blijven werken: links in Google, op social media en in oude
mails. Dat doen twee kleine sites op **Cloudflare Pages** (besluit van Jelger, oktober 2026), elk met een eigen project.
Het ontwerp staat in het merge-plan, §6.5 en §6.6.

| Onderdeel | Waar |
|---|---|
| De kaart (pagina's, wat verplaatst is, bestanden die blijven, oude ankers) | `data/legacy.json` |
| De twee sites | `legacy/jelgers3d/` en `legacy/jelgersieler/` |
| `_redirects` en `_headers` maken | `node tools/legacy.js` (niet met de hand aanpassen) |
| Controleren of ze kloppen | `npm run check` (doet ook `tools/legacy.js --controle`) |
| De oude ankers op de nieuwe home | `src/js/anker.js`, kaart in de home (`#anker-kaart`) |
| De redirects zelf testen | `node tools/test-redirects.mjs` |

## Wat de sites doen

**Blijft staan, met 200** (byte-kopieën van de productie, md5 gecontroleerd op 26 oktober 2026):
- de plaatjes uit oude mails (`assets/mail/*`, 18 bestanden op jelgers3d.nl, het logo op jelgersieler.nl);
- de lettertypen met een open licentie (OFL) die oude mails laden. **Geen Stevie Sans**: die valt in oude mails terug op
  Saira of Arial;
- `robots.txt` en de oude `sitemap.xml`, zodat Google de redirects snel vindt.

Plaatjes en lettertypen krijgen `Access-Control-Allow-Origin: *` (`_headers`).

**Gaat met een 301 naar jelgersdesign.nl:**
- elke oude pagina naar hetzelfde pad (`/webshop.html` → `https://jelgersdesign.nl/webshop.html`);
- zonder `.html` direct naar de pagina mét `.html`, zonder tussenstap;
- `/index.html` en `/404.html` naar de home, `/producten/kami-lamp.html` naar `/lampen.html` (besluit 32);
- al het overige padbehoudend (catch-all), nooit naar de home. Een query blijft staan; een `#anker` neemt de browser
  zelf mee. Zo blijven ook de links uit oude mails werken (nieuwsbrief bevestigen, "Ik heb gereageerd").

**Oude ankers** (bijvoorbeeld `jelgers3d.nl/#miners` of `jelgersieler.nl/#projecten`) komen zo op de nieuwe home uit.
Bestaat het anker daar niet, dan stuurt `src/js/anker.js` door naar waar die sectie nu staat (`data/legacy.json` >
`ankers`). `check.js` controleert dat elk doel bestaat en dat geen alias een id op de home is.

## Twee dingen die anders zijn dan in het merge-plan

1. **Cloudflare voert een redirect altijd uit, ook als het bestand bestaat.** Het plan ging uit van het gedrag van
   Netlify ("zonder force"). Daarom staan in `_redirects` eerst de bestanden die blijven, als proxy naar zichzelf
   (`/assets/mail/* /assets/mail/:splat 200`), en pas daarna de catch-all. Een lettertype dat er niet is (zoals Stevie
   Sans) geeft zo gewoon een 404.
2. **Een 410 (of 404) kan Cloudflare Pages in `_redirects` niet geven.** Wat echt weg is (`/betaling-status.html`, en op
   jelgersieler.nl de bronbestanden zoals `STYLEGUIDE.*`, `server/*` en `*.otf`), gaat met de catch-all door en eindigt
   als 404 op jelgersdesign.nl. Voor Google is dat hetzelfde als weg. Geen van die bestanden staat in `legacy/`, dus er wordt
   niets van geserveerd.

## Eenmalig: de twee projecten aanmaken (Jelger, in het dashboard van Cloudflare)

Per site een Pages-project, gekoppeld aan de repo `Jelger1/jsdesign`:

| Instelling | jelgers3d | jelgersieler |
|---|---|---|
| Projectnaam | `jelgers3d-redirect` | `jelgersieler-redirect` |
| Productiebranch | `main` | `main` |
| Build-commando | (leeg) | (leeg) |
| Uitvoermap | `legacy/jelgers3d` | `legacy/jelgersieler` |
| Build watch paths (alleen deployen bij wijzigingen) | `legacy/jelgers3d/*` | `legacy/jelgersieler/*` |

Daarna eerst testen op het platformsubdomein (zie hieronder). Pas als dat groen is, de eigen domeinen koppelen (met en
zonder `www`) en de DNS van jelgers3d.nl en jelgersieler.nl naar Cloudflare laten wijzen. Dat hoort bij de
cutover-stappen in het merge-plan (§10.3).

## Testen

Op het platformsubdomein, vóór de DNS-wissel (de eindstatus op de preview controleren, want jelgersdesign.nl draait dan nog
niet):

```bash
node tools/test-redirects.mjs --jelgers3d https://jelgers3d-redirect.pages.dev --jelgersieler https://jelgersieler-redirect.pages.dev --doel https://jelger1.github.io/jsdesign
```

Direct na de DNS-wissel nog een keer op de echte domeinen, ook over http en met www:

```bash
node tools/test-redirects.mjs --echt
```

De test controleert per oud adres een 301 met de juiste `Location` (en met `--doel` dat het doel 200 geeft), en per
bestand dat blijft een 200 met dezelfde bytes als in `legacy/` en, bij plaatjes en lettertypen, de CORS-header.

## Iets veranderen

1. Pas `data/legacy.json` aan (een pagina erbij, een verplaatsing, een anker).
2. `node tools/legacy.js` schrijft `_redirects` en `_headers` opnieuw.
3. `npm run build` en `npm run check` (ankers en legacy-bestanden), daarna committen. Cloudflare deployt alleen de site
   waarvan iets in `legacy/` veranderde.
