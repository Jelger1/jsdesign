// Gedeeld door de 3D-scènes: renderer, een renderlus die alleen draait als de scène in beeld is, en een veer.
// Overgenomen uit het portfolio (Portfolio/src/3d/util.js).
import { WebGLRenderer } from 'three';

export const minderBeweging = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Renderer die zijn container vult en meeschaalt. Geeft { renderer, grootte } terug; grootte() = { b, h }.
export function maakRenderer(container, opties) {
	const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
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

// Roept elk frame frame(dt, t) aan zolang de container in beeld is (scheelt GPU en accu). Geeft frame() true terug,
// dan is de scène in rust en stopt de lus tot wekken() hem weer start (bij "minder beweging" en zonder interactie).
export function renderLus(container, frame, opnieuw) {
	let zichtbaar = false;
	let loopt = false;
	let vorige = 0;
	let tijd = 0;

	function lus(nu) {
		if (!zichtbaar) { loopt = false; return; }
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
		zichtbaar = entries[0].isIntersecting;
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
