// De twee onthullingen uit de reel (brand.css): sectiekoppen komen woord voor woord scherp (de woorden staan er al in,
// src/templates/koppen.js) en beelden worden laag voor laag geprint, van onder naar boven, met een printkop in de
// pijlerkleur. Alleen voor wat bij het laden nog helemaal onder de vouw staat: dat krijgt zijn beginstand (.kop-wacht,
// .print-wacht) en speelt zodra het in beeld schuift. Wat al in beeld staat, beweegt niet; de h1 speelt met CSS alleen.
// Komen er meer beelden tegelijk in beeld (een rij tegels), dan printen ze na elkaar, in leesvolgorde.
// Er gaat niets verloren: zonder JavaScript of bij minder beweging staat alles er meteen, en een kop of beeld wacht
// alleen zolang het nog niet in beeld is. Een beeld print pas als het geladen en gedecodeerd is, zodat de printkop nooit
// over een leeg vak loopt; daarom haalt de pagina alle beelden alvast binnen zodra ze zelf klaar is (laadVooruit).
import { prefersReducedMotion } from './util.js';

const KOPPEN = 'main h2.kop-woorden';
const BEELDEN = ['.werk-beeld', '.maker-kort-beeld', '.pijler-case-beeld', '.project-media', '.ook-media', '.case-fig-beeld', '.verwant-beeld', '.product-thumb']
	.map(function (s) { return 'main ' + s; }).join(', ');
const NA_ELKAAR_MS = 140;

export function initOnthul() {
	laadVooruit();
	if (prefersReducedMotion || !('IntersectionObserver' in window)) return;
	const vouw = window.innerHeight;
	const wachtend = [];
	document.querySelectorAll(KOPPEN).forEach(function (kop) {
		if (kop.getBoundingClientRect().top <= vouw) return;
		kop.classList.add('kop-wacht');
		wachtend.push(kop);
	});
	document.querySelectorAll(BEELDEN).forEach(function (vak) {
		if (!vak.querySelector('img') || vak.getBoundingClientRect().top <= vouw) return;
		vak.classList.add('print-wacht');
		wachtend.push(vak);
	});
	if (!wachtend.length) return;

	const kijker = new IntersectionObserver(function (entries) {
		let n = 0;
		entries.filter(function (e) { return e.isIntersecting; })
			.sort(function (a, b) { return a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; })
			.forEach(function (e) {
				kijker.unobserve(e.target);
				if (e.target.classList.contains('kop-wacht')) {
					e.target.classList.replace('kop-wacht', 'kop-speelt');
					return;
				}
				const vak = e.target;
				const rail = vak.closest('.rail-track');
				if (rail) zijwaartsKlaar(rail, kijker);
				const wacht = n++ * NA_ELKAAR_MS;
				klaar(vak.querySelector('img')).then(function () { setTimeout(print, wacht, vak); }, function () {
					vak.classList.remove('print-wacht'); // laden of decoderen mislukt: het vak staat er gewoon, zonder print
				});
			});
	}, { rootMargin: '0px 0px -8% 0px' });
	wachtend.forEach(function (el) { kijker.observe(el); });
}

// Een productrail: de kaarten die opzij buiten de rail staan, printen niet pas bij het vegen; die staan er gewoon
function zijwaartsKlaar(rail, kijker) {
	const zicht = rail.getBoundingClientRect();
	rail.querySelectorAll('.print-wacht').forEach(function (vak) {
		const r = vak.getBoundingClientRect();
		if (r.left < zicht.right && r.right > zicht.left) return;
		vak.classList.remove('print-wacht');
		kijker.unobserve(vak);
	});
}

// Alle beelden in de pagina alvast binnenhalen zodra de pagina zelf geladen is, in de volgorde van de pagina: dan staan
// ze klaar als je erheen scrolt. Niet bij databesparing of een trage verbinding (2G); de tweede productfoto, die je
// alleen bij aanwijzen ziet, laadt pas als hij nodig is.
function laadVooruit() {
	const verbinding = navigator.connection;
	if (verbinding && (verbinding.saveData || /2g$/.test(verbinding.effectiveType || ''))) return;
	function laad() {
		document.querySelectorAll('main img[loading="lazy"]:not(.product-thumb-alt)').forEach(function (img) { img.loading = 'eager'; });
	}
	const stil = window.requestIdleCallback || function (f) { return setTimeout(f, 300); };
	if (document.readyState === 'complete') stil(laad);
	else window.addEventListener('load', function () { stil(laad); }, { once: true });
}

// Klaar om te tonen: geladen en gedecodeerd. Mislukt dat, dan wordt de belofte afgewezen.
function klaar(img) {
	if (img.decode) return img.decode();
	if (img.complete) return img.naturalWidth ? Promise.resolve() : Promise.reject();
	return new Promise(function (ja, nee) {
		img.addEventListener('load', ja, { once: true });
		img.addEventListener('error', nee, { once: true });
	});
}

function print(vak) {
	const kop = document.createElement('span');
	kop.className = 'printkop';
	kop.setAttribute('aria-hidden', 'true');
	kop.addEventListener('animationend', function (e) {
		if (e.animationName !== 'printkop-weg') return;
		kop.remove();
		vak.classList.remove('print-loopt');
	});
	vak.appendChild(kop);
	vak.classList.replace('print-wacht', 'print-loopt');
}
