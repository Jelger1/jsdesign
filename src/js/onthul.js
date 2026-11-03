// De twee onthullingen uit de reel (brand.css): sectiekoppen komen woord voor woord scherp (de woorden staan er al in,
// src/templates/koppen.js) en beelden worden laag voor laag geprint, van onder naar boven, met een printkop in de
// pijlerkleur. Alleen voor wat bij het laden nog helemaal onder de vouw staat: dat krijgt zijn beginstand (.kop-wacht,
// .print-wacht) en speelt zodra het in beeld schuift. Wat al in beeld staat, beweegt niet; de h1 speelt met CSS alleen.
// Komen er meer beelden tegelijk in beeld (een rij tegels), dan printen ze na elkaar, in leesvolgorde.
// Er gaat niets verloren: zonder JavaScript of bij minder beweging staat alles er meteen, en een kop of beeld wacht
// alleen zolang het nog niet in beeld is.
import { prefersReducedMotion } from './util.js';

const KOPPEN = 'main h2.kop-woorden';
const BEELDEN = ['.werk-beeld', '.maker-kort-beeld', '.pijler-case-beeld', '.project-media', '.ook-media', '.case-fig-beeld', '.verwant-beeld', '.product-thumb']
	.map(function (s) { return 'main ' + s; }).join(', ');
const NA_ELKAAR_MS = 140;
const WACHT_OP_BEELD_MS = 1200; // een beeld dat dan nog niet geladen is, print toch (de achtergrond van het vak)

export function initOnthul() {
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
				geladen(vak.querySelector('img')).then(function () { setTimeout(print, wacht, vak); });
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

function geladen(img) {
	if (img.complete) return Promise.resolve();
	return new Promise(function (klaar) {
		img.addEventListener('load', klaar, { once: true });
		img.addEventListener('error', klaar, { once: true });
		setTimeout(klaar, WACHT_OP_BEELD_MS);
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
