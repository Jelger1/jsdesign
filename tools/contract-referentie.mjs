// Maakt tests/contract/referentie.json: wat de oude webshop (jelgers3d.nl) levert en wat de nieuwe site dus moet
// blijven leveren (MERGEPLAN §3, B2 en B3). Bron: de build van de live webshop (JelgerS3D.nl/dist, gelijk aan wat
// live staat) en JelgerS3D.nl/data/products.json. tools/contract.mjs toetst de nieuwe build tegen deze referentie.
// EENMALIG GEDRAAID op 23-10-2026, tegen commit b4e62f1 van Jelger1/JelgerS3d. De referentie staat in de repo en
// wordt niet met de hand aangepast. Alleen opnieuw draaien bij een bewuste her-sync van de productdata uit de oude
// webshop (content-freeze, §3 B12), en het verschil in de referentie dan apart nakijken en committen.
// Gebruik: node tools/contract-referentie.mjs [map van de oude webshop]   (standaard ../JelgerS3D.nl, alleen lezen)
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BRON = process.argv[2] || join(ROOT, '..', 'JelgerS3D.nl');
const DIST = join(BRON, 'dist');
const UIT = join(ROOT, 'tests/contract/referentie.json');

// Lettertypen: deze vier OFL-fonts laden de mails en de site; de rest is bewust niet meegenomen (B8, §6.5, §8)
const FONTS_VEREIST = ['dm-sans-latin.woff2', 'instrument-serif-italic-latin.woff2', 'jetbrains-mono-latin.woff2', 'saira-latin.woff2'];
const FONTS_NIET_VEREIST = {
	'stevie-sans-bold.woff2': 'Stevie Sans: geen licentiebewijs, dus geen webfont (B8)',
	'stevie-sans-medium.woff2': 'Stevie Sans: geen licentiebewijs, dus geen webfont (B8)',
	'syne-latin.woff2': 'ongebruikt; blijft alleen op de redirectlaag voor oude mails (§6.5)',
	'space-grotesk-latin.woff2': 'ongebruikt; blijft alleen op de redirectlaag voor oude mails (§6.5)',
	'arimo-bold.typeface.json': 'geen mailbestand maar het lettertype van de 3D-configurator'
};
// Uitvoer die in de oude dist/ staat maar live niet bestaat
const OG_WEZEN = { '3d-mijnlamp2.jpg': 'wees: geen pagina gebruikt hem en live geeft hij 404' };

function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap(function (entry) {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

function namen(map) {
	return readdirSync(join(DIST, map)).sort();
}

function fout(bericht) {
	console.error('\nReferentie niet gemaakt: ' + bericht + '\n');
	process.exit(1);
}

// Alle sleutels van een object als paden ("offerte.types"); lijsten tellen als één waarde
function sleutelpaden(obj, voor) {
	return Object.keys(obj).sort().flatMap(function (sleutel) {
		const pad = (voor ? voor + '.' : '') + sleutel;
		const waarde = obj[sleutel];
		return waarde && typeof waarde === 'object' && !Array.isArray(waarde) ? [pad].concat(sleutelpaden(waarde, pad)) : [pad];
	});
}

let commit = '';
try { commit = execFileSync('git', ['-C', BRON, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (e) { /* geen git: dan zonder */ }

// 1. Pagina's, mailbestanden, lettertypen, beelden
const html = walk(DIST).filter(function (f) { return f.endsWith('.html'); }).map(function (f) { return relative(DIST, f).replace(/\\/g, '/'); }).sort();
if (html.length !== 32) fout('de oude webshop heeft 32 pagina\'s, in ' + DIST + ' staan er ' + html.length);
const mail = namen('assets/mail');
if (mail.length !== 18) fout('de oude webshop heeft 18 mailbestanden, gevonden: ' + mail.length);
const fonts = namen('assets/fonts');
fonts.forEach(function (f) {
	if (FONTS_VEREIST.indexOf(f) === -1 && !FONTS_NIET_VEREIST[f]) fout('onbekend lettertype ' + f + ': zet het in FONTS_VEREIST of FONTS_NIET_VEREIST');
});
FONTS_VEREIST.forEach(function (f) { if (fonts.indexOf(f) === -1) fout(f + ' staat niet in de oude build'); });
const og = namen('assets/og');
Object.keys(OG_WEZEN).forEach(function (f) { if (og.indexOf(f) === -1) fout('de wees ' + f + ' staat niet (meer) in de oude build'); });

// 2. winkel.json: wat de Supabase-functie "formulier" leest (catalogus, bedrijfsgegevens, uploadregels)
const winkel = JSON.parse(readFileSync(join(DIST, 'js/winkel.json'), 'utf8'));
const ids = Object.keys(winkel.catalogus).sort();
const productvelden = Object.keys(winkel.catalogus[ids[0]]).sort();
const catalogus = {};
ids.forEach(function (id) {
	const p = winkel.catalogus[id];
	if (Object.keys(p).sort().join() !== productvelden.join()) fout('product ' + id + ' heeft andere velden dan ' + ids[0]);
	catalogus[id] = {
		sale: p.sale, personalize: p.personalize, wish: p.wish,
		varianten: (p.variants || []).map(function (v) { return { id: v.id, label: v.label || '' }; })
	};
});

// 3. Prijzen uit de productdata (niet uit de build: een introductieprijs hangt van de bouwdatum af)
const producten = JSON.parse(readFileSync(join(BRON, 'data/products.json'), 'utf8'));
if (producten.map(function (p) { return p.id; }).sort().join() !== ids.join()) fout('data/products.json en winkel.json noemen andere producten');
const prijzen = {};
producten.slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; }).forEach(function (p) {
	const varianten = {};
	(p.variants || []).forEach(function (v) { varianten[v.id] = v.price; });
	prijzen[p.id] = { varianten: varianten, intro: p.intro ? { price: p.intro.price, until: p.intro.until } : null };
});

// 4. Productfeed (Merchant Center): de id's moeten stabiel blijven
const feed = Array.from(readFileSync(join(DIST, 'feed.xml'), 'utf8').matchAll(/<g:id>([^<]*)<\/g:id>/g), function (m) { return m[1]; }).sort();

const referentie = {
	toelichting: 'Eenmalig gemaakt met tools/contract-referentie.mjs uit de build van de live webshop. Niet met de hand aanpassen; tools/contract.mjs toetst hiertegen.',
	bron: { site: winkel.winkel.url, map: 'JelgerS3D.nl/dist en JelgerS3D.nl/data/products.json', commit: commit, gemaakt: new Date().toISOString().slice(0, 10) },
	html: html,
	mail: mail,
	fonts: { vereist: FONTS_VEREIST, nietVereist: FONTS_NIET_VEREIST },
	img: namen('assets/img'),
	og: og.filter(function (f) { return !OG_WEZEN[f]; }),
	ogWezen: OG_WEZEN,
	winkelJson: {
		sleutels: Object.keys(winkel).sort(),
		winkel: Object.keys(winkel.winkel).sort(),
		uploads: sleutelpaden(winkel.uploads),
		productvelden: productvelden,
		catalogus: catalogus
	},
	prijzen: prijzen,
	feed: feed
};

mkdirSync(dirname(UIT), { recursive: true });
writeFileSync(UIT, JSON.stringify(referentie, null, '\t') + '\n');
console.log('\n✓ ' + relative(ROOT, UIT).replace(/\\/g, '/') + ': ' + html.length + ' pagina\'s, ' + mail.length + ' mailbestanden, '
	+ referentie.img.length + ' beelden, ' + referentie.og.length + ' OG-beelden, ' + ids.length + ' producten en ' + feed.length + ' feed-items (bron: commit ' + (commit || 'onbekend') + ').\n');
