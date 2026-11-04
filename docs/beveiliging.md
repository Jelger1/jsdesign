# Beveiliging: de stand per punt (4 november 2026)

Een veelgebruikte checklist van 27 stappen voor een app die "met AI gebouwd" is, toegepast op jelgersdesign.nl:
de statische site op GitHub Pages, de Supabase-functie `formulier`, Jelly-bot op Render en de mail via Resend.
Waar het kon, is het die dag gecontroleerd.

| # | Punt | Stand | Hoe en waar |
|---|---|---|---|
| 1 | Inloggen | n.v.t. | De site heeft geen accounts. Beheer gaat via de dashboards (zie 9). |
| 2 | Sleutels verbergen | in orde | Sleutels staan alleen bij Supabase en Render. In `dist/` staat geen sleutel (gescand). |
| 3 | Database | in orde | RLS aan, zonder policies: alleen de functie kan erbij. |
| 4 | Https | in orde | http geeft een 301 naar https; de CSP heeft `upgrade-insecure-requests`. HSTS kan niet (zie 14). |
| 5 | Wachtwoorden | n.v.t. | Geen accounts. |
| 6 | Formulieren op de server controleren | in orde | `controleer` in `supabase/functions/formulier/logica.js`, met tests. |
| 7 | XSS | in orde | Invoer wordt overal ontsmet (mails, pagina's, chat). Sinds 4 november houdt de CSP ingevoegde scripts tegen (getest). |
| 8 | Verdacht gedrag | deels | Het formulier telt per gehasht IP-adres; Jelly-bot logt per antwoord en per dag. Er gaan nog geen meldingen uit. |
| 9 | Beheer afschermen | **eigenaar** | Zet tweestapsverificatie aan op GitHub, Supabase, Render, Resend, OpenAI, One.com en Google (Cloudflare heeft het al). |
| 10 | Veilige databasequery's | in orde | Via de Supabase-client, nooit losse SQL met invoer. |
| 11 | Configuratie | in orde | Op de site staan alleen URL's en de GTM- en GA-ID's. `.env` staat buiten de repo en in `.gitignore`. |
| 12 | Limieten | in orde | Formulier: 5 per IP per 10 minuten, 5 per e-mailadres per dag, uploads 10 per IP per 10 minuten en 100 per dag. Jelly-bot: 12 per minuut en 120 per dag per IP, 1500 per dag in totaal. |
| 13 | CORS | in orde | Jelly-bot en het formulier (vanaf versie 22, 4 november) laten alleen jelgersdesign.nl toe. |
| 14 | Beveiligingsheaders | deels | Sinds 4 november een CSP per pagina als meta-tag (`src/templates/csp.js`). HSTS, `frame-ancestors` en `nosniff` kunnen niet op GitHub Pages: alleen als jelgersdesign.nl via Cloudflare gaat (**beslissing**). |
| 15 | Sessiecookies | n.v.t. | Geen eigen cookies; die van Google pas na toestemming. |
| 16 | CSRF | n.v.t. | Geen ingelogde sessies. |
| 17 | Resetlinks laten verlopen | n.v.t. | Vergelijkbaar: een niet-bevestigde aanmelding voor de nieuwsbrief vervalt na 30 dagen. |
| 18 | Uploads | in orde | Type, grootte, aantal en dagtotaal worden gecontroleerd; privébucket; bestanden worden automatisch verwijderd. |
| 19 | Prijzen en betalingen | in orde | De server rekent elke prijs na; er is geen online betaling (een bestelling is een aanvraag). |
| 20 | Geen debugmodus | in orde | Nette foutmeldingen. Het health-endpoint van Jelly-bot toont geen model of sleutelinformatie. |
| 21 | Kwetsbare onderdelen | opgelost | 4 november: Jelly-bot ging van 4 lekken (1 kritiek) naar 0 (Express 4.22.3); sharp 0.35.5 voor de build. `npm audit` in de hoofdmap en in `server/`: 0. |
| 22 | Ongebruikte pakketten | in orde | Site: 3 voor het bouwen en three.js; server: express en dotenv. |
| 23 | Blootgestelde bestanden | deels | De site publiceert alleen `dist/`. De oude repo's Portfolio en JelgerS3d zijn openbaar, met onder meer de Dekentje-bestanden en betaalde lettertypes (**beslissing**: privé maken). |
| 24 | Geheimen in de Git-geschiedenis | in orde | Alle 84 commits van deze repo gescand: niets gevonden. In de lokale map Portfolio staat nog een oude OpenAI-sleutel (`.history`, `refs/original`; nooit gepusht). |
| 25 | Sleutels intrekken | **eigenaar** | Controleer bij OpenAI dat de sleutel uit maart 2026 is ingetrokken. De `OPENAI_API_KEY` in `JSdesign.nl/.env` is verouderd. |
| 26 | Review | gedaan | Deze lijst. |
| 27 | Testen | in orde | `npm test` (29), `npm run contract` (9), `npm run check` (50 pagina's), `node tools/eval-jellybot.mjs` (12 vragen), een CSP-browsertest over 21 soorten pagina's: 0 overtredingen. |

**Herhalen, elk kwartaal:**
- `npm audit`, in de hoofdmap en in `server/`;
- `node tools/eval-jellybot.mjs`;
- een scan van de Git-geschiedenis op sleutels.

**Komt er een nieuwe tag in Tag Manager of een widget met een eigen script?** Voeg zijn bron dan toe aan `BRONNEN` in
`src/templates/csp.js`, anders blokkeert de browser hem.
