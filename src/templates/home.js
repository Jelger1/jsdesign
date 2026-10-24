// De homepage: de hub (src/templates/hub.js) en daaronder uitgelicht werk, de webshop, de maker, de FAQ en contact.
// De inhoud van de oude webshophome (categorieën, rails, stappen, op maat, winkel-FAQ, reviews) staat nu op de
// Tastbaar-pagina (3d-printen.html).
const h = require('./helpers');
const c = require('./components');
const { hub } = require('./hub');

// Volgorde van het uitgelichte werk: het eerste project krijgt de grote tegel
const UITGELICHT = ['rolduc', 'sanctus', 'wmc', 'heerlen'];

function homePage(ctx, template) {
	const site = ctx.site;

	const werk = UITGELICHT.map(function (id, i) {
		const p = ctx.projects.find(function (x) { return x.id === id; });
		if (!p) throw new Error('Home: onbekend project ' + id);
		// Een project uit tier A heeft een eigen casepagina (portfolio/rolduc.html)
		return '<li class="werk-kaart" data-pillar="' + h.esc(p.pillar) + '"><a href="' + h.esc(h.projectUrl(p)) + '">'
			+ '<span class="werk-beeld">' + h.img(ctx.images, p.image, {
				alt: p.alt,
				// De eerste kaart is vanaf 900px twee rijen hoog, de vierde twee kolommen breed
				sizes: i === 0 || i === 3 ? '(max-width: 600px) 92vw, (max-width: 900px) 46vw, 760px' : '(max-width: 600px) 92vw, (max-width: 900px) 46vw, 380px'
			}) + '</span>'
			+ '<span class="werk-tekst"><span class="werk-tags">' + h.esc(p.tags) + '</span>'
			+ '<strong class="werk-titel">' + h.esc(p.title) + '</strong></span>'
			+ '<span class="werk-open" aria-hidden="true">→</span>'
			+ '</a></li>';
	}).join('\n\t\t');

	// De vraag over JelgerS3D krijgt het oude en het nieuwe logo naast elkaar
	const faq = site.homeFaq.map(function (item) {
		const logos = item.logo
			? '<span class="faq-logos" aria-hidden="true"><img src="assets/js-3D-LOGO.svg" width="56" height="56" alt="" loading="lazy">'
				+ '<span class="faq-logos-pijl">→</span><img src="assets/brand/js-icon-tegel.svg" width="56" height="56" alt="" loading="lazy"></span>'
			: '';
		return '<details class="faq-item"><summary>' + h.esc(item.q) + '</summary><p>' + logos + h.esc(item.a) + '</p></details>';
	}).join('\n\t\t');

	const design = ctx.products.filter(function (p) { return p.collection === 'design'; });

	const main = h.fill(template.replace(/^<!--[\s\S]*?-->\s*/, ''), {
		hub: hub(ctx),
		werk: werk,
		'rail:design': c.productRail(design, ctx, { root: '' }),
		aboutImage: h.img(ctx.images, site.homeImages.about.file, {
			alt: site.homeImages.about.alt,
			sizes: '(max-width: 900px) 280px, 360px'
		}),
		faq: faq,
		mail: h.mailLink(site.email, '')
	});

	return {
		path: 'index.html',
		root: '',
		name: 'home',
		title: site.name + ' · branding, websites & 3D uit Kerkrade',
		description: site.description + ' Voorheen JelgerS3D.',
		ogImage: ctx.images[site.defaultOgImage].og,
		// Organisatie, persoon en website staan op elke pagina in de graaf (src/templates/seo.js)
		jsonLd: [{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: site.homeFaq.map(function (item) {
				return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } };
			})
		}],
		main: main
	};
}

module.exports = homePage;
