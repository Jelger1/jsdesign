// Koppen voor de mails van de functie "formulier" (bestellingen, berichten, aanvragen, nieuwsbrief, kortingscode,
// herinneringen) als plaatje in de letters van de site, net als bij de nieuwsbrief (tools/mail-koppen.mjs). Gmail laadt
// geen eigen lettertypen en toont anders Arial.
//
// Maakt assets/mailkoppen/kop-<naam>.png (op dubbele grootte) en data/mail-koppen.json (tekst -> bestand en maat).
// build.js kopieert de plaatjes naar de site en zet de lijst in winkel.json (winkel.mailKoppen); de functie gebruikt een
// plaatje als de tekst van een kop daar precies in staat, en anders gewone tekst.
// Een kop erbij of anders? Pas KOPPEN aan, draai dit script (Edge of Chrome nodig) en bouw opnieuw.
// Gebruik: node tools/mail-koppen-functie.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakKoppen } from './mail-koppen.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UIT = path.join(ROOT, 'assets/mailkoppen');
const LIJST = path.join(ROOT, 'data/mail-koppen.json');

// Doorzichtig, in kleuren die op de lichte kaart (#f3fffd) én in donkere modus (Gmail maakt de kaart dan donker, rond
// #1f1f1f) minstens 3:1 contrast halen: petrol #027a84 (5,0 en 3,2) en het accent van roze naar petrol (hl-mail).
// Een vaste lichte achtergrond in het plaatje gaf in donkere modus een witte balk achter elke kop.
const KAART = 'transparent';
const TEKST = '#027a84';
const BREED = 536; // binnenbreedte van de kaart: 600 min 2 x 32
const HL = (t) => '<span class="hl hl-mail">' + t + '</span>';

// tekst: precies zoals de functie hem gebruikt (en de alt van het plaatje). html: met het accent in Instrument Serif.
// Versie in de bestandsnaam: Gmail bewaart plaatjes per adres, dus een nieuwe versie krijgt een nieuwe naam
const V = 't2';
const titel = (naam, tekst, html) => ({ naam: naam + '-' + V, tekst, html, niveau: 'h2', grootte: 30, kleur: TEKST, achter: KAART, max: BREED });
const tussen = (naam, tekst) => ({ naam: naam + '-' + V, tekst, html: tekst, niveau: 'h3', grootte: 19, kleur: TEKST, achter: KAART, max: BREED });

const KOPPEN = [
	// Voor de klant
	titel('bedankt-bestelling', 'Bedankt voor je bestelling!', 'Bedankt voor je ' + HL('bestelling!')),
	titel('bedankt-bericht', 'Bedankt voor je bericht!', 'Bedankt voor je ' + HL('bericht!')),
	titel('bedankt-aanvraag', 'Bedankt voor je aanvraag!', 'Bedankt voor je ' + HL('aanvraag!')),
	titel('bedankt-printaanvraag', 'Bedankt voor je printaanvraag!', 'Bedankt voor je ' + HL('printaanvraag!')),
	titel('herroeping-binnen', 'Je herroeping is binnen', 'Je herroeping is ' + HL('binnen')),
	titel('als-eerste', 'Je hoort het als eerste', 'Je hoort het ' + HL('als eerste')),
	titel('bevestig-aanmelding', 'Bevestig je aanmelding', 'Bevestig je ' + HL('aanmelding')),
	titel('kortingscode', 'Je kortingscode', 'Je ' + HL('kortingscode')),
	tussen('dit-heb-je-besteld', 'Dit heb je besteld'),
	tussen('hoe-verder', 'Hoe gaat het nu verder?'),
	tussen('je-verklaring', 'Je verklaring'),
	tussen('wat-je-stuurde', 'Wat je hebt gestuurd'),
	// Voor Jelger
	titel('nieuwe-bestelling', 'Nieuwe bestelling', 'Nieuwe ' + HL('bestelling')),
	titel('nieuw-bericht', 'Nieuw bericht', 'Nieuw ' + HL('bericht')),
	titel('nieuwe-aanvraag', 'Nieuwe aanvraag', 'Nieuwe ' + HL('aanvraag')),
	titel('nieuwe-printaanvraag', 'Nieuwe printaanvraag', 'Nieuwe ' + HL('printaanvraag')),
	titel('seintje', 'Seintje gevraagd', 'Seintje ' + HL('gevraagd')),
	titel('herroeping', 'Herroeping', HL('Herroeping')),
	titel('niet-gereageerd', 'Nog niet gereageerd', 'Nog niet ' + HL('gereageerd')),
	tussen('besteld', 'Besteld'),
	tussen('klant', 'Klant'),
	tussen('afzender', 'Afzender'),
	tussen('bestand', 'Bestand'),
	tussen('bestanden', 'Bestanden')
];

fs.mkdirSync(UIT, { recursive: true });
const maten = await maakKoppen(KOPPEN, UIT, path.join(ROOT, 'assets/fonts'));
const lijst = {};
for (const k of KOPPEN) lijst[k.tekst] = { bestand: 'kop-' + k.naam + '.png', breedte: maten[k.naam].breedte, hoogte: maten[k.naam].hoogte };
// De plaatjes van de vorige versie (met lichte achtergrond) blijven staan: al verstuurde mails laden ze nog.
fs.writeFileSync(LIJST, JSON.stringify(lijst, null, '\t') + '\n');
console.log(KOPPEN.length + ' koppen gemaakt in assets/mailkoppen, lijst in data/mail-koppen.json');
