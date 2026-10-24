// De sitemap. sitemap.xml is een index met drie delen: de pagina's van de studio, het portfolio (overzicht en cases)
// en de webshop. Welk deel een pagina krijgt, volgt uit het paginatype; een nieuwe pagina, case of product staat er
// bij de volgende build dus vanzelf in. Pagina's met noindex blijven eruit. Producten en cases noemen ook hun foto's
// (image-sitemap), zodat Google Afbeeldingen ze vindt.
//
// lastmod is de dag waarop de inhoud van een pagina echt veranderde, niet de builddatum (zo'n lastmod negeert Google).
// De build onthoudt per pagina een vingerafdruk van title, description en inhoud (zie stand()); verandert die, dan
// wordt lastmod de dag van die build.
//
// Daarnaast sitemap.html: dezelfde pagina's als leesbare lijst voor bezoekers, gelinkt in de footer.

const crypto = require('crypto');
const h = require('./helpers');

const DELEN = [
	{ id: 'paginas', file: 'sitemap-paginas.xml', kop: 'Pagina\'s' },
	{ id: 'portfolio', file: 'sitemap-portfolio.xml', kop: 'Portfolio' },
	{ id: 'webshop', file: 'sitemap-webshop.xml', kop: 'Webshop' }
];

function deelVan(page) {
	if (page.name === 'portfolio' || page.name === 'case') return 'portfolio';
	if (page.name === 'shop' || page.name === 'category' || page.name === 'product') return 'webshop';
	return 'paginas';
}

// Het pad zoals de canonical het noemt: index.html valt weg (zie layout.js)
function pad(page) {
	return page.path === 'index.html' ? '' : page.path.replace(/(^|\/)index\.html$/, '$1');
}

// Wat een bezoeker en Google van de pagina zien. Het versienummer achter scripts en stylesheets (?v=...) verandert
// bij elke CSS- of JS-wijziging en telt niet mee.
function vingerafdruk(page) {
	return crypto.createHash('sha1')
		.update(page.title + '\n' + page.description + '\n' + page.main.replace(/\?v=[0-9a-f]+/g, ''))
		.digest('hex').slice(0, 16);
}

// pages: de pagina's in de sitemap. vorige: de stand van de vorige build ({ pad: { hash, lastmod } }).
// Geeft de nieuwe stand: een pagina met dezelfde vingerafdruk houdt haar lastmod, de rest krijgt today.
function stand(pages, vorige, today) {
	const nieuw = {};
	pages.forEach(function (page) {
		const hash = vingerafdruk(page);
		const oud = vorige[page.path];
		nieuw[page.path] = { hash: hash, lastmod: oud && oud.hash === hash ? oud.lastmod : today };
	});
	return nieuw;
}

function urlset(site, pages, stand, beelden) {
	return '<?xml version="1.0" encoding="UTF-8"?>\n'
		+ '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
		+ pages.map(function (page) {
			return '\t<url>\n'
				+ '\t\t<loc>' + h.esc(site.url + '/' + pad(page)) + '</loc>\n'
				+ '\t\t<lastmod>' + stand[page.path].lastmod + '</lastmod>\n'
				+ (beelden[page.path] || []).map(function (url) { return '\t\t<image:image><image:loc>' + h.esc(url) + '</image:loc></image:image>\n'; }).join('')
				+ '\t</url>\n';
		}).join('')
		+ '</urlset>\n';
}

// Alle bestanden van de sitemap: { 'sitemap.xml': index, 'sitemap-paginas.xml': ..., ... }.
// beelden: { pad van de pagina: [volledige adressen van foto's] }. Een leeg deel komt niet in de index.
function bestanden(site, pages, stand, beelden) {
	const files = {};
	const index = DELEN.map(function (deel) {
		const eigen = pages.filter(function (page) { return deelVan(page) === deel.id; });
		if (!eigen.length) return '';
		files[deel.file] = urlset(site, eigen, stand, beelden);
		const laatste = eigen.map(function (page) { return stand[page.path].lastmod; }).sort().pop();
		return '\t<sitemap>\n\t\t<loc>' + h.esc(site.url + '/' + deel.file) + '</loc>\n\t\t<lastmod>' + laatste + '</lastmod>\n\t</sitemap>\n';
	});
	files['sitemap.xml'] = '<?xml version="1.0" encoding="UTF-8"?>\n'
		+ '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + index.join('') + '</sitemapindex>\n';
	return files;
}

// De naam van een pagina in de lijst: page.label, anders het laatste stuk van haar kruimelpad, anders haar title
// zonder merknaam
function naam(page) {
	if (page.label) return page.label;
	const kruimels = (page.jsonLd || []).filter(function (item) { return item['@type'] === 'BreadcrumbList'; })[0];
	if (kruimels) return kruimels.itemListElement[kruimels.itemListElement.length - 1].name;
	if (page.name === 'home') return 'Home';
	return page.title.split(' | ')[0].split(' – ')[0].split(' · ')[0];
}

// De leesbare sitemap. pages: de pagina's die erin horen, in de volgorde van de build.
function sitemapPage(ctx, pages) {
	const site = ctx.site;
	const groepen = DELEN.map(function (deel) {
		const eigen = pages.filter(function (page) { return deelVan(page) === deel.id; });
		if (!eigen.length) return '';
		return '<section class="sitemap-groep" aria-labelledby="sitemap-' + deel.id + '">\n'
			+ '<h2 id="sitemap-' + deel.id + '">' + h.esc(deel.kop) + '</h2>\n<ul>\n'
			+ eigen.map(function (page) { return '<li><a href="' + (pad(page) || './') + '">' + h.esc(naam(page)) + '</a></li>'; }).join('\n')
			+ '\n</ul>\n</section>';
	}).join('\n');
	return {
		path: 'sitemap.html',
		root: '',
		name: 'sitemap',
		title: 'Sitemap | ' + site.name,
		description: 'Alle pagina\'s van ' + site.name + ' op een rij: de diensten, de cases uit het portfolio, de webshop met alle ontwerpen en de praktische pagina\'s.',
		ogImage: ctx.images[site.defaultOgImage].og,
		main: '<div class="container text-page sitemap-pagina">\n<h1>Sitemap</h1>\n<p class="text-page-intro">Alle pagina\'s van deze site op een rij.</p>\n' + groepen + '\n</div>'
	};
}

module.exports = { stand: stand, bestanden: bestanden, sitemapPage: sitemapPage };
