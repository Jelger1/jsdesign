// De redirectlaag voor de oude domeinen (MERGEPLAN §6.5, docs/redirectlaag.md): maakt uit data/legacy.json per oude
// site legacy/<site>/_redirects en _headers, voor Cloudflare Pages. De bestanden die er met 200 blijven staan (de plaatjes
// en lettertypen uit oude mails, robots.txt en de oude sitemap) staan als byte-kopie in legacy/<site>/.
//
// Gebruik: node tools/legacy.js             schrijft de bestanden
//          node tools/legacy.js --controle  meldt alleen of ze kloppen met data/legacy.json (ook in check.js)
//
// Let op Cloudflare Pages: een redirect gaat altijd voor, ook als het bestand bestaat ("Redirects are always followed,
// regardless of whether or not an asset matches the incoming request"). Daarom staan de bestanden eerst, als proxy naar
// zichzelf (200), en pas daarna de catch-all. Een 404 of 410 kan Cloudflare Pages in _redirects niet geven: wat weg is
// (zoals betaling-status.html), gaat met de catch-all door en eindigt als 404 op jsdesign.nl.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const KOP = '# Gemaakt door tools/legacy.js uit data/legacy.json: niet met de hand aanpassen.\n';

function lees() {
	return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/legacy.json'), 'utf8'));
}

// De regels voor één oude site, in de volgorde waarin Cloudflare ze afloopt (de bovenste die past, wint)
function redirects(site, doel) {
	const regels = [];
	const proxy = Array.from(new Set(site.bestanden.map(function (f) { return f.indexOf('/') > -1 ? '/' + path.posix.dirname(f) + '/*' : '/' + f; })));
	regels.push('# Blijven hier staan, met 200 (oude mails linken ernaar): een proxy naar zichzelf, vóór de catch-all');
	proxy.forEach(function (p) { regels.push(p + ' ' + (p.endsWith('/*') ? p.slice(0, -1) + ':splat' : p) + ' 200'); });
	regels.push('# Verplaatst, en de oude startpagina');
	Object.keys(site.verplaatst).forEach(function (van) {
		regels.push(van + ' ' + doel + site.verplaatst[van] + ' 301');
		if (/\.html$/.test(van)) regels.push(van.replace(/\.html$/, '') + ' ' + doel + site.verplaatst[van] + ' 301');
	});
	regels.push('# Zonder .html: direct naar de pagina mét .html, zonder tussenstap');
	site.paginas.filter(function (p) { return p !== 'index.html' && !site.verplaatst['/' + p]; }).forEach(function (p) {
		regels.push('/' + p.replace(/\.html$/, '') + ' ' + doel + '/' + p + ' 301');
	});
	regels.push('# Al het overige: hetzelfde pad op ' + doel.replace(/^https:\/\//, '') + ' (een #anker neemt de browser mee)');
	regels.push('/* ' + doel + '/:splat 301');
	return KOP + regels.join('\n') + '\n';
}

function headers(site) {
	const mappen = Array.from(new Set(site.bestanden.filter(function (f) { return f.indexOf('/') > -1; }).map(function (f) { return '/' + path.posix.dirname(f) + '/*'; })));
	return KOP + '# Lettertypen en mailplaatjes mogen van elke site geladen worden (mailprogramma\'s, de nieuwe site)\n'
		+ mappen.map(function (m) { return m + '\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=86400'; }).join('\n') + '\n';
}

// Geeft per bestand de verwachte inhoud; ontbrekende kopieën staan in "missen"
function plan() {
	const data = lees();
	const uit = { bestanden: {}, missen: [] };
	Object.keys(data.sites).forEach(function (naam) {
		const site = data.sites[naam];
		uit.bestanden['legacy/' + naam + '/_redirects'] = redirects(site, data.doel);
		uit.bestanden['legacy/' + naam + '/_headers'] = headers(site);
		site.bestanden.forEach(function (f) {
			if (!fs.existsSync(path.join(ROOT, 'legacy', naam, f))) uit.missen.push('legacy/' + naam + '/' + f);
		});
	});
	return uit;
}

// Voor check.js: de lijst met problemen (leeg als alles klopt)
function controle() {
	const p = plan();
	const problemen = p.missen.map(function (f) { return f + ' ontbreekt (byte-kopie van de productie)'; });
	Object.keys(p.bestanden).forEach(function (f) {
		const nu = fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : null;
		if (nu !== p.bestanden[f]) problemen.push(f + ' klopt niet met data/legacy.json (draai node tools/legacy.js)');
	});
	return problemen;
}

if (require.main === module) {
	if (process.argv.includes('--controle')) {
		const problemen = controle();
		problemen.forEach(function (p) { console.log(' - ' + p); });
		console.log(problemen.length ? '\n' + problemen.length + ' problemen' : '✓ legacy/ klopt met data/legacy.json');
		process.exit(problemen.length ? 1 : 0);
	}
	const p = plan();
	Object.keys(p.bestanden).forEach(function (f) {
		fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true });
		fs.writeFileSync(path.join(ROOT, f), p.bestanden[f]);
		console.log('geschreven: ' + f);
	});
	p.missen.forEach(function (f) { console.log('ontbreekt: ' + f); });
}

module.exports = { controle: controle, lees: lees };
