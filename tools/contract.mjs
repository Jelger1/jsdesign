// Contracttests: de nieuwe site levert alles wat de oude webshop (jelgers3d.nl) leverde, zodat jelgers3d.nl ->
// jsdesign.nl een padbehoudende domeinwissel wordt (MERGEPLAN §3, B2 en B3). Zo blijven al verstuurde mails, de
// productfeed en de Supabase-functie "formulier" (die /js/winkel.json leest) werken.
// De referentie (tests/contract/referentie.json) is eenmalig gemaakt uit de build van de live webshop, met
// tools/contract-referentie.mjs. Wijkt de nieuwe site bewust af, zet dat dan in AFWIJKINGEN hieronder (niet in de
// referentie).
// Draai met: npm run contract   (na npm run build)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const REF = JSON.parse(readFileSync(join(ROOT, 'tests/contract/referentie.json'), 'utf8'));
if (!existsSync(join(DIST, 'js/winkel.json'))) throw new Error('dist/ ontbreekt of is onvolledig: draai eerst npm run build');

const winkel = JSON.parse(readFileSync(join(DIST, 'js/winkel.json'), 'utf8'));

// Bewuste afwijkingen van de oude webshop, elk met de reden. Wijkt dist/ bewust af (een nieuw product, een andere
// prijs, een nieuwe sleutel in winkel.json zoals winkel.logo), dan houdt dit contract elke publicatie tegen, ook de
// nachtelijke build. Zet dan in dezelfde commit het onderwerp uit de foutmelding hier: het begin van de melding, tot
// " ontbreekt", " is nieuw" of de dubbele punt. Een * staat voor een stuk zonder spaties, en een onderwerp vangt ook
// wat eronder valt (een product-id ook de velden, varianten en prijzen van dat product). Bijvoorbeeld:
//   'product koempel-lamp': 'nieuw product, november 2026',
//   'g:id koempel-lamp*': 'nieuw product, november 2026 (een feed-item per variant)',
//   'mijnwerkerslamp/standaard': 'nieuwe prijs vanaf 1 januari 2027',
//   'winkel.logo': 'logo in de mails (fase 4)',
// Vóór de cutover geldt de content-freeze: dan hoort hier niets bij te komen. Een regel die niets meer afvangt, meldt
// de laatste test; de referentie maak je alleen opnieuw bij een her-sync (tools/contract-referentie.mjs).
const AFWIJKINGEN = {
	'winkel.logo': 'het logo van JS Design bovenaan de mails, als plaatje (oktober 2026); de oude webshop heeft alleen het teken',
	'winkel.herroepen': 'de pagina Bestelling herroepen (art. 6:230oa BW), gelinkt onder de bevestiging van een bestelling (oktober 2026)'
};
const gebruikt = new Set();

function ontbreekt(map, namen) {
	return namen.filter(function (naam) { return !existsSync(join(DIST, map, naam)); });
}

function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Alle verschillen in één melding, niet alleen het eerste
function geenVerschillen(verschillen, uitleg) {
	assert.ok(verschillen.length === 0, uitleg + ':\n  - ' + verschillen.join('\n  - '));
}

// Hetzelfde voor verschillen met de oude webshop, behalve wat als bewuste afwijking in AFWIJKINGEN staat
function geenAfwijkingen(verschillen, uitleg) {
	const onbedoeld = verschillen.filter(function (verschil) {
		const bewust = Object.keys(AFWIJKINGEN).filter(function (onderwerp) {
			return new RegExp('^' + onderwerp.split('*').map(escapeRegex).join('\\S*') + '(?=$|[\\s:./])').test(verschil);
		});
		bewust.forEach(function (onderwerp) { gebruikt.add(onderwerp); });
		return bewust.length === 0;
	});
	geenVerschillen(onbedoeld, uitleg + ' (bewust? zet het onderwerp met de reden in AFWIJKINGEN in tools/contract.mjs)');
}

// Wat in de referentie staat maar nu ontbreekt, en wat er nieuw bij is gekomen ("winkel." + "naam" ontbreekt)
function vergelijk(voor, oud, nieuw) {
	return oud.filter(function (x) { return nieuw.indexOf(x) === -1; }).map(function (x) { return voor + x + ' ontbreekt'; })
		.concat(nieuw.filter(function (x) { return oud.indexOf(x) === -1; }).map(function (x) { return voor + x + ' is nieuw (stond niet in de oude webshop)'; }));
}

// Alle sleutels van een object als paden ("offerte.types"); lijsten tellen als één waarde
function sleutelpaden(obj, voor) {
	return Object.keys(obj || {}).sort().flatMap(function (sleutel) {
		const pad = (voor ? voor + '.' : '') + sleutel;
		const waarde = obj[sleutel];
		return waarde && typeof waarde === 'object' && !Array.isArray(waarde) ? [pad].concat(sleutelpaden(waarde, pad)) : [pad];
	});
}

function varianten(lijst) {
	return (lijst || []).map(function (v) { return v.id + ' "' + (v.label || '') + '"'; }).join(', ') || 'geen';
}

// (a) Alle pagina's van de oude webshop: links in mails, de feed, Google en bladwijzers wijzen ernaar
test('alle ' + REF.html.length + ' pagina\'s van de oude webshop bestaan nog', function () {
	geenAfwijkingen(ontbreekt('', REF.html), 'Deze pagina\'s van de oude webshop ontbreken in dist/');
});

// (b) Al verstuurde mails laden hun plaatjes uit /assets/mail/ en de lettertypen uit /assets/fonts/. Stevie Sans,
// Syne en Space Grotesk zijn bewust weggelaten (zie fonts.nietVereist in de referentie).
test('mailbestanden en OFL-lettertypen bestaan nog', function () {
	geenAfwijkingen(ontbreekt('assets/mail', REF.mail).map(function (f) { return 'assets/mail/' + f; })
		.concat(ontbreekt('assets/fonts', REF.fonts.vereist).map(function (f) { return 'assets/fonts/' + f; })), 'Deze bestanden voor mails ontbreken in dist/');
});

// (c) Beelden en deelbeelden houden hun naam (Google Afbeeldingen, de feed, gedeelde links)
test('beeld- en OG-namen van de oude build bestaan nog', function () {
	geenAfwijkingen(ontbreekt('assets/img', REF.img).map(function (f) { return 'assets/img/' + f; })
		.concat(ontbreekt('assets/og', REF.og).map(function (f) { return 'assets/og/' + f; })), 'Deze beelden van de oude webshop ontbreken in dist/');
});

// (d) winkel.json is het contract met de Supabase-functie: bedrijfsgegevens, catalogus en uploadregels
test('winkel.json: dezelfde sleutels in winkel, catalogus en uploads', function () {
	const ref = REF.winkelJson;
	const verschillen = vergelijk('onderdeel ', ref.sleutels, Object.keys(winkel))
		.concat(vergelijk('winkel.', ref.winkel, Object.keys(winkel.winkel || {})))
		.concat(vergelijk('uploads.', ref.uploads, sleutelpaden(winkel.uploads)))
		.concat(vergelijk('product ', Object.keys(ref.catalogus), Object.keys(winkel.catalogus || {})));
	Object.keys(winkel.catalogus || {}).forEach(function (id) {
		verschillen.push.apply(verschillen, vergelijk(id + '.', ref.productvelden, Object.keys(winkel.catalogus[id])));
	});
	geenAfwijkingen(verschillen, 'winkel.json wijkt af van de oude webshop');
});

test('winkel.json: dezelfde producten, varianten en verkoopwijze', function () {
	const verschillen = [];
	Object.keys(REF.winkelJson.catalogus).forEach(function (id) {
		const oud = REF.winkelJson.catalogus[id];
		const nieuw = (winkel.catalogus || {})[id];
		if (!nieuw) {
			verschillen.push(id + ': ontbreekt in de catalogus');
			return;
		}
		['sale', 'personalize', 'wish'].forEach(function (veld) {
			if (nieuw[veld] !== oud[veld]) verschillen.push(id + '.' + veld + ': ' + JSON.stringify(oud[veld]) + ' werd ' + JSON.stringify(nieuw[veld]));
		});
		if (varianten(nieuw.variants) !== varianten(oud.varianten)) verschillen.push(id + ': varianten ' + varianten(oud.varianten) + ' werden ' + varianten(nieuw.variants));
	});
	geenAfwijkingen(verschillen, 'De catalogus in winkel.json wijkt af van de oude webshop');
});

// Prijzen niet uit de build: een introductieprijs hangt af van de bouwdatum. Wel de basisprijzen en de
// introductieprijzen zoals ze in data/products.json staan.
test('basisprijzen en introductieprijzen in data/products.json zijn gelijk', function () {
	const producten = JSON.parse(readFileSync(join(ROOT, 'data/products.json'), 'utf8'));
	const verschillen = [];
	Object.keys(REF.prijzen).forEach(function (id) {
		const oud = REF.prijzen[id];
		const p = producten.find(function (x) { return x.id === id; });
		if (!p) {
			verschillen.push(id + ': ontbreekt in data/products.json');
			return;
		}
		const prijs = {};
		(p.variants || []).forEach(function (v) { prijs[v.id] = v.price; });
		Object.keys(Object.assign({}, oud.varianten, prijs)).forEach(function (variant) {
			if (prijs[variant] !== oud.varianten[variant]) verschillen.push(id + '/' + variant + ': basisprijs ' + oud.varianten[variant] + ' werd ' + prijs[variant]);
		});
		const intro = p.intro ? { price: p.intro.price, until: p.intro.until } : null;
		if (JSON.stringify(intro) !== JSON.stringify(oud.intro)) verschillen.push(id + ': introductieprijs ' + JSON.stringify(oud.intro) + ' werd ' + JSON.stringify(intro));
	});
	geenAfwijkingen(verschillen, 'De prijzen in data/products.json wijken af van de oude webshop');
});

// En de build rekent daarmee goed: tot en met de einddatum de introductieprijs (met de gewone prijs erbij), daarna de
// gewone prijs. De bouwdatum staat in dist/build.txt. Een build die over middernacht (UTC) liep, kan op de dag na de
// einddatum nog de introductieprijs hebben; die dag zijn beide goed.
test('de prijzen in winkel.json volgen data/products.json op de bouwdatum', { skip: !existsSync(join(DIST, 'build.txt')) && 'geen dist/build.txt' }, function () {
	const dag = (readFileSync(join(DIST, 'build.txt'), 'utf8').match(/^gebouwd=(\d{4}-\d{2}-\d{2})/m) || [])[1];
	assert.ok(dag, 'dist/build.txt noemt geen bouwdatum');
	const gisteren = new Date(Date.parse(dag) - 86400000).toISOString().slice(0, 10);
	const producten = JSON.parse(readFileSync(join(ROOT, 'data/products.json'), 'utf8'));
	const verschillen = [];
	producten.forEach(function (p) {
		const gebouwd = ((winkel.catalogus || {})[p.id] || {}).variants || [];
		(p.variants || []).forEach(function (v) {
			const b = gebouwd.find(function (x) { return x.id === v.id; });
			if (!b) {
				verschillen.push(p.id + '/' + v.id + ': ontbreekt in winkel.json');
				return;
			}
			const metIntro = b.price === (p.intro && p.intro.price) && b.regularPrice === v.price;
			const zonder = b.price === v.price && b.regularPrice === undefined;
			const actief = Boolean(p.intro) && p.intro.until >= dag;
			const goed = actief ? metIntro : p.intro && p.intro.until === gisteren ? metIntro || zonder : zonder;
			const verwacht = actief ? p.intro.price + ' (introductieprijs tot ' + p.intro.until + ', gewoon ' + v.price + ')' : String(v.price);
			if (!goed) verschillen.push(p.id + '/' + v.id + ': winkel.json rekent ' + b.price + (b.regularPrice ? ' (gewoon ' + b.regularPrice + ')' : '') + ', op ' + dag + ' hoort ' + verwacht);
		});
	});
	geenVerschillen(verschillen, 'winkel.json rekent andere prijzen dan data/products.json');
});

// (e) Merchant Center kent de producten aan hun g:id; een nieuw id is voor Google een nieuw product
test('feed.xml: dezelfde item-id\'s (g:id)', function () {
	const ids = Array.from(readFileSync(join(DIST, 'feed.xml'), 'utf8').matchAll(/<g:id>([^<]*)<\/g:id>/g), function (m) { return m[1]; }).sort();
	const dubbel = ids.filter(function (id, i) { return ids.indexOf(id) !== i; }).map(function (id) { return 'g:id ' + id + ' staat er meer dan één keer in'; });
	geenVerschillen(dubbel, 'De productfeed heeft dubbele item-id\'s');
	geenAfwijkingen(vergelijk('g:id ', REF.feed, ids), 'De productfeed wijkt af van de oude webshop');
});

// Als laatste: een regel in AFWIJKINGEN die niets meer afvangt (de wijziging is teruggedraaid, of de referentie is bij
// een her-sync opnieuw gemaakt), kan later een echte fout verbergen. Elke regel heeft dus een reden en is nog nodig.
test('AFWIJKINGEN: elke regel heeft een reden en vangt nog iets af', function () {
	const fout = [];
	Object.keys(AFWIJKINGEN).forEach(function (onderwerp) {
		if (!/[^*\s.:/]/.test(onderwerp)) fout.push('\'' + onderwerp + '\' is te ruim: zo telt geen enkel verschil meer');
		else if (typeof AFWIJKINGEN[onderwerp] !== 'string' || !AFWIJKINGEN[onderwerp].trim()) fout.push('\'' + onderwerp + '\' heeft geen reden');
		else if (!gebruikt.has(onderwerp)) fout.push('\'' + onderwerp + '\' vangt niets meer af: haal de regel weg');
	});
	geenVerschillen(fout, 'AFWIJKINGEN in tools/contract.mjs klopt niet');
});
