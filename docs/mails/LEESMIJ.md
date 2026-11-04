# Mails: "JelgerS3D heet nu JelgersDesign" (november 2026)

| Bestand | Wat | Hoe verstuurd |
|---|---|---|
| `nieuwsbrief-nieuwe-naam.html` / `.txt` | de nieuwsbrief, met afmeldlink (`{{{RESEND_UNSUBSCRIBE_URL}}}`) | Resend-broadcast naar het segment "Nieuwsbrief", 4 november 2026 |
| `klanten-nieuwe-naam.html` / `.txt` | voor bestaande klanten die niet op de lijst staan, met een groot aanmeldblok | Jelger zelf, per klant, vanuit Gmail |

## De klantmail versturen

1. Open `klanten-nieuwe-naam.html` in Chrome of Edge (dubbelklikken).
2. Ctrl+A, Ctrl+C. Plak in een nieuw Gmail-bericht (Ctrl+V).
3. Vervang **[naam]** door de voornaam. Onderwerp: *JelgerS3D heet nu JelgersDesign*.
4. Eén mail per klant: nooit iedereen samen in Aan of CC (dan ziet iedereen elkaars adres).

Antwoordt iemand met "ja", dan heeft die zich aangemeld: zet het adres in het Resend-segment "Nieuwsbrief" en
bewaar de mail als bewijs van toestemming. Antwoordt iemand "nee bedankt", stuur dan niets meer.

## Aanpassen

```
node tools/nieuwsbrief-beelden.mjs   # fotos (na een build, voor de productuitsneden)
node tools/mail-nieuwe-naam.mjs      # koppen als plaatje (via Edge) en beide mails
```

Daarna bouwen en uitrollen: de plaatjes staan op `jelgersdesign.nl/assets/nieuwsbrief/2026-11/`. De koppen zijn
plaatjes omdat Gmail geen eigen lettertypen laadt; met de site-lettertypen als tekst zou je daar Arial zien.
