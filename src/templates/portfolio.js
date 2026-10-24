// Het portfolio (portfolio/index.html) met de projecten uit data/projects.json (src/css/portfolio.css).
// Tier A: grote kaarten, beeld voorop en om en om links en rechts, met "Lees de case" naar de eigen casepagina
// (src/templates/case.js). Tier B: een compacte lijst "Ook gemaakt". Elk project heeft zijn id als anker
// (portfolio/#rolduc); de pijler van een project (data-pillar) kleurt het blokje en het bovenkopje, net als op de
// pijlerpagina's.
const h = require('./helpers');
const c = require('./components');
const seo = require('./seo');
const { caseCover, caseCoverAlt } = require('./case');

const ROOT = '../';

function nieuwVenster(label) {
	return label + ' <span aria-hidden="true">↗</span><span class="sr-only"> (opent in een nieuw venster)</span>';
}

function project(p, ctx, eerste) {
	const pillar = ctx.pillars.find(function (x) { return x.id === p.pillar; });
	// Hetzelfde beeld als bovenaan de casepagina, zodat je herkent waar je op klikt
	const file = caseCover(p);
	const entry = ctx.images[file];
	const caseLink = p.id + '.html'; // de casepagina staat in dezelfde map
	// Een staand beeld (etiket, foto) staat helemaal in beeld op een vlak; een liggend beeld vult het kader
	const staand = entry.height > entry.width;
	const img = h.img(ctx.images, file, {
		root: ROOT, alt: caseCoverAlt(p), eager: eerste,
		sizes: staand ? '(max-width: 900px) 75vw, 320px' : '(max-width: 900px) 92vw, (max-width: 1280px) 54vw, 680px'
	});
	// Het beeld linkt ook naar de case, maar alleen voor de muis: de kop en de knop zijn de echte links
	const media = staand
		? '<a class="project-media project-media-staand" href="' + caseLink + '" tabindex="-1" aria-hidden="true">' + img + '</a>'
		: '<a class="project-media" href="' + caseLink + '" tabindex="-1" aria-hidden="true">' + (p.pillar === 'digitaal' ? c.browserBalk : '') + img + '</a>';
	return '\t\t<article id="' + h.esc(p.id) + '" class="project" data-pillar="' + h.esc(p.pillar) + '">\n'
		+ '\t\t\t' + media + '\n'
		+ '\t\t\t<div class="project-text">\n'
		+ '\t\t\t\t<p class="kicker">' + h.esc(pillar.label) + '</p>\n'
		+ '\t\t\t\t<h2><a href="' + caseLink + '">' + h.esc(p.title) + '</a></h2>\n'
		+ '\t\t\t\t<p class="project-meta"><span class="project-tags">' + h.esc(p.tags) + '</span>' + (p.team ? ' <span class="project-team">Teamproject</span>' : '') + '</p>\n'
		+ '\t\t\t\t<p class="project-desc">' + h.esc(p.text) + '</p>\n'
		+ '\t\t\t\t<p class="project-link"><a class="btn primary" href="' + caseLink + '">Lees de case<span class="sr-only"> over ' + h.esc(p.title) + '</span></a>'
		+ (p.url ? ' <a class="btn-text project-live" href="' + h.esc(p.url) + '" target="_blank" rel="noopener">' + nieuwVenster('Bekijk ' + h.esc(p.urlLabel || 'het project')) + '</a>' : '')
		+ '</p>\n'
		+ '\t\t\t</div>\n'
		+ '\t\t</article>';
}

// Tier B: titel, één zin, het blokje van de pijler en eventueel een live link
function ookGemaakt(p, ctx) {
	const pillar = ctx.pillars.find(function (x) { return x.id === p.pillar; });
	return '\t\t\t<li id="' + h.esc(p.id) + '" class="ook-item" data-pillar="' + h.esc(p.pillar) + '">\n'
		+ '\t\t\t\t<span class="ook-blok" aria-hidden="true"></span>\n'
		+ '\t\t\t\t<div class="ook-kop"><h3>' + h.esc(p.title) + '</h3><p class="ook-tags"><span class="sr-only">' + h.esc(pillar.label) + ': </span>' + h.esc(p.tags) + (p.team ? ' · teamproject' : '') + '</p></div>\n'
		+ '\t\t\t\t<p class="ook-tekst">' + h.esc(p.text) + '</p>\n'
		+ (p.url ? '\t\t\t\t<p class="ook-link"><a class="btn-text" href="' + h.esc(p.url) + '" target="_blank" rel="noopener">' + nieuwVenster('Bekijk ' + h.esc(p.urlLabel || 'het project')) + '</a></p>\n' : '')
		+ '\t\t\t</li>';
}

// Gestructureerde gegevens: de projecten als lijst van creatieve werken, van Jelger (bij een teamproject als bijdrager).
// Een case heeft hetzelfde @id als op zijn eigen pagina (portfolio/<id>.html#werk).
function itemList(ctx) {
	const site = ctx.site;
	const jelger = { '@id': seo.ids(site).person };
	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Portfolio van ' + site.name,
		numberOfItems: ctx.projects.length,
		itemListElement: ctx.projects.map(function (p, i) {
			const adres = site.url + '/' + h.projectUrl(p);
			const werk = {
				'@type': 'CreativeWork',
				'@id': p.tier === 'A' ? adres + '#werk' : adres,
				name: p.title,
				description: p.text,
				keywords: p.tags.split(' · ').join(', '),
				url: p.tier === 'A' ? adres : (p.url || adres)
			};
			if (p.tier === 'A') werk.image = site.url + '/' + h.imgPath(ctx.images, caseCover(p), 1200, '');
			werk[p.team ? 'contributor' : 'creator'] = jelger;
			return { '@type': 'ListItem', position: i + 1, item: werk };
		})
	};
}

function portfolioPage(ctx) {
	const site = ctx.site;
	const crumbs = [{ label: 'Home', url: ROOT, path: '' }, { label: 'Portfolio', path: 'portfolio/' }];
	const cases = ctx.projects.filter(function (p) { return p.tier === 'A'; });
	const ook = ctx.projects.filter(function (p) { return p.tier === 'B'; });
	return {
		path: 'portfolio/index.html',
		root: ROOT,
		name: 'portfolio',
		section: 'portfolio',
		schemaType: 'CollectionPage',
		noindex: true, // tot fase 3 (zie NOINDEX_TOT_FASE_3 in tools/check.js)
		title: 'Portfolio · branding, websites & interactie | ' + site.name,
		description: 'Werk van ' + site.name + ' uit Kerkrade: websites, interactieve verhalen en branding, van de site van Brouwerij Rolduc tot een verhaal over het WMC.',
		ogImage: ctx.images[site.defaultOgImage].og,
		jsonLd: [c.breadcrumbsLd(crumbs, site), itemList(ctx)],
		main: '<div class="container portfolio-page">\n'
			+ '\t' + c.breadcrumbs(crumbs) + '\n'
			+ '\t<header class="portfolio-head">\n'
			+ '\t\t<p class="kicker">Werk</p>\n'
			+ '\t\t<h1>Portfolio</h1>\n'
			+ '\t\t<p class="portfolio-intro">Een selectie van mijn werk: websites, interactieve verhalen, branding en 3D. Bij elk project vertel ik hoe het tot stand kwam.</p>\n'
			+ '\t</header>\n'
			+ '\t<div class="portfolio-list">\n'
			+ cases.map(function (p, i) { return project(p, ctx, i === 0); }).join('\n') + '\n'
			+ '\t</div>\n'
			+ (ook.length ? '\t<section class="portfolio-ook" aria-labelledby="ook-titel">\n'
				+ '\t\t<h2 id="ook-titel">Ook gemaakt</h2>\n'
				+ '\t\t<p class="portfolio-ook-intro">Kleinere projecten, teamwerk en interne tools.</p>\n'
				+ '\t\t<ul class="ook-lijst">\n'
				+ ook.map(function (p) { return ookGemaakt(p, ctx); }).join('\n') + '\n'
				+ '\t\t</ul>\n'
				+ '\t</section>\n' : '')
			+ '\t<div class="portfolio-cta">\n'
			+ '\t\t<h2>Een website, merk of interactief verhaal laten maken?</h2>\n'
			+ '\t\t<p class="cta-row"><a class="btn primary" href="' + ROOT + 'contact.html">Neem contact op</a></p>\n'
			+ '\t</div>\n'
			+ '</div>'
	};
}

module.exports = portfolioPage;
