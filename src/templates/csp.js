// Content-Security-Policy per pagina, als <meta> direct na de charset: GitHub Pages kan geen headers meesturen.
// Scripts mogen alleen komen van de site zelf, van Google Tag Manager (de container heeft alleen de Google-tag voor
// GA4, geen eigen HTML of JavaScript) en de inline scripts die build.js zelf op de pagina zet, elk met zijn hash. Een
// script dat iemand weet in te voegen, draait dus niet. Verder: geen plug-ins, geen andere <base>, formulieren alleen
// naar de site zelf, en alles via https.
// Bewust niet: connect-src, img-src en style-src (de metingen van Google, de chat, de uploads en de inline stijlen
// blijven zo werken; scripts zijn de echte deur) en frame-ancestors (werkt niet in een meta-tag).
// Verandert een inline script, dan verandert de hash vanzelf mee. Komt er een nieuwe externe scriptbron bij (een
// andere tag in Tag Manager, een widget), dan moet die hieronder bij BRONNEN, anders blokkeert de browser hem.
const crypto = require('crypto');

const BRONNEN = ['https://*.googletagmanager.com'];

module.exports = function csp(html) {
	const hashes = [];
	html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, function (heel, attrs, inhoud) {
		if (/\ssrc=/.test(attrs)) return heel; // een bestand: valt onder 'self' of BRONNEN
		const type = (/\stype="([^"]*)"/.exec(attrs) || [])[1] || '';
		if (/json/.test(type)) return heel; // gegevens (JSON-LD, de ankerkaart), geen code
		const hash = "'sha256-" + crypto.createHash('sha256').update(inhoud, 'utf8').digest('base64') + "'";
		if (hashes.indexOf(hash) === -1) hashes.push(hash);
		return heel;
	});
	const beleid = [
		"script-src 'self' " + hashes.concat(BRONNEN).join(' '),
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		'upgrade-insecure-requests'
	].join('; ');
	return html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n\t<meta http-equiv="Content-Security-Policy" content="' + beleid + '">');
};
