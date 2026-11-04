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
  6.700 tokens aan invoer (vooral de kennisbank), met gpt-4o-mini een tiende cent.
- **Cache:** de prompt begint voor elke vraag hetzelfde (persona, regels, kennisbank); de pagina van de bezoeker staat
  achteraan. OpenAI haalt het vaste deel dan uit zijn cache: op 4 november 6.656 van de 6.700 tokens, tegen half tarief,
  en een antwoord in ongeveer 1 seconde in plaats van 2,4. Zet dus nooit iets wat per vraag verschilt vóór de
  kennisbank.

## Persoonsgegevens, meten en de weg naar Jelger

- **Persoonsgegevens:** e-mailadressen, telefoonnummers en IBANs in een vraag vervangt de server door
  `[e-mailadres]` enzovoort voordat er iets naar OpenAI gaat (`verberg` in `server/logica.js`, met tests). Bedragen,
  datums, postcodes en ordernummers blijven staan.
- **Meten zonder mee te lezen:** per antwoord één logregel in Render (Logs): tokens in, waarvan uit de cache, tokens
  uit, tijd, aantal berichten, de pagina en of er links of persoonsgegevens zijn weggehaald. Nooit de vraag of het
  antwoord. Bij de wisseling van de dag een regel met het dagtotaal.
- **Stuur je vraag naar Jelger:** na de eerste vraag verschijnt in de chat de knop "Liever een mens?". Die opent het
  contactformulier met het onderwerp van de pijler en de vragen uit de chat al in het berichtveld (`chatVragen` in
  `src/js/chat.js`, gelezen door `src/js/forms.js`). De bezoeker ziet en verstuurt het zelf.

## Testvragen voor elke wijziging

`node tools/eval-jellybot.mjs` stelt 12 echte vragen aan de live server en controleert de antwoorden:
- hij noemt zichzelf Jelly-bot en nooit ChatGPT, en zegt dat hij een AI is;
- de prijs op een productpagina klopt; voor maatwerk noemt hij geen prijs;
- hij geeft geen e-mailadres, en weigert vragen buiten het onderwerp, pogingen om de regels te breken en een nep-antwoord
  in de geschiedenis;
- een Engelse vraag krijgt een Engels antwoord;
- alle links gaan naar de site of naar adressen uit de kennisbank.

Draai het voor en na elke wijziging aan de prompt (`server/logica.js`), het model (`OPENAI_MODEL`) of de opbouw van de
kennisbank. Een lokale server test je met `node tools/eval-jellybot.mjs http://localhost:3000`. Kost ongeveer een cent.
Op 4 november: 12 van de 12 goed. De eerste ronde vond een echte fout: op een Engelse vraag antwoordde hij in het
Nederlands. De taalregel staat sindsdien ook achter de kennisbank.

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
JSdesign en JelgerS3D). Met akkoord van Jelger is hij om 23:57 via de Render-API aan deze repo gekoppeld; de URL bleef
gelijk en de OpenAI-sleutel bleef staan. Daarna live getest:
- `/api/health` gaf `klaar: true`;
- een preflight vanaf jelgersdesign.nl kreeg de juiste CORS-header;
- zonder herkomst of vanaf jelgersieler.nl kwam er 403;
- echte vragen werden goed beantwoord: de prijs op de pagina van de mijnwerkerslamp, de printservice, en een poging
  om de regels te breken werd netjes afgewezen.

De chatknop ging om 00:01 live (5e81012 en ae251dd). Render bouwt sindsdien vanzelf bij een commit in `server/`
(trigger `new_commit`).
