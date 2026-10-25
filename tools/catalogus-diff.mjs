// Catalogusdiff: de poort van cutover-stap 4 (MERGEPLAN §10.2 V7 en §10.3). Vergelijkt de catalogus die de
// Supabase-functie "formulier" nu leest (https://jelgers3d.nl/js/winkel.json, live, alleen lezen) met die van de
// nieuwe site (dist/js/winkel.json). Pas als ze gelijk zijn, mag SITE_URL naar https://jsdesign.nl: vanaf dat moment
// rekent de functie elke bestelling na met de nieuwe winkel.json.
// Gelijk moeten zijn: de product-id's, de varianten (id, label en prijs), sale, personalize, wish, mailImage en de
// uploadregels. In "winkel" mogen alleen naam, url, mail en slogan verschillen.
// Gebruik: npm run catalogus-diff [-- <oud> [<nieuw>]]   (een adres of een bestand)
//   oud    standaard https://jelgers3d.nl/js/winkel.json
//   nieuw  standaard dist/js/winkel.json (na stap 2 kan ook https://jsdesign.nl/js/winkel.json)
// Exitcode: 0 = gelijk (poort open), 1 = verschil (poort dicht), 2 = vergelijken lukte niet (poort dicht).
// Niet in CI: de live webshop kan tijdens de overgang nog legitiem wijzigen; dit draai je bewust, vlak voor stap 4.
import { readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUD = process.argv[2] || 'https://jelgers3d.nl/js/winkel.json';
const NIEUW = process.argv[3] || join(ROOT, 'dist/js/winkel.json');
// instagram: de handle wisselt bewust mee met de naam (jelgers3d naar jsdesign.nl)
const WINKEL_MAG_VERSCHILLEN = ['naam', 'url', 'mail', 'slogan', 'instagram'];
// De overige productvelden: een verschil houdt de poort niet dicht, maar staat er ter info bij (de naam komt ook in
// de mails, dus kijk die even na)
const PRODUCT_TER_INFO = ['name', 'url', 'image', 'related'];

function naam(bron) {
	return /^https?:\/\//.test(bron) ? bron : relative(process.cwd(), bron).replace(/\\/g, '/') || bron;
}

async function laad(bron) {
	if (!/^https?:\/\//.test(bron)) return JSON.parse(readFileSync(bron, 'utf8'));
	// Net als de functie: ?n=<tijd>, zodat er geen verouderde kopie uit de cache van GitHub Pages komt
	const res = await fetch(bron + (bron.indexOf('?') > -1 ? '&' : '?') + 'n=' + Date.now(), { signal: AbortSignal.timeout(20000) });
	if (!res.ok) throw new Error(bron + ' gaf HTTP ' + res.status);
	return res.json();
}

// Vaste volgorde van sleutels, zodat twee gelijke objecten ook als tekst gelijk zijn
function vast(waarde) {
	return JSON.stringify(waarde, function (sleutel, v) {
		return v && typeof v === 'object' && !Array.isArray(v)
			? Object.keys(v).sort().reduce(function (o, k) { o[k] = v[k]; return o; }, {})
			: v;
	});
}

// Alle eindwaarden van een object met hun pad ({ "printservice.max": 5 }); een lijst telt als één waarde
function plat(obj, voor, uit) {
	uit = uit || {};
	Object.keys(obj || {}).forEach(function (k) {
		const pad = (voor ? voor + '.' : '') + k;
		const v = obj[k];
		if (v && typeof v === 'object' && !Array.isArray(v)) plat(v, pad, uit);
		else uit[pad] = v;
	});
	return uit;
}

function euro(bedrag) {
	return typeof bedrag === 'number' ? '€' + bedrag.toFixed(2).replace('.', ',') : String(bedrag);
}

function varianten(lijst) {
	return (lijst || []).map(function (v) {
		return v.id + ' "' + (v.label || '') + '" ' + euro(v.price) + (v.regularPrice !== undefined ? ' (gewoon ' + euro(v.regularPrice) + ')' : '');
	}).join(', ') || 'geen';
}

function vergelijk(oud, nieuw) {
	const verschillen = [], info = [];
	const pijl = function (a, b) { return (vast(a) || 'ontbreekt') + ' → ' + (vast(b) || 'ontbreekt'); };

	// Bedrijfsgegevens: alleen naam, url, mail en slogan mogen anders zijn (het nieuwe merk en domein)
	const ow = oud.winkel || {}, nw = nieuw.winkel || {};
	Array.from(new Set(Object.keys(ow).concat(Object.keys(nw)))).sort().forEach(function (k) {
		if (vast(ow[k]) === vast(nw[k])) return;
		(WINKEL_MAG_VERSCHILLEN.indexOf(k) > -1 ? info : verschillen).push('winkel.' + k + ': ' + pijl(ow[k], nw[k]));
	});

	// Uploadregels: welke bestanden bij een aanvraag mogen (de functie controleert ze hiermee)
	const ou = plat(oud.uploads), nu = plat(nieuw.uploads);
	Array.from(new Set(Object.keys(ou).concat(Object.keys(nu)))).sort().forEach(function (pad) {
		if (vast(ou[pad]) !== vast(nu[pad])) verschillen.push('uploads.' + pad + ': ' + pijl(ou[pad], nu[pad]));
	});

	// Producten
	const oc = oud.catalogus || {}, nc = nieuw.catalogus || {};
	Object.keys(oc).filter(function (id) { return !nc[id]; }).forEach(function (id) { verschillen.push(id + ': ontbreekt in de nieuwe catalogus'); });
	Object.keys(nc).filter(function (id) { return !oc[id]; }).forEach(function (id) { verschillen.push(id + ': is nieuw (staat niet in de oude catalogus)'); });
	Object.keys(oc).filter(function (id) { return nc[id]; }).forEach(function (id) {
		const o = oc[id], n = nc[id];
		if (varianten(o.variants) !== varianten(n.variants)) verschillen.push(id + ': varianten ' + varianten(o.variants) + ' → ' + varianten(n.variants));
		['sale', 'personalize', 'wish', 'mailImage'].forEach(function (veld) {
			if (vast(o[veld]) !== vast(n[veld])) verschillen.push(id + '.' + veld + ': ' + pijl(o[veld], n[veld]));
		});
		PRODUCT_TER_INFO.forEach(function (veld) {
			if (vast(o[veld]) !== vast(n[veld])) info.push(id + '.' + veld + ': ' + pijl(o[veld], n[veld]));
		});
	});
	return { verschillen: verschillen, info: info };
}

async function main() {
	let oud, nieuw;
	try {
		[oud, nieuw] = await Promise.all([laad(OUD), laad(NIEUW)]);
	} catch (e) {
		console.error('\n✗ Vergelijken lukte niet: ' + e.message + '\n  De poort van stap 4 blijft dicht tot dit wel lukt (bouw eerst de site met npm run build als dist/ ontbreekt).\n');
		process.exit(2);
	}
	console.log('\nCatalogusdiff\n  oud:   ' + naam(OUD) + '\n  nieuw: ' + naam(NIEUW));
	const uitslag = vergelijk(oud, nieuw);
	if (uitslag.info.length) console.log('\nMag verschillen (geen blokkade):\n - ' + uitslag.info.join('\n - '));
	const doel = (nieuw.winkel && nieuw.winkel.url) || 'het nieuwe domein';
	if (uitslag.verschillen.length) {
		console.error('\n✗ ' + uitslag.verschillen.length + ' verschil(len) in wat de Supabase-functie gebruikt:\n - ' + uitslag.verschillen.join('\n - ')
			+ '\n\nDe poort van stap 4 (V7) is dicht: zet SITE_URL nog NIET op ' + doel + '. De functie zou bestellingen dan narekenen'
			+ '\nmet een andere catalogus dan de oude webshop toont (andere prijzen, varianten of regels). Breng de productdata van beide'
			+ '\nsites gelijk (her-sync naar data/products.json en data/shop.json, opnieuw bouwen en publiceren) en draai dit opnieuw.\n');
		process.exit(1);
	}
	const aantal = Object.keys(nieuw.catalogus || {}).length;
	const aantalVarianten = Object.keys(nieuw.catalogus || {}).reduce(function (som, id) { return som + (nieuw.catalogus[id].variants || []).length; }, 0);
	console.log('\n✓ Gelijk: ' + aantal + ' producten en ' + aantalVarianten + ' varianten (id, label, prijs), sale, personalize, wish, mailImage en de uploadregels.'
		+ '\n  De poort van stap 4 (V7) is open: SITE_URL mag naar ' + doel + '.\n');
}

main();
