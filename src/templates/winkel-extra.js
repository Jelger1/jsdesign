// Twee pagina's rond de webshop (keuzepagina "Keuzes webshopverkoop", 6-11-2026):
//  - review.html: een review schrijven. Gaat als contactbericht naar de functie (src/js/review.js), dus zonder
//    nieuwe backend; Jelger zet goedgekeurde reviews zelf in data/reviews.json.
//  - zakelijk.html: voor winkels en bedrijven (inkoop en relatiegeschenken), met het aanvraagformulier van de
//    maatwerkproducten (src/js/request.js, soort "offerte").
const h = require('./helpers');

function reviewPage(ctx) {
	const site = ctx.site;
	const producten = ctx.products.filter(function (p) { return p.sale === 'cart'; });
	const opties = '<option value="">Kies een product</option>\n'
		+ producten.map(function (p) { return '\t\t\t\t<option value="' + h.esc(p.id) + '">' + h.esc(p.name) + '</option>'; }).join('\n') + '\n'
		+ '\t\t\t\t<option value="anders">Iets anders, bijvoorbeeld maatwerk</option>';
	const sterren = [5, 4, 3, 2, 1].map(function (n) {
		return '<label class="review-ster"><input type="radio" name="sterren" value="' + n + '"' + (n === 5 ? ' required' : '') + '><span>' + n + (n === 1 ? ' ster' : ' sterren') + '</span></label>';
	}).join('\n\t\t\t\t');

	const main = '<div class="container text-page review-page">\n'
		+ '\t<h1>Vertel hoe het <span class="highlight">bevalt</span></h1>\n'
		+ '\t<p class="text-page-intro">Kocht je iets bij mij? Ik hoor graag wat je ervan vindt, ook als iets beter kan. Geef je toestemming, dan zet ik je review met je voornaam op de site.</p>\n'
		+ '\t<form class="request-form review-form" id="review-form" novalidate>\n'
		+ '\t\t<div class="form-row">\n'
		+ '\t\t\t<div class="form-group"><label for="rv-name">Naam <span aria-hidden="true">*</span></label><input type="text" id="rv-name" name="name" required autocomplete="name"></div>\n'
		+ '\t\t\t<div class="form-group"><label for="rv-email">E-mailadres <span aria-hidden="true">*</span></label><input type="email" id="rv-email" name="email" required autocomplete="email"></div>\n'
		+ '\t\t</div>\n'
		+ '\t\t<div class="form-group"><label for="rv-product">Waar gaat je review over?</label><select id="rv-product" name="product">\n\t\t\t\t' + opties + '\n\t\t\t</select></div>\n'
		+ '\t\t<fieldset class="review-sterren">\n'
		+ '\t\t\t<legend>Hoeveel sterren geef je? <span aria-hidden="true">*</span></legend>\n'
		+ '\t\t\t<div class="review-sterren-keuze">\n\t\t\t\t' + sterren + '\n\t\t\t</div>\n'
		+ '\t\t</fieldset>\n'
		+ '\t\t<div class="form-group"><label for="rv-text">Je review <span aria-hidden="true">*</span></label><textarea id="rv-text" name="review" rows="5" required maxlength="1500" placeholder="Wat vind je ervan, en voor wie was het?"></textarea></div>\n'
		+ '\t\t<div class="form-consent form-optin"><label class="form-consent-label" for="rv-plaatsen"><input type="checkbox" id="rv-plaatsen" name="plaatsen" value="ja"><span>Je mag mijn review met mijn voornaam op ' + h.esc(site.url.replace(/^https?:\/\//, '')) + ' zetten</span></label></div>\n'
		+ '\t\t<input type="checkbox" name="botcheck" class="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">\n'
		+ '\t\t' + h.privacyCheckbox(site, '', 'rv-privacy', false) + '\n'
		+ '\t\t<p class="checkout-msg" data-review-msg role="alert"></p>\n'
		+ '\t\t<button type="submit" class="btn btn-primary btn-block">Verstuur je review</button>\n'
		+ '\t\t<p class="pdp-note">Ik lees elke review voordat hij online komt. Je e-mailadres komt nooit op de site.</p>\n'
		+ '\t</form>\n'
		+ '\t<div class="request-success" data-review-success hidden tabindex="-1"><strong>Bedankt voor je review!</strong><p>Ik lees hem zo snel mogelijk. Gaf je toestemming, dan zie je hem binnenkort op de site.</p></div>\n'
		+ '</div>';

	return {
		path: 'review.html',
		root: '',
		name: 'text',
		title: 'Schrijf een review | ' + site.name,
		label: 'Review schrijven', // in sitemap.html
		description: 'Kocht je iets bij ' + site.name + '? Vertel hoe het bevalt. Met jouw toestemming komt je review met je voornaam op de site.',
		ogImage: ctx.images[site.defaultOgImage].og,
		main: main
	};
}

function zakelijkPage(ctx) {
	const site = ctx.site;
	const byId = ctx.byId;
	const projecten = {};
	(ctx.projects || []).forEach(function (p) { projecten[p.id] = p; });
	const winkels = site.verkooppunten || [];
	const product = function (id, label) { return byId[id] ? '<a href="' + h.productUrl(byId[id]) + '">' + h.esc(label || byId[id].name) + '</a>' : h.esc(label); };
	const project = function (id, label) { return projecten[id] ? '<a href="' + h.projectUrl(projecten[id]) + '">' + h.esc(label) + '</a>' : h.esc(label); };
	const geleverd = site.geprint && site.geprint.aanWinkels ? ' Dit jaar leverde ik al ' + h.aantalTekst(site.geprint.aanWinkels) + ' stuks aan winkels.' : '';
	const stap = function (i, kop, tekst) {
		return '\t<li style="--i:' + i + '"><span class="trap-nr" aria-hidden="true">' + (i + 1) + '</span><span class="trap-lijn" aria-hidden="true"></span><span class="trap-schuin" aria-hidden="true"></span><h3>' + kop + '</h3><p>' + tekst + '</p></li>';
	};

	const formulier = '<form class="request-form" data-request="offerte" data-product="zakelijk" novalidate>\n'
		+ '\t<div class="form-row">\n'
		+ '\t\t<div class="form-group"><label for="rq-name">Naam <span aria-hidden="true">*</span></label><input type="text" id="rq-name" name="name" required autocomplete="name"></div>\n'
		+ '\t\t<div class="form-group"><label for="rq-email">E-mailadres <span aria-hidden="true">*</span></label><input type="email" id="rq-email" name="email" required autocomplete="email"></div>\n'
		+ '\t</div>\n'
		+ '\t<div class="form-row">\n'
		+ '\t\t<div class="form-group"><label for="rq-company">Bedrijf of organisatie</label><input type="text" id="rq-company" name="company" autocomplete="organization"></div>\n'
		+ '\t\t<div class="form-group form-group-narrow"><label for="rq-qty">Aantal</label><input type="number" id="rq-qty" name="quantity" min="1" value="10" inputmode="numeric"></div>\n'
		+ '\t</div>\n'
		+ '\t<div class="form-group"><label for="rq-text">Wat zoek je? <span aria-hidden="true">*</span></label><textarea id="rq-text" name="text" rows="4" required placeholder="Voor je winkel of als geschenk, welke ontwerpen of kleuren, en wanneer je het nodig hebt"></textarea></div>\n'
		+ '\t' + h.uploadField(site, 'offerte', { label: 'Je logo (optioneel)', hint: 'Voor een geschenk met je logo: het liefst als SVG, PDF of een scherpe PNG.' }) + '\n'
		+ '\t<input type="checkbox" name="botcheck" class="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">\n'
		+ '\t' + h.privacyCheckbox(site, '', 'rq-privacy', false) + '\n'
		+ '\t<p class="checkout-msg" data-request-msg role="alert"></p>\n'
		+ '\t<button type="submit" class="btn btn-primary btn-block">Vraag een voorstel aan</button>\n'
		+ '\t<p class="pdp-note">Vrijblijvend. Je krijgt eerst een voorstel met prijs en levertijd.</p>\n'
		+ '</form>\n'
		+ '<div class="request-success" data-request-success hidden tabindex="-1"><strong>Bedankt, je aanvraag is verstuurd!</strong><p>Ik stuur je zo snel mogelijk een voorstel.</p></div>';

	const main = '<div class="container text-page zakelijk-page">\n'
		+ '\t<h1>Voor winkels en <span class="highlight">bedrijven</span></h1>\n'
		+ '\t<p class="text-page-intro">' + h.esc(h.verkooppuntenZin(winkels).replace(/^het /, 'Het ')) + ' verkopen mijn Limburgse ontwerpen al. Wil je ze ook in je winkel, of zoek je een relatiegeschenk? Vanaf 10 stuks maak ik een zakelijke prijs.</p>\n'
		+ '\t<p class="cta-row"><a class="btn primary" href="#aanvragen">Vraag een voorstel aan</a></p>\n'
		+ '\t<h2>Verkopen in je winkel</h2>\n'
		+ '\t<p>Deze ontwerpen liggen al in museum- en cadeauwinkels in Zuid-Limburg.' + geleverd + '</p>\n'
		+ '\t<ul>\n'
		+ '\t\t<li><strong>' + product('koempel-eend') + '</strong> – de badeend met mijnwerkershelm en lamp.</li>\n'
		+ '\t\t<li><strong>' + product('dr-joep') + '</strong> – in 15 en 25 cm, ook in andere kleuren.</li>\n'
		+ '\t\t<li><strong>' + product('mijnschacht-nulland') + '</strong> – 15 of 25 cm breed.</li>\n'
		+ '\t\t<li><strong>Sleutelhangers</strong> – ' + product('vlaai-sleutelhanger', 'vlaai') + ', ' + product('poefel-sleutelhanger', 'poefel') + ' en ' + product('kirchroa-sleutelhanger', 'Kirchroa') + '.</li>\n'
		+ '\t\t<li><strong>Magneten</strong> – Kirchroa en vlaai, alleen voor winkels.</li>\n'
		+ '\t</ul>\n'
		+ '\t<p>Ik print op bestelling, dus je kiest zelf de aantallen en kleuren. Je krijgt een factuur met btw.</p>\n'
		+ '\t<h2>Relatiegeschenken en eigen ontwerpen</h2>\n'
		+ '\t<p>Een geschenk voor je klanten, je team of een jubileum: een bestaand ontwerp in je eigen kleuren, met je logo, of iets wat ik speciaal voor je ontwerp.</p>\n'
		+ '\t<ul>\n'
		+ '\t\t<li><strong>' + project('blonde-non', 'Blonde Non') + '</strong> – een eigen beeld voor Brouwerij Rolduc, als beeld bij hun bier.</li>\n'
		+ '\t\t<li><strong>' + project('wmc', 'WMC Kerkrade') + '</strong> – een beeld in 3D als relatiegeschenk voor mensen die veel voor het concours betekenen.</li>\n'
		+ '\t\t<li><strong>' + product('custom-lightbox') + '</strong> – je logo als lichtobject, met korting bij een grotere oplage.</li>\n'
		+ '\t</ul>\n'
		+ '\t<h2>Zo werkt het</h2>\n'
		+ '\t<ol class="trap trap--staand" data-pillar="tastbaar" style="--treden:4">\n'
		+ stap(0, 'Aanvraag', 'Je vertelt wat je zoekt, hoeveel en wanneer je het nodig hebt.') + '\n'
		+ stap(1, 'Voorstel', 'Je krijgt een voorstel met prijs en levertijd.') + '\n'
		+ stap(2, 'Printen', 'Na je akkoord print ik alles in ' + h.esc(site.pickupLocation) + '.') + '\n'
		+ stap(3, 'Levering', 'Ophalen of laten bezorgen, dat spreken we af. De factuur krijg je erbij.') + '\n'
		+ '\t</ol>\n'
		+ '\t<h2 id="aanvragen">Vraag een voorstel aan</h2>\n'
		+ formulier + '\n'
		+ '</div>';

	return {
		path: 'zakelijk.html',
		root: '',
		name: 'text',
		title: 'Voor winkels en bedrijven | ' + site.name,
		ogTitle: 'Limburgse ontwerpen voor je winkel of als relatiegeschenk',
		label: 'Voor winkels en bedrijven', // in sitemap.html
		description: 'Limburgse ontwerpen voor je winkel of als relatiegeschenk, al te koop in musea en winkels in Zuid-Limburg. Zakelijke prijs vanaf 10 stuks.',
		ogImage: ctx.images[site.defaultOgImage].og,
		main: main
	};
}

module.exports = { reviewPage: reviewPage, zakelijkPage: zakelijkPage };
