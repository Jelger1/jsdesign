# Draaiboek: de functie `formulier` deployen

Zo zet je de Supabase-functie `formulier` online. De functie verwerkt alle formulieren, bestellingen en de nieuwsbrief.
Dit draaiboek geldt voor elke deploy, en volgt het merge-plan (§3 B5 en §10). De eerste deploy (fase 2: CORS los van
`SITE_URL`) staat [onderaan](#eerste-deploy-fase-2-cors-los-van-site_url).

| Onderdeel | Waarde |
|---|---|
| Project | `kgxhefdzufhmigbmchhk` (Supabase "JSdesign", eu-west-1) |
| Functie | `formulier` → `https://kgxhefdzufhmigbmchhk.supabase.co/functions/v1/formulier` |
| Code | `supabase/functions/formulier/` (`index.ts` + `logica.js`), instellingen in `supabase/config.toml` |
| Cron | `jelgers3d-taken` roept de functie elk uur om :05 aan (pg_net); `jelgers3d-opruimen` draait om 03:15 in de database zelf |

## Vaste regels

- **Eén deployroute:** alleen de Supabase CLI, vanuit een **getagde commit** van `Jelger1/jsdesign`, in de root van de
  repo (dus met `supabase/config.toml`). Nooit via:
  - de GitHub-integratie;
  - de MCP (die hoort op `read_only` te staan);
  - de editor in het dashboard;
  - de oude repo `Jelger1/JelgerS3d`. Die is bevroren, en de code daar laat jsdesign.nl en de preview niet toe.
- **Altijd `--no-verify-jwt`.** Ook `verify_jwt = false` in `config.toml` moet blijven. Staat de JWT-controle aan, dan
  geeft de functie een 401 aan de site én aan pg_cron.
- **De secret key "default" nooit roteren of verwijderen.** Alle ondertekende links zijn ervan afgeleid: "Ik heb
  gereageerd" (tot 2 jaar), downloads (6 maanden) en de nieuwsbrief (30 dagen). Om dezelfde reden blijven de
  legacy-sleutels zoals ze zijn (niet aan- of uitzetten), en komt er geen tweede "default".
- **Niet wijzigen:**
  - het project en de functienaam (en dus de URL);
  - de HMAC-prefix `jelgers3d-links|` en het ordernummerprefix `JS3D-`;
  - `verify_jwt = false`.
- **Twee soorten sleutels, strikt gescheiden:**
  - voor de deploy gebruik je het **persoonlijke access token** (`sbp_…`);
  - de functie zelf gebruikt de **secret key "default"** (`sb_secret_…`). Die heb je hier nooit nodig.
- **Migraties horen niet bij dit draaiboek.**
  - Ze gaan alleen als bestand in `supabase/migrations/`, via `db push`.
  - Eerst toepassen en controleren; pas daarna komt de code die ze nodig heeft.

## Eenmalig, vóór de eerste deploy

1. **De GitHub-integratie losmaken** (een klik van Jelger in het dashboard).
   - Waar: Supabase-dashboard → Project Settings → Integrations → GitHub Integration. Verwijder daar de koppeling met
     `Jelger1/JelgerS3d`. Anders zet een push naar die repo oude functiecode terug.
   - Controle: er staat daarna geen repository meer gekoppeld.
   - Bevries daarna `Jelger1/JelgerS3d`: geen pushes meer.
2. **Een terugvalpunt taggen.**
   - De functiecode in `9c73c4f` (de laatste commit vóór de CORS-wijziging) is byte-gelijk aan `b4e62f1` van
     `Jelger1/JelgerS3d`. Dat is de live stand, en volgens het plan de bron van de live versie v15.
   - Met deze tag heeft ook de eerste deploy een "vorige tag":

   ```bash
   git tag -a formulier-basis 9c73c4f -m "formulier: gelijk aan live v15 (JelgerS3d b4e62f1)"
   git push origin formulier-basis
   ```

## Elke deploy

### 1. Vooraf

1. **Schone werkboom, getagd en gepusht.**

   ```bash
   git status --short                      # moet leeg zijn
   git tag -a formulier-JJJJ-MM-DD -m "formulier: <wat er verandert>"
   git push origin formulier-JJJJ-MM-DD
   git checkout formulier-JJJJ-MM-DD       # of een aparte worktree op de tag
   ```

   Een tweede deploy op dezelfde dag krijgt `-2` achter de tagnaam. De tags vormen samen het logboek:
   `git tag -l "formulier-*"`.
2. **Groen:** `npm ci`, `npm run build` en `npm test`. De laatste test leest `dist/js/winkel.json`.
3. **`config.toml` klopt:**
   - `project_id = "kgxhefdzufhmigbmchhk"`;
   - onder `[functions.formulier]` staat `verify_jwt = false`.
4. **Terugvalpunt:** noteer de vorige tag.
5. **Nulmeting:** draai [controle a en b](#4-controles-erna) één keer vóór de deploy. Dan zie je daarna precies wat er
   veranderd is.

### 2. Token klaarzetten

Het persoonlijke token (`sbp_…`) staat in `JSdesign.nl/.env`, buiten de repo. Zet het alleen in de omgeving van je
terminalsessie. Dus **nooit**:
- in de repo of in `supabase/.env`;
- als argument van een commando;
- in een log of chat.

PowerShell 7:

```powershell
$env:SUPABASE_ACCESS_TOKEN = Read-Host -MaskInput 'Supabase-token (sbp_...)'
```

Git Bash:

```bash
read -rsp 'Supabase-token (sbp_...): ' SUPABASE_ACCESS_TOKEN && export SUPABASE_ACCESS_TOKEN
```

### 3. Deployen

Werk in de root van de repo (de map met `supabase/`) en op de tag.

1. **Huidig versienummer noteren** (alleen lezen):

   ```bash
   npx supabase@2 functions list --project-ref kgxhefdzufhmigbmchhk
   ```

2. **Deployen:**

   ```bash
   npx supabase@2 functions deploy formulier --project-ref kgxhefdzufhmigbmchhk --use-api --no-verify-jwt
   ```

   `--use-api` laat Supabase de code zelf bundelen. Docker is dus niet nodig.
3. **Controleren:** `functions list` toont nu een versienummer dat één hoger is.
4. **Token weghalen:**
   - PowerShell: `Remove-Item Env:SUPABASE_ACCESS_TOKEN`;
   - Git Bash: `unset SUPABASE_ACCESS_TOKEN`.
5. Maakt de CLI een map `supabase/.temp/` aan? Commit die niet.

### 4. Controles erna

Is één controle niet groen, [draai dan terug](#terugdraaien).

**a. Een GET geeft 405 "Alleen POST.", geen 401.**

```bash
curl -s -w '\n%{http_code}\n' https://kgxhefdzufhmigbmchhk.supabase.co/functions/v1/formulier
```

- Verwacht: `Alleen POST.` en `405`.
- Krijg je een `401`? Dan staat de JWT-controle aan en liggen de formulieren en pg_cron stil. Deploy meteen opnieuw mét
  `--no-verify-jwt`, of draai terug.

**b. De preflights slagen vanaf alle herkomsten.**

Elke herkomst krijgt status 204 en zichzelf terug in `access-control-allow-origin`. Een vreemde herkomst
(`voorbeeld.invalid`) krijgt `https://jsdesign.nl` terug. Daarop blokkeert de browser, en dat is de bedoeling.

```bash
F=https://kgxhefdzufhmigbmchhk.supabase.co/functions/v1/formulier
for o in https://jsdesign.nl https://jelger1.github.io https://jelgers3d.nl https://jelgersieler.nl https://voorbeeld.invalid; do
  echo "== $o"
  curl -s -o /dev/null -D - -X OPTIONS "$F" -H "Origin: $o" \
    -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' \
    | grep -iE '^(HTTP/|access-control-allow-origin)'
done
```

PowerShell:

```powershell
$F = 'https://kgxhefdzufhmigbmchhk.supabase.co/functions/v1/formulier'
foreach ($o in 'https://jsdesign.nl', 'https://jelger1.github.io', 'https://jelgers3d.nl', 'https://jelgersieler.nl', 'https://voorbeeld.invalid') {
  "== $o"
  curl.exe -s -o NUL -D - -X OPTIONS $F -H "Origin: $o" -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type' |
    Select-String '^(HTTP/|access-control-allow-origin)'
}
```

**c. De eerstvolgende cronrun is geslaagd.**

Wacht tot na de eerste :05 na de deploy. Kijk dan in de SQL Editor (of read-only via de MCP):

```sql
select d.start_time, d.status, d.return_message
from cron.job_run_details d
join cron.job j on j.jobid = d.jobid
where j.jobname = 'jelgers3d-taken'
order by d.start_time desc
limit 3;
```

- Verwacht: de bovenste run, die van na de deploy, heeft `status = 'succeeded'`.
- Let op: dat zegt alleen dat de aanroep verstuurd is. Wat de functie antwoordde, bewaart pg_net een paar uur:

```sql
select created, status_code, left(content, 120) as antwoord
from net._http_response
order by created desc
limit 3;
```

- Verwacht: `200` met `{"ok":true,…}`.
- Een `401` betekent dat de JWT-controle aanstaat (zie a).

**d. De logs zijn schoon.** Kijk bij Edge Functions → `formulier` → Logs: geen fouten bij het opstarten, zoals een
mislukte import van `logica.js`.

**e. Functionele test** (alleen als het gedrag verandert, niet bij een pure CORS-wijziging).
- Volg het testprotocol uit het plan (§10.4):
  - testadressen met plus-adressering en namen die beginnen met "TEST";
  - hooguit 4 inzendingen per 10 minuten per IP, en 5 per adres per dag (de limieten van de functie).
- Ruim de testrecords, uploads en Resend-contacten daarna op.

## Terugdraaien

**De vorige tag opnieuw deployen**, met hetzelfde commando. Herhaal daarna de controles. Migraties blijven staan, want
die zijn additief.

```bash
git checkout <vorige-tag>
npx supabase@2 functions deploy formulier --project-ref kgxhefdzufhmigbmchhk --use-api --no-verify-jwt
```

- **Bij de eerste deploy is `formulier-basis` (v15) de vorige tag.**
  - Daarmee verdwijnen jsdesign.nl, de preview en 127.0.0.1 weer uit de CORS-lijst. De oude sites blijven werken.
  - Doe dat dus alleen vóór de cutover (stap 4, `SITE_URL`). Daarna nooit meer terug naar code zonder deze CORS-lijst.
- **Nooit terugdraaien met code uit `Jelger1/JelgerS3d`.**
- **Een verkeerde `ALLOWED_ORIGINS`?**
  - Zo haal je hem weg:
    `npx supabase@2 secrets unset ALLOWED_ORIGINS --project-ref kgxhefdzufhmigbmchhk`.
  - Daarna geldt weer de standaardlijst, zonder nieuwe deploy. Nieuwe instanties van de functie lezen de nieuwe waarde;
    reken op een paar minuten.
  - Herhaal dan controle b.

## CORS: welke websites de functie mogen aanroepen

De lijst staat in `herkomstLijst` en `toegestaneHerkomst` (`logica.js`), met tests in `tools/test-formulier.mjs`.

**De standaardlijst** (zonder secret):
- `https://jsdesign.nl` en `https://www.jsdesign.nl`;
- `https://jelgers3d.nl` en `https://www.jelgers3d.nl`;
- `https://jelgersieler.nl` en `https://www.jelgersieler.nl`;
- `https://jelger1.github.io`. Dat is de preview, maar het geldt ook voor de andere Pages-sites van jelger1.

**Altijd toegestaan:**
- `SITE_URL` en de www-variant ervan;
- `http://localhost` en `http://127.0.0.1`, met elke poort (lokaal ontwikkelen).

**Los van `SITE_URL`.** De wissel in cutover-stap 4 sluit de oude domeinen dus niet uit.

**De secret `ALLOWED_ORIGINS`** (kommagescheiden) **vervangt** de standaardlijst.
- **Advies: niet zetten.** De lijst in de code is getest. Het plan noemt de secret bij fase 2, maar met deze
  standaardlijst is hij niet nodig.
- Zet je hem toch, neem dan **alle** herkomsten op waar nog formulieren staan. Dus zolang het oude portfolio live is,
  ook `jelgersieler.nl` met www.
- Noteer alleen schema en domein (en eventueel een poort), zonder pad: `https://jelger1.github.io`, niet
  `https://jelger1.github.io/jsdesign`.
- De code vangt slordigheid op:
  - een pad en een slash aan het eind haalt hij weg, en hoofdletters worden kleine letters;
  - wat geen http(s)-adres is, telt niet mee;
  - staat er niets bruikbaars in, dan geldt de standaardlijst.

## Eerste deploy: fase 2, CORS los van SITE_URL

**Wat er verandert:** alleen CORS. De rest van de functie is gelijk aan v15.
- **Erbij:** `https://jsdesign.nl`, `https://www.jsdesign.nl`, `https://jelger1.github.io` (de preview) en
  `http://127.0.0.1` (met poort).
- **Eraf:** niets. De lijst hangt niet meer af van `SITE_URL`.
- Een vreemde herkomst krijgt nu `https://jsdesign.nl` terug in plaats van `https://jelgers3d.nl`. Geblokkeerd wordt hij
  hoe dan ook.

**Volgorde**
1. De GitHub-integratie losmaken en `formulier-basis` taggen (zie [Eenmalig](#eenmalig-vóór-de-eerste-deploy)).
2. **Nulmeting:** de preflight vanaf `https://jsdesign.nl` en `https://jelger1.github.io` geeft nu nog
   `https://jelgers3d.nl` terug. Die herkomsten worden dus nog geweigerd.
3. De commit met deze wijziging taggen, en deployen volgens [Elke deploy](#elke-deploy).
4. **Controles a t/m d.** Daarna geven jsdesign.nl en jelger1.github.io zichzelf terug, en jelgers3d.nl en
   jelgersieler.nl nog steeds ook.
5. **Acceptatie fase 2** (plan §11): een nieuwsbriefaanmelding vanaf de preview komt aan, volgens het testprotocol.

`ALLOWED_ORIGINS` blijft ongezet (zie [CORS](#cors-welke-websites-de-functie-mogen-aanroepen)).

**Uitgevoerd op 23 oktober 2026:** tag `formulier-2026-10-23`, versie 17.
- **Vóór de deploy stond er v16, niet v15.** De GitHub-integratie had `b4e62f1` van `Jelger1/JelgerS3d` op 22 oktober
  om 16:13 automatisch gedeployd, 40 seconden na de push. Die functiecode is gelijk aan `formulier-basis`, dus
  terugdraaien naar die tag blijft correct.
- **De integratie is dus nog actief:** een push naar `Jelger1/JelgerS3d` zet binnen een minuut de oude functie terug,
  zonder jsdesign.nl en de preview in de CORS-lijst. Push daar niet meer, of maak eerst de koppeling los (stap 1 van
  [Eenmalig](#eenmalig-vóór-de-eerste-deploy)). Losmaken kon niet via de API; dat blijft een klik in het dashboard.
- **Resultaat:** controles a t/m d groen (de cronrun van 22:05 gaf `200 {"ok":true,…}`, de logs tonen alleen het
  opstarten). De acceptatie is ook gedaan: een nieuwsbriefaanmelding vanaf de preview kwam binnen, de bevestigingsmail is
  afgeleverd, en de testrij is daarna verwijderd.
- **Logs lezen via de API:** het oude endpoint `analytics/endpoints/logs.all` is weg. Het nieuwe is
  `analytics/endpoints/logs` (ClickHouse): één tabel `logs`, de bron in de kolom `source` (bijvoorbeeld
  `function_logs`), de velden in `log_attributes`, en alleen SELECT zonder `*`.
