// De drie pijlers van JS Design (data/pillars.json), elk een volledige hoofdpagina in de eigen kleurwereld: een hero in
// het pijlervlak met "Je bent hier", in het kort, diensten, werkwijze, uitgelicht werk, wat ik kan, veelgestelde vragen
// en een afsluiter (src/css/pijler.css). De teksten staan in pillars.json > pagina, de vaardigheden in data/skills.json.
// Tastbaar (3d-printen.html) krijgt daarna de webshopsecties (src/templates/tastbaar.js); de vragen over de pijler staan
// daar in één FAQ met die over de webshop.
const h = require('./helpers');
const c = require('./components');
const seo = require('./seo');
const tastbaarSections = require('./tastbaar');
const skills = require('./skills');
const { DELEN, RICHTING } = require('./hub');

const getal = function (n) { return Math.round(n * 10) / 10; };

// "Je bent hier": het JS-teken op de tegel, in een vak van 400 x 400. Het deel van deze pijler is massief en schuift een
// stukje naar buiten langs zijn as (RICHTING, zoals in de hub); de andere twee staan als stippelcontour, zoals in een
// technische tekening. Een dunne lijn loopt van het deel naar het label: eerst schuin onder 30°, dan recht.
const TEKEN = { x: 67.2, y: 82.2, schaal: 1.05 }; // het teken (253 x 235,83) midden in het vak
const WIJZER = {
	branding: { anker: [57, 81], hoek: 150, lengte: 76, eind: 70 },
	digitaal: { anker: [165, 42], hoek: 30, lengte: 76, eind: 70 },
	tastbaar: { anker: [215, 160], hoek: 330, lengte: 46, eind: 330 }
};

function richting(id, afstand) {
	const r = RICHTING[id] * Math.PI / 180;
	return { x: Math.cos(r) * afstand, y: -Math.sin(r) * afstand };
}

function hierTeken(actief) {
	const uit = richting(actief, 14);
	// Eerst de contouren, het massieve deel erboven
	const delen = ['digitaal', 'tastbaar', 'branding'].sort(function (a, b) { return (a === actief) - (b === actief); }).map(function (id) {
		const d = id === actief ? uit : richting(id, 5);
		const vorm = id === actief
			? DELEN[id].replace(/^<(\w+)/, '<$1 class="pijler-deel is-hier"')
			: DELEN[id].replace(/ fill="[^"]*"/, ' class="pijler-deel"');
		return '<g transform="translate(' + getal(d.x) + ' ' + getal(d.y) + ')">' + vorm + '</g>';
	}).join('');
	const w = WIJZER[actief];
	const p0 = { x: TEKEN.x + TEKEN.schaal * (w.anker[0] + uit.x), y: TEKEN.y + TEKEN.schaal * (w.anker[1] + uit.y) };
	const r = w.hoek * Math.PI / 180;
	const p1 = { x: p0.x + Math.cos(r) * w.lengte, y: p0.y - Math.sin(r) * w.lengte };
	const punten = [p0, p1, { x: p1.x, y: w.eind }].map(function (p) { return getal(p.x) + ',' + getal(p.y); }).join(' ');
	return '<svg class="pijler-teken" viewBox="0 0 400 400" focusable="false">'
		+ '<g transform="translate(' + TEKEN.x + ' ' + TEKEN.y + ') scale(' + TEKEN.schaal + ')">' + delen + '</g>'
		+ '<polyline class="pijler-wijzer" points="' + punten + '"/>'
		+ '<circle class="pijler-wijzer-punt" cx="' + getal(p0.x) + '" cy="' + getal(p0.y) + '" r="4"/>'
		+ '</svg>';
}

// "Design & branding": het deel na het &-teken is het accent, op een eigen regel
function titel(tekst) {
	const i = tekst.indexOf(' & ');
	if (i === -1) return h.esc(tekst);
	return h.esc(tekst.slice(0, i + 2)) + ' <span class="highlight">' + h.esc(tekst.slice(i + 3)) + '</span>';
}

function sectieKop(kicker, kop, id) {
	return '\t<header class="section-head">\n'
		+ '\t\t<p class="kicker">' + kicker + '</p>\n'
		+ '\t\t<h2 id="' + id + '">' + kop + '</h2>\n'
		+ '\t</header>\n';
}

// Een case als grote beeldkaart. De titel is de link en dekt de hele kaart (zo blijft de linknaam kort). Een staand beeld
// (de poster) staat helemaal in beeld op het isometrische raster, net als op het portfolio.
function caseKaart(p, i, ctx) {
	const entry = ctx.images[p.image];
	const staand = entry.height > entry.width;
	// Eigen klassenamen (pijler-case-...): de casepagina's gebruiken case-... al voor iets anders
	return '\t\t<li class="pijler-case' + (staand ? ' pijler-case--staand' : '') + '" data-pillar="' + h.esc(p.pillar) + '">\n'
		+ '\t\t\t<div class="pijler-case-beeld">' + h.img(ctx.images, p.image, {
			alt: p.alt,
			sizes: i === 0 ? '(max-width: 900px) 92vw, 760px' : '(max-width: 900px) 92vw, 600px'
		}) + '</div>\n'
		+ '\t\t\t<div class="pijler-case-tekst">\n'
		+ '\t\t\t\t<p class="pijler-case-tags"><span class="pijler-case-nr" aria-hidden="true">0' + (i + 1) + '</span>' + h.esc(p.tags) + (p.team ? ' · teamproject' : '') + '</p>\n'
		+ '\t\t\t\t<h3 class="pijler-case-titel"><a href="' + skills.caseUrl(p) + '">' + h.esc(p.title) + '</a></h3>\n'
		+ '\t\t\t\t<p class="pijler-case-kort">' + h.esc(p.short) + '</p>\n'
		+ '\t\t\t\t<span class="pijler-case-meer" aria-hidden="true">Bekijk het project</span>\n'
		+ '\t\t\t</div>\n'
		+ '\t\t</li>';
}

function faqLd(items) {
	return {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: items.map(function (item) {
			return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } };
		})
	};
}

// tastbaarTemplate: src/pages/tastbaar.html. Alleen de pijler Tastbaar gebruikt het (zie bovenaan)
function pillarPage(pillar, ctx, tastbaarTemplate) {
	const site = ctx.site;
	const pagina = pillar.pagina;
	const nr = '0' + (ctx.pillars.indexOf(pillar) + 1);
	const crumbs = [{ label: 'Home', url: './', path: '' }, { label: pillar.label, path: pillar.path }];
	const shop = pillar.id === 'tastbaar' ? tastbaarSections(ctx, tastbaarTemplate, pagina.faq) : null;
	const cases = (pagina.cases || []).map(function (id) { return ctx.projects.find(function (p) { return p.id === id; }); }).filter(Boolean);
	const andere = ctx.pillars.filter(function (p) { return p.id !== pillar.id; });

	const hero = '<section class="pijler-hero" data-surface="' + pillar.id + '" aria-labelledby="pijler-titel">\n'
		+ '\t<div class="container pijler-hero-in">\n'
		+ '\t\t<div class="pijler-hero-tekst">\n'
		+ '\t\t\t' + c.breadcrumbs(crumbs) + '\n'
		+ '\t\t\t<p class="kicker pijler-kicker"><span class="pijler-nr" aria-hidden="true">' + nr + '</span>' + h.esc(pillar.label) + '</p>\n'
		+ '\t\t\t<h1 id="pijler-titel" class="pijler-titel">' + titel(pillar.h1) + '</h1>\n'
		+ '\t\t\t<p class="pijler-lead">' + h.esc(pagina.lead || pillar.summary) + '</p>\n'
		+ '\t\t\t<p class="cta-row pijler-knoppen"><a class="btn primary" href="contact.html">Bespreek je project</a> <a class="btn outline" href="#werk">Bekijk het werk</a></p>\n'
		+ '\t\t</div>\n'
		+ '\t\t<figure class="pijler-hier pijler-hier--' + pillar.id + '" aria-hidden="true">\n'
		+ '\t\t\t<div class="pijler-tegel">' + hierTeken(pillar.id) + '<span class="pijler-hier-label">Je bent hier</span></div>\n'
		+ '\t\t</figure>\n'
		+ '\t</div>\n'
		+ '</section>\n'
		// De onderrand van het vlak: een trede onder 30° met een streep in een tweede merkkleur
		+ '<div class="pijler-band" aria-hidden="true"><i></i><i></i><i></i></div>\n';

	const kort = '<section class="section container pijler-kort" aria-labelledby="kort-titel">\n'
		+ '\t<h2 id="kort-titel" class="pijler-label">In het kort</h2>\n'
		+ '\t<p class="pijler-kort-tekst">' + h.esc(pagina.kort) + '</p>\n'
		+ '</section>\n';

	// De home linkt naar de diensten (#diensten)
	const diensten = '<section id="diensten" class="section container pijler-diensten" aria-labelledby="diensten-titel">\n'
		+ sectieKop('Diensten', 'Wat ik voor je <span class="highlight">' + h.esc(pagina.werkwoord) + '</span>', 'diensten-titel')
		+ '\t<ol class="dienst-index">\n'
		+ pagina.diensten.map(function (d, i) {
			return '\t\t<li class="dienst"><span class="dienst-nr" aria-hidden="true">0' + (i + 1) + '</span>'
				+ '<h3 class="dienst-naam">' + h.esc(d.naam) + '</h3><p class="dienst-tekst">' + h.esc(d.tekst) + '</p></li>';
		}).join('\n') + '\n'
		+ '\t</ol>\n'
		+ '</section>\n';

	// Een trap: elke stap staat een trede hoger dan de vorige, verbonden door een lijn onder 30°
	const aanpak = '<section class="section container pijler-aanpak" aria-labelledby="aanpak-titel">\n'
		+ sectieKop('Werkwijze', 'Zo werk ik', 'aanpak-titel')
		+ '\t<ol class="trap" style="--treden:' + pagina.aanpak.length + '">\n'
		+ pagina.aanpak.map(function (s, i) {
			return '\t\t<li style="--i:' + i + '"><span class="trap-nr" aria-hidden="true">' + (i + 1) + '</span>'
				+ '<h3>' + h.esc(s.stap) + '</h3><p>' + h.esc(s.tekst) + '</p></li>';
		}).join('\n') + '\n'
		+ '\t</ol>\n'
		// Tastbaar: hoe een bestelling uit de webshop gaat (korter, zonder ontwerp en proefprint)
		+ (pagina.aanpakNoot ? '\t<p class="trap-noot">' + h.esc(pagina.aanpakNoot) + '</p>\n' : '')
		+ '</section>\n';

	// Het laatste vak gaat naar het portfolio, zodat de sectie ook zonder (gevonden) cases iets toont
	const werk = '<section id="werk" class="section container pijler-werk" aria-labelledby="werk-titel">\n'
		+ sectieKop('Uitgelicht werk', 'Wat ik eerder <span class="highlight">maakte</span>', 'werk-titel')
		+ '\t<ul class="pijler-case-raster">\n'
		+ cases.map(function (p, i) { return caseKaart(p, i, ctx); }).join('\n') + (cases.length ? '\n' : '')
		+ '\t\t<li class="pijler-case-alle"><a href="portfolio/"><span class="pijler-case-alle-label">Portfolio</span><strong>Meer werk bekijken</strong>'
		+ '<span>Alle projecten op een rij, met wat ik deed en hoe.</span></a></li>\n'
		+ '\t</ul>\n'
		+ '</section>\n';

	const kunde = '<section class="section container pijler-kunde" aria-labelledby="kunde-titel">\n'
		+ '\t<header class="section-head section-head-row">\n'
		+ '\t\t<div>\n\t\t\t<p class="kicker">Vaardigheden</p>\n\t\t\t<h2 id="kunde-titel">Wat ik kan</h2>\n\t\t</div>\n'
		+ '\t\t<a class="link-arrow" href="over.html">Meer over mij</a>\n'
		+ '\t</header>\n'
		+ skills.lijst(skills.groepen(ctx, pillar.id), ctx, { max: 6 }) + '\n'
		+ '</section>\n';

	const faq = '<section class="section container pijler-faq" aria-labelledby="faq-titel">\n'
		+ '\t<header class="section-head section-head-center">\n\t\t<p class="kicker">Goed om te weten</p>\n\t\t<h2 id="faq-titel">Veelgestelde vragen</h2>\n\t</header>\n'
		+ '\t<div class="faq">\n'
		+ pagina.faq.map(function (item) {
			return '\t\t<details class="faq-item"><summary>' + h.esc(item.q) + '</summary><p>' + h.esc(item.a) + '</p></details>';
		}).join('\n') + '\n'
		+ '\t</div>\n'
		+ '</section>\n';

	const cta = '<section class="section container pijler-cta" aria-labelledby="cta-titel">\n'
		+ '\t<div class="cta-band">\n'
		+ '\t\t<div class="cta-band-tekst">\n'
		+ '\t\t\t<h2 id="cta-titel">Iets in gedachten?</h2>\n'
		+ '\t\t\t<p>Vertel kort wat je zoekt. Je krijgt antwoord van mij persoonlijk.</p>\n'
		+ '\t\t</div>\n'
		+ '\t\t<p class="cta-row"><a class="btn primary" href="contact.html">Bespreek je project</a> <span class="cta-band-mail">of mail naar ' + h.mailLink(site.email, '') + '</span></p>\n'
		+ '\t</div>\n'
		+ '\t<nav class="pijler-ook" aria-label="Ook bij JS Design">\n'
		+ '\t\t<p class="pijler-label">Ook bij JS Design</p>\n'
		+ '\t\t<ul>\n'
		+ andere.map(function (p) {
			return '\t\t\t<li data-pillar="' + p.id + '"><a href="' + h.esc(p.path) + '"><span class="pijler-ook-naam">' + h.esc(p.label) + '</span> '
				+ '<span class="pijler-ook-wat">' + h.esc(p.hub.kort) + '</span></a></li>';
		}).join('\n') + '\n'
		+ '\t\t</ul>\n'
		+ '\t</nav>\n'
		+ '</section>';

	// De diensten van de pijler als dienst van de studio, voor zoekmachines en AI-assistenten
	const dienstLd = {
		'@context': 'https://schema.org',
		'@type': 'Service',
		name: pillar.h1,
		serviceType: (pillar.pagina && pillar.pagina.serviceType) || pillar.label,
		description: pagina.kort,
		provider: { '@id': seo.ids(site).organization },
		areaServed: [{ '@type': 'AdministrativeArea', name: 'Limburg' }, { '@type': 'Country', name: 'Nederland' }],
		hasOfferCatalog: {
			'@type': 'OfferCatalog',
			name: (pillar.pagina && pillar.pagina.serviceType) || pillar.label,
			itemListElement: pagina.diensten.map(function (d) {
				return { '@type': 'Offer', itemOffered: { '@type': 'Service', name: d.naam, description: d.tekst } };
			})
		}
	};

	return {
		path: pillar.path,
		root: '',
		name: 'pillar',
		pillar: pillar.id,
		section: pillar.id,
		title: pillar.seo.title + ' | ' + site.name,
		description: pillar.seo.description,
		ogImage: ((pillar.pagina && pillar.pagina.ogImage && ctx.images[pillar.pagina.ogImage]) || ctx.images[site.defaultOgImage]).og,
		jsonLd: [c.breadcrumbsLd(crumbs, site), dienstLd].concat(shop ? shop.jsonLd : [faqLd(pagina.faq)]),
		main: '<div class="pijler" data-pillar="' + pillar.id + '">\n'
			+ hero + kort + diensten + aanpak + werk + kunde + (shop ? '' : faq)
			+ '</div>\n'
			+ (shop ? shop.html + '\n' : '')
			+ cta
	};
}

module.exports = { pillarPage: pillarPage };
