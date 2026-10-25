// Test van de redirectlaag (MERGEPLAN §6.5, docs/redirectlaag.md): loopt alle oude adressen uit data/legacy.json af
// tegen de twee Cloudflare Pages-sites en controleert:
// - een pagina: 301 met de juiste Location (zelfde pad op jsdesign.nl, zonder .html met .html, de query blijft);
// - een bestand dat blijft (mailplaatjes, lettertypen, robots.txt, sitemap.xml): 200, dezelfde bytes als in legacy/,
//   en bij plaatjes en lettertypen Access-Control-Allow-Origin: *;
// - met --doel: dat elk doel met 200 antwoordt (jsdesign.nl in Location vervangen door dit adres, bv. de preview).
//
// Gebruik:
//   node tools/test-redirects.mjs --jelgers3d https://jelgers3d-redirect.pages.dev --jelgersieler https://jelgersieler-redirect.pages.dev
//   node tools/test-redirects.mjs --echt                (na de DNS-wissel: de echte domeinen, ook http:// en www.)
//   ... --doel https://jelger1.github.io/jsdesign        (de eindstatus 200 controleren op een andere plek)
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(ROOT, 'data/legacy.json'), 'utf8'));
const arg = (naam) => { const i = process.argv.indexOf('--' + naam); return i > -1 ? process.argv[i + 1] : null; };
const ECHT = process.argv.includes('--echt');
const DOEL = (arg('doel') || '').replace(/\/$/, '');

const fouten = [];
let getest = 0;
const md5 = (buf) => createHash('md5').update(buf).digest('hex');

async function hoofd(url) {
	return fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'jsdesign-test-redirects' } });
}

async function verwachtRedirect(url, naar) {
	getest++;
	let r = await hoofd(url);
	let plek = r.headers.get('location');
	// Over http stuurt Cloudflare eerst naar dezelfde pagina over https (Always Use HTTPS); die tussenstap is goed
	if (url.startsWith('http://') && plek === url.replace(/^http:/, 'https:')) {
		r = await hoofd(plek);
		plek = r.headers.get('location');
	}
	if (r.status !== 301 || plek !== naar) { fouten.push(url + ' -> ' + r.status + ' ' + (plek || '') + ' (verwacht 301 ' + naar + ')'); return; }
	if (DOEL) {
		const eind = await fetch(naar.replace(data.doel, DOEL), { redirect: 'follow' });
		if (eind.status !== 200) fouten.push(url + ' -> ' + naar + ': het doel geeft ' + eind.status);
	}
}

async function verwachtBestand(url, lokaal, cors) {
	getest++;
	const r = await hoofd(url);
	if (r.status !== 200) { fouten.push(url + ' -> ' + r.status + ' (verwacht 200)'); return; }
	if (cors && r.headers.get('access-control-allow-origin') !== '*') fouten.push(url + ': geen Access-Control-Allow-Origin: *');
	const buf = Buffer.from(await r.arrayBuffer());
	if (md5(buf) !== md5(readFileSync(lokaal))) fouten.push(url + ': andere bytes dan ' + lokaal);
}

for (const naam of Object.keys(data.sites)) {
	const site = data.sites[naam];
	const bases = ECHT
		? ['https://' + site.domein, 'https://www.' + site.domein, 'http://' + site.domein, 'http://www.' + site.domein]
		: [arg(naam)].filter(Boolean).map((b) => b.replace(/\/$/, ''));
	if (!bases.length) { console.log('overgeslagen: ' + naam + ' (geef --' + naam + ' <adres> of --echt)'); continue; }
	for (const base of bases) {
		const https = base.startsWith('https://');
		// Pagina's: met .html, zonder .html, de startpagina en een query die mee moet
		for (const p of site.paginas) {
			const nu = site.verplaatst['/' + p];
			const naar = data.doel + (nu || (p === 'index.html' ? '/' : '/' + p));
			await verwachtRedirect(base + '/' + p, naar);
			if (p !== 'index.html') await verwachtRedirect(base + '/' + p.replace(/\.html$/, ''), naar);
		}
		await verwachtRedirect(base + '/', data.doel + '/');
		for (const van of Object.keys(site.verplaatst)) await verwachtRedirect(base + van, data.doel + site.verplaatst[van]);
		await verwachtRedirect(base + '/nieuwsbrief.html?bron=test', data.doel + '/nieuwsbrief.html?bron=test');
		await verwachtRedirect(base + '/bestaat-niet/ergens.html', data.doel + '/bestaat-niet/ergens.html');
		// Bestanden die blijven (over http alleen de redirect naar https, dat regelt Cloudflare zelf)
		if (https) for (const f of site.bestanden) await verwachtBestand(base + '/' + f, join(ROOT, 'legacy', naam, f), f.startsWith('assets/'));
	}
}

if (!getest) { console.log('niets getest: geef de adressen van de Pages-sites, of --echt'); process.exit(1); }
console.log(getest + ' adressen getest');
fouten.forEach((f) => console.log(' - ' + f));
console.log(fouten.length ? '\n' + fouten.length + ' fouten' : '✓ de redirectlaag klopt');
process.exit(fouten.length ? 1 : 0);
