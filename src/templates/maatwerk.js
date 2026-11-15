// Twee pagina's onder Tastbaar, uit de search-check van 15-11-2026: bij "prototype of kleine serie laten 3d printen"
// en "3d model van een gebouw laten maken" noemde Google's AI alleen anderen, omdat de site dit maar in een paar regels
// aanbood. Alles hier komt uit bestaande feiten (pillars.json > tastbaar, shop.json > printService en de producten).
//  - prototype-kleine-serie.html: eerst een proefprint, dan de serie
//  - gebouw-op-schaal.html: een gebouw als 3D-geprint model, met de eigen gebouwen uit de webshop als voorbeeld
const h = require('./helpers');
const c = require('./components');
const seo = require('./seo');

function stap(i, kop, tekst) {
	return '\t<li style="--i:' + i + '"><span class="trap-nr" aria-hidden="true">' + (i + 1) + '</span><span class="trap-lijn" aria-hidden="true"></span><span class="trap-schuin" aria-hidden="true"></span><h3>' + kop + '</h3><p>' + tekst + '</p></li>';
}

function dienstLd(site, naam, beschrijving) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Service',
		name: naam,
		serviceType: '3D-printen',
		description: beschrijving,
		provider: { '@id': seo.ids(site).organization },
		areaServed: seo.werkgebied()
	};
}

const CRUMBS_TASTBAAR = [{ label: 'Home', path: '', url: './' }, { label: 'Tastbaar', path: '3d-printen.html', url: '3d-printen.html' }];

function prototypePage(ctx) {
	const site = ctx.site;
	const ps = site.printService;
	const crumbs = CRUMBS_TASTBAAR.concat([{ label: 'Prototype of kleine serie', path: 'prototype-kleine-serie.html' }]);
	const vragen = [
		{ q: 'Wat kost een prototype of kleine serie?', a: 'Heb je al een 3D-bestand (' + ps.formats.replace(' en ', ' of ') + '), dan geldt de 3D-printservice: ' + h.euro(ps.pricePerGram) + ' per gram, minimaal ' + h.euro(ps.minimumOrder) + ' per opdracht. Moet het ontwerp nog gemaakt worden, of gaat het om een serie, dan krijg je eerst een voorstel met prijs en levertijd. Vanaf 10 stuks maak ik een zakelijke prijs.' },
		{ q: 'Hoeveel stuks kun je in één keer printen?', a: 'Dat hangt af van de maat. Ik verdeel een serie over printplaten, van sleutelhangers voor een brouwerij tot twintig eenden in één keer.' },
		{ q: 'In welk materiaal print je?', a: 'In PLA, en waar nodig in PETG of TPU, op een Bambu Lab P1S of H2C. Een ontwerp kan ook meerdere kleuren krijgen; meer kleuren maken een print wel duurder.' }
	];
	const main = '<div class="container text-page maatwerk-page">\n'
		+ '\t' + c.breadcrumbs(crumbs) + '\n'
		+ '\t<h1>Prototype of kleine serie laten <span class="highlight">3D-printen</span></h1>\n'
		+ '\t<p class="text-page-intro">Heb je een idee voor een onderdeel, een product of een geschenk in een kleine oplage? Ik ontwerp het in 3D, print eerst een proefversie om te testen en bij te stellen, en print daarna de serie op mijn eigen printers in ' + h.esc(site.pickupLocation) + '. Voor bedrijven, verenigingen en particulieren in Parkstad, Zuid-Limburg en daarbuiten.</p>\n'
		+ '\t<p class="cta-row"><a class="btn primary" href="contact.html?onderwerp=tastbaar">Vertel over je idee</a> <a class="btn outline" href="3d-printservice.html">Ik heb al een 3D-bestand</a></p>\n'
		+ '\t<h2>Wat ik voor je doe</h2>\n'
		+ '\t<ul>\n'
		+ '\t\t<li><strong>3D-ontwerp</strong>: van idee of schets naar een printbaar 3D-model, in Blender of een ander 3D-programma.</li>\n'
		+ '\t\t<li><strong>Proefprint</strong>: eerst één exemplaar om te testen en bij te stellen.</li>\n'
		+ '\t\t<li><strong>Kleine serie</strong>: daarna tientallen stuks per printplaat.</li>\n'
		+ '\t\t<li><strong>Maatwerk</strong>: met je eigen logo of verhaal, zoals een <a href="' + h.productUrl(ctx.byId['custom-lightbox'] || { id: 'custom-lightbox' }) + '">lightbox</a>, sleutelhangers of een figuur voor in de winkel.</li>\n'
		+ '\t</ul>\n'
		+ '\t<h2>Zo werkt het</h2>\n'
		+ '\t<ol class="trap trap--staand" data-pillar="tastbaar" style="--treden:4">\n'
		+ stap(0, 'Je idee', 'Je vertelt wat je wilt maken, hoeveel en wanneer je het nodig hebt. Een schets of foto helpt.') + '\n'
		+ stap(1, 'Ontwerp', 'Ik maak een 3D-model, of ik maak jouw bestand klaar om te printen.') + '\n'
		+ stap(2, 'Proefprint', 'Een eerste exemplaar om te testen. Waar nodig stel ik het ontwerp bij.') + '\n'
		+ stap(3, 'Serie', 'Daarna print ik de serie in ' + h.esc(site.pickupLocation) + '. Ophalen of laten verzenden, dat spreken we af.') + '\n'
		+ '\t</ol>\n'
		+ '\t<h2>Vragen</h2>\n'
		+ '\t<div class="faq">\n' + vragen.map(function (v) { return '\t\t' + c.vraag(v.q, h.esc(v.a)); }).join('\n') + '\n\t</div>\n'
		+ '\t<p class="cta-row"><a class="btn primary" href="contact.html?onderwerp=tastbaar">Vertel over je idee</a> <a class="btn outline" href="zakelijk.html">Relatiegeschenken met logo</a></p>\n'
		+ '</div>';
	return {
		path: 'prototype-kleine-serie.html',
		root: '',
		name: 'text',
		section: 'tastbaar',
		title: 'Prototype of kleine serie laten 3D-printen | ' + site.name,
		label: 'Prototype of kleine serie', // in sitemap.html
		description: 'Een prototype of kleine serie laten 3D-printen in Kerkrade: eerst een proefprint, dan de serie. Met je eigen bestand vanaf ' + h.euro(ps.pricePerGram) + ' per gram.',
		ogImage: ctx.images[site.defaultOgImage].og,
		jsonLd: [c.breadcrumbsLd(crumbs, site), dienstLd(site, 'Prototype of kleine serie laten 3D-printen', 'Eerst een proefprint om te testen en bij te stellen, daarna de serie, geprint in ' + site.pickupLocation + '.'), {
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: vragen.map(function (v) { return { '@type': 'Question', name: v.q, acceptedAnswer: { '@type': 'Answer', text: v.a } }; })
		}],
		main: main
	};
}

function gebouwPage(ctx) {
	const site = ctx.site;
	const crumbs = CRUMBS_TASTBAAR.concat([{ label: 'Gebouw op schaal', path: 'gebouw-op-schaal.html' }]);
	// De gebouwen uit de webshop als voorbeeld (alleen wat er echt is)
	const voorbeelden = ['raadhuis-kerkrade', 'schachtgebouw-oranje-nassau-1', 'mijnschacht-nulland'].map(function (id) { return ctx.byId[id]; }).filter(Boolean);
	const kaarten = voorbeelden.map(function (p) {
		return c.productCard(p, ctx, { heading: 'h3' });
	}).join('\n');
	const vragen = [
		{ q: 'Kun je ook mijn eigen gebouw op schaal maken?', a: 'Stuur een bericht met het gebouw dat je in gedachten hebt, met een paar foto\'s als je die hebt. Dan kijk ik wat mogelijk is en wat het kost.' },
		{ q: 'Hoe precies is zo\'n model?', a: 'Het Raadhuis Kerkrade en het schachtgebouw Oranje-Nassau I ontwierp ik zelf, op de echte maten van de gebouwen. Ik legde ze naast oude en nieuwe foto\'s tot elk detail klopte. In de sokkel staat de naam van het gebouw gegraveerd.' },
		{ q: 'Hoe groot wordt een model?', a: 'De modellen in de webshop zijn 10 tot 25 cm: het Raadhuis Kerkrade 10 of 15 cm hoog, Oranje-Nassau I 15 of 25 cm hoog en Mijnschacht Nulland 15 of 25 cm breed.' }
	];
	const main = '<div class="container text-page maatwerk-page">\n'
		+ '\t' + c.breadcrumbs(crumbs) + '\n'
		+ '\t<h1>Een gebouw op schaal laten <span class="highlight">3D-printen</span></h1>\n'
		+ '\t<p class="text-page-intro">Een bekend gebouw uit je stad, je bedrijfspand of een plek met een verhaal als 3D-geprint model, bijvoorbeeld als cadeau of voor een jubileum. Ik ontwerp het zelf, op de echte maten van het gebouw, en print het in ' + h.esc(site.pickupLocation) + '.</p>\n'
		+ '\t<p class="cta-row"><a class="btn primary" href="contact.html?onderwerp=tastbaar">Vraag naar jouw gebouw</a></p>\n'
		+ '\t<h2>Gebouwen die ik al maakte</h2>\n'
		+ '\t<div class="grid grid-products maatwerk-voorbeelden">\n' + kaarten + '\n\t</div>\n'
		+ '\t<h2>Zo werkt het</h2>\n'
		+ '\t<ol class="trap trap--staand" data-pillar="tastbaar" style="--treden:3">\n'
		+ stap(0, 'Je gebouw', 'Je vertelt welk gebouw je wilt, voor wie en hoe groot. Foto\'s helpen.') + '\n'
		+ stap(1, 'Ontwerp', 'Ik bouw het gebouw na in 3D, op de echte maten, en leg het naast foto\'s tot de details kloppen.') + '\n'
		+ stap(2, 'Printen', 'Ik print het model in ' + h.esc(site.pickupLocation) + '. Ophalen of laten verzenden, dat spreken we af.') + '\n'
		+ '\t</ol>\n'
		+ '\t<h2>Vragen</h2>\n'
		+ '\t<div class="faq">\n' + vragen.map(function (v) { return '\t\t' + c.vraag(v.q, h.esc(v.a)); }).join('\n') + '\n\t</div>\n'
		+ '\t<p class="cta-row"><a class="btn primary" href="contact.html?onderwerp=tastbaar">Vraag naar jouw gebouw</a> <a class="btn outline" href="beelden-en-modellen.html">Alle beelden en modellen</a></p>\n'
		+ '</div>';
	return {
		path: 'gebouw-op-schaal.html',
		root: '',
		name: 'text',
		section: 'tastbaar',
		title: 'Gebouw op schaal laten 3D-printen | ' + site.name,
		label: 'Gebouw op schaal', // in sitemap.html
		description: 'Een gebouw op schaal laten 3D-printen in Kerkrade: zelf ontworpen op de echte maten, zoals het Raadhuis Kerkrade en Mijnschacht Nulland.',
		ogImage: voorbeelden.length ? ctx.images[voorbeelden[0].images[0].file].og : ctx.images[site.defaultOgImage].og,
		jsonLd: [c.breadcrumbsLd(crumbs, site), dienstLd(site, 'Gebouw op schaal laten 3D-printen', 'Een bestaand gebouw als 3D-geprint schaalmodel, zelf ontworpen op de echte maten van het gebouw.'), {
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: vragen.map(function (v) { return { '@type': 'Question', name: v.q, acceptedAnswer: { '@type': 'Answer', text: v.a } }; })
		}],
		main: main
	};
}

module.exports = { prototypePage: prototypePage, gebouwPage: gebouwPage };
