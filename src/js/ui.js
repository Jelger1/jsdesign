// Algemene interface: mobiel menu, seizoensmelding en subtiele scroll-animaties.
import { prefersReducedMotion } from './util.js';

// Het menu onder 900px is een modale <dialog> (src/partials/header.html). showModal() maakt de rest van de pagina inert
// en Escape sluit hem; daarna staat de focus weer op de menuknop. De sluitknop staat op dezelfde plek als de menuknop en
// krijgt bij openen de focus, zodat nog een keer Enter het menu weer dichtdoet. Een link kiezen sluit het menu meteen
// (zonder animatie), zodat de paginaovergang (transition.js) er niet achter valt.
function initNav() {
	const toggle = document.querySelector('.nav-toggle');
	const menu = document.getElementById('site-menu');
	if (!toggle || !menu || typeof menu.showModal !== 'function') return;
	const sluitKnop = menu.querySelector('.menu-sluit');
	const mobiel = window.matchMedia('(max-width: 56.25em)') // gelijk aan header.css (900px bij de gewone letter);

	function sluit(direct) {
		if (!menu.open) return;
		menu.classList.toggle('is-direct', direct);
		menu.close();
	}

	toggle.addEventListener('click', function () {
		if (menu.open) return;
		menu.classList.remove('is-direct');
		menu.showModal();
		toggle.setAttribute('aria-expanded', 'true');
		if (sluitKnop) sluitKnop.focus();
	});
	if (sluitKnop) sluitKnop.addEventListener('click', function () { sluit(false); });
	menu.addEventListener('click', function (event) { if (event.target.closest('a')) sluit(true); });
	menu.addEventListener('close', function () {
		toggle.setAttribute('aria-expanded', 'false');
		if (mobiel.matches) toggle.focus({ preventScroll: true });
	});
	// Breder dan 900px is er geen menuknop meer: dan gaat het menu dicht
	mobiel.addEventListener('change', function () { if (!mobiel.matches) sluit(true); });
}

function initReveal() {
	const elements = document.querySelectorAll('.section, .pdp-details, .pdp-related');
	if (prefersReducedMotion || !('IntersectionObserver' in window) || !elements.length) return;

	const observer = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (!entry.isIntersecting) return;
			entry.target.classList.add('is-revealed');
			observer.unobserve(entry.target);
		});
	}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

	elements.forEach(function (el) {
		// Wat al in beeld staat hoeft niet in te faden
		if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
		el.classList.add('reveal');
		observer.observe(el);
	});
}

// Seizoensmelding ("Op tijd voor Kerst? Bestel uiterlijk ..."). Eerlijke urgentie: de data komen uit
// site.json > deadlines, de melding verschijnt pas vanaf "showFrom" en verdwijnt vanzelf na "orderBefore".
// Bewust in de browser berekend: zo klopt hij ook als de site een tijd niet opnieuw is gebouwd.
function initDeadlines() {
	const now = new Date();
	const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
	document.querySelectorAll('[data-deadlines]').forEach(function (el) {
		let list = [];
		try { list = JSON.parse(el.dataset.deadlines); } catch (e) {}
		const active = list.find(function (d) { return today >= d.showFrom && today <= d.orderBefore; });
		if (!active) return;
		const date = new Date(active.orderBefore + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
		el.textContent = 'Op tijd voor ' + active.occasion + '? Bestel uiterlijk ' + date + '.';
		el.hidden = false;
	});
}

export function initUi() {
	initNav();
	initReveal();
	initDeadlines();
}
