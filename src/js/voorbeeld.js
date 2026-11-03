// Uit de praktijk (skills.js > bewijsLijst): wijs je met de muis een bewijs aan, dan staat naast de muis een klein beeld
// uit het hoofdstuk waar het bewijs staat, geprint met dezelfde scan als de beelden (brand.css, onthul.js). Het beeld
// staat rechtsboven de muis, zodat de regel die je leest vrij blijft, en volgt de muis rustig, zonder na te veren. Past
// het rechts niet meer, dan staat het links van de muis. Alleen met een muis en als beweging mag; op een telefoon, met
// het toetsenbord of bij minder beweging verandert er niets: het beeld is versiering, de link zegt het al.
import { prefersReducedMotion } from './util.js';
import { print } from './onthul.js';

const AFSTAND = 24; // tussen de muis en het beeld
const VOLG = 0.22; // welk deel van de afstand tot de muis het beeld per beeldje aflegt

export function initVoorbeeld() {
	const rijen = document.querySelectorAll('.bewijs[data-voorbeeld]');
	if (!rijen.length || prefersReducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

	const vak = document.createElement('div');
	vak.className = 'voorbeeld';
	vak.setAttribute('aria-hidden', 'true');
	const img = document.createElement('img');
	img.alt = '';
	img.decoding = 'async';
	vak.appendChild(img);
	document.body.appendChild(vak);

	// De beelden alvast laden zodra de pagina klaar is: dan staan ze er meteen als je een regel aanwijst
	const stil = window.requestIdleCallback || function (f) { return setTimeout(f, 300); };
	const laad = function () { rijen.forEach(function (rij) { new Image().src = rij.dataset.voorbeeld; }); };
	if (document.readyState === 'complete') stil(laad);
	else window.addEventListener('load', function () { stil(laad); }, { once: true });

	let doel = null;
	let x = 0, y = 0, naarX = 0, naarY = 0;
	let loopt = false;

	function plaats(e) {
		const b = vak.offsetWidth || 300;
		const links = e.clientX + AFSTAND + b > window.innerWidth - 16;
		naarX = links ? e.clientX - AFSTAND - b : e.clientX + AFSTAND;
		naarY = Math.max(e.clientY - AFSTAND, (vak.offsetHeight || 200) + 16);
	}
	function volg() {
		x += (naarX - x) * VOLG;
		y += (naarY - y) * VOLG;
		vak.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
		if (Math.abs(naarX - x) + Math.abs(naarY - y) > 0.5) requestAnimationFrame(volg);
		else loopt = false;
	}
	function wissel(rij) {
		doel = rij;
		if (!rij) { vak.classList.remove('is-zichtbaar'); return; }
		// Het nieuwe beeld meteen afdekken, anders staat het een beeldje lang heel in beeld voordat de scan begint
		const oud = vak.querySelector('.printkop');
		if (oud) oud.remove();
		vak.classList.remove('print-loopt');
		vak.classList.add('print-wacht');
		img.src = rij.dataset.voorbeeld;
		vak.style.setProperty('--pillar', getComputedStyle(rij).getPropertyValue('--pillar')); // de printkop in de kleur van de regel
		(img.decode ? img.decode() : Promise.resolve()).then(function () {
			if (doel !== rij) return; // al een andere regel aangewezen
			if (!vak.classList.contains('is-zichtbaar')) { x = naarX; y = naarY; vak.style.translate = x + 'px ' + y + 'px'; }
			vak.classList.add('is-zichtbaar');
			void vak.offsetWidth; // de scan opnieuw laten beginnen
			print(vak);
		}, function () { if (doel === rij) vak.classList.remove('is-zichtbaar'); });
	}

	// Per lijst, niet per regel: van de ene regel naar de volgende wisselt het beeld zonder eerst te verdwijnen. De open
	// regel naar de Over-pagina heeft geen beeld.
	document.querySelectorAll('.bewijs-lijst').forEach(function (lijst) {
		lijst.addEventListener('pointermove', function (e) {
			if (e.pointerType !== 'mouse') return;
			plaats(e);
			const rij = e.target.closest('.bewijs');
			const nieuw = rij && rij.dataset.voorbeeld ? rij : null;
			if (nieuw !== doel) wissel(nieuw);
			if (!loopt && vak.classList.contains('is-zichtbaar')) { loopt = true; requestAnimationFrame(volg); }
		});
		lijst.addEventListener('pointerleave', function () { wissel(null); });
	});
	// Scrollen met het wiel onder een stilstaande muis: het beeld hoort dan niet meer bij een regel
	window.addEventListener('scroll', function () { if (doel) wissel(null); }, { passive: true });
}
