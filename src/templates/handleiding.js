// Handleidingen bij producten (data/handleidingen.json), als pagina op de site met een download van de print-pdf
// (tools/handleiding-pdf.mjs maakt die pdf uit dezelfde tekst). Eerste: de wifi-lamp (E14) bij de Mijnwerkerslamp.
// De stappen staan als trap, net als de werkwijze elders; het schakelschema als labels: AAN vol, UIT gestippeld
// (in de huisstijl betekent gestippeld "niet/nog niet").
const h = require('./helpers');
const c = require('./components');

// "Zo stel je je *wifi-lamp* in": het deel tussen sterretjes krijgt de accentkleur
function accent(tekst) {
	return h.esc(tekst).replace(/\*(.+?)\*/g, '<span class="highlight">$1</span>');
}

function schema(stappen) {
	return '<p class="schakel-schema" role="img" aria-label="Schakelschema: ' + h.esc(stappen.join(', ')) + '">'
		+ stappen.map(function (s) { return '<span class="schakel-' + (s === 'AAN' ? 'aan' : 'uit') + '" aria-hidden="true">' + h.esc(s) + '</span>'; })
			.join('<span class="schakel-pijl" aria-hidden="true">›</span>')
		+ '</p>';
}

function handleidingPage(id, hd, ctx) {
	const site = ctx.site;
	const pdf = 'assets/handleidingen/' + hd.pdf;
	const crumbs = [{ label: 'Home', path: '', url: './' }, { label: 'Webshop', path: 'webshop.html', url: 'webshop.html' }, { label: hd.label, path: hd.pagina }];
	const producten = ctx.products.filter(function (p) { return p.handleiding === id; });
	const stap = function (s, i) {
		return '\t<li style="--i:' + i + '"><span class="trap-nr" aria-hidden="true">' + (i + 1) + '</span><span class="trap-lijn" aria-hidden="true"></span><span class="trap-schuin" aria-hidden="true"></span>'
			+ '<h3>' + h.esc(s.kop) + '</h3><p>' + h.esc(s.tekst) + '</p>' + (s.schema ? schema(hd.schema) : '') + '</li>';
	};
	const main = '<div class="container text-page handleiding-page">\n'
		+ '\t' + c.breadcrumbs(crumbs) + '\n'
		+ '\t<h1>' + accent(hd.titel) + '</h1>\n'
		+ '\t<p class="text-page-intro">' + h.esc(hd.intro) + '</p>\n'
		+ '\t<p class="handleiding-nodig"><span>' + h.esc(hd.nodig) + '</span> <strong class="handleiding-label">' + h.esc(hd.label24) + '</strong></p>\n'
		+ '\t<p class="cta-row"><a class="btn outline" href="' + pdf + '" download data-no-transition>Download als pdf (A5)</a></p>\n'
		+ '\t<h2>In 4 stappen</h2>\n'
		+ '\t<ol class="trap trap--staand" data-pillar="tastbaar" style="--treden:' + hd.stappen.length + '">\n'
		+ hd.stappen.map(stap).join('\n') + '\n'
		+ '\t</ol>\n'
		+ '\t<p class="handleiding-belangrijk"><strong>Belangrijk:</strong> ' + h.esc(hd.belangrijk) + '</p>\n'
		+ '\t<h2>' + accent(hd.hulpKop) + '</h2>\n'
		+ '\t<p>' + h.esc(hd.hulpIntro) + '</p>\n'
		+ '\t<div class="handleiding-reset">\n'
		+ '\t\t<h3>' + h.esc(hd.reset.kop) + '</h3>\n'
		+ '\t\t<p>' + h.esc(hd.reset.tekst) + '</p>\n'
		+ '\t\t' + schema(hd.schema) + '\n'
		+ '\t</div>\n'
		+ '\t<div class="faq">\n' + hd.problemen.map(function (p) { return '\t\t' + c.vraag(p.kop, h.esc(p.tekst)); }).join('\n') + '\n\t</div>\n'
		+ '\t<p class="handleiding-letop">' + h.esc(hd.letOp) + '</p>\n'
		+ '\t<p>' + h.esc(hd.hulp.replace(/ via jelgersdesign\.nl\/contact/, '')) + ' <a href="contact.html">Stuur me een bericht</a>.</p>\n'
		+ (producten.length
			? '\t<p class="handleiding-hoort">Hoort bij: ' + producten.map(function (p) { return '<a href="' + h.productUrl(p) + '">' + h.esc(p.name) + '</a>'; }).join(', ') + '.</p>\n'
			: '')
		+ '</div>';
	return {
		path: hd.pagina,
		root: '',
		name: 'text',
		section: 'webshop',
		title: hd.seoTitel + ' | ' + site.name,
		label: hd.label, // in sitemap.html
		description: hd.seoOmschrijving,
		ogImage: ctx.images[site.defaultOgImage].og,
		jsonLd: [c.breadcrumbsLd(crumbs, site), {
			'@context': 'https://schema.org',
			'@type': 'HowTo',
			name: hd.titel.replace(/\*/g, ''),
			description: hd.intro,
			step: hd.stappen.map(function (s, i) { return { '@type': 'HowToStep', position: i + 1, name: s.kop, text: s.tekst }; })
		}],
		main: main
	};
}

function handleidingPages(ctx) {
	const alle = ctx.handleidingen || {};
	return Object.keys(alle).filter(function (id) { return id.charAt(0) !== '_'; }).map(function (id) { return handleidingPage(id, alle[id], ctx); });
}

// De link op een productpagina ("handleiding": "<id>" in products.json): lees online of download de pdf
function handleidingLink(product, ctx, root) {
	const hd = product.handleiding && ctx.handleidingen && ctx.handleidingen[product.handleiding];
	if (!hd) return '';
	return '\t\t\t<p class="pdp-handleiding"><strong>' + h.esc(hd.label) + '</strong> <a href="' + (root || '') + hd.pagina + '">Lees online</a> <span aria-hidden="true">·</span> '
		+ '<a href="' + (root || '') + 'assets/handleidingen/' + hd.pdf + '" download data-no-transition>Download pdf</a></p>\n';
}

module.exports = { handleidingPages: handleidingPages, handleidingLink: handleidingLink, accent: accent };
