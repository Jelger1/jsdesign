// De drie pijlers van JS Design (data/pillars.json), elk een volledige hoofdpagina in de eigen kleurwereld: een hero in
// het pijlervlak met "Je bent hier", in het kort, diensten, werkwijze, uitgelicht werk, wat ik kan (bewijs uit dit vak),
// veelgestelde vragen en een afsluiter (src/css/pijler.css). De teksten staan in pillars.json > pagina, het bewijs in
// data/skills.json.
// Tastbaar (3d-printen.html) krijgt daarna de webshopsecties (src/templates/tastbaar.js); de vragen over de pijler staan
// daar in één FAQ met die over de webshop.
const h = require('./helpers');
const c = require('./components');
const seo = require('./seo');
const tastbaarSections = require('./tastbaar');
const skills = require('./skills');
const { DELEN, RICHTING } = require('./teken');

const getal = function (n) { return Math.round(n * 10) / 10; };

// "Je bent hier": het JS-teken op de tegel, in een vak van 400 x 400. Het deel van deze pijler is massief en schuift een
// stukje naar buiten langs zijn as (RICHTING, zie teken.js); de andere twee staan als stippelcontour, zoals in een
// technische tekening. Een dunne lijn loopt van het deel naar het label: eerst schuin onder 30°, dan recht.
// Elk deel krijgt zijn eigen lijn, punt en label: die van een andere pijler verschijnen als je dat deel aanwijst ("Naar
// Digitaal"), en de andere twee delen zijn links naar hun pijler (alleen voor de muis: de tegel is aria-hidden, en het
// menu heeft dezelfde links). Hoe ver een deel naar buiten staat, regelt de CSS (--uit, pijler.css).
const TEKEN = { x: 67.2, y: 82.2, schaal: 1.05 }; // het teken (253 x 235,83) midden in het vak
const WIJZER = {
	branding: { anker: [57, 81], hoek: 150, lengte: 76, eind: 70 },
	digitaal: { anker: [165, 42], hoek: 30, lengte: 76, eind: 70 },
	tastbaar: { anker: [215, 160], hoek: 330, lengte: 46, eind: 330 }
};
const UIT = 14; // hoe ver een uitgeschoven deel staat, in eenheden van het teken (pijler.css > .tegel-deel)

function richting(id, afstand) {
	const r = RICHTING[id] * Math.PI / 180;
	return { x: Math.cos(r) * afstand, y: -Math.sin(r) * afstand };
}

// pijlers: [{ id, label, path }] uit pillars.json
function hierTeken(actief, pijlers) {
	// Eerst de contouren, het massieve deel erboven
	const delen = ['digitaal', 'tastbaar', 'branding'].sort(function (a, b) { return (a === actief) - (b === actief); }).map(function (id) {
		const as = richting(id, 1);
		const vorm = DELEN[id].replace(/ fill="[^"]*"/, '').replace(/^<(\w+)/, '<$1 class="tegel-vorm"');
		const deel = '<g class="tegel-deel' + (id === actief ? ' is-hier' : '') + '" data-pillar="' + id + '" style="--rx:' + getal(as.x * 100) / 100 + ';--ry:' + getal(as.y * 100) / 100 + '">' + vorm + '</g>';
		if (id === actief) return deel;
		const p = pijlers.find(function (x) { return x.id === id; });
		return '<a class="tegel-link" href="' + h.esc(p.path) + '" tabindex="-1" data-naar="' + id + '">' + deel + '</a>';
	}).join('');
	const lijnen = ['branding', 'digitaal', 'tastbaar'].map(function (id) {
		const w = WIJZER[id];
		const uit = richting(id, UIT);
		const p0 = { x: TEKEN.x + TEKEN.schaal * (w.anker[0] + uit.x), y: TEKEN.y + TEKEN.schaal * (w.anker[1] + uit.y) };
		const r = w.hoek * Math.PI / 180;
		const p1 = { x: p0.x + Math.cos(r) * w.lengte, y: p0.y - Math.sin(r) * w.lengte };
		const punten = [p0, p1, { x: p1.x, y: w.eind }].map(function (p) { return getal(p.x) + ',' + getal(p.y); }).join(' ');
		const klasse = id === actief ? ' is-hier' : '';
		return '<polyline class="tegel-lijn' + klasse + '" data-pillar="' + id + '" points="' + punten + '" pathLength="1"/>'
			+ '<circle class="tegel-punt' + klasse + '" data-pillar="' + id + '" cx="' + getal(p0.x) + '" cy="' + getal(p0.y) + '" r="4"/>';
	}).join('');
	const labels = pijlers.map(function (p) {
		return p.id === actief
			? '<span class="pijler-hier-label is-hier" data-pillar="' + p.id + '">Je bent hier</span>'
			: '<a class="pijler-hier-label" data-pillar="' + p.id + '" data-naar="' + p.id + '" href="' + h.esc(p.path) + '" tabindex="-1">Naar ' + h.esc(p.label) + '</a>';
	}).join('');
	return '<svg class="pijler-teken" viewBox="0 0 400 400" focusable="false">'
		+ '<g transform="translate(' + TEKEN.x + ' ' + TEKEN.y + ') scale(' + TEKEN.schaal + ')">' + delen + '</g>'
		+ lijnen
		+ '</svg>'
		+ labels;
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
	// Een kaartbeeld (projects.json > kaart > 1610) is speciaal voor deze kaarten gemaakt; anders de gewone afbeelding
	const kaart = p.kaart && p.kaart['1610'];
	const file = kaart || p.image;
	const entry = ctx.images[file];
	const staand = entry.height > entry.width;
	// Eigen klassenamen (pijler-case-...): de casepagina's gebruiken case-... al voor iets anders
	return '\t\t<li class="pijler-case' + (staand ? ' pijler-case--staand' : '') + '" data-pillar="' + h.esc(p.pillar) + '" data-rand>\n'
		+ '\t\t\t<div class="pijler-case-beeld">' + h.img(ctx.images, file, {
			alt: kaart ? p.kaart.alt : p.alt,
			sizes: i === 0 ? '(max-width: 900px) 92vw, 760px' : '(max-width: 900px) 92vw, 600px'
		}) + '</div>\n'
		+ '\t\t\t<div class="pijler-case-tekst">\n'
		+ '\t\t\t\t<p class="pijler-case-tags"><span class="pijler-case-nr" aria-hidden="true">0' + (i + 1) + '</span>' + h.esc(p.tags) + (p.klantopdracht ? ' · klantopdracht' : '') + (p.team ? ' · teamproject' : '') + '</p>\n'
		+ '\t\t\t\t<h3 class="pijler-case-titel"><a href="' + skills.caseUrl(p) + '">' + h.esc(p.title) + '</a></h3>\n'
		+ '\t\t\t\t<p class="pijler-case-kort">' + h.esc(p.short) + '</p>\n'
		+ '\t\t\t\t<span class="pijler-case-meer" aria-hidden="true">Bekijk het project</span>\n'
		+ '\t\t\t</div>\n'
		+ '\t\t\t<span class="werk-open" aria-hidden="true">→</span>\n'
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
		+ '\t\t\t<div class="pijler-tegel">' + hierTeken(pillar.id, ctx.pillars) + '</div>\n'
		+ '\t\t</figure>\n'
		+ '\t</div>\n'
		+ '</section>\n'
		// De onderrand van het vlak: een trede onder 30° met een streep in een tweede merkkleur
		+ '<div class="pijler-band" aria-hidden="true"><i></i><i></i><i></i></div>\n';

	const kort = '<section id="kort" class="section container pijler-kort" aria-labelledby="kort-titel">\n'
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

	// Een trap: elke stap staat een trede hoger dan de vorige, verbonden door een lijn onder 30°. De twee lege spans zijn
	// de trede en de schuine lijn die zich bij het bouwen trekken (pijler.css > .trap, src/js/trap.js)
	const aanpak = '<section id="aanpak" class="section container pijler-aanpak" aria-labelledby="aanpak-titel">\n'
		+ sectieKop('Werkwijze', 'Zo werk ik', 'aanpak-titel')
		+ '\t<ol class="trap" style="--treden:' + pagina.aanpak.length + '">\n'
		+ pagina.aanpak.map(function (s, i) {
			return '\t\t<li style="--i:' + i + '"><span class="trap-nr" aria-hidden="true">' + (i + 1) + '</span>'
				+ '<span class="trap-lijn" aria-hidden="true"></span><span class="trap-schuin" aria-hidden="true"></span>'
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

	// Wat ik kan: geen opsomming (Diensten en Werkwijze zeggen het al), maar bewijs uit dit vak, elk met een link naar het
	// hoofdstuk of product waar het staat (skills.json > bewijsPijler); de laatste rij gaat naar alles op Over
	const kunde = '<section id="kunde" class="section container pijler-kunde bewijs-sectie" aria-labelledby="kunde-titel">\n'
		+ sectieKop('Wat ik kan', 'Uit de praktijk', 'kunde-titel')
		+ skills.bewijsLijst(ctx.skills.bewijsPijler[pillar.id].map(function (id) { return { id: id, pijler: pillar.id }; }), ctx, { open: 'Alles wat ik kan' }) + '\n'
		+ '</section>\n';

	const faq = '<section id="vragen" class="section container pijler-faq" aria-labelledby="faq-titel">\n'
		+ '\t<header class="section-head section-head-center">\n\t\t<p class="kicker">Goed om te weten</p>\n\t\t<h2 id="faq-titel">Veelgestelde vragen</h2>\n\t</header>\n'
		+ '\t<div class="faq">\n'
		+ pagina.faq.map(function (item) {
			return '\t\t' + c.vraag(item.q, h.esc(item.a));
		}).join('\n') + '\n'
		+ '\t</div>\n'
		+ '</section>\n';

	const cta = '<section class="section container pijler-cta" aria-labelledby="cta-titel">\n'
		+ '\t<div class="cta-band">\n'
		+ '\t\t<div class="cta-band-tekst">\n'
		+ '\t\t\t<h2 id="cta-titel">Iets in gedachten?</h2>\n'
		+ '\t\t\t<p>Vertel kort wat je zoekt. Je krijgt antwoord van mij persoonlijk, meestal binnen 3 tot 4 werkdagen.</p>\n'
		+ '\t\t</div>\n'
		+ '\t\t<p class="cta-row"><a class="btn primary" href="contact.html">Bespreek je project</a> <span class="cta-band-mail">of mail naar ' + h.mailLink(site.email, '') + '</span></p>\n'
		+ '\t</div>\n'
		+ '\t<nav class="pijler-ook" aria-label="Ook bij JS Design">\n'
		+ '\t\t<p class="pijler-label">Ook bij JS Design</p>\n'
		+ '\t\t<ul>\n'
		+ andere.map(function (p) {
			return '\t\t\t<li data-pillar="' + p.id + '"><a href="' + h.esc(p.path) + '"><span class="pijler-ook-naam">' + h.esc(p.label) + '</span> '
				+ '<span class="pijler-ook-wat">' + h.esc(p.omschrijving) + '</span></a></li>';
		}).join('\n') + '\n'
		+ '\t\t</ul>\n'
		+ '\t</nav>\n'
		+ '</section>';

	// De sectiewijzer (wijzer.css, src/js/wijzer.js): de onderdelen van de pagina in een smalle balk onder de hero, die
	// onder de header blijft staan tot na de vragen. In rust een inhoudsopgave; tijdens het lezen loopt het stuk lijn
	// onder het onderdeel waar je bent vol. De aantallen laten zien hoeveel er in een onderdeel staat. Op Tastbaar staan
	// alle webshopsecties onder één onderdeel. Op een telefoon is het één knop met het onderdeel waar je bent; de lijst
	// opent dan als paneel (popover), net als "Inhoud" op de casepagina's.
	const vragen = shop ? shop.jsonLd[0].mainEntity.length : pagina.faq.length;
	const onderdelen = [
		{ id: 'kort', naam: 'In het kort' },
		{ id: 'diensten', naam: 'Diensten', tal: pagina.diensten.length },
		{ id: 'aanpak', naam: 'Werkwijze', tal: pagina.aanpak.length },
		{ id: 'werk', naam: 'Werk', tal: cases.length },
		{ id: 'kunde', naam: 'Wat ik kan' }
	].concat(shop ? [{ id: 'webshop', naam: 'Webshop' }] : []).concat([{ id: 'vragen', naam: 'Vragen', tal: vragen }]);
	const wijzer = '<nav class="wijzer" aria-label="Op deze pagina">\n'
		+ '\t<div class="wijzer-in">\n'
		+ '\t\t<button class="wijzer-knop" type="button" popovertarget="onderdelen"><span class="wijzer-knop-naam">Op deze pagina</span>'
		+ '<span class="wijzer-knop-tal"></span><span class="wijzer-knop-open">Inhoud</span></button>\n'
		+ '\t\t<div class="wijzer-paneel" id="onderdelen" popover tabindex="-1">\n'
		+ '\t\t\t<p class="wijzer-paneel-kop">Op deze pagina</p>\n'
		+ '\t\t\t<ol class="wijzer-lijst">\n'
		+ onderdelen.map(function (o) {
			return '\t\t\t\t<li><a href="#' + o.id + '"><span class="wijzer-naam">' + o.naam + '</span>'
				+ (o.tal ? ' <span class="wijzer-tal" aria-hidden="true">' + o.tal + '</span>' : '') + '</a>'
				+ '<i class="wijzer-stuk" aria-hidden="true"><b></b></i></li>';
		}).join('\n') + '\n'
		+ '\t\t\t</ol>\n'
		+ '\t\t</div>\n'
		+ '\t\t<span class="wijzer-lijn" aria-hidden="true">' + onderdelen.map(function () { return '<i></i>'; }).join('') + '</span>\n'
		+ '\t</div>\n'
		+ '</nav>\n';

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
		// De hero staat in zijn eigen .pijler; de rest (met de sectiewijzer en op Tastbaar de webshop) in .pijler-inhoud,
		// waarbinnen de wijzer blijft staan. De webshopsecties horen niet in een .pijler (hun koppen houden hun eigen kleur).
		main: '<div class="pijler" data-pillar="' + pillar.id + '">\n'
			+ hero
			+ '</div>\n'
			+ '<div class="pijler-inhoud" data-pillar="' + pillar.id + '">\n'
			+ wijzer
			+ '<div class="pijler" data-pillar="' + pillar.id + '">\n'
			+ kort + diensten + aanpak + werk + kunde + (shop ? '' : faq)
			+ '</div>\n'
			+ (shop ? shop.html + '\n' : '')
			+ '</div>\n'
			+ cta
	};
}

module.exports = { pillarPage: pillarPage };
