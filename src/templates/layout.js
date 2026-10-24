// Het HTML-skelet van elke pagina: <head> met SEO-tags, header, footer, winkelwagen.
const h = require('./helpers');
const seo = require('./seo');

// Menu-onderdelen en de pagina waar ze naartoe gaan
const NAV = {
	branding: 'design-branding.html', digitaal: 'websites-interactie.html', tastbaar: '3d-printen.html',
	portfolio: 'portfolio/index.html', webshop: 'webshop.html', over: 'over.html', contact: 'contact.html'
};
// De naam van elk menu-onderdeel, zoals in het menu
const NAV_LABEL = { branding: 'Branding', digitaal: 'Digitaal', tastbaar: 'Tastbaar', portfolio: 'Portfolio', webshop: 'Webshop', over: 'Over', contact: 'Contact' };
// Bij welk menu-onderdeel een pagina hoort als ze er zelf niet in staat (voor de markering in het menu)
const SECTION_BY_NAME = { shop: 'webshop', category: 'webshop', product: 'webshop', checkout: 'webshop', thanks: 'webshop' };
const PILLARS = ['branding', 'digitaal', 'tastbaar'];

// page: { path, root, name, section, pillar, title, description, ogImage, ogType, schemaType, jsonLd[], preload, main, noindex }
function layout(page, ctx) {
	const site = ctx.site;
	const root = page.root || '';
	const productie = ctx.mode === 'productie';
	const canonicalPath = page.path === 'index.html' ? '' : page.path.replace(/(^|\/)index\.html$/, '$1');
	const canonical = site.url + '/' + canonicalPath;
	const defaultOg = ctx.images[site.defaultOgImage].og;
	const ogImage = site.url + '/assets/og/' + (page.ogImage || defaultOg);
	const v = '?v=' + ctx.version;
	// In de preview (en lokaal) nooit indexeren; in productie alleen pagina's die daar zelf om vragen niet
	const noindex = page.noindex || !productie;

	const section = page.section || SECTION_BY_NAME[page.name] || (page.path === '3d-printservice.html' ? 'tastbaar' : '');
	const pillar = page.pillar || (PILLARS.indexOf(section) > -1 ? section : (section === 'webshop' ? 'tastbaar' : ''));

	// Links naar de homepage gaan naar de map ("./", "../" of "/"), niet naar index.html: dat is voor Google een
	// tweede adres van dezelfde pagina
	const home = root || './';
	const socials = site.socials || {};
	// Het mobiele menu (een dialog in de header) toont per pijler de korte omschrijving (pillars.json > omschrijving)
	// en de socials
	const headerValues = {
		root: root, home: home, logo: ctx.partials.logo,
		instagram: h.esc(socials.instagram || site.instagram), linkedin: h.esc(socials.linkedin || ''), github: h.esc(socials.github || '')
	};
	Object.keys(NAV).forEach(function (key) {
		headerValues['nav:' + key] = page.path === NAV[key] ? ' aria-current="page"' : (section === key ? ' data-ancestor' : '');
	});
	// Onder 900px staat naast het logo waar je bent (header.css > .header-hier). Op een pagina eronder (een case, een
	// product, de printservice) is het een link terug naar het overzicht van die sectie. In de bovenbalk van het menu
	// staat dezelfde naam als kopie op dezelfde plek (aria-hidden: in het menu draagt de link zelf aria-current).
	const hier = Object.keys(NAV).find(function (k) { return page.path === NAV[k]; }) || (NAV[section] ? section : '');
	const sectie = Boolean(hier) && page.path !== NAV[hier];
	const hierNaam = '<span class="header-hier-naam">' + h.esc(NAV_LABEL[hier] || '') + '</span>';
	const hierKlasse = 'header-hier' + (sectie ? ' is-sectie' : '');
	headerValues.hier = !hier ? ''
		: sectie ? '<a class="' + hierKlasse + '" href="' + root + NAV[hier].replace(/index\.html$/, '') + '"><span class="sr-only">Terug naar </span>' + hierNaam + '</a>'
		: '<span class="' + hierKlasse + '"><span class="sr-only">Je bent hier: </span>' + hierNaam + '</span>';
	headerValues.hierMenu = hier ? '<span class="' + hierKlasse + '" aria-hidden="true">' + hierNaam + '</span>' : '';
	ctx.pillars.forEach(function (p) { headerValues['kort:' + p.id] = h.esc(p.omschrijving); });
	let header = h.fill(ctx.partials.header, headerValues);
	if (page.name === 'home') header = header.replace(/href="\.\/#/g, 'href="#');

	const footer = h.fill(ctx.partials.footer, {
		root: root,
		home: home,
		logo: ctx.partials.logo,
		year: String(ctx.year),
		name: h.esc(site.name),
		owner: h.esc(site.owner),
		slogan: h.esc(site.slogan),
		description: h.esc(site.description),
		emailLink: h.mailLink(site.email, root),
		addressLine: h.addressLine(site),
		kvk: h.esc(site.kvk),
		btw: h.esc(site.btw),
		instagram: h.esc(socials.instagram || site.instagram),
		linkedin: h.esc(socials.linkedin || ''),
		github: h.esc(socials.github || ''),
		// Aanmelden voor de nieuwsbrief, behalve waar de pagina dat zelf al vraagt (bedankt) of net bevestigt
		newsletter: page.name === 'thanks' || page.name === 'confirm' ? '' : '<section class="footer-newsletter" aria-labelledby="footer-newsletter-heading">'
			+ '<div class="footer-newsletter-text"><h2 id="footer-newsletter-heading">Als eerste horen over nieuwe ontwerpen?</h2>'
			+ '<p>Laat je e-mailadres achter. Je krijgt alleen een mail als er iets nieuws is, en afmelden kan altijd.</p></div>'
			+ h.nieuwsbriefForm('footer', root)
			+ '</section>',
		pillarLinks: ctx.pillars.map(function (p) {
			return '<li><a href="' + root + p.path + '" data-pillar="' + p.id + '">' + h.esc(p.label) + '</a></li>';
		}).join('\n\t\t\t\t\t'),
		categoryLinks: (site.categoryPages || []).map(function (cat) {
			return '<li><a href="' + root + cat.slug + '.html">' + h.esc(cat.label) + '</a></li>';
		}).join('\n\t\t\t\t\t')
	});

	const cart = h.fill(ctx.partials.cart, {
		root: root,
		shippingNote: h.esc(site.shipping.note)
	});

	// Google Tag Manager alleen in productie. Daarvóór staat de standaardtoestemming (Consent Mode v2), anders kan een
	// tag starten voordat de cookiebanner iets heeft doorgegeven. Opslagnaam en termijn (12 maanden) moeten gelijk
	// blijven aan src/js/consent.js. In de preview laadt er geen analytics en vraagt de banner dus ook niets.
	const analytics = productie ? (site.analytics || {}) : {};
	const gtm = /^GTM-[A-Z0-9]+$/.test(analytics.gtm || '') ? analytics.gtm : '';
	const gtmHead = gtm
		? '\t<script>window.dataLayer=window.dataLayer||[];(function(){function gtag(){dataLayer.push(arguments);}'
			+ 'gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});'
			+ 'try{var c=JSON.parse(localStorage.getItem("js3d-consent-v2"));'
			+ 'if(c&&c.date&&Date.now()-new Date(c.date).getTime()<=365*864e5){var a=c.marketing?"granted":"denied";'
			+ 'gtag("consent","update",{analytics_storage:c.statistics?"granted":"denied",ad_storage:a,ad_user_data:a,ad_personalization:a});}'
			+ '}catch(e){}})();</script>\n'
			+ '\t<!-- Google Tag Manager -->\n'
			+ "\t<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\n"
			+ "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\n"
			+ "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n"
			+ "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n"
			+ "})(window,document,'script','dataLayer','" + gtm + "');</script>\n"
			+ '\t<!-- End Google Tag Manager -->\n'
		: '';
	// Welke toestemmingscategorieën er zijn, leest consent.js hieruit (ga4 = Statistieken, googleAds = Marketing)
	const analyticsAttrs = (site.backend && site.backend.url ? ' data-backend="' + h.esc(site.backend.url) + '"' : '') // waar formulieren heen gaan (src/js/util.js)
		+ (analytics.ga4 ? ' data-ga4="' + h.esc(analytics.ga4) + '"' : '')
		+ (analytics.googleAds ? ' data-ads="' + h.esc(analytics.googleAds) + '"' : '');

	const preload = page.preload
		? '\t<link rel="preload" as="image" imagesrcset="' + h.esc(page.preload.srcset) + '" imagesizes="' + h.esc(page.preload.sizes) + '" fetchpriority="high">\n'
		: '';

	// Eén samenhangende graaf: organisatie, persoon, website, deze pagina en wat de pagina zelf toevoegt
	const graph = seo.graph(page, site, { canonical: canonical, ogImage: ogImage, orgImage: site.url + '/assets/og/' + defaultOg });

	return '<!doctype html>\n'
		+ '<!-- GEGENEREERD BESTAND: pas dit niet handmatig aan. Bewerk data/ of src/ en draai "npm run build". -->\n'
		+ '<html lang="nl-NL"' + analyticsAttrs + '>\n<head>\n'
		+ '\t<meta charset="utf-8">\n'
		+ gtmHead
		+ '\t<meta name="viewport" content="width=device-width, initial-scale=1">\n'
		+ '\t<title>' + h.esc(page.title) + '</title>\n'
		+ '\t<meta name="description" content="' + h.esc(page.description) + '">\n'
		+ '\t<meta name="robots" content="' + (noindex ? 'noindex, ' + (productie ? 'follow' : 'nofollow') : 'index, follow, max-snippet:-1, max-image-preview:large') + '">\n'
		+ '\t<link rel="canonical" href="' + h.esc(canonical) + '">\n'
		+ '\t<meta name="theme-color" content="#080a0d">\n'
		+ '\t<meta property="og:type" content="' + (page.ogType || 'website') + '">\n'
		+ '\t<meta property="og:url" content="' + h.esc(canonical) + '">\n'
		+ '\t<meta property="og:title" content="' + h.esc(page.ogTitle || page.title) + '">\n'
		+ '\t<meta property="og:description" content="' + h.esc(page.description) + '">\n'
		+ '\t<meta property="og:image" content="' + h.esc(ogImage) + '">\n'
		+ '\t<meta property="og:image:width" content="1200">\n'
		+ '\t<meta property="og:image:height" content="630">\n'
		+ '\t<meta property="og:site_name" content="' + h.esc(site.name) + '">\n'
		+ '\t<meta property="og:locale" content="nl_NL">\n'
		+ '\t<meta name="twitter:card" content="summary_large_image">\n'
		+ '\t<link rel="icon" type="image/svg+xml" href="' + root + 'assets/brand/js-icon-tegel.svg">\n'
		+ '\t<link rel="icon" type="image/png" sizes="96x96" href="' + root + 'assets/brand/favicon-96.png">\n'
		+ '\t<link rel="apple-touch-icon" href="' + root + 'assets/brand/apple-touch-icon.png">\n'
		+ ctx.fonts.map(function (font) { return '\t<link rel="preload" as="font" type="font/woff2" href="' + root + 'assets/fonts/' + font + '" crossorigin>\n'; }).join('')
		+ '\t<link rel="stylesheet" href="' + root + 'css/styles.css' + v + '">\n'
		// Paginaovergang: kwam je hier via een link op de site (src/js/transition.js), dan begint de pagina achter het doek
		+ '\t<script>try{var pc=+sessionStorage.getItem(\'pc\');sessionStorage.removeItem(\'pc\');if(Date.now()-pc<5000&&!matchMedia(\'(prefers-reduced-motion: reduce)\').matches)document.documentElement.classList.add(\'pc-arriving\')}catch(e){}</script>\n'
		// Pagina's alvast ophalen als iemand een link aanwijst, zodat doorklikken (en de overgang) snel is.
		// Niet voor stappen met een eigen werking (afrekenen, bevestigen, gereageerd).
		+ '\t<script type="speculationrules">{"prefetch":[{"where":{"and":[{"href_matches":"/*"},{"not":{"href_matches":"*afrekenen*"}},{"not":{"href_matches":"*bedankt*"}},{"not":{"href_matches":"*gereageerd*"}},{"not":{"href_matches":"*nieuwsbrief*"}}]},"eagerness":"moderate"}]}</script>\n'
		+ preload
		+ '\t' + h.jsonLd(graph) + '\n'
		+ '\t<script type="module" src="' + root + 'js/main.js' + v + '"></script>\n'
		+ '</head>\n'
		+ '<body data-page="' + page.name + '" data-root="' + root + '"' + (pillar ? ' data-pillar="' + pillar + '"' : '') + '>\n'
		+ ctx.partials.curtain
		+ header + '\n'
		+ '<main id="main">\n' + page.main + '\n</main>\n'
		+ footer + '\n'
		+ cart + '\n'
		+ '</body>\n</html>\n';
}

module.exports = layout;
