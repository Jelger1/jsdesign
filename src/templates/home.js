// De homepage: de hero (src/templates/held.js) en daaronder uitgelicht werk, de maker met per vak één bewijs uit een
// case (src/templates/skills.js), de webshop, de FAQ en contact.
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
		return '<li class="werk-kaart" data-pillar="' + h.esc(p.pillar) + '"><a href="' + h.esc(h.projectUrl(p)) + '" data-rand>'
			+ '<span class="werk-beeld">' + tegelBeeld(p, i, ctx) + '</span>'
			// Op de tegels alleen de tags, op één regel, zodat het beeld zichtbaar blijft; de labels Klantopdracht en
			// Teamproject staan op de pijlerpagina's, het portfolio en de casepagina's
			+ '<span class="werk-tekst"><span class="werk-tags"><span>' + h.esc(p.tags) + '</span></span>'
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
		return c.vraag(item.q, logos + h.esc(item.a));
	}).join('\n\t\t');

	const design = ctx.products.filter(function (p) { return p.collection === 'design'; });
	const hero = held(ctx);

	const main = h.fill(template.replace(/^<!--[\s\S]*?-->\s*/, ''), {
		teken: hero.teken,
		legenda: hero.legenda,
		werk: werk,
		'rail:design': c.productRail(design, ctx, { root: '' }),
		// Eén maker, drie vakken: per pijler één bewering met bewijs (skills.json > bewijsHome), het label is de pijler
		bewijs: skills.bewijsLijst(ctx.pillars.map(function (p) {
			return { id: ctx.skills.bewijsHome[p.id], pijler: p.id, label: p.label };
		}), ctx, { open: 'Alles wat ik kan en hoe ik werk' }),
		// Telefoon: klein naast de kop; vanaf 760px links van de rijen (held.css > .maker-bewijs)
		aboutImage: h.img(ctx.images, site.homeImages.about.file, {
			alt: site.homeImages.about.alt,
			sizes: '(max-width: 759px) 88px, (max-width: 1099px) 280px, 340px'
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
