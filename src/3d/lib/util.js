// Gedeeld door de 3D-scènes: renderer, een renderlus die alleen draait als de scène in beeld is, en een veer.
// Overgenomen uit het portfolio (Portfolio/src/3d/util.js).
import { WebGLRenderer } from 'three';

// "Minder beweging" kan veranderen terwijl de pagina open is (instelling van het systeem): daarom een functie
const MINDER = window.matchMedia('(prefers-reduced-motion: reduce)');
export function minderBeweging() { return MINDER.matches; }
export function bijMinderBeweging(f) {
	if (MINDER.addEventListener) MINDER.addEventListener('change', f);
}

// Renderer die zijn container vult en meeschaalt. Geeft { renderer, grootte } terug; grootte() = { b, h }.
// Het teken is klein: de gewone grafische chip is genoeg (scheelt accu op laptops met twee chips).
export function maakRenderer(container, opties) {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, (opties && opties.maxPixelRatio) || 2));
	renderer.setClearColor(0x000000, 0);
	container.appendChild(renderer.domElement);
	function grootte() {
		return { b: Math.max(1, container.clientWidth), h: Math.max(1, container.clientHeight) };
	}
	const g = grootte();
	renderer.setSize(g.b, g.h, false);
	return { renderer, grootte };
}

// Roept frame(dt, t) aan zolang de container in beeld is, hooguit ongeveer 60 keer per seconde (ook op schermen van
// 120 Hz en meer). Geeft frame() true terug, dan is de scène in rust en stopt de lus tot wekken() hem weer start.
export function renderLus(container, frame, opnieuw) {
	let zichtbaar = false;
	let loopt = false;
	let vorige = 0;
	let tijd = 0;

	function lus(nu) {
		if (!zichtbaar) { loopt = false; return; }
		if (vorige && nu - vorige < 15) { requestAnimationFrame(lus); return; }
		const dt = Math.min(0.05, vorige ? (nu - vorige) / 1000 : 0.016);
		vorige = nu;
		tijd += dt;
		if (frame(dt, tijd) === true) { loopt = false; return; }
		requestAnimationFrame(lus);
	}
	function wekken() {
		if (loopt || !zichtbaar) return;
		loopt = true;
		vorige = 0;
		requestAnimationFrame(lus);
	}

	new IntersectionObserver(function (entries) {
		zichtbaar = entries[entries.length - 1].isIntersecting; // de nieuwste stand telt
		if (zichtbaar) wekken();
	}, { rootMargin: '80px' }).observe(container);

	if (opnieuw && 'ResizeObserver' in window) new ResizeObserver(function () { opnieuw(); wekken(); }).observe(container);
	else if (opnieuw) window.addEventListener('resize', function () { opnieuw(); wekken(); });
	return wekken;
}

// Kritisch gedempte veer (demping = 2 x wortel van de stijfheid): vloeiend naar het doel, zonder na te veren.
export function veer(huidig, snelheid, doel, dt, stijfheid, demping) {
	const v = (snelheid + (doel - huidig) * stijfheid * dt) * Math.exp(-demping * dt);
	return [huidig + v * dt, v];
}

export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
