// Meetpunten die bij geen enkel onderdeel horen. Alles gaat via track() naar de dataLayer; Tag Manager stuurt het
// pas door naar GA4 als de bezoeker toestemming gaf (consent.js). Nooit persoonsgegevens of wat iemand typt.
// De gebeurtenissen en hun velden staan in docs/meten.md; de tag die ze doorstuurt in docs/gtm/.
import { track } from './util.js';

// Een herkenbare naam voor een deel van de pagina: het id, anders de kop waar het naar verwijst ("werk-titel" > "werk"),
// anders de eerste klasse
function naam(el) {
	return el.id || (el.getAttribute('aria-labelledby') || '').replace(/-(titel|heading)$/, '') || (el.classList[0] || 'pagina');
}

// Een klik op een knop of link naar het contactformulier, met de tekst en het deel van de pagina waar hij stond
export function initMeten() {
	document.addEventListener('click', function (e) {
		const a = e.target.closest('a[href]');
		if (!a || a.closest('.chat')) return; // de chat meet zelf (chat_naar_jelger)
		const url = new URL(a.href, location.href);
		if (url.origin !== location.origin || !/\/contact\.html$/.test(url.pathname)) return;
		const blok = a.closest('section, main > header, main > div');
		const onderdeel = a.closest('.site-header') ? 'header' : a.closest('.site-footer') ? 'footer' : blok ? naam(blok) : 'pagina';
		track('contact_klik', {
			link_tekst: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
			onderdeel: onderdeel,
			onderwerp: url.searchParams.get('onderwerp') || undefined
		});
	}, true); // vóór de paginaovergang, die de klik zelf afhandelt
}
