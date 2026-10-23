// Vindbaarheid buiten de pagina's zelf: robots.txt (ook voor AI-bots), llms.txt (een samenvatting van de site in
// Markdown voor taalmodellen, zie llmstxt.org) en /ai/kennis.json (de kennisbank van Jelly-bot).
// Alles komt uit dezelfde data als de pagina's, zodat site, AI-assistenten en Jelly-bot nergens iets anders zeggen.
const h = require('./helpers');

// Zoekmachines en AI-assistenten zijn welkom. Trainingsbots staan apart, zodat je ze met één regel kunt blokkeren
// ("Allow: /" vervangen door "Disallow: /"). In de preview staat er geen sitemap in: die pagina's zijn noindex.
function robots(site, mode) {
	if (mode !== 'productie') return 'User-agent: *\nAllow: /\n';
	return '# JS Design · robots.txt\n'
		+ '# Zoekmachines en AI-assistenten zijn welkom: alles op deze site is bedoeld om gevonden te worden.\n'
		+ 'User-agent: *\nAllow: /\n\n'
		+ '# AI-zoek- en antwoordbots (bezoeken pagina\'s om vragen van gebruikers te beantwoorden)\n'
		+ 'User-agent: OAI-SearchBot\nUser-agent: ChatGPT-User\nUser-agent: PerplexityBot\nUser-agent: Perplexity-User\n'
		+ 'User-agent: Claude-SearchBot\nUser-agent: Claude-User\nAllow: /\n\n'
		+ '# AI-trainingsbots (bewust toegestaan; blokkeren kan door hier "Allow: /" te vervangen door "Disallow: /")\n'
		+ 'User-agent: GPTBot\nUser-agent: ClaudeBot\nUser-agent: Google-Extended\nUser-agent: Applebot-Extended\nUser-agent: CCBot\nAllow: /\n\n'
		+ 'Sitemap: ' + site.url + '/sitemap.xml\n';
}

function prijs(product) {
	const prices = (product.variants || []).map(function (v) { return v.price; });
	if (!prices.length) return '';
	const min = Math.min.apply(null, prices);
	return (prices.length > 1 ? 'vanaf ' : '') + h.euro(min);
}

function link(site, path, label) { return '[' + label + '](' + site.url + '/' + path + ')'; }

// full = false: llms.txt (kort, met links). full = true: llms-full.txt (ook producten, FAQ en de printservice).
function llms(ctx, full) {
	const site = ctx.site;
	const ps = site.printService || {};
	const lines = [
		'# ' + site.name,
		'',
		'> ' + site.description + ' Voorheen JelgerS3D. ' + site.name + ' ontwerpt merken, bouwt websites en interactieve verhalen, en maakt ideeën tastbaar in 3D, met een eigen webshop.',
		'',
		'- Studio: ' + site.name + ' (voorheen JelgerS3D), eenmanszaak van ' + site.owner + ', ' + [site.address && site.address.city, site.region].filter(Boolean).join(', ') + '. KvK ' + site.kvk + '.',
		'- Bestellen in de webshop gaat via een aanvraag: je krijgt eerst persoonlijk contact en betaalt pas na bevestiging. Ophalen in ' + site.pickupLocation + ' kan.',
		'- 3D-printservice: ' + h.euro(ps.pricePerGram) + ' per gram, minimaal ' + h.euro(ps.minimumOrder) + ' per opdracht; aanleveren als ' + ps.formats + '.',
		'',
		'## Diensten',
		''
	];
	// "Huisstijl" wordt "huisstijl" midden in een zin; afkortingen zoals "UI/UX-design" blijven staan
	const inZin = function (s) { return /^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; };
	ctx.pillars.forEach(function (p) {
		lines.push('- ' + link(site, p.path, p.h1) + ': ' + p.summary + ' Diensten: ' + p.services.map(inZin).join(', ') + '.');
	});
	lines.push('', '## Webshop', '', '- ' + link(site, 'webshop.html', 'Webshop') + ': eigen 3D-geprinte ontwerpen, gemaakt in Limburg.');
	(site.categoryPages || []).forEach(function (cat) {
		lines.push('- ' + link(site, cat.slug + '.html', cat.label) + (cat.seoDescription ? ': ' + cat.seoDescription : ''));
	});
	lines.push('- ' + link(site, '3d-printservice.html', '3D-printservice') + ': je eigen 3D-bestand laten printen.');
	if (full) {
		lines.push('', '## Producten', '');
		ctx.products.forEach(function (p) {
			lines.push('- ' + link(site, h.productUrl(p), p.name) + (prijs(p) ? ' (' + prijs(p) + ')' : '') + ': ' + (p.seo && p.seo.description ? p.seo.description : (p.tagline || '')));
		});
		lines.push('', '## Veelgestelde vragen', '');
		(site.faq || []).forEach(function (item) { lines.push('### ' + item.q, '', item.a, ''); });
	}
	lines.push('', '## Over en contact', '',
		'- ' + link(site, 'over.html', 'Over JS Design'),
		'- ' + link(site, 'contact.html', 'Contact'),
		'- ' + link(site, 'privacy.html', 'Privacyverklaring'),
		'- ' + link(site, 'voorwaarden.html', 'Algemene voorwaarden'));
	if (!full) lines.push('', '## Optional', '', '- ' + link(site, 'llms-full.txt', 'Volledige versie met alle producten en veelgestelde vragen'));
	return lines.join('\n') + '\n';
}

// De kennisbank voor Jelly-bot (fase 4 koppelt de server hieraan). Bewust zonder e-mailadres: dat leest elke robot.
function kennis(ctx) {
	const site = ctx.site;
	const socials = site.socials || {};
	return {
		bron: site.url,
		merk: {
			naam: site.name, voorheen: site.formerNames, eigenaar: site.owner, omschrijving: site.description,
			plaats: site.address && site.address.city, regio: site.region, kvk: site.kvk,
			socials: socials, contactpagina: site.url + '/contact.html'
		},
		pijlers: ctx.pillars.map(function (p) {
			return { id: p.id, label: p.label, titel: p.h1, samenvatting: p.summary, diensten: p.services, url: site.url + '/' + p.path };
		}),
		webshop: {
			url: site.url + '/webshop.html',
			bestellen: 'Een bestelling is een aanvraag: eerst persoonlijk contact, betalen pas na bevestiging.',
			levertijd: site.delivery && site.delivery.leadTimeLong,
			ophalen: site.pickupLocation,
			verzending: site.shipping && site.shipping.note,
			categorieen: (site.categoryPages || []).map(function (cat) { return { naam: cat.label, url: site.url + '/' + cat.slug + '.html' }; }),
			producten: ctx.products.map(function (p) {
				return { id: p.id, naam: p.name, prijs: prijs(p), url: site.url + '/' + h.productUrl(p), type: site.types[p.type].label, collectie: site.collections[p.collection].label, verkoop: p.sale };
			}),
			printservice: Object.assign({ url: site.url + '/3d-printservice.html' }, site.printService)
		},
		faq: site.faq
	};
}

module.exports = { robots: robots, llms: llms, kennis: kennis };
