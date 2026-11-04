// De mail "JelgerS3D heet nu JelgersDesign" in twee versies:
// - de nieuwsbrief (via Resend, met afmeldlink), verstuurd op 4 november 2026;
// - een versie voor bestaande klanten die nog niet op de lijst staan. Jelger stuurt die zelf, per klant, vanuit Gmail
//   (pagina openen, alles kopiëren, plakken). Doel: aanmeldingen voor de nieuwsbrief.
// Prijzen en teksten komen uit data/, zodat de mail klopt met de site. Fotos maakt tools/nieuwsbrief-beelden.mjs, de
// koppen tools/mail-koppen.mjs (als plaatje, in de letters van de site). Alles staat op
// jelgersdesign.nl/assets/nieuwsbrief/2026-11/; na een wijziging dus opnieuw bouwen en uitrollen.
//
//   node tools/mail-nieuwe-naam.mjs            schrijft docs/mails/*.html en *.txt, en de kopplaatjes
//
// Opmaak zoals de mails van het formulier (supabase/functions/formulier/logica.js): tabellen en inline stijlen,
// donker met lichte kaarten, de balk van roze naar aqua, DM Sans voor tekst (Gmail toont Arial).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakKoppen } from './mail-koppen.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const site = lees('data/site.json');
const producten = lees('data/products.json');
const pijlers = lees('data/pillars.json');

const URL = site.url;
const MAP = 'assets/nieuwsbrief/2026-11/';
const BEELD = URL + '/' + MAP;
const CAMPAGNE = 'nieuwe-naam';

const K = {
	donker: '#080a0d', paneel: '#151920', rand: '#252b33', licht: '#f3fffd', zacht: '#e1efed', lijn: '#d9e6e4',
	aqua: '#03bcca', roze: '#f10067', rozeOpDonker: '#ff5c9d', grijs: '#98a4a3', gedempt: '#56606b', link: '#027a8c'
};
// Voor de weinige koppen die tekst blijven (prijs): breed en zwaar als terugval, net als Saira Expanded
const KOP = "'Saira','Arial Black','Helvetica Neue',Arial,sans-serif";
const LETTER = "'DM Sans','Segoe UI',Arial,Helvetica,sans-serif";

function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function euro(b) { return '€' + b.toFixed(2).replace('.', ','); }
function product(id) { const p = producten.find((x) => x.id === id); if (!p) throw new Error('Geen product ' + id); return p; }
function vanafPrijs(p) { return Math.min.apply(null, p.variants.map((v) => v.price)); }
function pijler(id) { const p = pijlers.find((x) => x.id === id); if (!p) throw new Error('Geen pijler ' + id); return p; }
function datumNl(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }); }

// Elke link krijgt UTM-tags, zodat je in GA4 ziet wat de mail opleverde (alleen bij bezoekers met toestemming).
// BRON: nieuwsbrief of klantmail, gezet per versie (zie onderaan)
let BRON = 'nieuwsbrief';
function u(pad, inhoud) {
	return URL + '/' + pad + (pad.includes('?') ? '&' : '?') + 'utm_source=' + BRON + '&utm_medium=email&utm_campaign=' + CAMPAGNE + '&utm_content=' + inhoud;
}

// Wat de nieuwsbrief belooft: dezelfde punten als op de aanmeldpagina (voordelen in src/templates/pages.js)
const VOORDELEN = [
	'Als eerste weten wanneer er een nieuw ontwerp is',
	'Speciale acties en deals in je mailbox',
	'Geen spam: alleen een mail als er echt iets te melden is',
	'Afmelden kan altijd, met één klik'
];

// --- Koppen als plaatje -------------------------------------------------------------------------------------------
// Breedtes: het paneel is 600 breed met 36 px binnenruimte, dus 528 voor de inhoud; kolommen ernaast hebben minder.
// achter: de kleur van het paneel, die zit in het plaatje.
const HL = (t) => '<span class="hl">' + t + '</span>';
const KOPPEN = [
	{ naam: 'held', niveau: 'h1', grootte: 46, kleur: K.licht, achter: K.paneel, max: 528, alt: 'JelgerS3D heet nu JelgersDesign.',
		html: '<span class="weg" style="color:' + K.grijs + '">JelgerS3D</span><br>' + HL('heet nu') + '<br><span style="color:' + K.aqua + '">JelgersDesign.</span>' },
	{ naam: 'hoi-jelger', niveau: 'h2', grootte: 27, kleur: K.donker, achter: K.licht, max: 300, alt: 'Hoi, ik ben Jelger', html: 'Hoi, ik ben ' + HL('Jelger') },
	{ naam: 'zelfde-maker', niveau: 'h2', grootte: 27, kleur: K.donker, achter: K.licht, max: 300, alt: 'Nieuwe naam, zelfde maker', html: 'Nieuwe naam, ' + HL('zelfde maker') },
	{ naam: 'aanmelden', niveau: 'h2', grootte: 32, kleur: K.donker, achter: K.aqua, max: 360, alt: 'Mis nooit meer een nieuw ontwerp', html: 'Mis nooit meer een <span class="hl hl-effen">nieuw ontwerp</span>' },
	{ naam: 'diensten', niveau: 'h2', grootte: 29, kleur: K.licht, achter: K.paneel, max: 528, alt: 'Eén studio, drie vakken', html: 'Eén studio, ' + HL('drie vakken') },
	{ naam: 'pijler-branding', niveau: 'h3', grootte: 22, kleur: K.licht, achter: K.paneel, max: 484, alt: 'Design & branding', html: 'Design &amp; ' + HL('branding') },
	{ naam: 'pijler-digitaal', niveau: 'h3', grootte: 22, kleur: K.licht, achter: K.paneel, max: 484, alt: 'Websites & interactieve verhalen', html: 'Websites &amp; ' + HL('interactieve verhalen') },
	{ naam: 'pijler-tastbaar', niveau: 'h3', grootte: 22, kleur: K.licht, achter: K.paneel, max: 484, alt: '3D-printen & prototyping', html: '3D-printen &amp; ' + HL('prototyping') },
	{ naam: 'webshop', niveau: 'h2', grootte: 29, kleur: K.donker, achter: K.licht, max: 340, alt: 'Vers ontworpen, laag voor laag geprint', html: 'Vers ontworpen, ' + HL('laag voor laag') + ' geprint' },
	{ naam: 'lamp', niveau: 'h2', grootte: 23, kleur: K.donker, achter: K.licht, max: 252, alt: 'Mijnwerkerslamp', html: 'Mijnwerkerslamp' },
	{ naam: 'jellybot', niveau: 'h3', grootte: 22, kleur: K.licht, achter: K.paneel, max: 456, alt: 'Vraag het Jelly-bot', html: 'Vraag het ' + HL('Jelly-bot') },
	{ naam: 'iets-moois', niveau: 'h2', grootte: 29, kleur: K.donker, achter: K.licht, max: 528, alt: 'Iets moois maken?', html: 'Iets moois ' + HL('maken?') },
	{ naam: 'jelger', niveau: 'h2', grootte: 30, kleur: K.donker, achter: K.licht, max: 300, alt: 'Jelger', html: '<span class="hl hl-effen">Jelger</span>' }
];
let MATEN = {};
function kop(naam, marge) {
	const k = KOPPEN.find((x) => x.naam === naam);
	const m = MATEN[naam];
	if (!k || !m) throw new Error('Geen kop ' + naam);
	return '<div style="margin:' + (marge || '0 0 14px 0') + '"><img src="' + BEELD + 'kop-' + naam + '.png" width="' + m.breedte + '" height="' + m.hoogte + '" alt="' + esc(k.alt) + '"'
		+ ' style="display:block;border:0;outline:none;width:' + m.breedte + 'px;max-width:100%;height:auto;font:800 ' + Math.round(k.grootte * 0.8) + 'px/1.2 ' + KOP + ';color:' + k.kleur + '"></div>';
}

// --- Bouwstenen ---------------------------------------------------------------------------------------------------
const ruimte = (h) => '<tr><td height="' + h + '" style="height:' + h + 'px;line-height:' + h + 'px;font-size:0">&nbsp;</td></tr>';
const balk = '<tr><td height="4" bgcolor="' + K.aqua + '" style="height:4px;line-height:4px;font-size:0;background:' + K.aqua + ';background-image:linear-gradient(90deg,' + K.roze + ',' + K.aqua + ')">&nbsp;</td></tr>';
function bovenkop(t, kleur, blok) {
	return '<p style="margin:0 0 12px 0;font:700 12px/1.4 ' + LETTER + ';letter-spacing:0.12em;text-transform:uppercase;color:' + kleur + '">'
		+ (blok ? '<img src="' + BEELD + 'blok-' + blok + '.png" width="14" height="14" alt="" style="display:inline-block;vertical-align:-2px;margin-right:8px;border:0">' : '')
		+ esc(t) + '</p>';
}
function knop(href, t, achter, tekst, groot) {
	return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 0 0"><tr><td bgcolor="' + achter + '" style="border-radius:999px;background:' + achter + '">'
		+ '<a href="' + esc(href) + '" style="display:inline-block;padding:' + (groot ? '17px 30px' : '13px 24px') + ';font:700 ' + (groot ? 17 : 15) + 'px/1.2 ' + LETTER + ';color:' + tekst + ';text-decoration:none;border-radius:999px">' + esc(t) + '</a>'
		+ '</td></tr></table>';
}
// Een paneel: donker (zoals de site), licht (zoals de kaart in de formuliermails) of aqua (de aanmelding)
function paneel(inhoud, soort, metBalk) {
	const achter = { donker: K.paneel, licht: K.licht, aqua: K.aqua }[soort];
	const tekst = soort === 'donker' ? K.licht : K.donker;
	return '<tr><td bgcolor="' + achter + '" style="background:' + achter + ';border-radius:20px;overflow:hidden' + (soort === 'donker' ? ';border:1px solid ' + K.rand : '') + '">'
		+ '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + (metBalk ? balk : '')
		+ '<tr><td class="paneel" style="padding:36px 36px 34px 36px;font:16px/1.6 ' + LETTER + ';color:' + tekst + '">' + inhoud + '</td></tr>'
		+ '</table></td></tr>';
}

// --- De onderdelen ------------------------------------------------------------------------------------------------
// 1. De naam
function held() {
	return bovenkop('Nieuwe naam', K.rozeOpDonker, 'branding')
		+ kop('held', '0 0 22px 0')
		+ '<p style="margin:0 0 24px 0;font:17px/1.6 ' + LETTER + ';color:' + K.licht + '">Zelfde maker, zelfde printers in Kerkrade. Maar ik doe meer dan 3D-printen: ik ontwerp ook logo’s, huisstijlen en websites. Daarom heeft alles nu één naam.</p>'
		// Losse labels die op een smal scherm naar de volgende regel gaan
		+ '<p style="margin:0;font:700 13px/1 ' + LETTER + '">'
		+ [['branding', 'Branding'], ['digitaal', 'Digitaal'], ['tastbaar', 'Tastbaar']].map(function (p) {
			return '<span style="display:inline-block;margin:0 6px 8px 0;border:1px solid ' + K.rand + ';border-radius:999px;padding:7px 14px 7px 11px;color:' + K.licht + ';white-space:nowrap">'
				+ '<img src="' + BEELD + 'blok-' + p[0] + '.png" width="12" height="12" alt="" style="display:inline-block;vertical-align:-1px;margin-right:7px;border:0">' + p[1] + '</span>';
		}).join('') + '</p>';
}

// 2. Persoonlijk, met portret
function persoonlijk(variant) {
	const tekst = variant.persoonlijk;
	return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
		+ '<td class="kolom kolom-ruimte" width="200" valign="top" style="width:200px;padding:0 28px 0 0;vertical-align:top">'
		+ '<img class="portret" src="' + BEELD + 'jelger.jpg" width="200" height="250" alt="Jelger Sieler" style="display:block;border:0;border-radius:14px;width:200px;height:auto;background:#55595c"></td>'
		+ '<td class="kolom" valign="top" style="vertical-align:top">'
		+ bovenkop('Van Jelger', K.link)
		+ kop(tekst.kop)
		+ tekst.alineas.map((a) => '<p style="margin:0 0 14px 0">' + a + '</p>').join('')
		+ '</td></tr></table>';
}

// 2b. Aanmelden voor de nieuwsbrief (alleen in de klantmail): groot, in aqua, met knop én "antwoord met ja"
function aanmelden() {
	return bovenkop('Nieuwsbrief', K.donker, 'donker')
		+ kop('aanmelden', '0 0 16px 0')
		+ '<p style="margin:0 0 18px 0;font:17px/1.6 ' + LETTER + '">Je staat nog niet op mijn lijst. Meld je aan en hoor als eerste wanneer er iets nieuws uit mijn printers komt.</p>'
		+ '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px 0">'
		+ VOORDELEN.map((v) => '<tr><td width="26" valign="top" style="width:26px;vertical-align:top;padding:5px 0 8px 0"><img src="' + BEELD + 'blok-donker.png" width="14" height="14" alt="" style="display:block;border:0"></td>'
			+ '<td valign="top" style="vertical-align:top;padding:0 0 8px 0;font:700 15px/1.5 ' + LETTER + '">' + esc(v) + '</td></tr>').join('')
		+ '</table>'
		+ knop(u('nieuwsbrief.html', 'aanmelden-knop'), 'Ja, houd me op de hoogte', K.donker, K.licht, true)
		+ '<p style="margin:18px 0 0 0;font:15px/1.6 ' + LETTER + '">Liever niet klikken? <strong>Antwoord op deze mail met “ja”</strong>, dan zet ik je er zelf op.</p>';
}

// 3. Wat ik maak: de drie pijlers, kleuren en namen uit pillars.json
const PIJLERTEKST = {
	branding: { kleur: K.rozeOpDonker, tekst: 'Een logo en huisstijl die echt bij je passen. Plus visual design voor verpakking, merch en social.', link: 'Bekijk branding' },
	digitaal: { kleur: K.aqua, tekst: 'Websites en webshops op maat, en interactieve verhalen die meebewegen als je scrolt.', link: 'Bekijk websites' },
	tastbaar: { kleur: K.licht, tekst: 'Van 3D-ontwerp tot prototype of kleine serie. Ook maatwerk voor bedrijven en verenigingen, of je eigen bestand via de printservice.', link: 'Bekijk 3D-printen' }
};
function diensten() {
	return bovenkop('Wat ik voor je kan maken', K.grijs)
		+ kop('diensten', '0 0 6px 0')
		+ '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">'
		+ ['branding', 'digitaal', 'tastbaar'].map(function (id, i) {
			const p = pijler(id);
			const t = PIJLERTEKST[id];
			return '<tr><td style="padding:22px 0 ' + (i < 2 ? 22 : 4) + 'px 0;' + (i < 2 ? 'border-bottom:1px solid ' + K.rand : '') + '">'
				+ '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
				+ '<td width="44" valign="top" style="width:44px;vertical-align:top;padding-top:2px"><img src="' + BEELD + 'blok-' + id + '.png" width="28" height="28" alt="" style="display:block;border:0"></td>'
				+ '<td valign="top" style="vertical-align:top">'
				+ '<p style="margin:0 0 6px 0;font:700 12px/1.4 ' + LETTER + ';letter-spacing:0.12em;text-transform:uppercase;color:' + t.kleur + '">' + esc(p.label) + '</p>'
				+ kop('pijler-' + id, '0 0 8px 0')
				+ '<p style="margin:0 0 10px 0;font:15px/1.6 ' + LETTER + ';color:' + K.grijs + '">' + esc(t.tekst) + '</p>'
				+ '<a href="' + esc(u(p.path, 'pijler-' + id)) + '" style="font:700 14px/1.4 ' + LETTER + ';color:' + t.kleur + ';text-decoration:none">' + esc(t.link) + ' &rarr;</a>'
				+ '</td></tr></table></td></tr>';
		}).join('') + '</table>';
}

// 4. Nieuw in de webshop: de Mijnwerkerslamp groot (met de introductieprijs uit products.json), dan drie nieuwe
const NIEUW = [
	['schachtgebouw-oranje-nassau-1', 'oranje-nassau.jpg', 'De toren met de letters ON, getrouw op schaal.'],
	['raadhuis-kerkrade', 'raadhuis.jpg', 'Het raadhuis aan de Markt, op de echte maten.'],
	['straatnaam-sleutelhanger', 'straatnaam.jpg', 'Typ je straat en zie hem meteen in 3D.']
];
function webshop() {
	const lamp = product('mijnwerkerslamp');
	const intro = lamp.intro && new Date(lamp.intro.until + 'T23:59:59') >= new Date() ? lamp.intro : null;
	const prijs = lamp.variants[0].price;
	const lampUrl = u('producten/mijnwerkerslamp.html', 'mijnwerkerslamp');
	const prijsHtml = intro
		? '<p style="margin:0 0 4px 0"><span style="font:800 30px/1.1 ' + KOP + ';color:' + K.donker + '">' + euro(intro.price) + '</span>'
			+ '<span style="font:16px/1.1 ' + LETTER + ';color:' + K.gedempt + ';text-decoration:line-through;margin-left:10px">' + euro(prijs) + '</span></p>'
			+ '<p style="margin:0 0 18px 0;font:14px/1.5 ' + LETTER + ';color:' + K.gedempt + '">Introductieprijs tot en met ' + datumNl(intro.until) + '. Daarna ' + euro(prijs) + '.</p>'
		: '<p style="margin:0 0 18px 0;font:800 30px/1.1 ' + KOP + ';color:' + K.donker + '">' + euro(prijs) + '</p>';

	const uitgelicht = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
		+ '<td class="kolom kolom-ruimte" width="248" valign="top" style="width:248px;padding:0 28px 0 0;vertical-align:top">'
		+ '<a href="' + esc(lampUrl) + '"><img class="uitgelicht" src="' + BEELD + 'mijnwerkerslamp.jpg" width="248" height="310" alt="' + esc(lamp.images[0].alt) + '" style="display:block;border:0;border-radius:14px;width:248px;height:auto;background:#3a3f45"></a></td>'
		+ '<td class="kolom" valign="middle" style="vertical-align:middle">'
		+ (intro ? '<p style="margin:0 0 12px 0"><span style="display:inline-block;background:' + K.roze + ';color:#ffffff;border-radius:999px;padding:6px 13px;font:700 12px/1 ' + LETTER + ';letter-spacing:0.06em;text-transform:uppercase">Introductieprijs</span></p>' : '')
		+ kop('lamp', '0 0 8px 0')
		+ '<p style="margin:0 0 14px 0;font:15px/1.6 ' + LETTER + '">De mijnlamp van vroeger als tafellamp van nu. Met een wifi-lamp die elke kleur kan en een snoer van 4 meter.</p>'
		+ prijsHtml
		+ knop(lampUrl, 'Bekijk de lamp', K.aqua, K.donker)
		+ '</td></tr></table>';

	// Drie even brede kolommen (528 px binnen het paneel: 3 x 166 plus twee tussenruimtes van 15)
	const raster = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
		+ NIEUW.map(function (n, i) {
			const p = product(n[0]);
			const href = u('producten/' + p.id + '.html', p.id);
			const meer = p.variants.length > 1 ? 'vanaf ' : '';
			return (i > 0 ? '<td class="verberg-mobiel" width="15" style="width:15px;font-size:0;line-height:0">&nbsp;</td>' : '')
				+ '<td class="raster-cel" width="166" valign="top" style="width:166px;vertical-align:top">'
				+ '<a href="' + esc(href) + '"><img class="raster-beeld" src="' + BEELD + n[1] + '" width="166" height="208" alt="' + esc(p.images[0].alt) + '" style="display:block;border:0;border-radius:12px;width:100%;max-width:166px;height:auto;background:' + K.zacht + '"></a>'
				+ '<p style="margin:12px 0 4px 0;font:700 15px/1.3 ' + LETTER + '"><a href="' + esc(href) + '" style="color:' + K.donker + ';text-decoration:none">' + esc(p.name) + '</a></p>'
				+ '<p style="margin:0 0 6px 0;font:13px/1.5 ' + LETTER + ';color:' + K.gedempt + '">' + esc(n[2]) + '</p>'
				+ '<p style="margin:0;font:700 14px/1.4 ' + LETTER + ';color:' + K.link + '">' + meer + euro(vanafPrijs(p)) + '</p>'
				+ '</td>';
		}).join('') + '</tr></table>';

	return bovenkop('Nieuw in de webshop', K.link)
		+ kop('webshop', '0 0 24px 0')
		+ uitgelicht
		+ '<div style="height:1px;line-height:1px;font-size:0;background:' + K.lijn + ';margin:30px 0 26px 0">&nbsp;</div>'
		+ raster
		+ '<p style="margin:28px 0 0 0;font:700 15px/1.4 ' + LETTER + '"><a href="' + esc(u('webshop.html', 'webshop')) + '" style="color:' + K.link + ';text-decoration:none">Bekijk de hele webshop &rarr;</a></p>';
}

// 5. Jelly-bot
function jellybot() {
	return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
		+ '<td width="72" valign="top" style="width:72px;vertical-align:top"><img src="' + BEELD + 'jelly-bot.png" width="56" height="56" alt="" style="display:block;border:0"></td>'
		+ '<td valign="top" style="vertical-align:top">'
		+ '<p style="margin:0 0 6px 0;font:700 12px/1.4 ' + LETTER + ';letter-spacing:0.12em;text-transform:uppercase;color:' + K.aqua + '">Nieuw op de site</p>'
		+ kop('jellybot', '0 0 8px 0')
		+ '<p style="margin:0 0 10px 0;font:15px/1.6 ' + LETTER + ';color:' + K.grijs + '">Mijn AI-assistent beantwoordt je vragen over producten, prijzen en levertijden. Je vindt hem rechtsonder op de site.</p>'
		+ '<a href="' + esc(u('', 'jellybot')) + '" style="font:700 14px/1.4 ' + LETTER + ';color:' + K.aqua + ';text-decoration:none">Stel je vraag &rarr;</a>'
		+ '</td></tr></table>';
}

// 6. Afsluiting, met in de klantmail een P.S. over de nieuwsbrief (een P.S. wordt bijna altijd gelezen)
function afsluiting(variant) {
	return kop('iets-moois', '0 0 12px 0')
		+ '<p style="margin:0 0 22px 0">Heb je een idee voor een logo, een website of iets wat je geprint wilt hebben? Antwoord gewoon op deze mail. Ik lees alles zelf.</p>'
		+ knop(u('', 'afsluiting'), 'Bekijk jelgersdesign.nl', K.donker, K.licht)
		+ '<p style="margin:28px 0 4px 0">Groet,</p>'
		+ kop('jelger', '0 0 2px 0')
		+ '<p style="margin:0;font:14px/1.5 ' + LETTER + ';color:' + K.gedempt + '">Jelger Sieler · ' + esc(site.name) + ', Kerkrade</p>'
		+ (variant.aanmelden ? '<p style="margin:24px 0 0 0;padding:16px 0 0 0;border-top:1px solid ' + K.lijn + ';font:15px/1.6 ' + LETTER + '"><strong>P.S.</strong> Wil je nieuwe ontwerpen en acties als eerste zien? '
			+ '<a href="' + esc(u('nieuwsbrief.html', 'aanmelden-ps')) + '" style="color:' + K.link + ';font-weight:700">Meld je aan voor de nieuwsbrief</a>, of antwoord met “ja”.</p>' : '');
}

function voet(variant) {
	const a = site.address;
	const link = (href, t) => '<a href="' + esc(href) + '" style="color:' + K.aqua + ';text-decoration:none">' + esc(t) + '</a>';
	return '<strong style="color:' + K.licht + '">' + esc(site.name) + '</strong> · ' + esc(site.slogan) + '<br>'
		+ esc(a.street + ', ' + a.postcode + ' ' + a.city) + ' · KvK ' + esc(site.kvk) + '<br>'
		+ [link(u('', 'voet'), 'jelgersdesign.nl'), link(site.instagram, 'Instagram'), link(URL + '/privacy.html', 'Privacyverklaring')].join(' · ')
		+ '<br><br>' + variant.voet(link);
}

function mail(variant) {
	return '<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
		+ '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + esc(variant.onderwerp) + '</title>'
		+ '<style>@font-face{font-family:"Saira";font-weight:600 900;font-stretch:100% 125%;src:url(' + URL + '/assets/fonts/saira-latin.woff2) format("woff2")}'
		+ '@font-face{font-family:"DM Sans";font-weight:300 700;src:url(' + URL + '/assets/fonts/dm-sans-latin.woff2) format("woff2")}'
		+ '@media (max-width:620px){'
		+ '.kolom{display:block!important;width:100%!important}'
		+ '.kolom-ruimte{padding:0 0 22px 0!important}'
		+ '.paneel{padding:28px 22px 26px 22px!important}'
		+ '.portret{width:160px!important}'
		+ '.uitgelicht{width:100%!important;max-width:320px!important}'
		+ '.raster-cel{display:block!important;width:100%!important;padding:0 0 26px 0!important}'
		+ '.raster-beeld{max-width:220px!important}'
		+ '.verberg-mobiel{display:none!important}}'
		+ '</style></head>'
		+ '<body style="margin:0;padding:0;background:' + K.donker + '">'
		+ '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:' + K.donker + '">' + esc(variant.preheader) + '&#847;&zwnj;&nbsp;'.repeat(40) + '</div>'
		+ '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + K.donker + '" style="background:' + K.donker + '"><tr><td align="center" style="padding:24px 12px 40px 12px">'
		+ '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">'
		+ '<tr><td style="padding:0 4px 20px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
		+ '<td><a href="' + esc(u('', 'logo')) + '" style="text-decoration:none"><img src="' + URL + '/assets/mail/logo-js-design.png" width="140" height="41" alt="' + esc(site.name) + '" style="display:block;border:0"></a></td>'
		+ '<td class="verberg-mobiel" align="right" style="font:12px/1.4 ' + LETTER + ';color:' + K.grijs + '">' + esc(variant.datumregel) + '</td>'
		+ '</tr></table></td></tr>'
		+ paneel(held(), 'donker', true)
		+ ruimte(16)
		+ paneel(persoonlijk(variant), 'licht')
		+ (variant.aanmelden ? ruimte(16) + paneel(aanmelden(), 'aqua') : '')
		+ ruimte(16)
		+ paneel(diensten(), 'donker')
		+ ruimte(16)
		+ paneel(webshop(), 'licht')
		+ ruimte(16)
		+ paneel(jellybot(), 'donker')
		+ ruimte(16)
		+ paneel(afsluiting(variant), 'licht', true)
		+ '<tr><td style="padding:26px 4px 0 4px;font:12px/1.7 ' + LETTER + ';color:' + K.grijs + '">' + voet(variant) + '</td></tr>'
		+ '</table></td></tr></table></body></html>';
}

// Platte tekst voor mailprogramma's zonder HTML
function tekstversie(variant) {
	const lamp = product('mijnwerkerslamp');
	const intro = lamp.intro;
	const persoonlijkeKop = KOPPEN.find((k) => k.naam === variant.persoonlijk.kop).alt;
	const regels = [
		'JelgerS3D heet nu JelgersDesign.',
		'',
		'Zelfde maker, zelfde printers in Kerkrade. Maar ik doe meer dan 3D-printen: ik ontwerp ook logo’s, huisstijlen en websites. Daarom heeft alles nu één naam.',
		'',
		persoonlijkeKop.toUpperCase(),
		variant.persoonlijk.alineas.map((a) => a.replace(/<[^>]+>/g, '')).join('\n\n'),
		...(variant.aanmelden ? ['', 'MIS NOOIT MEER EEN NIEUW ONTWERP',
			'Je staat nog niet op mijn lijst. Meld je aan en hoor als eerste wanneer er iets nieuws uit mijn printers komt.',
			...VOORDELEN.map((v) => '- ' + v),
			'Aanmelden: ' + u('nieuwsbrief.html', 'aanmelden-knop'),
			'Liever niet klikken? Antwoord op deze mail met "ja", dan zet ik je er zelf op.'] : []),
		'',
		'WAT IK VOOR JE KAN MAKEN',
		...['branding', 'digitaal', 'tastbaar'].map((id) => '- ' + pijler(id).h1 + ': ' + PIJLERTEKST[id].tekst + '\n  ' + u(pijler(id).path, 'pijler-' + id)),
		'',
		'NIEUW IN DE WEBSHOP',
		'- ' + lamp.name + ': ' + (intro ? euro(intro.price) + ' (introductieprijs tot en met ' + datumNl(intro.until) + ', daarna ' + euro(lamp.variants[0].price) + ')' : euro(lamp.variants[0].price)) + '\n  ' + u('producten/mijnwerkerslamp.html', 'mijnwerkerslamp'),
		...NIEUW.map((n) => { const p = product(n[0]); return '- ' + p.name + ': ' + (p.variants.length > 1 ? 'vanaf ' : '') + euro(vanafPrijs(p)) + '\n  ' + u('producten/' + p.id + '.html', p.id); }),
		'',
		'Nieuw op de site: Jelly-bot, mijn AI-assistent. Je vindt hem rechtsonder op ' + URL,
		'',
		'Heb je een idee voor een logo, een website of iets wat je geprint wilt hebben? Antwoord gewoon op deze mail. Ik lees alles zelf.',
		'',
		'Groet,',
		'Jelger',
		...(variant.aanmelden ? ['', 'P.S. Wil je nieuwe ontwerpen en acties als eerste zien? Meld je aan voor de nieuwsbrief (' + u('nieuwsbrief.html', 'aanmelden-ps') + '), of antwoord met "ja".'] : []),
		'',
		'--',
		site.name + ' · ' + site.address.street + ', ' + site.address.postcode + ' ' + site.address.city + ' · KvK ' + site.kvk,
		variant.voetTekst
	];
	return regels.join('\n');
}

const NIEUWSBRIEF = {
	bestand: 'nieuwsbrief-nieuwe-naam',
	onderwerp: 'JelgerS3D heet nu JelgersDesign',
	preheader: 'Meer dan 3D-printen. En nieuw in de webshop: de Mijnwerkerslamp voor een introductieprijs.',
	datumregel: 'Nieuwsbrief · november 2026',
	persoonlijk: {
		kop: 'hoi-jelger',
		alineas: [
			'Je kent me misschien van mijn 3D-prints: lampen, vazen, sleutelhangers en Limburgse gebouwen. Die blijf ik gewoon maken, laag voor laag in Kerkrade.',
			'Wat verandert er voor jou? Bijna niets. Alles staat nu op <strong>jelgersdesign.nl</strong>, en het oude adres stuurt je daar vanzelf naartoe.'
		]
	},
	// Resend vult {{{RESEND_UNSUBSCRIBE_URL}}} per ontvanger in bij een broadcast
	voet: (link) => 'Je krijgt deze mail omdat je je hebt aangemeld voor de nieuwsbrief van JelgerS3D, nu JelgersDesign. Geen zin meer in? ' + link('{{{RESEND_UNSUBSCRIBE_URL}}}', 'Afmelden'),
	voetTekst: 'Je krijgt deze mail omdat je je hebt aangemeld voor de nieuwsbrief. Afmelden: {{{RESEND_UNSUBSCRIBE_URL}}}'
};

// Voor bestaande klanten die niet op de lijst staan. [naam] vervangt Jelger per klant.
const KLANTEN = {
	bestand: 'klanten-nieuwe-naam',
	bron: 'klantmail',
	aanmelden: true,
	onderwerp: 'JelgerS3D heet nu JelgersDesign',
	preheader: 'Een nieuwe naam, nieuwe ontwerpen, en een vraag: wil je op de hoogte blijven?',
	datumregel: 'November 2026',
	persoonlijk: {
		kop: 'zelfde-maker',
		alineas: [
			'<strong>Hoi [naam],</strong>',
			'Je hebt ooit iets bij me gekocht of laten maken toen ik nog JelgerS3D heette. Daarvoor nog steeds bedankt!',
			'Ik blijf gewoon 3D-printen in Kerkrade, maar ik doe nu meer. Alles staat op <strong>jelgersdesign.nl</strong>, en het oude adres stuurt je daar vanzelf naartoe.'
		]
	},
	voet: () => 'Je krijgt deze mail van mij persoonlijk, omdat je ooit klant bij me was. Je staat niet op een mailinglijst, tenzij je je zelf aanmeldt. Liever geen mail meer van me? Antwoord met “nee bedankt”, dan hoor je niets meer van me.',
	voetTekst: 'Je krijgt deze mail van mij persoonlijk, omdat je ooit klant bij me was. Je staat niet op een mailinglijst, tenzij je je zelf aanmeldt. Liever geen mail meer van me? Antwoord met "nee bedankt", dan hoor je niets meer van me.'
};

// Eerst de koppen tekenen (de maten zijn nodig voor de HTML), dan de mails schrijven
const beeldMap = path.join(ROOT, MAP);
fs.mkdirSync(beeldMap, { recursive: true });
MATEN = await maakKoppen(KOPPEN, beeldMap, path.join(ROOT, 'assets/fonts'));
for (const k of KOPPEN) {
	if (MATEN[k.naam].breedte > k.max) console.log('Let op: kop "' + k.naam + '" is ' + MATEN[k.naam].breedte + ' breed, meer dan ' + k.max);
}

const uit = path.join(ROOT, 'docs/mails');
fs.mkdirSync(uit, { recursive: true });
for (const v of [NIEUWSBRIEF, KLANTEN]) {
	BRON = v.bron || 'nieuwsbrief';
	const html = mail(v);
	fs.writeFileSync(path.join(uit, v.bestand + '.html'), html);
	fs.writeFileSync(path.join(uit, v.bestand + '.txt'), tekstversie(v));
	console.log(v.bestand + '.html', Math.round(Buffer.byteLength(html) / 1024) + ' kB (Gmail kort af boven 102 kB)');
}
