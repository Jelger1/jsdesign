# Jelly-bot

De AI-assistent rechtsonder op jelgersdesign.nl, op elke pagina behalve afrekenen. Voorheen stond hij op
jelgersieler.nl; sinds 3 november 2026 staat hij op deze site, met de kennis van deze site.

## Hoe het werkt

```
src/js/chat.js  →  Render: jellybot-backend (map server/ van deze repo)  →  OpenAI (gpt-4o-mini)
                         ↑ elk half uur: /ai/kennis.json en de sitemap van de site
```

- **De chat** (`src/js/chat.js`, `src/css/chat.css`) leest het adres van de server uit `data-chat` op `<html>`
  (`data/site.json` > `chat.url`). Het gesprek staat in de browsertab (sessionStorage, sleutel `jd-chat-v1`) en gaat
  mee als je doorklikt. De server wordt pas gewekt als iemand de knop aanwijst of opent.
- **De server** (`server/server.js`, regels in `server/logica.js`) zet een systeemprompt voor het gesprek: persona,
  gedragsregels, de pagina waar de bezoeker is en de hele kennisbank (`/ai/kennis.json`, gemaakt door
  `src/templates/discovery.js` uit dezelfde data als de pagina's). Verandert de site, dan weet de bot dat binnen een
  half uur, zonder nieuwe uitrol.
- **Links:** de server haalt elke link uit een antwoord die niet in de kennisbank of de sitemap staat. Een verzonnen
  of ingefluisterde link wordt dus nooit klikbaar.
- **Privacy:** de server slaat gesprekken niet op en logt ze niet. Zie de privacyverklaring, `#chat`.

## Rem op misbruik en kosten

- Alleen verzoeken vanaf jelgersdesign.nl (anders 403). Een vastberaden misbruiker kan dat namaken, de rest niet.
- Per IP-adres 12 vragen per minuut en 120 per dag; alle bezoekers samen 1500 per dag (`DAGLIMIET`). Dit staat in het
  werkgeheugen en begint na een herstart opnieuw.
- **Zet een maandlimiet in het OpenAI-dashboard** (Settings > Limits). Dat is de echte grens. Een vraag kost ongeveer
  7.000 tokens aan invoer (vooral de kennisbank), met gpt-4o-mini een tiende cent.

## Instellingen op Render (Environment)

| Naam | Waarde |
|---|---|
| `OPENAI_API_KEY` | verplicht; staat alleen op Render, nooit in de repo |
| `OPENAI_MODEL` | optioneel, standaard `gpt-4o-mini` |
| `SITE_URL` | optioneel, standaard `https://jelgersdesign.nl` |
| `ALLOWED_ORIGINS` | optioneel, standaard de site met en zonder `www` |
| `DAGLIMIET` | optioneel, standaard 1500 |

De service: `jellybot-backend` (srv-d6nerkf5r7bs73d0d7g0), gratis plan, Frankfurt. Repo `Jelger1/jsdesign`, branch
`main`, map `server`, build `npm ci`, start `node server.js`, health check `/api/health`. Hij bouwt alleen opnieuw bij
een commit die iets in `server/` verandert (build filter).

Het gratis plan slaapt na een kwartier zonder bezoek. De eerste vraag duurt dan 20 tot 60 seconden; de chat meldt
dat. Wil je dat niet, dan kan de service naar het Starter-plan van Render (betaald, slaapt niet).

## Lokaal testen

```
cd server && npm ci
cp .env.example .env          # zet er een OpenAI-sleutel in, of OPENAI_BASE_URL naar een nep-server
node server.js                # poort 3000
# in de hoofdmap: de site bouwen met de lokale server
MSYS_NO_PATHCONV=1 BASE_PATH=/ SITE_MODE=productie CHAT_URL=http://localhost:3000 npm run build
```

Buiten Render accepteert de server ook `localhost`. De regels hebben tests: `npm test` (`tools/test-jellybot.mjs`).

## Terugdraaien

- **Server:** in het Render-dashboard bij Events de vorige deploy kiezen > Rollback. De oude code staat nog in
  `Jelger1/Portfolio` (map `server`), maar die laat jelgersdesign.nl niet toe.
- **Chat van de site halen:** `chat` uit `data/site.json` weghalen en de site opnieuw uitrollen; dan verschijnt de
  knop niet meer.

## De overstap (3 november 2026)

De server hing tot dan aan `Jelger1/Portfolio` (autodeploy, CORS alleen jelgersieler.nl, kennis hardcoded over
JSdesign en JelgerS3D). Hij is via de Render-API aan deze repo gekoppeld; de URL bleef gelijk en de OpenAI-sleutel
bleef staan.
