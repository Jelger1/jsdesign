// Het portfolio (portfolio/index.html): de projecten uit data/projects.json, beeld voorop, om en om links en rechts
// (src/css/portfolio.css). Elk project is een <article> met zijn id als anker; de home linkt zo naar portfolio/#rolduc.
// De pijler van een project (data-pillar) kleurt het blokje en het bovenkopje, net als op de pijlerpagina's.
const h = require('./helpers');
const c = require('./components');
const seo = require('./seo');

const ROOT = '../';
// Browserbalk boven een website, met de drie kleuren van het teken als knopjes
const BROWSERBALK = '<span class="project-browser" aria-hidden="true"><i></i><i></i><i></i></span>';

function project(p, ctx, eerste) {
	const pillar = ctx.pillars.find(function (x) { return x.id === p.pillar; });
	const entry = ctx.images[p.image];
	// Een staand beeld (de poster) staat helemaal in beeld op een vlak; een liggend beeld vult het kader
	const staand = entry.height > entry.width;
	const img = h.img(ctx.images, p.image, {
		root: ROOT, alt: p.alt, eager: eerste,
		sizes: staand ? '(max-width: 900px) 75vw, 320px' : '(max-width: 900px) 92vw, (max-width: 1280px) 54vw, 680px'
	});
	const media = staand
		? '<div class="project-media project-media-staand">' + img + '</div>'
		: '<div class="project-media">' + (p.pillar === 'digitaal' ? BROWSERBALK : '') + img + '</div>';
	return '\t\t<article id="' + h.esc(p.id) + '" class="project" data-pillar="' + h.esc(p.pillar) + '">\n'
		+ '\t\t\t' + media + '\n'
		+ '\t\t\t<div class="project-text">\n'
		+ '\t\t\t\t<p class="kicker">' + h.esc(pillar.label) + '</p>\n'
		+ '\t\t\t\t<h2>' + h.esc(p.title) + '</h2>\n'
		+ '\t\t\t\t<p class="project-meta"><span class="project-tags">' + h.esc(p.tags) + '</span>' + (p.team ? ' <span class="project-team">Teamproject</span>' : '') + '</p>\n'
		+ '\t\t\t\t<p class="project-desc">' + h.esc(p.text) + '</p>\n'
		+ (p.url ? '\t\t\t\t<p class="project-link"><a class="btn outline" href="' + h.esc(p.url) + '" target="_blank" rel="noopener">Bekijk ' + h.esc(p.urlLabel || 'het project') + ' <span aria-hidden="true">↗</span><span class="sr-only"> (opent in een nieuw venster)</span></a></p>\n' : '')
		+ '\t\t\t</div>\n'
		+ '\t\t</article>';
}

// Gestructureerde gegevens: de projecten als lijst van creatieve werken, van Jelger (bij een teamproject als bijdrager)
function itemList(ctx) {
	const site = ctx.site;
	const jelger = { '@id': seo.ids(site).person };
	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		name: 'Portfolio van ' + site.name,
		numberOfItems: ctx.projects.length,
		itemListElement: ctx.projects.map(function (p, i) {
			const anker = site.url + '/portfolio/#' + p.id;
			const werk = {
				'@type': 'CreativeWork',
				'@id': anker,
				name: p.title,
				description: p.text,
				image: site.url + '/' + h.imgPath(ctx.images, p.image, 1200, ''),
				keywords: p.tags.split(' · ').join(', '),
				url: p.url || anker
			};
			werk[p.team ? 'contributor' : 'creator'] = jelger;
			return { '@type': 'ListItem', position: i + 1, item: werk };
		})
	};
}

function portfolioPage(ctx) {
	const site = ctx.site;
	const crumbs = [{ label: 'Home', url: ROOT, path: '' }, { label: 'Portfolio', path: 'portfolio/' }];
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
			+ '\t\t<p class="portfolio-intro">Een selectie van mijn werk: websites, interactieve verhalen en branding.</p>\n'
			+ '\t</header>\n'
			+ '\t<div class="portfolio-list">\n'
			+ ctx.projects.map(function (p, i) { return project(p, ctx, i === 0); }).join('\n') + '\n'
			+ '\t</div>\n'
			+ '\t<div class="portfolio-cta">\n'
			+ '\t\t<h2>Een website, merk of interactief verhaal laten maken?</h2>\n'
			+ '\t\t<p class="cta-row"><a class="btn primary" href="' + ROOT + 'contact.html">Neem contact op</a></p>\n'
			+ '\t</div>\n'
			+ '</div>'
	};
}

module.exports = portfolioPage;
