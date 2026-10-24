// Controleert de gebouwde site in dist/: bestaan alle interne links, afbeeldingen,
// scripts en stylesheets? Is alle JSON-LD geldig? Heeft elke pagina precies één h1?
// Daarnaast de SEO-regels van de bouwmodus (SITE_MODE, net als build.js):
// - preview (standaard): elke pagina is noindex, robots.txt noemt geen sitemap en er laadt geen analytics;
// - productie: noindex alleen op afrekenen, bedankt, gereageerd en 404 (die vier blijven noindex) en tot fase 3 op de
//   pijler- en tussenpagina's; wat noindex is staat niet in de sitemap en de pagina's die de oude webshop liet
//   indexeren staan er wel in; robots.txt noemt de sitemap; nergens in dist/ staan nog links naar de oude domeinen.
// Basisbewust: adressen op site.url (https://jsdesign.nl/...) en vanaf de hoofdmap (/... in 404.html, met BASE_PATH
// ervoor) worden bestanden in dist/. Zo worden ook canonical, og:image, JSON-LD, sitemap, feed, llms.txt en de
// kennisbank nagelopen.
// Gebruik: npm run check   (na npm run build, met dezelfde SITE_MODE en BASE_PATH als de build)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const MODE = process.env.SITE_MODE === 'productie' ? 'productie' : 'preview';
const BASE = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const SITE_URL = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8')).url.replace(/\/+$/, '');
const ORGANISATIE = SITE_URL + '/#organization';
// Pagina's die ook in productie niet in Google horen: stappen van een bestelling, de link uit mails en de 404
const ALTIJD_NOINDEX = ['afrekenen.html', 'bedankt.html', 'gereageerd.html', '404.html'];
// Paginatypes (body data-page) die tot fase 3 bewust noindex zijn: de pijlers en de tussenpagina's
// (src/templates/pillar.js), de contactpagina en het portfolio. Krijgt een type in fase 3 zijn volledige inhoud, haal
// het dan hier weg: vanaf dan is noindex daar in productie een fout, net als op elke andere pagina buiten ALTIJD_NOINDEX.
const NOINDEX_TOT_FASE_3 = ['pillar', 'placeholder', 'contact', 'portfolio'];
// De pagina's die de oude webshop liet indexeren (28): alle pagina's uit de contractreferentie behalve ALTIJD_NOINDEX,
// precies de vier die daar al noindex waren. In productie blijven ze indexeerbaar en staan ze in de sitemap, welk
// paginatype ze ook krijgen; anders kost de domeinwissel hun plek in Google. Of ze bestaan, toetst npm run contract.
const REFERENTIE = path.join(ROOT, 'tests/contract/referentie.json');
const OUD_INDEXEERBAAR = fs.existsSync(REFERENTIE)
	? JSON.parse(fs.readFileSync(REFERENTIE, 'utf8')).html.filter(function (page) { return ALTIJD_NOINDEX.indexOf(page) === -1; })
	: [];
// Nieuwe paginatypes (body data-page): daar is een te lange title of description een fout. De overige komen
// 1-op-1 uit de oude webshop; daar is het een waarschuwing.
const NIEUWE_TYPES = ['pillar', 'placeholder', 'contact', 'portfolio'];
// De oude domeinen. Draait de site zelf op een ervan (plan B: jelgers3d.nl), dan is dat domein niet oud.
const OUDE_DOMEINEN = ['jelgers3d.nl', 'jelgersieler.nl'].filter(function (domein) {
	return new URL(SITE_URL).hostname.replace(/^www\./, '') !== domein;
});
// Naast de pagina's: sitemap, feed, robots.txt, llms.txt, build.txt, de kennisbank van Jelly-bot en winkel.json
const TEKSTBESTANDEN = /^(?:[^/]+\.(?:xml|txt)|ai\/[^/]+\.json|js\/winkel\.json)$/;

const problems = [];
const warnings = [];
const missing = new Map(); // ontbrekend volledig adres -> de bestanden waarin het staat
let pageCount = 0, refCount = 0, urlCount = 0;

if (!fs.existsSync(DIST)) {
	console.error('\ndist/ bestaat niet: draai eerst npm run build.\n');
	process.exit(1);
}

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap(function (entry) {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

function isExternal(ref) {
	return /^(https?:|mailto:|tel:|data:|#|\/\/)/.test(ref);
}

function relative(file) {
	return path.relative(DIST, file).replace(/\\/g, '/');
}

function escapeRegex(text) {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Tekst zoals een bezoeker (en Google) hem leest: &amp; wordt & enzovoort
function decode(text) {
	return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos));/gi, function (m, dec, hex, name) {
		if (dec) return String.fromCodePoint(Number(dec));
		if (hex) return String.fromCodePoint(parseInt(hex, 16));
		return { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' }[name.toLowerCase()];
	});
}

// Alle treffers van de eerste groep van een regex met /g
function all(regex, text) {
	const found = [];
	let m;
	while ((m = regex.exec(text))) found.push(m[1]);
	return found;
}

// De waarde van een attribuut in alle tags van één soort waarvan een ander attribuut een vaste waarde heeft, in welke
// volgorde de attributen ook staan. Bijvoorbeeld tagValues(html, 'link', 'rel', 'canonical', 'href').
function tagValues(html, tag, key, value, wanted) {
	return (html.match(new RegExp('<' + tag + '\\b[^>]*>', 'gi')) || []).map(function (found) {
		const attrs = {};
		found.replace(/\s([\w:-]+)="([^"]*)"/g, function (m, name, v) { attrs[name.toLowerCase()] = decode(v); return m; });
		return attrs;
	}).filter(function (attrs) { return attrs[key] === value; }).map(function (attrs) { return attrs[wanted]; });
}

// Het bestand in dist/ waar een adres naar wijst: relatief (vanaf het bestand "from"), vanaf de hoofdmap (/... met
// BASE_PATH ervoor) of volledig op site.url. Een map wordt index.html. Geeft null voor andere sites, mailto: en
// dergelijke, en false voor een adres vanaf de hoofdmap dat buiten BASE_PATH valt.
function toFile(ref, from) {
	let rest = ref.split('#')[0].split('?')[0];
	let dir;
	if (rest === SITE_URL || rest.indexOf(SITE_URL + '/') === 0) {
		dir = DIST;
		rest = rest.slice(SITE_URL.length + 1);
	} else if (isExternal(ref)) {
		return null;
	} else if (rest.charAt(0) === '/') {
		if (rest.indexOf(BASE) !== 0) return false;
		dir = DIST;
		rest = rest.slice(BASE.length);
	} else if (!rest) {
		return from; // alleen een ?zoekvraag: dezelfde pagina
	} else {
		dir = path.dirname(from);
	}
	try { rest = decodeURIComponent(rest); } catch (e) { /* ongeldige %-code: zoek het bestand zoals het er staat */ }
	const target = path.join(dir, rest);
	const isDir = !rest || rest.endsWith('/') || (fs.existsSync(target) && fs.statSync(target).isDirectory());
	return isDir ? path.join(target, 'index.html') : target;
}

// Volledige adressen op site.url buiten de gewone links (JSON-LD, sitemap, feed, llms.txt, kennisbank): elk
// ontbrekend adres wordt één keer gemeld, met de bestanden waarin het staat
function checkUrl(url, where) {
	const target = toFile(url, DIST);
	if (!target) return;
	urlCount++;
	if (fs.existsSync(target)) return;
	if (!missing.has(url)) missing.set(url, []);
	if (missing.get(url).indexOf(where) === -1) missing.get(url).push(where);
}

// Alle tekstwaarden in een JSON-object die een adres op site.url zijn
function urlsIn(value, found) {
	if (typeof value === 'string') {
		if (value === SITE_URL || value.indexOf(SITE_URL + '/') === 0) found.push(value);
	} else if (value && typeof value === 'object') {
		Object.keys(value).forEach(function (key) { urlsIn(value[key], found); });
	}
	return found;
}

const SITE_URL_RE = new RegExp(escapeRegex(SITE_URL) + '(?:/[^\\s"\'<>)\\]]*)?', 'g');
const OUD_RE = OUDE_DOMEINEN.length
	? new RegExp('(?:https?:)?//(?:[a-z0-9-]+\\.)*(?:' + OUDE_DOMEINEN.map(escapeRegex).join('|') + ')(?![\\w-]|\\.\\w)[^\\s"\'`<>)\\]]*', 'gi')
	: null;

// Productie: geen links naar de oude domeinen (jelgers3d.nl, jelgersieler.nl)
function checkOldDomains(rel, text) {
	if (MODE !== 'productie' || !OUD_RE) return;
	const urls = Array.from(new Set(text.match(OUD_RE) || []));
	if (urls.length) problems.push(rel + ': link(s) naar een oud domein: ' + urls.join(', '));
}

const files = walk(DIST);

// dist/ moet in dezelfde modus gebouwd zijn als deze controle draait (build.txt komt uit build.js)
const buildInfo = path.join(DIST, 'build.txt');
const builtMode = fs.existsSync(buildInfo) ? (fs.readFileSync(buildInfo, 'utf8').match(/^modus=(\S+)/m) || [])[1] : '';
if (builtMode && builtMode !== MODE) problems.push('dist/ is gebouwd in modus "' + builtMode + '", maar deze controle draait in modus "' + MODE + '": geef build en check dezelfde SITE_MODE');

// Welke pagina's in de sitemap staan (in productie moet dat kloppen met noindex)
const sitemapFile = path.join(DIST, 'sitemap.xml');
const inSitemap = new Set();
if (fs.existsSync(sitemapFile)) {
	all(/<loc>([^<]+)<\/loc>/g, fs.readFileSync(sitemapFile, 'utf8')).forEach(function (loc) {
		const target = toFile(decode(loc), DIST);
		if (target) inSitemap.add(relative(target));
		else problems.push('sitemap.xml: "' + loc + '" staat niet op ' + SITE_URL);
	});
} else if (MODE === 'productie') {
	problems.push('sitemap.xml ontbreekt');
}
if (MODE === 'productie' && !fs.existsSync(REFERENTIE)) problems.push('tests/contract/referentie.json ontbreekt: zonder die lijst gaat deze controle niet na of de pagina\'s van de oude webshop indexeerbaar blijven');

files.filter(function (f) { return f.endsWith('.html'); }).forEach(function (file) {
	pageCount++;
	const rel = relative(file);
	const html = fs.readFileSync(file, 'utf8');

	const refs = [];
	const attr = /\s(?:href|src)="([^"]+)"/g;
	let m;
	while ((m = attr.exec(html))) refs.push(m[1]);
	const srcset = /\s(?:srcset|imagesrcset)="([^"]+)"/g;
	while ((m = srcset.exec(html))) m[1].split(',').forEach(function (part) { refs.push(part.trim().split(/\s+/)[0]); });
	const dataFull = /\sdata-full="([^"]+)"/g;
	while ((m = dataFull.exec(html))) refs.push(m[1]);

	refs.forEach(function (ref) {
		const target = toFile(decode(ref), file);
		if (target === null) return;
		refCount++;
		if (target === false) problems.push(rel + ': "' + ref + '" valt buiten de basismap ' + BASE + ' (geef build en check dezelfde BASE_PATH)');
		else if (!fs.existsSync(target)) problems.push(rel + ': verwijst naar ontbrekend bestand "' + ref + '"' + (/^\/(?!\/)/.test(ref) ? ' (BASE_PATH is hier ' + BASE + ': dezelfde als bij de build?)' : ''));
	});

	// Ankers binnen dezelfde pagina
	const anchors = /href="#([^"]+)"/g;
	while ((m = anchors.exec(html))) {
		if (!new RegExp('id="' + m[1] + '"').test(html)) problems.push(rel + ': anker #' + m[1] + ' bestaat niet op de pagina');
	}

	// Precies één JSON-LD-graaf per pagina, met daarin de organisatie (src/templates/seo.js)
	const ld = /<script\b[^>]*\stype="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
	let ldCount = 0;
	while ((m = ld.exec(html))) {
		ldCount++;
		let graph;
		try { graph = JSON.parse(m[1]); } catch (e) { problems.push(rel + ': ongeldige JSON-LD (' + e.message + ')'); continue; }
		const nodes = graph && Array.isArray(graph['@graph']) ? graph['@graph'] : [];
		const org = nodes.some(function (node) { return node && node['@id'] === ORGANISATIE && [].concat(node['@type']).indexOf('ProfessionalService') > -1; });
		if (!org) problems.push(rel + ': de JSON-LD heeft geen @graph met de ProfessionalService ' + ORGANISATIE);
		urlsIn(graph, []).forEach(function (url) { checkUrl(url, rel); });
	}
	if (ldCount !== 1) problems.push(rel + ': ' + ldCount + ' JSON-LD-scripts gevonden (moet precies 1 zijn: één graaf per pagina)');

	const h1 = (html.match(/<h1[\s>]/g) || []).length;
	if (h1 !== 1) problems.push(rel + ': ' + h1 + ' h1-koppen gevonden (moet precies 1 zijn)');
	const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
	const description = tagValues(html, 'meta', 'name', 'description', 'content')[0] || '';
	if (!/<title>[^<]{10,}<\/title>/.test(html)) problems.push(rel + ': title ontbreekt of is te kort');
	if (description.length < 50) problems.push(rel + ': meta description ontbreekt of is te kort');
	const noAlt = (html.match(/<img(?![^>]*\salt=)[^>]*>/g) || []).length;
	if (noAlt) problems.push(rel + ': ' + noAlt + ' afbeelding(en) zonder alt-attribuut');

	// Title en description binnen wat Google toont. Fout bij nieuwe paginatypes, waarschuwing bij de rest.
	const type = (html.match(/<body[^>]*\sdata-page="([^"]*)"/) || [])[1] || '';
	const tooLong = NIEUWE_TYPES.indexOf(type) > -1 ? problems : warnings;
	if (title.length > 60) tooLong.push(rel + ': title is ' + title.length + ' tekens (maximaal 60): "' + title + '"');
	if (description.length > 160) tooLong.push(rel + ': meta description is ' + description.length + ' tekens (maximaal 160)');

	// Canonical, og:url en og:image: volledige adressen op site.url. Of het canonical-bestand bestaat, controleert
	// de lus over de links hierboven al (het is een href).
	const canonicals = tagValues(html, 'link', 'rel', 'canonical', 'href');
	if (canonicals.length !== 1) problems.push(rel + ': ' + canonicals.length + ' canonical-links gevonden (moet precies 1 zijn)');
	else if (canonicals[0].indexOf(SITE_URL + '/') !== 0) problems.push(rel + ': canonical "' + canonicals[0] + '" staat niet op ' + SITE_URL);
	const ogUrls = tagValues(html, 'meta', 'property', 'og:url', 'content');
	if (ogUrls.length !== 1 || ogUrls[0] !== canonicals[0]) problems.push(rel + ': og:url moet precies één keer voorkomen en gelijk zijn aan de canonical');
	const ogImages = tagValues(html, 'meta', 'property', 'og:image', 'content');
	if (ogImages.length !== 1) problems.push(rel + ': ' + ogImages.length + ' og:image-tags gevonden (moet precies 1 zijn)');
	else if (/undefined/.test(ogImages[0]) || !/\.jpe?g$/i.test(ogImages[0].split(/[?#]/)[0])) problems.push(rel + ': og:image "' + ogImages[0] + '" is geen JPG');
	else if (ogImages[0].indexOf(SITE_URL + '/') !== 0) problems.push(rel + ': og:image "' + ogImages[0] + '" staat niet op ' + SITE_URL);
	else if (!fs.existsSync(toFile(ogImages[0], file))) problems.push(rel + ': og:image "' + ogImages[0] + '" bestaat niet in dist/');

	// Indexering: in de preview nooit; in productie alleen waar het hoort, en in overeenstemming met de sitemap
	const robots = tagValues(html, 'meta', 'name', 'robots', 'content')[0];
	const noindex = /\bnoindex\b/i.test(robots || '');
	if (MODE === 'preview') {
		if (!noindex) problems.push(rel + ': ' + (robots === undefined ? 'geen <meta name="robots">' : 'robots "' + robots + '" zonder noindex') + ' (in de preview is elke pagina noindex)');
		// Alleen het laden zelf telt (gtm.js, gtag/js), niet een vermelding van het domein, zoals in een CSP
		if (/googletagmanager\.com\/(?:gtm\.js|gtag\/js|ns\.html)/.test(html)) problems.push(rel + ': laadt Google Tag Manager (in de preview laadt geen analytics)');
	} else {
		// build.js laat een noindex-pagina zelf uit de sitemap, dus "noindex en in de sitemap" vangt een verkeerde noindex
		// niet. Daarom apart: noindex mag alleen op ALTIJD_NOINDEX en tot fase 3 op de types van NOINDEX_TOT_FASE_3, en
		// nooit op een pagina die de oude webshop liet indexeren.
		const oud = OUD_INDEXEERBAAR.indexOf(rel) > -1;
		const magNoindex = ALTIJD_NOINDEX.indexOf(rel) > -1 || (NOINDEX_TOT_FASE_3.indexOf(type) > -1 && !oud);
		if (noindex && !magNoindex) problems.push(rel + ': heeft noindex in productie' + (oud ? ', terwijl de oude webshop deze pagina liet indexeren' : '') + ' (noindex mag alleen op ' + ALTIJD_NOINDEX.join(', ') + ' en tot fase 3 op de paginatypes ' + NOINDEX_TOT_FASE_3.join(' en ') + ')');
		if (noindex && inSitemap.has(rel)) problems.push(rel + ': heeft noindex maar staat in de sitemap');
		if (!noindex && !inSitemap.has(rel)) (oud ? problems : warnings).push(rel + ': is indexeerbaar maar staat niet in de sitemap' + (oud ? ' (in de oude webshop stond hij er wel in)' : ''));
		if (ALTIJD_NOINDEX.indexOf(rel) > -1 && !noindex) problems.push(rel + ': moet ook in productie noindex hebben');
	}

	checkOldDomains(rel, html);
});

files.filter(function (f) { return f.endsWith('.css'); }).forEach(function (file) {
	const css = fs.readFileSync(file, 'utf8');
	const url = /url\((['"]?)([^'")]+)\1\)/g;
	let m;
	while ((m = url.exec(css))) {
		const target = toFile(m[2], file);
		if (target === null) continue;
		refCount++;
		if (!target || !fs.existsSync(target)) problems.push(relative(file) + ': verwijst naar ontbrekend bestand "' + m[2] + '"');
	}
});

// Sitemap, feed, robots.txt, llms.txt, kennisbank en winkel.json: volledige adressen op site.url moeten bestaan,
// en in productie staan ook hier geen oude domeinen
files.map(relative).filter(function (rel) { return TEKSTBESTANDEN.test(rel); }).forEach(function (rel) {
	const text = fs.readFileSync(path.join(DIST, rel), 'utf8');
	// Een leesteken direct achter een adres in lopende tekst ("zie https://jsdesign.nl/over.html.") hoort er niet bij
	(text.match(SITE_URL_RE) || []).forEach(function (url) { checkUrl(decode(url).replace(/[.,;:!?]+$/, ''), rel); });
	checkOldDomains(rel, text);
});

// Productie: ook de scripts, stylesheets, SVG's, overige JSON en het webmanifest linken niet naar de oude domeinen.
// Hier alleen die controle; volledige adressen lopen de pagina's en tekstbestanden hierboven al na.
if (MODE === 'productie') files.map(relative).filter(function (rel) {
	return /\.(?:m?js|css|svg|json|webmanifest|xml|txt|vtt)$/i.test(rel) && !TEKSTBESTANDEN.test(rel);
}).forEach(function (rel) {
	checkOldDomains(rel, fs.readFileSync(path.join(DIST, rel), 'utf8'));
});

// robots.txt: in productie met de sitemap erin, in de preview zonder (die pagina's zijn noindex)
const robotsFile = path.join(DIST, 'robots.txt');
const sitemapLine = 'Sitemap: ' + SITE_URL + '/sitemap.xml';
if (!fs.existsSync(robotsFile)) problems.push('robots.txt ontbreekt');
else if (MODE === 'productie' && fs.readFileSync(robotsFile, 'utf8').split(/\r?\n/).indexOf(sitemapLine) === -1) problems.push('robots.txt mist de regel "' + sitemapLine + '"');
else if (MODE === 'preview' && /^sitemap:/im.test(fs.readFileSync(robotsFile, 'utf8'))) problems.push('robots.txt noemt een sitemap (in de preview hoort die er niet in)');

if (MODE === 'productie') ALTIJD_NOINDEX.forEach(function (page) {
	if (!fs.existsSync(path.join(DIST, page))) problems.push(page + ' ontbreekt');
});

missing.forEach(function (where, url) {
	problems.push('"' + url + '" bestaat niet in dist/ (staat in ' + where.slice(0, 3).join(', ') + (where.length > 3 ? ' en ' + (where.length - 3) + ' andere' : '') + ')');
});

if (warnings.length) console.log('\nWaarschuwingen:\n - ' + warnings.join('\n - '));
if (problems.length) {
	console.error('\n' + problems.length + ' probleem/problemen gevonden (modus ' + MODE + '):\n - ' + problems.join('\n - ') + '\n');
	process.exit(1);
}
console.log('\n✓ ' + pageCount + ' pagina\'s gecontroleerd (modus ' + MODE + '), ' + refCount + ' interne verwijzingen en ' + urlCount + ' volledige adressen kloppen; JSON-LD, koppen, SEO-tags en indexering in orde.\n');
