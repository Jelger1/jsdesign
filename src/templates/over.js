// De Over-pagina (over.html): wie ik ben, wat ik kan (data/skills.json: alles, als index per vak met per groep een
// voorbeeld; de "Alles wat ik kan"-rijen op de home en de pijlerpagina's landen op #kunde), hoe ik werk en waarmee.
// De vaste tekst staat in src/pages/over.html, de stijl in src/css/over.css.
const h = require('./helpers');
const c = require('./components');
const seo = require('./seo');
const skills = require('./skills');

function overPage(ctx, template) {
	const site = ctx.site;
	const crumbs = [{ label: 'Home', url: './', path: '' }, { label: 'Over', path: 'over.html' }];
	const portret = site.homeImages.about;
	const id = seo.ids(site);

	// Gereedschap als specificatielijst: per groep de programma's als gewone tekst (geen pillen die op knoppen lijken)
	const gereedschap = '<dl class="gereedschap">\n' + ((ctx.skills && ctx.skills.gereedschap) || []).map(function (g) {
		return '\t\t<div><dt>' + h.esc(g.groep) + '</dt><dd><ul class="gereedschap-lijst">'
			+ g.items.map(function (item) { return '<li>' + h.esc(item) + '</li>'; }).join('') + '</ul></dd></div>';
	}).join('\n') + '\n\t</dl>';

	const main = h.fill(template.replace(/^<!--[\s\S]*?-->\s*/, ''), {
		breadcrumbs: c.breadcrumbs(crumbs),
		portret: h.img(ctx.images, portret.file, { alt: portret.alt, sizes: '(max-width: 900px) 70vw, 440px', eager: true }),
		kunde: skills.index(ctx),
		gereedschap: gereedschap,
		mail: h.mailLink(site.email, '')
	});

	return {
		path: 'over.html',
		root: '',
		name: 'over',
		section: 'over',
		// Een AboutPage over de persoon Jelger (dezelfde @id als in de graaf op elke pagina, src/templates/seo.js)
		schemaType: 'AboutPage',
		about: id.person,
		title: 'Over Jelger Sieler · ontwerper en maker | ' + site.name,
		description: 'Jelger Sieler is de maker achter ' + site.name + ' in Kerkrade: branding, websites en interactieve verhalen, en 3D-printen. Wat ik kan, hoe ik werk en waarmee.',
		ogImage: ctx.images[portret.file].og,
		jsonLd: [c.breadcrumbsLd(crumbs, site), {
			'@context': 'https://schema.org',
			'@type': 'Person',
			'@id': id.person,
			image: site.url + '/' + h.imgPath(ctx.images, portret.file, 800, ''),
			knowsAbout: skills.groepen(ctx).map(function (g) { return g.groep; })
		}],
		main: main
	};
}

module.exports = overPage;
