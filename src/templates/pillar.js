// De drie pijlers van JS Design (data/pillars.json) en de pagina's die in fase 3 hun volledige inhoud krijgen.
// Tot dan zijn het nette, niet-geïndexeerde tussenpagina's, zodat menu, footer en interne links al kloppen.
const h = require('./helpers');
const c = require('./components');
const tastbaarSections = require('./tastbaar');

// tastbaarTemplate: src/pages/tastbaar.html. Alleen de pijler Tastbaar gebruikt het: onder de intro staan daar de
// webshopsecties die eerst op de homepage stonden (src/templates/tastbaar.js)
function pillarPage(pillar, ctx, tastbaarTemplate) {
	const site = ctx.site;
	const crumbs = [{ label: 'Home', url: './', path: '' }, { label: pillar.label, path: pillar.path }];
	const services = pillar.services.map(function (s) { return '\t\t<li>' + h.esc(s) + '</li>'; }).join('\n');
	const links = (pillar.links || []).map(function (l) {
		return '<a class="btn outline" href="' + h.esc(l.path) + '">' + h.esc(l.label) + '</a>';
	});
	const shop = pillar.id === 'tastbaar' ? tastbaarSections(ctx, tastbaarTemplate) : null;
	return {
		path: pillar.path,
		root: '',
		name: 'pillar',
		pillar: pillar.id,
		section: pillar.id,
		noindex: true, // volledige inhoud volgt in fase 3
		title: pillar.seo.title + ' | ' + site.name,
		description: pillar.seo.description,
		ogImage: ctx.images[site.defaultOgImage].og,
		jsonLd: [c.breadcrumbsLd(crumbs, site)].concat(shop ? shop.jsonLd : []),
		// De diensten hebben een anker (#diensten): de home linkt ernaartoe
		main: '<div class="container text-page pillar-page" data-pillar="' + pillar.id + '">\n'
			+ '\t' + c.breadcrumbs(crumbs) + '\n'
			+ '\t<p class="kicker">' + h.esc(pillar.label) + '</p>\n'
			+ '\t<h1>' + h.esc(pillar.h1) + '</h1>\n'
			+ '\t<p class="text-page-intro">' + h.esc(pillar.summary) + '</p>\n'
			+ '\t<ul id="diensten" class="check-list">\n' + services + '\n\t</ul>\n'
			+ (shop ? '' : '\t<p class="text-page-note">Deze pagina is in opbouw: hier komen binnenkort de werkwijze, cases en veelgestelde vragen.</p>\n')
			+ '\t<p class="cta-row">' + links.concat('<a class="btn primary" href="contact.html">Neem contact op</a>').join(' ') + '</p>\n'
			+ '</div>'
			+ (shop ? '\n' + shop.html : '')
	};
}

// spec: { path, root, section, kicker, h1, intro, title, description }
function placeholderPage(spec, ctx) {
	const site = ctx.site;
	const root = spec.root || '';
	return {
		path: spec.path,
		root: root,
		name: 'placeholder',
		section: spec.section,
		noindex: true,
		title: spec.title + ' | ' + site.name,
		description: spec.description,
		ogImage: ctx.images[site.defaultOgImage].og,
		main: '<div class="container text-page">\n'
			+ '\t<p class="kicker">' + h.esc(spec.kicker) + '</p>\n'
			+ '\t<h1>' + h.esc(spec.h1) + '</h1>\n'
			+ '\t<p class="text-page-intro">' + spec.intro + '</p>\n'
			+ '\t<p class="cta-row"><a class="btn primary" href="' + root + 'webshop.html">Naar de webshop</a> <a class="btn outline" href="' + (root || './') + '">Naar de homepage</a></p>\n'
			+ '</div>'
	};
}

// Het portfolio (src/templates/portfolio.js) en de contactpagina (contactPage in src/templates/pages.js) zijn al echte
// pagina's
function placeholderPages(ctx) {
	return [
		placeholderPage({ path: 'over.html', section: 'over', kicker: 'Over', h1: 'Over JS Design',
			title: 'Over JS Design · Jelger Sieler', description: 'JS Design (voorheen JelgerS3D) is de ontwerpstudio van Jelger Sieler in Kerkrade.',
			intro: 'JS Design is de ontwerpstudio van Jelger Sieler in Kerkrade, voorheen JelgerS3D. Het 3D-werk blijft; het plaatje is nu compleet. Deze pagina is in opbouw.' }, ctx)
	];
}

module.exports = { pillarPage: pillarPage, placeholderPages: placeholderPages };
