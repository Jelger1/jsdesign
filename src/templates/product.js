// De productpagina (producten/<id>.html). Eén template voor alle producten.
const h = require('./helpers');
const c = require('./components');
const { handleidingLink } = require('./handleiding');

const GALLERY_SIZES = '(max-width: 900px) 100vw, 580px';

// Een render (3D-weergave) zegt dat altijd zelf, op het beeld: "weergave": "3d" in products.json
function is3d(image) {
	return Boolean(image) && image.weergave === '3d';
}

// Op de eerste foto van een lamp met kleurkeuze staat het label altijd in de HTML; product.js toont of verbergt het
function weergaveLabel(image, kleurDia) {
	if (!kleurDia && !is3d(image)) return '';
	return '<span class="pdp-weergave"' + (kleurDia ? ' data-weergave' : '') + (is3d(image) ? '' : ' hidden') + '>3D-weergave</span>';
}

// Aan/uit-knop op de eerste foto van een lamp met kleurkeuze: wisselt tussen de foto met de lamp aan en uit
function lichtKnop() {
	return '<div class="pdp-licht" role="group" aria-label="Lamp op de foto">'
		+ '<button type="button" data-licht="aan" aria-pressed="true">Aan</button>'
		+ '<button type="button" data-licht="uit" aria-pressed="false">Uit</button></div>';
}

function gallery(product, ctx, root) {
	const kleuren = Boolean(product.kleuren && product.kleuren.length);
	const slides = product.images.map(function (image, i) {
		// In het kader staat de uitsnede met het product in het midden; vergroten toont de volledige foto
		const full = h.imgPath(ctx.images, image.file, 1600, root);
		const kleurDia = kleuren && i === 0;
		return '<li class="pdp-slide" id="foto-' + (i + 1) + '"' + (kleurDia ? ' data-kleur-dia' : '') + '>'
			+ '<button type="button" class="pdp-zoom" data-zoom="' + i + '" data-full="' + full + '" data-alt="' + h.esc(image.alt) + '" aria-label="Foto ' + (i + 1) + ' vergroten">'
			+ h.img(ctx.images, image.file, { alt: image.alt, sizes: GALLERY_SIZES, root: root, eager: i === 0, crop: true })
			+ '</button>' + weergaveLabel(image, kleurDia) + (kleurDia ? lichtKnop() : '') + '</li>';
	}).join('\n\t\t\t');

	let thumbs = '';
	if (product.images.length > 1) {
		thumbs = '\t\t<ul class="pdp-thumbs" aria-label="Kies een foto">\n'
			+ product.images.map(function (image, i) {
				return '\t\t\t<li><button type="button" class="pdp-thumb' + (i === 0 ? ' is-active' : '') + '" data-slide="' + i + '" aria-label="Toon foto ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : '') + '>'
					+ h.img(ctx.images, image.file, { alt: '', sizes: '72px', root: root, crop: true }) + '</button></li>';
			}).join('\n') + '\n\t\t</ul>\n';
	}

	// id: de productpagina rendert pas als de galerij er is (layout.js, rel="expect"), voor de overgang vanaf de kaart
	return '<div class="pdp-gallery" id="pdp-foto" data-gallery>\n'
		+ '\t\t<ul class="pdp-slides" data-slides tabindex="0" aria-label="Productfoto\'s van ' + h.esc(product.name) + '">\n\t\t\t' + slides + '\n\t\t</ul>\n'
		+ thumbs
		+ '\t</div>';
}

// Ontwerptool (producten met "personalize"): het podium met de live preview...
function keychainStage() {
	return '<div class="pdp-gallery" id="pdp-foto">\n'
		+ '\t\t<div class="keychain-stage">\n'
		+ '\t\t\t<span class="keychain-stage-label">Live voorbeeld</span>\n'
		+ '\t\t\t<canvas data-keychain-canvas role="img" aria-label="Voorbeeld van de sleutelhanger" width="1200" height="600"></canvas>\n'
		+ '\t\t</div>\n'
		+ '\t</div>';
}

// ...en het invoerveld met de knoppen
function keychainBuyBox(product, ctx, root) {
	const variant = product.variants[0];
	return '<form class="keychain-form" data-keychain-form data-product="' + h.esc(product.id) + '" data-variant="' + h.esc(variant.id) + '" novalidate>\n'
		+ '\t\t\t<div class="keychain-field">\n'
		+ '\t\t\t\t<label for="kc-text">' + h.esc(product.personalize.label) + ' <small data-keychain-count aria-hidden="true"></small></label>\n'
		+ '\t\t\t\t<input type="text" id="kc-text" class="keychain-input" data-keychain-input placeholder="' + h.esc(product.personalize.placeholder) + '" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" aria-describedby="kc-hint">\n'
		+ '\t\t\t\t<p class="keychain-hint" id="kc-hint" data-keychain-hint>Typ je straatnaam om je ontwerp te zien.</p>\n'
		+ '\t\t\t</div>\n'
		+ '\t\t\t<div class="keychain-actions">\n'
		+ '\t\t\t\t<button type="submit" class="btn btn-primary pdp-add" data-keychain-needs-text>In winkelwagen</button>\n'
		+ '\t\t\t\t<button type="button" class="btn outline" data-keychain-download data-keychain-needs-text>Download preview (.png)</button>\n'
		// Het adres staat gecodeerd in de HTML (tegen spamrobots); keychain.js maakt de mailto-link
		+ '\t\t\t\t<a class="btn outline" href="' + root + '#contact" data-keychain-mail="' + h.mailCode(ctx.site.email) + '" data-keychain-needs-text>Bestel per mail</a>\n'
		+ '\t\t\t</div>\n'
		+ '\t\t</form>\n'
		+ '\t\t<p class="keychain-note">Het voorbeeld laat zien hoe je tekst op het bord komt. De echte sleutelhanger wordt laag voor laag geprint; kleur en letters kunnen daardoor licht afwijken.</p>\n'
		+ '\t\t<p class="keychain-custom-note">Deze sleutelhanger wordt speciaal met jouw tekst gemaakt en kan daarom niet worden geretourneerd (zie de <a href="' + root + 'voorwaarden.html">algemene voorwaarden</a>). Controleer de spelling dus goed.</p>\n'
		+ '\t\t<p class="deadline-note" data-deadlines="' + h.esc(JSON.stringify(ctx.site.deadlines || [])) + '" hidden></p>';
}

function buyBox(product, ctx, root) {
	if (product.personalize) return keychainBuyBox(product, ctx, root);
	if (product.sale === 'cart') {
		const multiple = product.variants.length > 1;
		const options = multiple
			? '<fieldset class="product-options">\n\t\t\t\t<legend>Kies je uitvoering</legend>\n'
				+ product.variants.map(function (variant, i) {
					return '\t\t\t\t<label class="size-option"><input type="radio" name="variant" value="' + h.esc(variant.id) + '" data-price="' + variant.price + '"' + (i === 0 ? ' checked' : '') + '>'
						+ '<span>' + h.esc(variant.label) + '</span><span class="size-option-price">' + h.euro(variant.price) + '</span></label>';
				}).join('\n') + '\n\t\t\t</fieldset>'
			: '<input type="hidden" name="variant" value="' + h.esc(product.variants[0].id) + '">';

		// Wensveld (bv. een kleurwens): gaat mee als tekst bij de winkelwagenregel en staat zo ook in de bestelmail.
		// Met een kleurkeuze verschijnt het pas bij "Eigen kleuren"; anders gaat de tekst van de gekozen kleur mee.
		// Dan max. 32 tekens: product.js zet er "Eigen: " voor en de regel mag 40 tekens zijn.
		const kleuren = Boolean(product.kleuren && product.kleuren.length);
		const wens = product.wish || (kleuren ? { label: 'Welke kleuren wil je?', placeholder: 'Bijv. kap crème, voet groen', hint: 'Ik stem je kleuren met je af voordat ik ga printen.' } : null);
		const wish = wens
			? '\t\t\t<div class="pdp-wish"' + (kleuren ? ' data-kleur-wens hidden' : '') + '>\n'
				+ '\t\t\t\t<label for="pdp-wish">' + h.esc(wens.label) + '</label>\n'
				+ '\t\t\t\t<input type="text" id="pdp-wish" name="wish" maxlength="' + (kleuren ? 32 : 40) + '" autocomplete="off" placeholder="' + h.esc(wens.placeholder) + '" aria-describedby="pdp-wish-hint">\n'
				+ '\t\t\t\t<p class="pdp-wish-hint" id="pdp-wish-hint">' + h.esc(wens.hint) + '</p>\n'
				+ '\t\t\t</div>\n'
			: '';

		return '<form class="pdp-form" data-product="' + h.esc(product.id) + '">\n'
			+ (kleuren ? kleurKeuze(product, ctx, root) : '')
			+ '\t\t\t' + options + '\n'
			+ wish
			+ '\t\t\t<button type="submit" class="btn btn-primary btn-block pdp-add">In winkelwagen</button>\n'
			+ '\t\t</form>\n'
			// Eerlijke urgentie: verschijnt alleen in de weken voor een echte feestdag en verdwijnt daarna vanzelf (zie site.json > deadlines)
			+ '\t\t<p class="deadline-note" data-deadlines="' + h.esc(JSON.stringify(ctx.site.deadlines || [])) + '" hidden></p>';
	}
	if (product.sale === 'external') {
		return '<a class="btn btn-primary btn-block" href="' + h.esc(product.externalUrl) + '" target="_blank" rel="noopener">' + h.esc(product.externalLabel) + '</a>\n'
			+ '\t\t<p class="pdp-note">Dit ontwerp is exclusief verkrijgbaar via de webshop van de opdrachtgever.</p>';
	}
	const name = h.esc(product.name);

	if (product.sale === 'request') {
		// Maatwerk: aanvraag direct op de productpagina, zonder omweg via het contactformulier
		return '<form class="request-form" data-request="offerte" data-product="' + h.esc(product.id) + '" novalidate>\n'
			+ '\t\t\t<h2 class="request-title">Vraag jouw prijs en ontwerp aan</h2>\n'
			+ '\t\t\t<div class="form-row">\n'
			+ '\t\t\t\t<div class="form-group"><label for="rq-name">Naam <span aria-hidden="true">*</span></label><input type="text" id="rq-name" name="name" required autocomplete="name"></div>\n'
			+ '\t\t\t\t<div class="form-group"><label for="rq-email">E-mailadres <span aria-hidden="true">*</span></label><input type="email" id="rq-email" name="email" required autocomplete="email"></div>\n'
			+ '\t\t\t</div>\n'
			+ '\t\t\t<div class="form-row">\n'
			+ '\t\t\t\t<div class="form-group"><label for="rq-size">Gewenste afmeting</label><input type="text" id="rq-size" name="size" placeholder="Bijv. 20 cm breed"></div>\n'
			+ '\t\t\t\t<div class="form-group form-group-narrow"><label for="rq-qty">Aantal</label><input type="number" id="rq-qty" name="quantity" min="1" value="1" inputmode="numeric"></div>\n'
			+ '\t\t\t</div>\n'
			+ '\t\t\t<div class="form-group"><label for="rq-text">Wat wil je laten maken? <span aria-hidden="true">*</span></label><textarea id="rq-text" name="text" rows="3" required placeholder="Je logo, naam of idee, en waar hij komt te staan"></textarea></div>\n'
			+ '\t\t\t' + h.uploadField(ctx.site, 'offerte', { label: 'Je logo of afbeelding', hint: 'Het liefst als SVG, PDF of een scherpe PNG. Nog niet bij de hand? Dan mail je het later.' }) + '\n'
			+ '\t\t\t<input type="checkbox" name="botcheck" class="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">\n'
			+ '\t\t\t' + h.nieuwsbriefCheckbox('rq-nieuwsbrief') + '\n'
			+ '\t\t\t' + h.privacyCheckbox(ctx.site, root, 'rq-privacy', false) + '\n'
			+ '\t\t\t<p class="checkout-msg" data-request-msg role="alert"></p>\n'
			+ '\t\t\t<button type="submit" class="btn btn-primary btn-block">Verstuur aanvraag</button>\n'
			+ '\t\t\t<p class="pdp-note">Vrijblijvend. Je ontvangt eerst een voorstel met prijs.</p>\n'
			+ '\t\t</form>\n'
			+ '\t\t<div class="request-success" data-request-success hidden tabindex="-1"><strong>Bedankt, je aanvraag is verstuurd!</strong><p>Ik neem zo snel mogelijk contact met je op met een voorstel.</p></div>';
	}
	return '<form class="request-form" data-request="beschikbaarheid" data-product="' + h.esc(product.id) + '" novalidate>\n'
		+ '\t\t\t<h2 class="request-title">Houd mij op de hoogte</h2>\n'
		+ '\t\t\t<div class="form-group"><label for="rq-email">E-mailadres <span aria-hidden="true">*</span></label><input type="email" id="rq-email" name="email" required autocomplete="email" placeholder="je@email.nl"></div>\n'
		+ '\t\t\t<input type="checkbox" name="botcheck" class="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">\n'
		+ '\t\t\t' + h.privacyCheckbox(ctx.site, root, 'rq-privacy', false) + '\n'
		+ '\t\t\t<p class="checkout-msg" data-request-msg role="alert"></p>\n'
		+ '\t\t\t<button type="submit" class="btn btn-primary btn-block">Laat het me weten</button>\n'
		+ '\t\t\t<p class="pdp-note">Dit product is op dit moment niet te bestellen. Je krijgt één bericht zodra hij er weer is, verder niets.</p>\n'
		+ '\t\t</form>\n'
		+ '\t\t<div class="request-success" data-request-success hidden tabindex="-1"><strong>Genoteerd!</strong><p>Je hoort van mij zodra de ' + name + ' weer beschikbaar is.</p></div>';
}

// Kleurkeuze: per combinatie een staal (kap boven, voet onder) en de foto's aan en uit. De gekozen tekst
// ("Kap crème, voet terracotta") gaat als wens mee met de winkelwagenregel; de bestelfunctie kent dat veld al.
function kleurKeuze(product, ctx, root) {
	function beeld(b) {
		return h.esc(JSON.stringify({
			src: h.imgPath(ctx.images, b.file, 800, root, true),
			srcset: h.cropSrcset(ctx.images, b.file, root),
			full: h.imgPath(ctx.images, b.file, 1600, root),
			alt: b.alt,
			d3: is3d(b)
		}));
	}
	return '\t\t\t<fieldset class="product-options kleur-keuze">\n\t\t\t\t<legend>Kies je kleuren</legend>\n'
		+ '\t\t\t\t<div class="kleur-opties">\n'
		+ product.kleuren.map(function (k, i) {
			return '\t\t\t\t\t<label class="kleur-optie"><input type="radio" name="kleur" value="' + h.esc(k.id) + '" data-tekst="' + h.esc(k.tekst) + '"'
				+ ' data-aan="' + beeld(k.aan) + '" data-uit="' + beeld(k.uit) + '"' + (i === 0 ? ' checked' : '') + '>'
				+ '<span class="kleur-staal" style="--kap:' + k.kap + ';--voet:' + k.voet + '" aria-hidden="true"></span>'
				+ '<span class="kleur-naam">' + h.esc(k.naam) + '</span></label>';
		}).join('\n') + '\n'
		+ '\t\t\t\t\t<label class="kleur-optie"><input type="radio" name="kleur" value="eigen"><span class="kleur-staal kleur-staal-eigen" aria-hidden="true"></span><span class="kleur-naam">Eigen kleuren</span></label>\n'
		+ '\t\t\t\t</div>\n\t\t\t</fieldset>\n';
}

// Zo zit hij in elkaar (optioneel, "opbouw" in products.json): explosietekening met de onderdelen op volgorde
function opbouwSection(product, ctx, root) {
	const o = product.opbouw;
	if (!o) return '';
	return '<section class="container pdp-opbouw" aria-labelledby="opbouw-heading">\n'
		+ '\t<figure class="pdp-opbouw-beeld">' + h.img(ctx.images, o.beeld.file, { alt: o.beeld.alt, sizes: '(max-width: 900px) 100vw, 460px', root: root })
		+ (is3d(o.beeld) ? '<span class="pdp-weergave">3D-weergave</span>' : '') + '</figure>\n'
		+ '\t<div class="pdp-opbouw-tekst">\n'
		+ '\t\t<h2 id="opbouw-heading">' + h.esc(o.kop) + '</h2>\n'
		+ '\t\t<ol class="pdp-opbouw-lijst">\n'
		+ o.stappen.map(function (st) { return '\t\t\t<li><strong>' + h.esc(st.deel) + '</strong> ' + h.esc(st.tekst) + '</li>'; }).join('\n') + '\n'
		+ '\t\t</ol>\n'
		+ (o.noot ? '\t\t<p class="pdp-opbouw-noot">' + h.esc(o.noot) + '</p>\n' : '')
		+ '\t</div>\n'
		+ '</section>\n';
}

// De lampen naast elkaar, op ware grootte (shop.json > lampfamilie). Vervangt "Past erbij" op de lamppagina's,
// zodat er niet twee rijen met dezelfde lampen staan.
function familieSection(product, ctx, root) {
	const f = ctx.shop && ctx.shop.lampfamilie;
	if (!f || f.leden.indexOf(product.id) === -1) return '';
	return '<section class="container pdp-familie" aria-labelledby="familie-heading">\n'
		+ '\t<h2 id="familie-heading">' + h.esc(f.kop) + '</h2>\n'
		+ '\t<figure class="pdp-familie-beeld">' + h.img(ctx.images, f.beeld.file, { alt: f.beeld.alt, sizes: '(max-width: 1280px) 100vw, 1200px', root: root })
		+ (is3d(f.beeld) ? '<span class="pdp-weergave">3D-weergave</span>' : '') + '</figure>\n'
		+ '\t<ul class="pdp-familie-namen">\n'
		+ f.leden.map(function (id) {
			const p = ctx.byId[id];
			const hoogte = (p.specs.find(function (s) { return s.label === 'Hoogte'; }) || {}).value || '';
			const naam = '<span class="pdp-familie-naam">' + h.esc(p.name) + '</span><span class="pdp-familie-maat">' + h.esc(hoogte) + ' · ' + h.euro(p.variants[0].price) + '</span>';
			return '\t\t<li>' + (id === product.id ? '<span aria-current="page">' + naam + '</span>' : '<a href="' + h.productUrl(p, root) + '">' + naam + '</a>') + '</li>';
		}).join('\n') + '\n'
		+ '\t</ul>\n'
		+ '</section>\n';
}

// Introductieprijs: geen doorgestreepte "van"-prijs (die mag alleen als je hem echt hebt gevraagd), maar
// in gewone taal tot wanneer de prijs geldt en wat hij daarna wordt. build.js rekent de datum zelf na.
function introNote(product) {
	if (!(product.intro && product.intro.active)) return '';
	const until = new Date(product.intro.until + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
	return '\t\t<p class="pdp-intro-note"><strong>Introductieprijs</strong> tot en met ' + until
		+ '. Daarna ' + h.euro(product.variants[0].regularPrice) + '.</p>\n';
}

// Echte aantallen ("geprint" in products.json, geteld uit de facturen). Bewust "geprint" en niet "tevreden klanten":
// het meeste ging via winkels.
function geprintNote(product) {
	if (!product.geprint) return '';
	return '\t\t<p class="pdp-bewijs">Al ' + h.aantalTekst(product.geprint) + ' keer geprint</p>\n';
}

// Een set ("set" in products.json): wat de onderdelen los samen kosten, uitgerekend uit hun eigen prijzen
function setNote(product, ctx) {
	if (!product.set) return '';
	const los = product.set.reduce(function (som, deel) {
		const p = ctx.byId[deel.id];
		const v = p && (p.variants.find(function (x) { return x.id === deel.variant; }) || p.variants[0]);
		if (!v) throw new Error('Set ' + product.id + ': onderdeel ' + deel.id + ' bestaat niet');
		return som + v.price;
	}, 0);
	return '\t\t<p class="pdp-set-note">Los gekocht kosten ze samen ' + h.euro(Math.round(los * 100) / 100) + '.</p>\n';
}

// Wie het maakt, met een gezicht: onder de koopknop. Plus de winkels waar het product ook ligt (shop.json > verkooppunten).
function makerBlock(product, ctx, root) {
	const site = ctx.site;
	const portret = site.homeImages && site.homeImages.about;
	const winkels = (site.verkooppunten || []).filter(function (v) { return v.producten.indexOf(product.id) !== -1; });
	return '\t\t<div class="pdp-maker">\n'
		+ (portret ? '\t\t\t' + h.img(ctx.images, portret.file, { alt: '', sizes: '56px', root: root, className: 'pdp-maker-foto' }) + '\n' : '')
		+ '\t\t\t<p>Ik ontwerp en print elk stuk zelf in ' + h.esc(site.pickupLocation) + '. Vraag over kleur of maat? <a href="' + root + 'contact.html?onderwerp=tastbaar">Stuur me een bericht</a>.<span class="pdp-maker-naam">Jelger</span></p>\n'
		+ '\t\t</div>\n'
		+ (winkels.length ? '\t\t<p class="pdp-verkooppunten"><strong>Ook te koop bij</strong> ' + h.esc(h.verkooppuntenZin(winkels)) + '.</p>\n' : '');
}

// Achtergrond (optioneel, "achtergrond" in products.json): het verhaal achter een ontwerp, met tussenkoppen. Voor
// D'r Joep de geschiedenis van het monument op de Markt (content-gap-analyse 16-11-2026: de top 10 vertelt dat verhaal,
// de productpagina niet). Alleen feiten uit de bronnen die daar staan.
function achtergrondSection(product) {
	const a = product.achtergrond;
	if (!a || !a.blokken || !a.blokken.length) return '';
	return '<section class="container pdp-achtergrond" aria-labelledby="achtergrond-heading">\n'
		+ '\t<h2 id="achtergrond-heading">' + h.esc(a.kop) + '</h2>\n'
		+ (a.intro ? '\t<p class="pdp-achtergrond-intro">' + h.esc(a.intro) + '</p>\n' : '')
		+ '\t<div class="pdp-achtergrond-blokken">\n'
		+ a.blokken.map(function (b) {
			return '\t\t<div class="pdp-achtergrond-blok">\n\t\t\t<h3>' + h.esc(b.kop) + '</h3>\n'
				+ b.tekst.map(function (t) { return '\t\t\t<p>' + h.esc(t) + '</p>'; }).join('\n') + '\n\t\t</div>';
		}).join('\n') + '\n'
		+ '\t</div>\n'
		+ '</section>\n';
}

// Vragen over dit product (optioneel, "faq" in products.json), ook als FAQPage voor zoekmachines
function vragenSection(product) {
	if (!product.faq || !product.faq.length) return '';
	return '<section class="container pdp-vragen" aria-labelledby="vragen-heading">\n'
		+ '\t<h2 id="vragen-heading">Vragen over ' + h.esc(product.name) + '</h2>\n'
		+ '\t<div class="faq">\n' + product.faq.map(function (v) { return '\t\t' + c.vraag(v.q, h.esc(v.a)); }).join('\n') + '\n\t</div>\n'
		+ '</section>\n';
}

// Promovideo (optioneel, "video" in products.json). Laadt pas als de bezoeker op play drukt.
function videoSection(product, ctx, root) {
	if (!product.video) return '';
	const video = product.video;
	return '<section class="container pdp-video" aria-labelledby="video-heading">\n'
		+ '\t<h2 id="video-heading">' + h.esc(video.heading || 'Bekijk de video') + '</h2>\n'
		+ '\t<video controls preload="none" playsinline width="1280" height="720" poster="' + h.imgPath(ctx.images, video.poster, 1200, root) + '">\n'
		+ '\t\t<source src="' + root + 'assets/video/' + h.esc(video.file) + '" type="video/mp4">\n'
		+ '\t\tJe browser kan deze video niet afspelen.\n'
		+ '\t</video>\n'
		+ (video.alt ? '\t<p class="pdp-video-caption">' + h.esc(video.alt) + '</p>\n' : '')
		+ '</section>\n';
}

function productLd(product, ctx) {
	const site = ctx.site;
	const url = site.url + '/' + h.productUrl(product);
	const data = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: product.name,
		description: product.seo.description,
		sku: product.id,
		url: url,
		image: product.images.map(function (image) { return site.url + '/' + h.imgPath(ctx.images, image.file, 1600); }),
		brand: { '@type': 'Brand', name: site.name },
		category: site.types[product.type].label
	};
	if (product.material) data.material = product.material;

	function offer(variant) {
		return {
			'@type': 'Offer',
			name: variant.label || product.name,
			price: variant.price.toFixed(2),
			priceCurrency: 'EUR',
			availability: 'https://schema.org/InStock',
			itemCondition: 'https://schema.org/NewCondition',
			url: url,
			// Zolang de introductieprijs loopt, weet Google tot wanneer deze prijs geldt
			priceValidUntil: product.intro && product.intro.active ? product.intro.until : undefined,
			seller: { '@type': 'Organization', name: site.name }
		};
	}

	if (product.sale === 'cart' && product.variants.length === 1) {
		data.offers = offer(product.variants[0]);
	} else if (product.sale === 'cart') {
		const prices = product.variants.map(function (v) { return v.price; });
		data.offers = {
			'@type': 'AggregateOffer',
			priceCurrency: 'EUR',
			lowPrice: Math.min.apply(null, prices).toFixed(2),
			highPrice: Math.max.apply(null, prices).toFixed(2),
			offerCount: product.variants.length,
			offers: product.variants.map(offer)
		};
	} else if (product.sale === 'request' && product.priceFrom != null) {
		data.offers = { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: product.priceFrom.toFixed(2), url: url };
	} else {
		// Zonder aanbod (extern / binnenkort) geen Product-schema: Google keurt dat af
		return null;
	}
	return data;
}

function productPage(product, ctx) {
	const site = ctx.site;
	const root = '../';
	// Op de productpagina staat de eerste variant voorgeselecteerd, dus toon díe prijs (geen "Vanaf")
	const price = product.sale === 'cart' ? h.euro(product.variants[0].price) : h.priceLabel(product);
	const first = product.images[0];
	const firstEntry = ctx.images[first.file];

	const crumbs = [
		{ label: 'Home', path: '', url: root },
		{ label: 'Webshop', path: 'webshop.html', url: root + 'webshop.html' },
		{ label: product.name, path: h.productUrl(product) }
	];

	const specs = product.specs.slice();
	if (product.material) specs.unshift({ label: 'Materiaal', value: product.material });

	// Staat de lampfamilie op de pagina, dan geen lampen uit die familie nog eens onder "Past erbij"
	const familie = ctx.shop && ctx.shop.lampfamilie && ctx.shop.lampfamilie.leden.indexOf(product.id) !== -1 ? ctx.shop.lampfamilie.leden : [];
	const related = (product.related || []).filter(function (id) { return familie.indexOf(id) === -1; }).map(function (id) { return ctx.byId[id]; });
	const reviews = ctx.reviews.filter(function (r) { return r.products.indexOf(product.id) !== -1; });

	const main = '<div class="container pdp-container">\n'
		+ '\t' + c.breadcrumbs(crumbs) + '\n'
		+ '\t<article class="pdp"' + (product.personalize ? ' data-keychain' : '') + '>\n'
		+ '\t' + (product.personalize ? keychainStage() : gallery(product, ctx, root)) + '\n'
		+ '\t<div class="pdp-buy">\n'
		+ '\t\t<p class="product-kicker">' + c.kicker(product, ctx) + '</p>\n'
		+ (product.badge ? '\t\t<p class="pdp-badge">' + h.esc(product.badge) + '</p>\n' : '')
		+ '\t\t<h1 class="pdp-title">' + h.esc(product.name) + '</h1>\n'
		+ '\t\t<p class="pdp-tagline">' + h.esc(product.tagline) + '</p>\n'
		+ (price ? '\t\t<p class="pdp-price" id="pdp-price" aria-live="polite">' + price + '</p>\n' : '\t\t<p class="pdp-price pdp-price-muted">Binnenkort beschikbaar</p>\n')
		+ introNote(product)
		+ setNote(product, ctx)
		+ geprintNote(product)
		+ (product.sale === 'cart' ? '\t\t<p class="pdp-price-note">' + h.esc(site.shipping.note) + '</p>\n' : '')
		+ '\t\t' + buyBox(product, ctx, root) + '\n'
		+ '\t\t<ul class="pdp-usps">\n'
		+ site.productUsps.map(function (usp) { return '\t\t\t<li>' + h.esc(usp) + '</li>'; }).join('\n') + '\n'
		+ '\t\t</ul>\n'
		+ (product.sale === 'cart'
			? '\t\t<details class="pdp-delivery">\n\t\t\t<summary>Levering en verzendkosten</summary>\n'
				+ '\t\t\t<p>' + h.esc(site.delivery.leadTimeLong) + '</p>\n\t\t\t<p>' + h.esc(site.delivery.shipping) + ' ' + h.esc(site.delivery.pickup) + '</p>\n\t\t</details>\n'
			: '')
		+ makerBlock(product, ctx, root)
		+ '\t</div>\n'
		+ '\t</article>\n\n'
		+ '\t<div class="pdp-details">\n'
		+ '\t\t<section class="pdp-story" aria-labelledby="story-heading">\n'
		+ '\t\t\t<h2 id="story-heading">Het verhaal</h2>\n'
		+ product.description.map(function (p) { return '\t\t\t<p>' + h.esc(p) + '</p>'; }).join('\n') + '\n'
		+ '\t\t</section>\n'
		+ '\t\t<section class="pdp-specs" aria-labelledby="specs-heading">\n'
		+ '\t\t\t<h2 id="specs-heading">In het kort</h2>\n'
		+ '\t\t\t<ul class="feature-list">\n'
		+ product.highlights.map(function (item) { return '\t\t\t\t<li>' + h.esc(item) + '</li>'; }).join('\n') + '\n'
		+ '\t\t\t</ul>\n'
		+ (specs.length
			? '\t\t\t<dl class="spec-list">\n' + specs.map(function (s) {
				return '\t\t\t\t<div><dt>' + h.esc(s.label) + '</dt><dd>' + h.esc(s.value) + '</dd></div>';
			}).join('\n') + '\n\t\t\t</dl>\n'
			: '')
		+ handleidingLink(product, ctx, root)
		+ '\t\t</section>\n'
		+ '\t</div>\n'
		+ '</div>\n\n'
		+ opbouwSection(product, ctx, root)
		+ familieSection(product, ctx, root)
		+ achtergrondSection(product)
		+ vragenSection(product)
		+ videoSection(product, ctx, root)
		+ c.reviewsSection(reviews, 'Wat klanten zeggen over de ' + product.name, { root: root, product: product })
		+ (related.length
			? '<section class="container pdp-related" aria-labelledby="related-heading">\n'
				+ '\t<h2 id="related-heading">Past erbij</h2>\n'
				+ '\t<div class="grid grid-products">\n'
				+ related.map(function (p) { return c.productCard(p, ctx, { root: root }); }).join('\n') + '\n'
				+ '\t</div>\n'
				+ '</section>\n'
			: '')
		+ (product.sale === 'cart' && !product.personalize
			? '<div class="pdp-sticky" data-sticky hidden>\n'
				+ '\t<div><strong>' + h.esc(product.name) + '</strong><span data-sticky-price>' + price + '</span></div>\n'
				+ '\t<button type="button" class="btn btn-primary" data-sticky-add>In winkelwagen</button>\n'
				+ '</div>\n'
			: '');

	const ld = [c.breadcrumbsLd(crumbs, site)];
	const pLd = productLd(product, ctx);
	if (pLd) ld.push(pLd);
	if (product.faq && product.faq.length) {
		ld.push({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: product.faq.map(function (v) { return { '@type': 'Question', name: v.q, acceptedAnswer: { '@type': 'Answer', text: v.a } }; })
		});
	}

	return {
		path: h.productUrl(product),
		root: root,
		name: 'product',
		title: product.seo.title + ' | ' + site.name,
		ogTitle: product.seo.title,
		description: product.seo.description,
		ogImage: firstEntry.og,
		ogType: 'product',
		// Bij de ontwerptool staat er een live preview in plaats van de foto: dan valt er niets vooraf te laden
		preload: product.personalize ? null : { srcset: h.cropSrcset(ctx.images, first.file, root), sizes: GALLERY_SIZES },
		jsonLd: ld,
		main: main
	};
}

module.exports = productPage;
