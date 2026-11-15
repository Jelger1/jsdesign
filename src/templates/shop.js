// De winkelpagina (webshop.html): alle producten uit data/products.json, met filters.
// Het filteren zelf gebeurt in de browser (src/js/shop.js); de keuzes staan in de URL,
// bv. webshop.html?type=vaas, zodat elke gefilterde weergave een eigen link heeft (handig voor advertenties).
const h = require('./helpers');
const c = require('./components');

// "3D-geprinte *designvazen*" -> het deel tussen sterretjes krijgt de accentkleur
function highlight(text) {
	return h.esc(text).replace(/\*(.+?)\*/g, '<span class="highlight">$1</span>');
}

function chip(group, value, label, count, attrs) {
	return '<label class="chip"><input type="checkbox" name="' + group + '" value="' + h.esc(value) + '"' + (attrs || '') + '>'
		+ '<span>' + h.esc(label) + ' <small data-facet-count>' + count + '</small></span></label>';
}

function filterGroup(group, legend, chips) {
	// Een groep met maar één optie (bv. alles van hetzelfde materiaal) valt niets te kiezen: niet tonen
	if (chips.length < 2) return '';
	return '\t\t<fieldset class="filter-group" data-group="' + group + '">\n'
		+ '\t\t\t<legend>' + h.esc(legend) + '</legend>\n'
		+ '\t\t\t<div class="chips">' + chips.join('') + '</div>\n'
		+ '\t\t</fieldset>\n';
}

function inBucket(price, bucket) {
	return price != null && (bucket.min == null || price >= bucket.min) && (bucket.max == null || price < bucket.max);
}

function filters(ctx) {
	const site = ctx.site;
	const products = ctx.products;
	function countBy(fn) { return products.filter(fn).length; }

	const types = Object.keys(site.types).map(function (key) {
		const n = countBy(function (p) { return p.type === key; });
		return n ? chip('type', key, site.types[key].label, n, ' data-heading="' + h.esc(highlight(site.types[key].heading || site.types[key].label)) + '" data-title="' + h.esc(site.types[key].label) + '"') : '';
	}).filter(Boolean);

	const collections = Object.keys(site.collections).map(function (key) {
		const n = countBy(function (p) { return p.collection === key; });
		return n ? chip('collectie', key, site.collections[key].label, n) : '';
	}).filter(Boolean);

	// Materiaal verschijnt vanzelf als filter zodra het bij producten is ingevuld
	const materials = Array.from(new Set(products.map(function (p) { return p.material; }).filter(Boolean))).sort().map(function (m) {
		return chip('materiaal', m, m, countBy(function (p) { return p.material === m; }));
	});

	const prices = site.priceBuckets.map(function (bucket) {
		const n = countBy(function (p) { return inBucket(h.minPrice(p), bucket); });
		return n ? chip('prijs', bucket.id, bucket.label, n, (bucket.min != null ? ' data-min="' + bucket.min + '"' : '') + (bucket.max != null ? ' data-max="' + bucket.max + '"' : '')) : '';
	}).filter(Boolean);

	return '<form class="shop-filters" id="shop-filters" aria-label="Producten filteren">\n'
		+ '\t\t<div class="shop-filters-head">\n'
		+ '\t\t\t<h2>Filters</h2>\n'
		+ '\t\t\t<button type="button" class="cart-close" data-filter-close aria-label="Filters sluiten">✕</button>\n'
		+ '\t\t</div>\n'
		+ '\t\t<div class="shop-filters-body">\n'
		+ filterGroup('type', 'Type', types)
		+ filterGroup('collectie', 'Collectie', collections)
		+ filterGroup('materiaal', 'Materiaal', materials)
		+ filterGroup('prijs', 'Prijs', prices)
		+ '\t\t</div>\n'
		+ '\t\t<div class="shop-filters-foot">\n'
		+ '\t\t\t<button type="button" class="btn outline" data-filter-reset>Wis filters</button>\n'
		+ '\t\t\t<button type="button" class="btn btn-primary" data-filter-close>Toon <span data-count>' + products.length + '</span> producten</button>\n'
		+ '\t\t</div>\n'
		+ '\t</form>';
}

// Waarom een product in de etalage staat: zelf opgegeven (shop.json > winkel > etalage > label), of anders het badge
// van het product (build.js maakt dat "Introductieprijs" zolang die loopt; de einddatum staat op de productpagina)
function reden(item, product) {
	return item.label || product.badge || '';
}

// De etalage: een donkere tegel met het isometrische raster (zoals "Je bent hier" op de pijlerpagina's), met drie
// producten. De eerste is groot. Onderaan een gestippeld vak: gestippeld betekent in de huisstijl "nog niet", hier
// "jouw idee". De foto is die van de productpagina, zodat hij bij een klik doorgroeit (transition.js).
function etalageStukken(winkel, ctx) {
	const items = (winkel.etalage || []).filter(function (item) { return ctx.byId[item.id]; });
	if (!items.length) return '';
	const stukken = items.map(function (item, i) {
		const p = ctx.byId[item.id];
		const foto = item.foto || p.images[0].file;
		const label = reden(item, p);
		return '\t\t\t\t<li class="etalage-stuk' + (i === 0 ? ' etalage-stuk--groot' : '') + '" data-productfoto="' + h.esc(p.id) + '">'
			+ '<a href="' + h.productUrl(p) + '" data-rand>'
			+ h.img(ctx.images, foto, { alt: '', sizes: i === 0 ? '(max-width: 899px) 52vw, 330px' : '(max-width: 899px) 40vw, 250px', crop: true, eager: true })
			+ (label ? '<span class="etalage-label">' + h.esc(label) + '</span>' : '')
			+ '<span class="etalage-naam"><strong>' + h.esc(p.name) + '</strong> <span class="etalage-prijs">' + h.priceLabel(p) + '</span></span>'
			+ '</a></li>';
	}).join('\n');
	return '\t\t<div class="winkel-etalage">\n'
		+ '\t\t\t<ul class="etalage-lijst" aria-label="Uitgelicht">\n' + stukken + '\n\t\t\t</ul>\n'
		+ '\t\t\t<a class="etalage-maatwerk" href="3d-printservice.html"><span>Eigen idee of 3D-bestand?</span> <strong>Ik print het voor je <span aria-hidden="true">→</span></strong></a>\n'
		+ '\t\t</div>\n';
}

// Snelle ingangen onder de kop: elk een filter op de producten verderop (src/js/shop.js zet het filter zonder te herladen)
function ingangen(winkel, ctx) {
	const site = ctx.site;
	const lijst = (winkel.ingangen || []).map(function (ing) {
		const groep = Object.keys(ing.filter)[0];
		const waarde = ing.filter[groep];
		const n = ctx.products.filter(function (p) {
			if (groep === 'prijs') return inBucket(h.minPrice(p), site.priceBuckets.find(function (b) { return b.id === waarde; }) || {});
			return p[{ type: 'type', collectie: 'collection', materiaal: 'material' }[groep]] === waarde;
		}).length;
		if (!n) return '';
		return '\t\t\t\t<li><a class="chip-link" href="webshop.html?' + groep + '=' + encodeURIComponent(waarde) + '#producten" data-filter-link>' + h.esc(ing.label) + ' <small>' + n + '</small></a></li>';
	}).filter(Boolean);
	if (!lijst.length) return '';
	return '\t\t\t<ul class="winkel-ingangen" aria-label="Snel naar">\n' + lijst.join('\n') + '\n\t\t\t</ul>\n';
}

// Drie feiten onderaan het vlak, alle drie uit de gegevens: hoeveel er dit jaar de deur uit ging (facturen, shop.json >
// geprint), in hoeveel winkels het ook ligt (shop.json > verkooppunten) en hoe snel het klaar is
function feiten(site) {
	const lijst = [];
	if (site.geprint && site.geprint.totaal) lijst.push('Dit jaar al ' + h.aantalTekst(site.geprint.totaal) + ' ontwerpen de deur uit');
	const winkels = site.verkooppunten || [];
	if (winkels.length) lijst.push('Ook te koop bij ' + winkels.length + ' winkels in Zuid-Limburg');
	if (site.delivery && site.delivery.leadTime) lijst.push(site.delivery.leadTime);
	return lijst.length ? '<ul class="container winkel-feiten">' + lijst.map(function (f) { return '<li>' + h.esc(f) + '</li>'; }).join('') + '</ul>' : '';
}

// Een uitgelicht blok tussen de producten (shop.json > winkel > uitgelicht). Alleen zichtbaar zonder filters en met de
// standaardvolgorde; src/js/shop.js zet het na het opgegeven aantal producten.
function spotlight(u, ctx) {
	const p = ctx.byId[u.id];
	if (!p) return '';
	const attrs = 'data-spot data-na="' + (u.na || 4) + '"';
	if (u.soort === 'ontwerp' && p.personalize) {
		return c.keychainTeaser(p, { heading: 'h3', className: 'winkel-spot winkel-spot--ontwerp', attrs: attrs });
	}
	// Een set: de foto, en de onderdelen als een som (eend + Joep + vlaai), met de prijs van de set
	const delen = (p.set || []).map(function (deel) {
		const q = ctx.byId[deel.id];
		if (!q) return '';
		const v = deel.variant ? q.variants.find(function (x) { return x.id === deel.variant; }) : null;
		const naam = q.name + (v && v.label ? ' ' + v.label : '');
		return '<li><a href="' + h.productUrl(q) + '">' + h.img(ctx.images, q.images[0].file, { alt: '', sizes: '96px', crop: true }) + '<span>' + h.esc(naam) + '</span></a></li>';
	}).join('');
	const url = h.productUrl(p);
	const knop = p.sale === 'cart' && p.variants.length === 1
		? '<button class="btn btn-primary" type="button" data-add="' + h.esc(p.id) + '" data-variant="' + h.esc(p.variants[0].id) + '">In winkelwagen<span class="sr-only">: ' + h.esc(p.name) + '</span></button>'
		: '<a class="btn btn-primary" href="' + url + '">Bekijk<span class="sr-only"> ' + h.esc(p.name) + '</span></a>';
	return '<article class="winkel-spot winkel-spot--set" ' + attrs + ' data-productfoto="' + h.esc(p.id) + '" aria-labelledby="spot-' + h.esc(p.id) + '">\n'
		+ '\t<a class="winkel-spot-beeld" href="' + url + '" tabindex="-1" aria-hidden="true">' + h.img(ctx.images, p.images[0].file, { alt: '', sizes: '(max-width: 899px) 92vw, 520px' }) + '</a>\n'
		+ '\t<div class="winkel-spot-tekst">\n'
		+ (p.badge ? '\t\t<p class="winkel-spot-label"><span class="etalage-label">' + h.esc(p.badge) + '</span></p>\n' : '')
		+ '\t\t<h3 id="spot-' + h.esc(p.id) + '" class="winkel-spot-kop"><a href="' + url + '">' + highlight(u.kop || p.name) + '</a></h3>\n'
		+ '\t\t<p class="winkel-spot-intro">' + h.esc(p.tagline) + '</p>\n'
		+ (delen ? '\t\t<ol class="winkel-som" aria-label="In de set">' + delen + '</ol>\n' : '')
		+ '\t\t<div class="winkel-spot-voet"><p class="winkel-spot-prijs">' + h.priceHtml(p) + ' <small>voor de hele set</small></p>' + knop + '</div>\n'
		+ '\t</div>\n'
		+ '</article>';
}

function shopPage(ctx) {
	const site = ctx.site;
	const products = ctx.products;
	const prices = products.map(h.minPrice).filter(function (p) { return p != null; });

	const winkel = site.winkel || {};

	const cards = products.map(function (product, i) {
		// De producten staan nu onder de etalage: alleen lazy laden (de etalage is het grote beeld bovenaan)
		return c.productCard(product, ctx, { index: i, heading: 'h3' });
	}).join('\n');
	const uitgelicht = (winkel.uitgelicht || []).map(function (u) { return spotlight(u, ctx); }).join('\n');

	const crumbs = [{ label: 'Home', path: '', url: './' }, { label: 'Webshop', path: 'webshop.html' }];
	const etalage = etalageStukken(winkel, ctx);
	const hero = '<div class="pijler winkel" data-pillar="tastbaar">\n'
		+ '<section class="pijler-hero winkel-hero" data-surface="tastbaar" aria-labelledby="winkel-titel">\n'
		+ '\t<div class="container winkel-hero-in">\n'
		+ '\t\t<div class="winkel-hero-tekst">\n'
		+ '\t\t\t' + c.breadcrumbs(crumbs) + '\n'
		// Uit de reel "one glance": in één regel wat je hier koopt, en daaronder voor wie
		+ '\t\t\t<h1 id="winkel-titel" class="pijler-titel winkel-titel">Vazen, lampen&nbsp;en <span class="highlight">Limburgse cadeaus</span></h1>\n'
		+ '\t\t\t<p class="pijler-lead">Zelf ontworpen en pas geprint als jij bestelt, in Kerkrade. Voor je interieur, als cadeau of gewoon voor jezelf.</p>\n'
		+ '\t\t\t<p class="deadline-note winkel-deadline" data-deadlines="' + h.esc(JSON.stringify(site.deadlines || [])) + '" hidden></p>\n'
		+ '\t\t\t<p class="cta-row pijler-knoppen"><a class="btn primary" href="#producten">Bekijk alle ' + products.length + ' ontwerpen</a></p>\n'
		+ ingangen(winkel, ctx)
		+ '\t\t</div>\n'
		+ etalage
		+ '\t</div>\n'
		+ '\t' + feiten(site) + '\n'
		+ '</section>\n'
		+ '<div class="pijler-band" aria-hidden="true"><i></i><i></i><i></i></div>\n'
		+ '</div>\n';

	const main = hero
		+ '<div class="container">\n'
		+ '\t<section class="shop winkel-alles" id="producten" aria-labelledby="producten-titel" tabindex="-1">\n'
		+ '\t\t<header class="section-head"><h2 id="producten-titel" data-shop-heading>Alle <span class="highlight">ontwerpen</span></h2></header>\n'
		+ '\t' + filters(ctx) + '\n'
		+ '\t\t<div class="shop-filters-backdrop" data-filter-close></div>\n'
		+ '\t\t<div class="shop-toolbar">\n'
		+ '\t\t\t<button type="button" class="btn outline shop-filter-toggle" data-filter-open aria-controls="shop-filters" aria-expanded="false">\n'
		+ '\t\t\t\t<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></svg>\n'
		+ '\t\t\t\tFilters <span class="shop-filter-badge" data-filter-badge hidden></span>\n'
		+ '\t\t\t</button>\n'
		+ '\t\t\t<p class="shop-count" role="status"><strong data-count>' + products.length + '</strong> <span data-count-label>producten</span></p>\n'
		+ '\t\t\t<label class="shop-sort">Sorteer op\n'
		+ '\t\t\t\t<select data-sort>\n'
		+ '\t\t\t\t\t<option value="">Aanbevolen</option>\n'
		+ '\t\t\t\t\t<option value="prijs-oplopend">Prijs: laag naar hoog</option>\n'
		+ '\t\t\t\t\t<option value="prijs-aflopend">Prijs: hoog naar laag</option>\n'
		+ '\t\t\t\t\t<option value="naam">Naam A-Z</option>\n'
		+ '\t\t\t\t</select>\n'
		+ '\t\t\t</label>\n'
		+ '\t\t</div>\n'
		+ '\t\t<div class="shop-active" data-active hidden></div>\n'
		+ '\t\t<div class="grid grid-products products" id="product-grid">\n' + cards + '\n' + uitgelicht + '\n\t\t</div>\n'
		+ '\t\t<div class="shop-empty" data-empty hidden>\n'
		+ '\t\t\t<p><strong>Geen producten gevonden</strong></p>\n'
		+ '\t\t\t<p>Met deze combinatie van filters is er niets. Probeer een filter minder.</p>\n'
		+ '\t\t\t<button type="button" class="btn btn-primary" data-filter-reset>Wis alle filters</button>\n'
		+ '\t\t</div>\n'
		+ '\t</section>\n'
		+ '</div>\n'
		+ c.reviewsSection(ctx.reviews, 'Wat klanten zeggen');

	// De vragen over bestellen, betalen en leveren (shop.json > faq); ze stonden eerst op Tastbaar
	const vragen = site.faq || [];
	const faq = vragen.length
		? '<section class="section container shop-vragen" aria-labelledby="shop-vragen-titel">\n'
			+ '\t<header class="section-head"><h2 id="shop-vragen-titel">Vragen over bestellen</h2></header>\n'
			+ '\t<div class="faq">\n' + vragen.map(function (item) { return '\t\t' + c.vraag(item.q, h.esc(item.a)); }).join('\n') + '\n\t</div>\n'
			+ '</section>\n'
		: '';

	return {
		path: 'webshop.html',
		root: '',
		name: 'shop',
		title: 'Webshop: 3D-geprinte vazen, lampen & cadeaus | ' + site.name, // 60 tekens met JelgersDesign
		description: 'Shop unieke 3D-geprinte designvazen, lampen en Limburgse cadeaus van ' + site.owner + '. Eigen ontwerp, speciaal voor jou geprint in Limburg. Vanaf ' + h.euro(Math.min.apply(null, prices)) + '.',
		// Een productfoto, net als op de categoriepagina's; de rest van de site deelt het beeld van de studio
		ogImage: ctx.images[products[0].images[0].file].og,
		// Het grote beeld van de etalage is het eerste wat je ziet: alvast ophalen
		preload: (winkel.etalage || []).length && ctx.byId[winkel.etalage[0].id]
			? { srcset: h.cropSrcset(ctx.images, winkel.etalage[0].foto || ctx.byId[winkel.etalage[0].id].images[0].file, ''), sizes: '(max-width: 899px) 52vw, 330px' }
			: null,
		jsonLd: [
			c.breadcrumbsLd(crumbs, site),
			{
				'@context': 'https://schema.org',
				'@type': 'ItemList',
				name: site.name + ' webshop',
				itemListElement: products.map(function (product, i) {
					return { '@type': 'ListItem', position: i + 1, url: site.url + '/' + h.productUrl(product), name: product.name };
				})
			}
		].concat(vragen.length ? [{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: vragen.map(function (item) {
				return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } };
			})
		}] : []),
		main: main + faq
	};
}

module.exports = shopPage;
