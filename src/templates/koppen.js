// De blur-reveal uit de reel: koppen komen woord voor woord scherp, zonder te verschuiven (src/css/brand.css). Hier
// krijgt elk woord van de h1 en van de sectiekoppen in <main> een eigen <span class="w"> met zijn plaats (--i), bij het
// bouwen, zodat de h1 al vanaf het eerste beeld kan spelen en er niets knippert terwijl JavaScript laadt. Een element in
// de kop (een accentwoord in .highlight, een link) komt als één geheel. Sectiekoppen: een h2 met een id op "-titel" of
// een hoofdstuk van een case ("stap-1"). Koppen die JavaScript zelf herschrijft (een data-attribuut, zoals de winkel en
// de bevestigingspagina's) en de kleine labels blijven zoals ze zijn.
const SECTIEKOP = /\sid="(?:[^"]*-titel|stap-\d+)"/;
const OVERSLAAN = /\sdata-|\sid="(?:kort|toc|noot)-titel"|class="[^"]*\bpijler-label\b/;
const LEEG = /^(?:br|wbr)$/i;

function koppen(html) {
	const begin = html.indexOf('<main');
	const eind = html.lastIndexOf('</main>');
	if (begin === -1 || eind === -1) return html;
	const main = html.slice(begin, eind).replace(/<(h[12])(\s[^>]*)?>([\s\S]*?)<\/\1>/g, function (kop, tag, attrs, inhoud) {
		attrs = attrs || '';
		if (tag === 'h2' && !SECTIEKOP.test(attrs)) return kop;
		if (OVERSLAAN.test(attrs) || inhoud.indexOf('class="w"') > -1) return kop;
		return '<' + tag + klasse(attrs, 'kop-woorden') + '>' + woorden(inhoud) + '</' + tag + '>';
	});
	return html.slice(0, begin) + main + html.slice(eind);
}

// Zet de woorden en elementen op het hoogste niveau elk in hun eigen stuk
function woorden(inhoud) {
	const delen = inhoud.split(/(<[^>]+>)/);
	let uit = '';
	let diepte = 0;
	let i = 0;
	delen.forEach(function (deel) {
		if (!deel) return;
		if (deel.charAt(0) === '<') {
			const naam = (deel.match(/^<\/?([a-z0-9]+)/i) || [])[1] || '';
			const sluit = deel.charAt(1) === '/';
			if (diepte === 0 && !sluit && !LEEG.test(naam) && !/\/>$/.test(deel)) {
				uit += deel.replace(/^<([a-z0-9]+)(\s[^>]*)?>$/i, function (m, n, a) { return '<' + n + klasse(stijl(a || '', i++), 'w') + '>'; });
				diepte++;
				return;
			}
			if (!LEEG.test(naam) && !/\/>$/.test(deel)) diepte += sluit ? -1 : 1;
			uit += deel;
			return;
		}
		if (diepte > 0) { uit += deel; return; }
		uit += deel.split(/(\s+)/).map(function (stuk) {
			if (!stuk || /^\s+$/.test(stuk)) return stuk;
			return '<span class="w" style="--i:' + (i++) + '">' + stuk + '</span>';
		}).join('');
	});
	return uit;
}

function klasse(attrs, naam) {
	if (/\sclass="/.test(attrs)) return attrs.replace(/\sclass="([^"]*)"/, function (m, k) { return ' class="' + (k ? k + ' ' : '') + naam + '"'; });
	return attrs + ' class="' + naam + '"';
}

function stijl(attrs, i) {
	if (/\sstyle="/.test(attrs)) return attrs.replace(/\sstyle="([^"]*)"/, function (m, s) { return ' style="--i:' + i + ';' + s + '"'; });
	return attrs + ' style="--i:' + i + '"';
}

module.exports = koppen;
