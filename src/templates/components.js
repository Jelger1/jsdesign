// Herbruikbare bouwstenen: productkaart, reviews, broodkruimels.
const h = require('./helpers');

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

const CARD_SIZES = '(max-width: 600px) 90vw, (max-width: 900px) 45vw, 320px';

// Browserbalk boven een website (portfolio en casepagina's), met de drie kleuren van het teken als knopjes
const BROWSERBALK = '<span class="project-browser" aria-hidden="true"><i></i><i></i><i></i></span>';

function kicker(product, ctx) {
	const type = ctx.site.types[product.type];
	const collection = ctx.site.collections[product.collection];
	return h.esc(type.singular) + ' · ' + h.esc(collection.label);
}

// De actie onderaan een kaart hangt af van hoe het product verkocht wordt. Een schermlezer hoort ook welk product het
// is ("In winkelwagen: Kami Vase"); de zichtbare tekst blijft het begin van die naam (WCAG 2.5.3).
function cardAction(product, root) {
	const url = h.productUrl(product, root);
	const naam = '<span class="sr-only">: ' + h.esc(product.name) + '</span>';
	if (product.personalize) return '<a class="btn btn-add-cart" href="' + url + '">Ontwerp de jouwe' + naam + '</a>';
	if (product.sale === 'cart' && product.variants.length === 1) {
		return '<button class="btn btn-add-cart" type="button" data-add="' + h.esc(product.id) + '" data-variant="' + h.esc(product.variants[0].id) + '">In winkelwagen' + naam + '</button>';
	}
	if (product.sale === 'cart') return '<a class="btn btn-add-cart" href="' + url + '">Kies je optie' + naam + '</a>';
	if (product.sale === 'external') return '<a class="btn outline" href="' + h.esc(product.externalUrl) + '" target="_blank" rel="noopener">' + h.esc(product.externalLabel) + naam + '</a>';
	if (product.sale === 'request') return '<a class="btn btn-add-cart" href="' + url + '">Vraag aan' + naam + '</a>';
	return '<a class="btn outline" href="' + url + '">Bekijk' + naam + '</a>';
}

function productCard(product, ctx, opts) {
	opts = opts || {};
	const root = opts.root || '';
	const url = h.productUrl(product, root);
	// Een eigen kaartpaar (products.json > kaart, bij de lampen: de lamp uit op het dressoir, bij hover dezelfde scène
	// met de lamp aan) gaat voor de eerste twee foto's van de galerij
	const beelden = product.kaart || product.images;
	const first = beelden[0];
	const second = beelden[1];
	// Een kaartbeeld is al als 4:5-scène gemaakt: heel tonen, niet inzoomen op het product
	const crop = !product.kaart;
	const price = h.priceHtml(product);
	// Koppen moeten netjes aflopen: direct onder de h1 van een pagina is een kaart een h2, binnen een sectie een h3
	const heading = opts.heading || 'h3';

	// Kaarten tonen de productuitsnede: vast 4:5-kader met het product in het midden
	let media = h.img(ctx.images, first.file, { alt: first.alt, sizes: opts.sizes || CARD_SIZES, root: root, eager: opts.eager, crop: crop });
	// Tweede foto vloeit in bij hover (alleen op apparaten met een muis)
	if (second) {
		media += h.img(ctx.images, second.file, { alt: '', sizes: opts.sizes || CARD_SIZES, root: root, className: 'product-thumb-alt', crop: crop });
	}

	return '<article class="product-card' + (opts.className ? ' ' + opts.className : '') + '"'
		+ ' data-id="' + h.esc(product.id) + '" data-type="' + h.esc(product.type) + '" data-collection="' + h.esc(product.collection) + '"'
		+ ' data-name="' + h.esc(product.name) + '"'
		+ (product.material ? ' data-material="' + h.esc(product.material) + '"' : '')
		+ (h.minPrice(product) != null ? ' data-price="' + h.minPrice(product) + '"' : '')
		// Alleen op de webshop: de volgorde voor "Aanbevolen"
		+ (opts.index != null ? ' data-index="' + opts.index + '"' : '') + ' data-rand>\n'
		+ '\t<a class="product-thumb" href="' + url + '" tabindex="-1" aria-hidden="true">' + media
		+ (product.sale === 'soon' ? '<span class="badge badge-promo">Binnenkort</span>' : (product.badge ? '<span class="badge badge-promo">' + h.esc(product.badge) + '</span>' : ''))
		// Een render zegt dat zelf, ook op de kaart
		+ (first.weergave === '3d' ? '<span class="product-weergave">3D-weergave</span>' : '')
		+ '</a>\n'
		+ '\t<div class="product-info">\n'
		+ (opts.zonderKicker ? '' : '\t\t<p class="product-kicker">' + kicker(product, ctx) + '</p>\n')
		+ '\t\t<' + heading + ' class="product-title"><a href="' + url + '">' + h.esc(product.name) + '</a></' + heading + '>\n'
		+ '\t\t<p class="muted">' + h.esc(product.tagline) + '</p>\n'
		+ '\t\t<div class="product-card-foot">\n'
		+ '\t\t\t' + (price ? '<p class="product-price">' + price + '</p>' : '<p class="product-price product-price-muted">Binnenkort</p>') + '\n'
		+ '\t\t\t' + cardAction(product, root) + '\n'
		+ '\t\t</div>\n'
		+ '\t</div>\n'
		+ '</article>';
}

function stars(rating) {
	let out = '<div class="review-stars" role="img" aria-label="' + rating + ' van 5 sterren">';
	for (let i = 1; i <= 5; i++) {
		out += '<svg class="' + (i <= rating ? 'star' : 'star-empty') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '"/></svg>';
	}
	return out + '</div>';
}

function reviewCard(review) {
	return '<li class="review-card">\n'
		+ '\t' + stars(review.rating) + '\n'
		+ '\t<blockquote class="review-text">“' + h.esc(review.text) + '”</blockquote>\n'
		+ '\t<p class="review-meta"><span class="review-author">' + h.esc(review.author) + '</span> <span class="review-product">' + h.esc(review.productLabel) + '</span></p>\n'
		+ '</li>';
}

// opts.root: pad naar de hoofdmap; opts.product: op een productpagina gaat de link naar het reviewformulier met dat
// product al ingevuld, en staat zonder reviews alleen de vraag of je er een wilt schrijven.
function reviewsSection(reviews, heading, opts) {
	opts = opts || {};
	const root = opts.root || '';
	const href = root + 'review.html' + (opts.product ? '?product=' + encodeURIComponent(opts.product.id) : '');
	if (!reviews.length) {
		if (!opts.product || opts.product.sale !== 'cart') return '';
		return '<p class="container review-vraag">Heb je de ' + h.esc(opts.product.name) + ' al? <a href="' + href + '">Vertel hoe hij bevalt</a></p>\n';
	}
	return '<section class="reviews-banner" aria-labelledby="reviews-heading">\n'
		+ '\t<h2 id="reviews-heading" class="reviews-heading">' + h.esc(heading) + '</h2>\n'
		+ '\t<ul class="reviews-track" tabindex="0" aria-label="Klantreviews, horizontaal te scrollen">\n'
		+ reviews.map(reviewCard).join('\n') + '\n'
		+ '\t</ul>\n'
		// Omnibus-regels (sinds 28 mei 2022): zeg erbij of en hoe je controleert dat reviews van echte kopers komen
		+ '\t<p class="reviews-check">Alleen reviews van mensen die echt bij mij kochten; ik controleer elke review voordat hij hier staat. <a href="' + href + '">Schrijf een review</a></p>\n'
		+ '</section>\n';
}

// "Maak je eigen sleutelhanger": de ontwerptool in het klein (src/js/keychain.js), op Tastbaar en tussen de producten
// in de webshop. opts.heading: h2 als eigen sectie, h3 binnen een sectie; opts.className: extra klasse op het blok.
function keychainTeaser(custom, opts) {
	opts = opts || {};
	const kop = opts.heading || 'h2';
	const url = h.productUrl(custom, opts.root);
	return '<div class="keychain-teaser' + (opts.className ? ' ' + opts.className : '') + '" data-keychain' + (opts.attrs ? ' ' + opts.attrs : '') + '>\n'
		+ '\t\t<div class="keychain-teaser-text">\n'
		+ '\t\t\t<p class="kicker">Nieuw: ontwerp zelf</p>\n'
		+ '\t\t\t<' + kop + ' id="keychain-heading">Maak je eigen sleutelhanger en laat hem <span class="highlight">printen</span></' + kop + '>\n'
		+ '\t\t\t<p>Jouw straat als echt straatnaambord aan je sleutelbos. Typ hieronder een naam en zie direct hoe hij wordt.</p>\n'
		+ '\t\t\t<div class="keychain-field">\n'
		+ '\t\t\t\t<label for="kc-teaser">' + h.esc(custom.personalize.label) + '</label>\n'
		+ '\t\t\t\t<input type="text" id="kc-teaser" class="keychain-input" data-keychain-input placeholder="' + h.esc(custom.personalize.placeholder) + '" autocomplete="off" autocapitalize="words" spellcheck="false">\n'
		+ '\t\t\t</div>\n'
		+ '\t\t\t<p class="cta-row"><a class="btn primary" href="' + url + '" data-keychain-link="' + url + '">Ontwerp de jouwe</a>'
		+ ' <span class="keychain-teaser-price">Speciaal voor jou geprint · <strong>' + h.priceLabel(custom) + '</strong></span></p>\n'
		+ '\t\t</div>\n'
		+ '\t\t<div class="keychain-stage">\n'
		+ '\t\t\t<span class="keychain-stage-label">Live voorbeeld</span>\n'
		+ '\t\t\t<canvas data-keychain-canvas role="img" aria-label="Voorbeeld van de sleutelhanger" width="1200" height="600"></canvas>\n'
		+ '\t\t</div>\n'
		+ '\t</div>';
}

// Horizontale rail met scroll-snap en vorige/volgende-knoppen
function productRail(products, ctx, opts) {
	opts = opts || {};
	return '<div class="rail" data-rail>\n'
		+ '\t<button class="rail-btn rail-btn-prev" type="button" aria-label="Vorige producten" data-rail-prev>‹</button>\n'
		+ '\t<div class="rail-track" data-rail-track>\n'
		+ products.map(function (p) { return productCard(p, ctx, { root: opts.root, className: 'rail-card', sizes: '300px' }); }).join('\n') + '\n'
		+ '\t</div>\n'
		+ '\t<button class="rail-btn rail-btn-next" type="button" aria-label="Volgende producten" data-rail-next>›</button>\n'
		+ '</div>';
}

// items: [{ label, url }] - het laatste item is de huidige pagina
function breadcrumbs(items) {
	return '<nav class="breadcrumbs" aria-label="Kruimelpad"><ol>'
		+ items.map(function (item, i) {
			const last = i === items.length - 1;
			return '<li>' + (last
				? '<span aria-current="page">' + h.esc(item.label) + '</span>'
				: '<a href="' + item.url + '">' + h.esc(item.label) + '</a>') + '</li>';
		}).join('')
		+ '</ol></nav>';
}

function breadcrumbsLd(items, site) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map(function (item, i) {
			return { '@type': 'ListItem', position: i + 1, name: item.label, item: site.url + '/' + item.path };
		})
	};
}

// Het blokje uit het teken als knop voor iets dat uitklapt (home.css > .uitklap): dicht de omtrek met een plus, open
// massief met een min. De laag eronder is de extrude bij aanwijzen. Alleen beeld: details/summary zegt zelf of het
// open of dicht is.
const BLOK_KNOP = '<span class="uitklap-blok" aria-hidden="true"><svg viewBox="0 0 34 21" focusable="false">'
	+ '<polygon class="uitklap-laag" points="33 9.3 17.1 20 1 11.7 16.9 1" transform="translate(0.75 0.75)"/>'
	+ '<polygon class="uitklap-vlak" points="33 9.3 17.1 20 1 11.7 16.9 1"/>'
	+ '<path class="uitklap-teken" d="M12.6 10.5h8.8"/><path class="uitklap-teken uitklap-v" d="M17 6.1v8.8"/></svg></span>';

// Een vraag met antwoord in een veelgestelde-vragenlijst. antwoord is al HTML (ge-escaped door de aanroeper).
function vraag(q, antwoord) {
	return '<details class="faq-item uitklap"><summary>' + BLOK_KNOP + '<span>' + h.esc(q) + '</span></summary><p>' + antwoord + '</p></details>';
}

// De voortgangslijn (wijzer.css, src/js/wijzer.js): een korte verticale lijn links naast de inhoud, met voor elk
// hoofdstuk of onderdeel een blokje uit het teken. Terwijl je leest loopt de lijn van boven naar beneden vol en zakt het
// blokje "hier" mee; gelezen blokjes zijn massief, wat nog komt is een stippelcontour. Met de muis toont een blokje zijn
// naam en spring je erheen. Eén aanwijzer voor waar je bent: geen nummers als "01 / 07", geen "Hierna" en geen balk.
// delen: [{ href, naam }]. nav: true als dit de inhoudsopgave van de pagina is (pijlerpagina's); op een casepagina
// staat "In dit verhaal" al bovenaan, dan is de lijn beeld met een snelkoppeling voor de muis.
const SPOOR_VORM = 'points="26,6.96 13.08,16 0,9.04 12.92,0" vector-effect="non-scaling-stroke"';
function spoor(delen, opts) {
	const nav = !!(opts && opts.nav);
	const punten = delen.map(function (d, i) {
		return '<li style="--i:' + i + '"><a class="spoor-punt" href="' + d.href + '"' + (nav ? '' : ' tabindex="-1"') + '>'
			+ '<svg viewBox="-3 -3 32 22" aria-hidden="true" focusable="false"><polygon ' + SPOOR_VORM + '/></svg>'
			+ '<span class="spoor-naam">' + h.esc(d.naam) + '</span></a></li>';
	}).join('');
	return (nav ? '<nav class="spoor" aria-label="Op deze pagina">' : '<div class="spoor" aria-hidden="true">')
		+ '<div class="spoor-baan" style="--n:' + delen.length + '">'
		+ '<span class="spoor-lijn" aria-hidden="true"><i class="spoor-vul"></i></span>'
		+ '<ol class="spoor-lijst">' + punten + '</ol>'
		+ '<span class="spoor-hier" aria-hidden="true"><svg viewBox="-5 -5 36 26" focusable="false">'
		+ '<polygon class="spoor-ring" ' + SPOOR_VORM + '/><polygon class="spoor-kern" ' + SPOOR_VORM + '/></svg></span>'
		+ '</div>'
		+ (nav ? '</nav>' : '</div>');
}

module.exports = {
	productCard: productCard, productRail: productRail, reviewsSection: reviewsSection,
	breadcrumbs: breadcrumbs, breadcrumbsLd: breadcrumbsLd, kicker: kicker, stars: stars, reviewCard: reviewCard,
	browserBalk: BROWSERBALK, blokKnop: BLOK_KNOP, vraag: vraag, keychainTeaser: keychainTeaser, spoor: spoor
};
