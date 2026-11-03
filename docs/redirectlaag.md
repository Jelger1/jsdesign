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

## Zo is het ingericht (3 november 2026)

Cloudflare-account van Jelger (sielerjelger@gmail.com). Claude richtte het in met de `cf`-CLI (zones, DNS, projecten) en
Wrangler (de upload), beide ingelogd via de browser met Jelgers akkoord.

| | jelgers3d | jelgersieler |
|---|---|---|
| Pages-project | `jelgers3d-redirect` (`jelgers3d-redirect.pages.dev`) | `jelgersieler-redirect` (`jelgersieler-redirect.pages.dev`) |
| Inhoud | `legacy/jelgers3d` | `legacy/jelgersieler` |
| Zone (Free) | jelgers3d.nl | jelgersieler.nl |
| Naamservers | `blair.ns.cloudflare.com`, `glen.ns.cloudflare.com` | idem |

De projecten zijn **niet** aan GitHub gekoppeld (direct upload): verandert er iets in `legacy/`, dan opnieuw uploaden:

```bash
npx wrangler pages deploy legacy/jelgers3d --project-name jelgers3d-redirect --branch main
npx wrangler pages deploy legacy/jelgersieler --project-name jelgersieler-redirect --branch main
```

## De overstap is gedaan (3 november 2026)

- DNSSEC uit bij One.com (DS-records rond 17:30 weg bij .nl), naamservers om naar blair/glen.ns.cloudflare.com;
  zones actief om 18:22.
- Om 18:23 per domein: de A-records en `www` naar GitHub Pages weg, proxied CNAME's (`@` en `www`) naar het
  Pages-project, de eigen domeinen gekoppeld, Always Use HTTPS aan. Alle vier de domeinen actief om 18:29.
- `node tools/test-redirects.mjs --echt --doel https://jelgersdesign.nl`: 370 adressen goed (http, https, www).
- Resend: jelgers3d.nl blijft verified.
- Search Console: Jelger heeft dezelfde avond voor jelgers3d.nl en jelgersieler.nl de adreswijziging naar
  jelgersdesign.nl ingediend. De oude properties blijven staan.
- Nog te doen: over een maand bij de oude GitHub-repo's het eigen domein weghalen (Settings > Pages); optioneel
  DNSSEC aan via Cloudflare.

## Het plan van de overstap (stand 3 november 2026)

Het stappenplan voor Jelger staat als afvinkpagina in claude.ai ("Verhuizing oude domeinen"). De volgorde:
1. de twee Pages-projecten aanmaken en testen op `*.pages.dev` (gedaan, 3 november: 109 adressen goed);
2. DNSSEC uit bij One.com en een dag wachten tot de DS-records uit .nl weg zijn;
3. de domeinen aan Cloudflare toevoegen (Free) met de records hieronder (gedaan, 3 november), de naamservers bij One.com omzetten;
4. als de zone actief is: de oude A-records en `www` weg, de eigen domeinen (met en zonder `www`) aan het project koppelen,
   Always Use HTTPS aan;
5. `--echt` testen, daarna in Search Console per oud domein de adreswijziging naar jelgersdesign.nl.

Terug: de naamservers bij One.com weer op `ns01.one.com` en `ns02.one.com`. Daarom bij One.com niets weghalen.

Records die mee moeten, allemaal "DNS only" (grijze wolk):

| Domein | Type | Naam | Waarde | Waarvoor |
|---|---|---|---|---|
| jelgers3d.nl | TXT | `@` | `google-site-verification=gF1i7YIg4rivJZzbI-4GUqvEEsbiPNCHRtn7vSz8YCI` | Search Console |
| jelgers3d.nl | TXT | `resend._domainkey` | de DKIM-sleutel uit Resend (Domains > jelgers3d.nl) | mail |
| jelgers3d.nl | CNAME | `send` | `send.forge.rmta.net` | mail |
| jelgers3d.nl | CNAME | `rsend` | `rsend-euw1.forge.rmta.net` | mail |
| jelgers3d.nl | TXT | `_dmarc` | `v=DMARC1; p=none;` | mailbeleid |
| jelgers3d.nl | MX | `@` | `.` (prioriteit 0) | geen inkomende mail |
| jelgersieler.nl | TXT | `@` | `google-site-verification=PPVgDeE1Vzfh3lOb7SfqoLgO5h1BuFSSKT2O4v1C6GA` | Search Console |
| jelgersieler.nl | MX, TXT, TXT | `@`, `@`, `_dmarc` | `.` (0), `v=spf1 -all`, `v=DMARC1; p=reject;` | aanbevolen: dit domein mailt niet |

De vier A-records (185.199.108–111.153) en `www` → `jelger1.github.io` blijven staan tot de eigen domeinen aan het
Pages-project gekoppeld worden; dan maakt Cloudflare zelf de nieuwe.

## Testen

Op het platformsubdomein, vóór de DNS-wissel (met `--doel` controleert de test ook dat elk doel op jelgersdesign.nl een 200
geeft):

```bash
node tools/test-redirects.mjs --jelgers3d https://jelgers3d-redirect.pages.dev --jelgersieler https://jelgersieler-redirect.pages.dev --doel https://jelgersdesign.nl
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
