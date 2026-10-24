// De homepage: de hero (src/templates/held.js) en daaronder uitgelicht werk, wat ik kan, de webshop, de maker, de FAQ
// en contact.
// De inhoud van de oude webshophome (categorieën, rails, stappen, op maat, winkel-FAQ, reviews) staat nu op de
// Tastbaar-pagina (3d-printen.html).
const h = require('./helpers');
const c = require('./components');
const { held } = require('./held');
const skills = require('./skills');

// Volgorde van het uitgelichte werk: het eerste project krijgt de grote tegel
const UITGELICHT = ['rolduc', 'sanctus', 'wmc', 'heerlen'];

// Het beeld van een tegel. Heeft het project een kaartbeeld (projects.json > kaart: speciaal voor de tegels gemaakt,
// met een rustige onderkant voor de tekst), dan dat: 4:3 op elke breedte en vanaf 900px het staande beeld voor de
// eerste tegel en het brede (21:9) voor de vierde. Anders de gewone afbeelding van het project.
function tegelBeeld(p, i, ctx) {
	const kaart = p.kaart || {};
	const sizes = i === 0 || i === 3 ? '(max-width: 600px) 92vw, (max-width: 900px) 46vw, 760px' : '(max-width: 600px) 92vw, (max-width: 900px) 46vw, 380px';
	const img = h.img(ctx.images, kaart['43'] || p.image, { alt: kaart['43'] ? kaart.alt : p.alt, sizes: sizes });
	const groot = i === 0 ? kaart.staand : i === 3 ? kaart['219'] : null;
	return groot
		? '<picture><source media="(min-width: 900px)" srcset="' + h.srcset(ctx.images, groot) + '" sizes="760px">' + img + '</picture>'
		: img;
}

function homePage(ctx, template) {
	const site = ctx.site;

	const werk = UITGELICHT.map(function (id, i) {
		const p = ctx.projects.find(function (x) { return x.id === id; });
		if (!p) throw new Error('Home: onbekend project ' + id);
		// Een project uit tier A heeft een eigen casepagina (portfolio/rolduc.html)
		return '<li class="werk-kaart" data-pillar="' + h.esc(p.pillar) + '"><a href="' + h.esc(h.projectUrl(p)) + '">'
			+ '<span class="werk-beeld">' + tegelBeeld(p, i, ctx) + '</span>'
			+ '<span class="werk-tekst"><span class="werk-tags">' + h.esc(p.tags) + (p.klantopdracht ? ' · klantopdracht' : '') + (p.team ? ' · teamproject' : '') + '</span>'
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
	const hero = held(ctx);

	const main = h.fill(template.replace(/^<!--[\s\S]*?-->\s*/, ''), {
		teken: hero.teken,
		legenda: hero.legenda,
		bewijs: hero.bewijs,
		werk: werk,
		'rail:design': c.productRail(design, ctx, { root: '' }),
		// Wat ik kan: alle groepen uit data/skills.json, kort (drie chips per groep)
		kunde: skills.lijst(skills.groepen(ctx), ctx, { max: 3 }),
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
