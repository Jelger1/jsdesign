// De nieuwsbriefmelding linksonder (opmaak: layout.js > nieuwsbriefMelding, instellingen: site.json > nieuwsbriefMelding).
// Hij verschijnt als iemand een tijdje actief rondkijkt: de seconden tellen alleen terwijl het tabblad in beeld is, en
// lopen door over pagina's heen (sessionStorage). Eén keer per bezoek, en nooit:
// - als je je al hebt aangemeld (nieuwsbrief.js onthoudt dat, ook via het formulier in de footer);
// - binnen pauzeDagen na "Nu niet" of het kruisje;
// - zolang er iets anders openstaat (cookiebanner, winkelwagen, menu, chat) of je aan het typen bent: dan wacht hij even.
// Geen modal: de pagina blijft gewoon werken en de focus springt er niet heen. Escape sluit hem.
import { prefersReducedMotion, track } from './util.js';

const TIJD = 'jd-nb-tijd'; // sessionStorage: seconden actief op de site in dit bezoek
const GETOOND = 'jd-nb-getoond'; // sessionStorage: dit bezoek al getoond
const WEG = 'jd-nb-weg'; // localStorage: wanneer iemand "Nu niet" zei
export const AANGEMELD = 'jd-nb-aangemeld'; // localStorage: aangemeld via een van de formulieren
const DAG = 864e5;

function lees(opslag, sleutel) {
	try { return opslag.getItem(sleutel); } catch (e) { return null; }
}
function schrijf(opslag, sleutel, waarde) {
	try { opslag.setItem(sleutel, waarde); } catch (e) { /* privévenster of geblokkeerd: dan alleen dit bezoek */ }
}

// Staat er iets anders open, of is de bezoeker bezig? Dan nog niet.
function bezet() {
	if (document.body.classList.contains('is-locked')) return true; // winkelwagen, menu, filters, lightbox (dialog.js)
	if (document.querySelector('dialog[open], .cookie-banner:not([hidden]), .chat-knop[aria-expanded="true"]')) return true;
	const actief = document.activeElement;
	return Boolean(actief && actief.matches('input, textarea, select, [contenteditable="true"]'));
}

export function initMelding() {
	const melding = document.getElementById('nb-melding');
	if (!melding) return;
	if (lees(localStorage, AANGEMELD) || lees(sessionStorage, GETOOND)) return;
	const pauze = Number(melding.dataset.pauze || 30) * DAG;
	const weg = Number(lees(localStorage, WEG) || 0);
	if (weg && Date.now() - weg < pauze) return;

	const na = Number(melding.dataset.na || 45);
	let seconden = Number(lees(sessionStorage, TIJD) || 0);
	let klok = 0;

	function toon() {
		clearInterval(klok);
		schrijf(sessionStorage, GETOOND, '1');
		melding.hidden = false;
		// Het portret wordt geprint, net als de beelden op de site (brand.css > print-loopt)
		const foto = melding.querySelector('.nb-melding-foto');
		if (foto && !prefersReducedMotion) {
			const kop = document.createElement('span');
			kop.className = 'printkop';
			foto.classList.add('print-loopt');
			foto.appendChild(kop);
			setTimeout(function () { foto.classList.remove('print-loopt'); kop.remove(); }, 900);
		}
		requestAnimationFrame(function () { melding.classList.add('is-open'); });
		document.addEventListener('keydown', escape);
		track('nieuwsbrief_melding', { stap: 'getoond', na_seconden: seconden });
	}

	function sluit(nietMeer) {
		document.removeEventListener('keydown', escape);
		if (nietMeer) schrijf(localStorage, WEG, String(Date.now()));
		melding.classList.remove('is-open');
		melding.classList.add('is-weg');
		setTimeout(function () { melding.hidden = true; melding.classList.remove('is-weg'); }, prefersReducedMotion ? 0 : 260);
	}

	function escape(event) {
		// Niet als Escape eigenlijk voor iets anders is (een open menu of dialoog sluit dan eerst)
		if (event.key === 'Escape' && !document.body.classList.contains('is-locked')) sluit(true);
	}

	melding.addEventListener('click', function (event) {
		if (!event.target.closest('[data-melding-weg]')) return;
		track('nieuwsbrief_melding', { stap: 'weggeklikt' });
		sluit(true);
	});
	// Aangemeld via de melding: even het bedankje laten staan, dan weg
	melding.addEventListener('nieuwsbrief:aangemeld', function () { setTimeout(function () { sluit(false); }, 6000); });

	klok = setInterval(function () {
		if (document.visibilityState !== 'visible') return;
		seconden++;
		schrijf(sessionStorage, TIJD, String(seconden));
		if (seconden >= na && !bezet()) toon();
	}, 1000);
}
