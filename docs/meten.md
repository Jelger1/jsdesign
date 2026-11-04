# Meten: wat de site doorgeeft aan Tag Manager en GA4

De site zet gebeurtenissen in de `dataLayer` (`track()` in `src/js/util.js`). Tag Manager (GTM-MQLPSW9X) laadt pas
als een bezoeker toestemming geeft voor statistieken (`src/js/consent.js`) en stuurt ze dan door naar GA4
(G-0SLM0NK7CF, property "JelgerS3D" 555289449, die ook jelgersdesign.nl meet). Zonder toestemming gaat er niets weg.
Nooit persoonsgegevens of wat iemand typt.

## De gebeurtenissen

| Gebeurtenis | Wanneer | Velden |
|---|---|---|
| `view_item` | een productpagina | ecommerce (product, prijs) |
| `add_to_cart` | in de winkelwagen | ecommerce, `source` (waar de knop stond) |
| `begin_checkout` | naar afrekenen | ecommerce |
| `generate_lead` | bestelling, contactformulier, maatwerk- of printaanvraag | `lead_type`, `item_id` (product), ecommerce bij een bestelling |
| `sign_up` | aanmelding nieuwsbrief | `method`, `bron` (waar het formulier stond) |
| `keychain_download`, `keychain_mail` | sleutelhangerontwerp gedownload of gemaild | `text_length` |
| `chat_open` | de bezoeker opent Jelly-bot | geen |
| `chat_vraag` | een vraag aan Jelly-bot | `via` (`tip` of `typen`); nooit de vraag zelf |
| `chat_naar_jelger` | "Stuur je vraag naar Jelger" | geen |
| `contact_klik` | een klik naar het contactformulier | `link_tekst`, `onderdeel` (header, footer of sectie), `onderwerp` |

## Tag Manager: het importbestand

`docs/gtm/jelgersdesign-gebeurtenissen.json` bevat:
- één GA4-gebeurtenistag ("GA4 - gebeurtenissen van de site") met gebeurtenisnaam `{{Event}}` en de velden hierboven
  als parameters (`item_id` heet in GA4 `product_id`);
- één trigger ("Gebeurtenissen van de site"): een aangepaste gebeurtenis met de lijst hierboven als regex;
- tien gegevenslaagvariabelen ("DLV - …").

Importeren: Tag Manager > Beheer > Container importeren > kies het bestand > werkruimte "Bestaande" (Default
Workspace) > **Samenvoegen** > "Conflicterende tags, triggers en variabelen hernoemen" > Bevestigen. Daarna
**Voorbeeld** (testen) en **Verzenden** (publiceren).

Komt er een gebeurtenis bij, zet hem dan ook in de regex van de trigger. Komt er een tag met een **ander script** bij
(Meta-pixel, Hotjar, Clarity), dan moet die eerst in de CSP (`BRONNEN` in `src/templates/csp.js`), in de cookiemelding
en in de privacyverklaring; anders blokkeert de browser hem.

## GA4: eenmalig instellen

- **Beheer > Gegevensweergave > Belangrijke gebeurtenissen:** `generate_lead` en `sign_up` (verschijnen pas nadat ze
  een keer zijn binnengekomen; je kunt ze ook vooraf aanmaken met precies die naam).
- **Beheer > Aangepaste definities > Aangepaste dimensie maken** (bereik: gebeurtenis): `lead_type`, `via`,
  `onderdeel`, `link_tekst`, `onderwerp`, `bron`, `source`, `product_id`.
- **Beheer > Gegevensverzameling en -aanpassing > Gegevensbewaring:** 14 maanden.
- **Beheer > Gegevensstreams > de stream > Tagging-instellingen configureren > Intern verkeer definiëren:** je eigen
  IP-adres; daarna bij **Gegevensfilters** het filter "Internal Traffic" op **Actief**.
- **Beheer > Productkoppelingen > Search Console-koppelingen:** jelgersdesign.nl koppelen.
