// Een casepagina voor elk project uit tier A (data/projects.json > case): portfolio/<id>.html.
// Opbouw: de hero in de kleurwereld van de pijler (kicker met blokje, titel, lead, cover en specificaties), "In het
// kort" (40-60 woorden: het antwoord eerst, ook voor AI-assistenten), de hoofdstukken van het proces, het resultaat met
// de live link en een tekstlink naar contact, wat ik leerde, de verantwoording (credits, mockups, AI), twee verwante
// cases en de contactband.
// Scanbaar: per hoofdstuk een korte kop en één of twee korte alinea's; de rest staat achter "Lees meer". Waar je bent,
// toont één verticale voortgangslijn links (components.js > spoor), zonder nummers. Elk beeld heeft een onderschrift,
// en een voor/na-paar ("paar": true, de eerste twee beelden van een hoofdstuk) staat vanaf 600px naast elkaar.
// Stijlen: src/css/case.css. Bewust zonder in- of opschuivende animaties.
//
// projects.json > case (build.js > validateCase controleert dit):
//   gemaakt ("2026-04-11", dateCreated), jaar, context, rol, team (alleen rollen, geen namen), techniek [..],
//   lead (één zin onder de titel), kort (40-60 woorden), beschrijving (meta description, hooguit 155 tekens),
//   cover + coverAlt (anders image en alt van het project), kader ("browser" voor schermen), seoTitel (als de titel te
//   lang wordt), hoofdstukken [{ titel, alineas [..], meer [..] (achter "Lees meer"), paar, beelden [{ file, alt,
//   bijschrift, breed }] }], resultaat { alineas, beelden }, geleerd [..] (alleen in eigen woorden), noot
//   (verantwoording: credits, mockups, AI), pagina { href, label } (een pagina op deze site), verwant [twee ids],
//   akkoord (true zodra de toestemmingen voor publicatie er zijn).
const h = require('./helpers');
const c = require('./components');
const seo = require('./seo');

const ROOT = '../';
// De kop van de contactband onderaan, per pijler
const CTA = {
	branding: 'Een merk of etiket laten ontwerpen?',
	digitaal: 'Een website of interactief verhaal laten maken?',
	tastbaar: 'Iets laten ontwerpen of 3D-printen?'
};
// Hoe breed een beeld op het scherm komt (case.css): de tekstkolom is vanaf 900px 8/12 van de container
const SIZES = {
	cover: '(max-width: 900px) 92vw, 720px',
	coverStaand: '(max-width: 900px) 80vw, 480px',
	gewoon: '(max-width: 900px) 92vw, 800px',
	breed: '(max-width: 1280px) 92vw, 1216px',
	staand: '(max-width: 600px) 80vw, 420px',
	paar: '(max-width: 600px) 92vw, (max-width: 1280px) 46vw, 600px',
	paarStaand: '(max-width: 600px) 92vw, (max-width: 900px) 46vw, 400px',
	kaart: '(max-width: 700px) 92vw, 600px'
};

function cover(p) { return p.case.cover || p.image; }
function coverAlt(p) { return p.case.coverAlt || p.alt; }

// De titel in de zoekresultaten: "<titel> · case | JelgersDesign". Te lang (meer dan 60 tekens)? Dan case.seoTitel.
function titel(p, site) { return (p.case.seoTitel || p.title) + ' · case | ' + site.name; }

// Alle beelden van een case, voor de beeldpijplijn (build.js > used)
function images(p) {
	const files = [cover(p)];
	p.case.hoofdstukken.concat(p.case.resultaat).forEach(function (hs) {
		(hs.beelden || []).forEach(function (b) { files.push(b.file); });
	});
	return files;
}

function staand(ctx, file) {
	const entry = ctx.images[file];
	return entry.height > entry.width;
}

// Eén beeld met onderschrift (zonder "Fig. 3": nergens verwijst de tekst naar een nummer). sizes is er alleen bij een
// paar; anders volgt het uit het beeld zelf: breed, staand (niet groter dan nodig) of de tekstkolom.
function figuur(ctx, b, sizes) {
	const rechtop = !sizes && !b.breed && staand(ctx, b.file);
	const img = h.img(ctx.images, b.file, {
		root: ROOT, alt: b.alt,
		sizes: sizes || (b.breed ? SIZES.breed : rechtop ? SIZES.staand : SIZES.gewoon)
	});
	return '<figure class="case-fig' + (b.breed ? ' case-fig--breed' : '') + (rechtop ? ' case-fig--staand' : '') + '">'
		+ '<div class="case-fig-beeld">' + img + '</div>'
		+ (b.bijschrift ? '<figcaption>' + h.esc(b.bijschrift) + '</figcaption>' : '')
		+ '</figure>';
}

// Voor en na naast elkaar. Twee liggende beelden (schermen) krijgen de volle breedte, staande (telefoons, etiketten)
// blijven in de tekstkolom.
function paar(ctx, beelden) {
	const liggend = beelden.every(function (b) { return !staand(ctx, b.file); });
	return '<div class="case-paar' + (liggend ? ' case-paar--breed' : '') + '">'
		+ beelden.map(function (b) { return figuur(ctx, b, liggend ? SIZES.paar : SIZES.paarStaand); }).join('')
		+ '</div>';
}

function alineas(lijst) {
	return (lijst || []).map(function (a) { return '<p>' + h.esc(a) + '</p>'; }).join('');
}

// Het blokje uit het teken, één keer in de pagina; de lijst "In dit verhaal" gebruikt het als opsommingsteken
const BLOKDEF = '<svg class="wijzer-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>'
	+ '<polygon id="blok" points="26,6.96 13.08,16 0,9.04 12.92,0" vector-effect="non-scaling-stroke"/></defs></svg>';

// De hoofdstukken als lijst met links: "In dit verhaal" onder "In het kort". Het resultaat valt op: daar springen veel
// lezers meteen naartoe.
function inhoud(titels, klasse) {
	return '<ol class="' + klasse + '">'
		+ titels.map(function (t, i) {
			return '<li' + (t === 'Resultaat' ? ' class="is-resultaat"' : '') + '><a href="#hoofdstuk-' + (i + 1) + '">'
				+ '<svg class="toc-blok" viewBox="-2 -2 30 20" aria-hidden="true" focusable="false"><use href="#blok"/></svg>'
				+ '<span class="toc-titel">' + h.esc(t) + '</span></a></li>';
		}).join('')
		+ '</ol>';
}

// Een hoofdstuk: de kop (vanaf 900px blijft hij links staan zolang je in het hoofdstuk leest), daarnaast korte alinea's
// of een lijst, details achter "Lees meer" en de beelden in de tekstkolom. Brede beelden (en voor/na-paren van
// schermen) komen daarna over de volle breedte: zo blijft de kop staan tot het einde van de tekstkolom.
// extra: wat er nog onder de tekst hoort (de links bij het resultaat); na: wat de tekstkolom afsluit (de vraag naar
// contact bij het resultaat).
function stap(ctx, hs, i, extra, na) {
	const n = i + 1;
	const id = 'stap-' + n;
	const beelden = hs.beelden || [];
	const tweetal = hs.paar ? beelden.slice(0, 2) : [];
	const los = hs.paar ? beelden.slice(2) : beelden;
	const tweetalBreed = tweetal.length > 0 && tweetal.every(function (b) { return !staand(ctx, b.file); });
	const tekst = alineas(hs.alineas)
		+ (hs.lijst ? '<ul class="case-lijst">' + hs.lijst.map(function (l) { return '<li>' + h.esc(l) + '</li>'; }).join('') + '</ul>' : '')
		+ (hs.meer && hs.meer.length
			? '<details class="case-meer uitklap"><summary>' + c.blokKnop + '<span>Lees meer<span class="sr-only"> over ' + h.esc(hs.titel.toLowerCase()) + '</span></span></summary>' + alineas(hs.meer) + '</details>'
			: '')
		+ (extra || '');
	// Eerst alles in de tekstkolom, dan de brede beelden
	let lijf = '\t\t\t\t<div class="case-stap-tekst">' + tekst + '</div>\n';
	if (tweetal.length && !tweetalBreed) lijf += '\t\t\t\t' + paar(ctx, tweetal) + '\n';
	los.filter(function (b) { return !b.breed; }).forEach(function (b) { lijf += '\t\t\t\t' + figuur(ctx, b) + '\n'; });
	if (na) lijf += '\t\t\t\t' + na + '\n';
	let breed = '';
	if (tweetalBreed) breed += '\t\t' + paar(ctx, tweetal) + '\n';
	los.filter(function (b) { return b.breed; }).forEach(function (b) { breed += '\t\t' + figuur(ctx, b) + '\n'; });
	return '\t<section class="case-stap" id="hoofdstuk-' + n + '" aria-labelledby="' + id + '">\n'
		+ '\t\t<div class="case-stap-romp">\n'
		+ '\t\t\t<div class="case-stap-kop">'
		+ '<h2 id="' + id + '">' + h.esc(hs.titel) + '</h2>'
		+ '</div>\n'
		+ '\t\t\t<div class="case-stap-lijf">\n' + lijf + '\t\t\t</div>\n'
		+ '\t\t</div>\n'
		+ breed
		+ '\t</section>';
}

// Een uitspraak van de opdrachtgever bij het resultaat (projects.json > case.citaat): letterlijk, met hun eigen
// ondertekening en alleen met hun akkoord. Een rustig citaat, geen sterren of beoordeling.
function citaat(k) {
	if (!k.citaat || !k.citaat.tekst) return '';
	return '<figure class="case-citaat"><blockquote><p>' + h.esc(k.citaat.tekst) + '</p></blockquote>'
		+ '<figcaption>' + h.esc(k.citaat.bron) + '</figcaption></figure>';
}

// De live link (nieuw venster) en een eventuele pagina op deze site (bijvoorbeeld de webshop)
function links(p) {
	const out = [];
	if (p.url) {
		out.push('<a class="btn primary" href="' + h.esc(p.url) + '" target="_blank" rel="noopener">Bekijk ' + h.esc(p.urlLabel || 'het project')
			+ ' <span aria-hidden="true">↗</span><span class="sr-only"> (opent in een nieuw venster)</span></a>');
	}
	if (p.case.pagina) {
		out.push('<a class="btn ' + (out.length ? 'outline' : 'primary') + '" href="' + ROOT + h.esc(p.case.pagina.href) + '">Bekijk ' + h.esc(p.case.pagina.label) + '</a>');
	}
	return out.length ? '<p class="case-links">' + out.join(' ') + '</p>' : '';
}

// De hero in de kleurwereld van de pijler. Mobiel: tekst, cover, specificaties; vanaf 900px staat de cover rechts.
function hero(p, ctx, pillar, crumbs, coverSizes) {
	const k = p.case;
	const file = cover(p);
	const rechtop = staand(ctx, file);
	const spec = [['Context', k.context], ['Jaar', k.jaar], ['Rol', k.rol], ['Team', k.team], ['Techniek', k.techniek.join(', ')]];
	return '<header class="case-hero" data-surface="' + h.esc(p.pillar) + '">\n'
		+ '\t<div class="case-hero-in">\n'
		+ '\t\t' + c.breadcrumbs(crumbs) + '\n'
		+ '\t\t<div class="case-hero-grid">\n'
		+ '\t\t\t<div class="case-hero-tekst">\n'
		+ '\t\t\t\t<p class="kicker">' + h.esc(pillar.label) + '</p>\n'
		+ '\t\t\t\t<h1>' + h.esc(p.title) + '</h1>\n'
		+ '\t\t\t\t<p class="case-lead">' + h.esc(k.lead) + '</p>\n'
		+ '\t\t\t</div>\n'
		+ '\t\t\t<figure class="case-cover' + (rechtop ? ' case-cover--staand' : '') + '">'
		+ (k.kader === 'browser' && !rechtop ? c.browserBalk : '')
		+ h.img(ctx.images, file, { root: ROOT, alt: coverAlt(p), eager: true, sizes: coverSizes })
		+ '</figure>\n'
		+ '\t\t\t<dl class="case-spec">'
		+ spec.map(function (r) { return '<div class="case-spec-rij"><dt>' + r[0] + '</dt><dd>' + h.esc(r[1]) + '</dd></div>'; }).join('')
		+ '</dl>\n'
		+ '\t\t</div>\n'
		+ '\t</div>\n'
		+ '</header>';
}

// Twee verwante cases als beeldkaarten; de hele kaart is klikbaar via de link in de kop
function verwant(p, ctx) {
	const items = p.case.verwant.map(function (id) {
		const v = ctx.projects.find(function (x) { return x.id === id; });
		const vp = ctx.pillars.find(function (x) { return x.id === v.pillar; });
		const file = cover(v);
		return '\t\t<li class="verwant-kaart" data-pillar="' + h.esc(v.pillar) + '" data-rand>\n'
			+ '\t\t\t<div class="verwant-beeld' + (staand(ctx, file) ? ' verwant-beeld--staand' : '') + '">' + h.img(ctx.images, file, { root: ROOT, alt: '', sizes: SIZES.kaart }) + '</div>\n'
			+ '\t\t\t<div class="verwant-tekst">\n'
			+ '\t\t\t\t<p class="verwant-kicker">' + h.esc(vp.label) + '</p>\n'
			+ '\t\t\t\t<h3><a href="' + h.esc(v.id) + '.html">' + h.esc(v.title) + '</a></h3>\n'
			+ '\t\t\t\t<p>' + h.esc(v.case.lead) + '</p>\n'
			+ '\t\t\t</div>\n'
			+ '\t\t\t<span class="werk-open" aria-hidden="true">→</span>\n'
			+ '\t\t</li>';
	});
	return '<section class="container case-verwant" aria-labelledby="verwant-titel">\n'
		+ '\t<div class="case-verwant-kop"><h2 id="verwant-titel">Meer werk</h2><a class="link-arrow" href="./">Alle projecten</a></div>\n'
		+ '\t<ul class="verwant-lijst">\n' + items.join('\n') + '\n\t</ul>\n'
		+ '</section>';
}

// Gestructureerde gegevens: de case als creatief werk van Jelger (bij een teamproject als bijdrager)
function creativeWork(p, ctx, url) {
	const site = ctx.site;
	const jelger = { '@id': seo.ids(site).person };
	const tags = p.tags.split(' · ');
	const werk = {
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		'@id': url + '#werk',
		name: p.title,
		description: p.case.kort,
		image: site.url + '/' + h.imgPath(ctx.images, cover(p), 1600, ''),
		dateCreated: p.case.gemaakt,
		about: tags.map(function (t) { return { '@type': 'Thing', name: t.charAt(0).toUpperCase() + t.slice(1) }; }),
		keywords: tags.join(', '),
		inLanguage: 'nl-NL',
		url: url,
		mainEntityOfPage: { '@id': url + '#webpage' }
	};
	// Bij een teamproject is Jelger een van de makers; het team staat (zonder namen) in de tekst
	werk.creator = jelger;
	if (!p.team) werk.author = jelger;
	return werk;
}

// De hoofdstukken in de volgorde van de pagina: het proces, het resultaat en (als die er is) wat ik leerde. Het anker
// van een hoofdstuk is zijn plek in die lijst (#hoofdstuk-3), zodat links van elders (skills.js: het bewijs bij Wat ik
// kan) op één manier tellen; build.js controleert dat de titel bestaat.
function hoofdstukTitels(p) {
	const k = p.case;
	return k.hoofdstukken.map(function (hs) { return hs.titel; })
		.concat(['Resultaat'], k.geleerd && k.geleerd.length ? ['Wat ik leerde'] : []);
}
function hoofdstukAnker(p, titel) {
	const i = hoofdstukTitels(p).indexOf(titel);
	return i === -1 ? '' : '#hoofdstuk-' + (i + 1);
}

function casePage(p, ctx) {
	const site = ctx.site;
	const k = p.case;
	const pillar = ctx.pillars.find(function (x) { return x.id === p.pillar; });
	const path = 'portfolio/' + p.id + '.html';
	const url = site.url + '/' + path;
	const crumbs = [{ label: 'Home', url: ROOT, path: '' }, { label: 'Portfolio', url: './', path: 'portfolio/' }, { label: p.title, path: path }];
	const entry = ctx.images[cover(p)];
	const coverSizes = staand(ctx, cover(p)) ? SIZES.coverStaand : SIZES.cover;

	// Het proces, daarna het resultaat (met de links en een tekstlink naar contact) en wat ik leerde, in dezelfde volgorde.
	// De verantwoording telt niet mee: dat is geen hoofdstuk van het verhaal.
	const lijst = k.hoofdstukken.concat([{ titel: 'Resultaat', alineas: k.resultaat.alineas, beelden: k.resultaat.beelden, paar: k.resultaat.paar }]);
	if (k.geleerd && k.geleerd.length) lijst.push({ titel: 'Wat ik leerde', lijst: k.geleerd });
	const titels = hoofdstukTitels(p);
	const vraag = '<p class="case-vraag">Iets vergelijkbaars nodig? <a class="link-arrow" href="' + ROOT + 'contact.html">Vertel over je project</a></p>';
	const stappen = lijst.map(function (hs, i) {
		const resultaat = hs.titel === 'Resultaat';
		return stap(ctx, hs, i, resultaat ? citaat(k) + links(p) : '', resultaat ? vraag : '');
	});

	return {
		path: path,
		root: ROOT,
		name: 'case',
		section: 'portfolio',
		pillar: p.pillar,
		schemaType: 'ItemPage',
		title: titel(p, site),
		description: k.beschrijving,
		ogImage: entry.og || ctx.images[site.defaultOgImage].og,
		// De cover is het grootste beeld boven de vouw: alvast laden
		preload: { srcset: entry.variants.map(function (v) { return ROOT + 'assets/img/' + v.file + ' ' + v.w + 'w'; }).join(', '), sizes: coverSizes },
		jsonLd: [c.breadcrumbsLd(crumbs, site), creativeWork(p, ctx, url)],
		main: '<article class="case" data-pillar="' + h.esc(p.pillar) + '">\n'
			+ BLOKDEF + '\n'
			+ hero(p, ctx, pillar, crumbs, coverSizes) + '\n'
			+ '<section class="container case-kort" aria-labelledby="kort-titel">\n'
			+ '\t<h2 id="kort-titel">In het kort</h2>\n'
			+ '\t<p>' + h.esc(k.kort) + '</p>\n'
			+ '</section>\n'
			+ '<nav class="container toc" aria-labelledby="toc-titel">\n'
			+ '\t<h2 id="toc-titel">In dit verhaal</h2>\n'
			+ '\t' + inhoud(titels, 'toc-lijst') + '\n'
			+ '</nav>\n'
			// Waar je bent in het verhaal: de voortgangslijn links (alleen beeld; "In dit verhaal" hierboven is de route)
			+ c.spoor(titels.map(function (t, i) { return { href: '#hoofdstuk-' + (i + 1), naam: t }; })) + '\n'
			+ '<div class="container case-stappen">\n' + stappen.join('\n') + '\n</div>\n'
			+ (k.noot ? '<section class="container case-noot" aria-labelledby="noot-titel">\n\t<h2 id="noot-titel">Verantwoording</h2>\n\t<p>' + h.esc(k.noot) + '</p>\n</section>\n' : '')
			+ verwant(p, ctx) + '\n'
			+ '<section class="container case-cta" aria-labelledby="cta-titel">\n'
			+ '\t<div class="cta-band" data-surface="' + p.pillar + '">\n'
			+ '\t\t<div class="cta-band-tekst">\n'
			+ '\t\t\t<h2 id="cta-titel">' + h.esc(CTA[p.pillar]) + '</h2>\n'
			+ '\t\t\t<p>Vertel me wat je in gedachten hebt. Je krijgt antwoord van mij persoonlijk, meestal binnen 3 tot 4 werkdagen.</p>\n'
			+ '\t\t</div>\n'
			+ '\t\t<p class="cta-row"><a class="btn primary" href="' + ROOT + 'contact.html">Neem contact op</a><span class="cta-band-mail">of mail naar ' + h.mailLink(site.email, ROOT) + '</span></p>\n'
			+ '\t</div>\n'
			+ '</section>\n'
			+ '</article>'
	};
}

module.exports = { casePage: casePage, caseImages: images, caseCover: cover, caseCoverAlt: coverAlt, caseTitel: titel, hoofdstukAnker: hoofdstukAnker };
