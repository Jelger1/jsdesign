// Paginaovergang. Twee manieren, afhankelijk van de browser:
//
// 1. View Transitions (Chrome, Edge, Safari 18.2+): de browser maakt de overgang zelf (brand.css, @view-transition).
//    Hier en in het scriptje in de <head> (layout.js > OVERGANG_AANKOMST) staan alleen de namen: de header ("site-kop")
//    blijft staan, en de foto van een product groeit van de kaart waarop je klikte naar de productpagina ("productfoto"),
//    en met de terugknop weer terug naar de kaart. Terug krijgt het type "terug", zodat de pagina de andere kant op
//    schuift. Dit bestand doet de oude pagina (pageswap), de head de nieuwe (pagereveal: dat gebeurt vóór main.js).
//    Uit drie reels van theglidestudio: de kaart wordt de pagina, terug gaat terug, en niets verschijnt zomaar.
// 2. Anders (bv. Firefox) het doek in de huisstijl: bij een klik op een link naar een andere pagina van de site schuiven
//    drie banden (raspberry, aqua, Midnight Slate) schuin over het scherm en valt het JS-teken in elkaar. Pas dan gaat de
//    browser naar de nieuwe pagina, die achter hetzelfde doek begint (zie het scriptje in de <head>, layout.js) en het
//    weer wegschuift. De opmaak staat in src/partials/curtain.html en src/css/brand.css.
import { prefersReducedMotion } from './util.js';

const VANGNET_MS = 600; // als het einde van de animatie niet gemeld wordt, toch doorgaan
const AANKOMST_MS = 700;
const KAN_VT = 'CSSViewTransitionRule' in window;
const PRODUCT = /\/producten\/([^/.]+)(?:\.html)?$/;

function isPaginaLink(event, link) {
	if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
	if ((link.target && link.target !== '_self') || link.hasAttribute('download') || link.hasAttribute('data-no-transition')) return false;
	const url = new URL(link.href, location.href);
	if (url.origin !== location.origin) return false;
	if (url.pathname === location.pathname && url.search === location.search) return false; // zelfde pagina, ook #anker
	return /(\/|\.html)$/.test(url.pathname); // alleen pagina's, geen bestanden
}

function vertrek(href) {
	const html = document.documentElement;
	try { sessionStorage.setItem('pc', String(Date.now())); } catch (e) { /* privévenster: dan alleen het vertrek */ }
	html.classList.remove('pc-arriving');
	html.classList.add('pc-leaving');
	let weg = false;
	function ga() {
		if (weg) return;
		weg = true;
		location.href = href;
	}
	const laatste = document.querySelector('.pc-band-3');
	if (laatste) laatste.addEventListener('animationend', ga, { once: true });
	setTimeout(ga, VANGNET_MS);
}

// ------------------------------------------------------------------------------------------- View Transitions

function productId(url) {
	const m = PRODUCT.exec(new URL(url, location.href).pathname);
	return m ? m[1] : '';
}

// De eerste (niet de hover-)foto in een kaart, tegel of uitgelicht blok
function fotoIn(blok) {
	return blok ? blok.querySelector('img:not(.product-thumb-alt)') : null;
}

function inBeeld(el) {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}

// De foto die bij een product hoort: op de productpagina zelf de eerste foto van de galerij; elders het blok waarop je
// klikte, of anders de kaart (of het blok met data-productfoto) van dat product die nu in beeld is. Eén naam per pagina,
// anders slaat de browser de overgang over.
function fotoVan(id, bron) {
	if (productId(location.href) === id) return fotoIn(document.querySelector('.pdp-gallery'));
	if (bron) return fotoIn(bron);
	const kandidaten = Array.from(document.querySelectorAll('.product-card[data-id="' + CSS.escape(id) + '"], [data-productfoto="' + CSS.escape(id) + '"]'));
	const blok = kandidaten.find(function (k) { const f = fotoIn(k); return f && inBeeld(f); });
	return fotoIn(blok);
}

function noem(el, naam, vt) {
	if (!el) return;
	el.style.viewTransitionName = naam;
	vt.finished.finally(function () { el.style.viewTransitionName = ''; });
}

// De grote foto van de productpagina alvast ophalen zodra je een kaart aanwijst (of aantikt): het is dezelfde uitsnede
// als op de kaart, alleen groter. Zo staat hij klaar als de foto doorgroeit, en zie je geen leeg vak.
const opgehaald = new WeakSet();
function haalOp(blok) {
	if (!blok || opgehaald.has(blok)) return;
	opgehaald.add(blok);
	const img = fotoIn(blok);
	if (!img || !img.srcset) return;
	const nodig = (innerWidth <= 900 ? innerWidth : 580) * (window.devicePixelRatio || 1); // GALLERY_SIZES in product.js
	const kandidaten = img.srcset.split(',').map(function (deel) {
		const stukken = deel.trim().split(/\s+/);
		return { url: stukken[0], w: parseInt(stukken[1], 10) || 0 };
	}).filter(function (k) { return k.w; }).sort(function (a, b) { return a.w - b.w; });
	const keuze = kandidaten.find(function (k) { return k.w >= nodig; }) || kandidaten[kandidaten.length - 1];
	if (keuze) { const voor = new Image(); voor.decoding = 'async'; voor.src = keuze.url; }
}

function initViewTransitions() {
	['pointerover', 'pointerdown'].forEach(function (soort) {
		document.addEventListener(soort, function (event) {
			const link = event.target.closest && event.target.closest('a[href*="producten/"]');
			if (link) haalOp(link.closest('.product-card, [data-productfoto]'));
		}, { passive: true });
	});
	let geklikt = null; // het blok waarin de laatste link stond (een kaart, tegel of uitgelicht blok)
	document.addEventListener('click', function (event) {
		const link = event.target.closest('a[href]');
		geklikt = link ? link.closest('.product-card, [data-productfoto]') : null;
	}, true);

	// Oude pagina, net voordat de browser de foto maakt
	window.addEventListener('pageswap', function (event) {
		if (!event.viewTransition || !event.activation) return;
		noem(document.querySelector('.site-header'), 'site-kop', event.viewTransition);
		const naar = productId(event.activation.entry.url);
		const hier = productId(location.href);
		// Van een overzicht naar een product: de foto op de kaart. Van een product terug (de terugknop): de grote foto. Ga je
		// vanaf een product ergens anders heen (het menu), dan is daar geen kaart om naartoe te groeien.
		const id = naar || hier;
		if (!id || naar === hier || (!naar && event.activation.navigationType !== 'traverse')) return;
		noem(fotoVan(id, naar ? geklikt : null), 'productfoto', event.viewTransition);
	});
}

export function initTransition() {
	const html = document.documentElement;
	if (html.classList.contains('pc-arriving')) setTimeout(function () { html.classList.remove('pc-arriving'); }, AANKOMST_MS);
	// Terug met de knop van de browser: de vorige pagina kan nog met het doek ervoor in het geheugen staan
	window.addEventListener('pageshow', function (event) { if (event.persisted) html.classList.remove('pc-leaving', 'pc-arriving'); });
	if (prefersReducedMotion) return;
	if (KAN_VT) { initViewTransitions(); return; }
	if (!document.querySelector('.page-curtain')) return;

	// Als laatste geregistreerd (main.js), zodat andere klik-afhandelingen eerst hun preventDefault kunnen doen
	document.addEventListener('click', function (event) {
		const link = event.target.closest('a[href]');
		if (!link || !isPaginaLink(event, link)) return;
		event.preventDefault();
		vertrek(link.href);
	});
}
