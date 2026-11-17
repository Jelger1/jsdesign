// Productpagina: galerij, variantkeuze met live prijs, toevoegen en de mobiele koopbalk.
import { addAndShow } from './cart-ui.js';
import { openLightbox } from './lightbox.js';
import catalog from './catalog.js';
import { euro, prefersReducedMotion, track as trackEvent } from './util.js';

function initGallery() {
	const gallery = document.querySelector('[data-gallery]');
	if (!gallery) return;
	const track = gallery.querySelector('[data-slides]');
	const slides = Array.from(track.children);
	const thumbs = Array.from(gallery.querySelectorAll('[data-slide]'));

	function setActive(index) {
		thumbs.forEach(function (thumb, i) {
			thumb.classList.toggle('is-active', i === index);
			if (i === index) thumb.setAttribute('aria-current', 'true');
			else thumb.removeAttribute('aria-current');
		});
	}

	thumbs.forEach(function (thumb) {
		thumb.addEventListener('click', function () {
			const slide = slides[Number(thumb.dataset.slide)];
			track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
		});
	});

	// De actieve thumbnail volgt het swipen
	if (thumbs.length && 'IntersectionObserver' in window) {
		const observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) setActive(slides.indexOf(entry.target));
			});
		}, { root: track, threshold: 0.6 });
		slides.forEach(function (slide) { observer.observe(slide); });
	}

	const zoomButtons = Array.from(gallery.querySelectorAll('[data-zoom]'));
	const heading = document.querySelector('.pdp-title');
	zoomButtons.forEach(function (button) {
		button.addEventListener('click', function () {
			// Pas bij het klikken uitlezen: de kleurkeuze kan de eerste foto intussen hebben gewisseld
			const photos = zoomButtons.map(function (b) { return { src: b.dataset.full, alt: b.dataset.alt }; });
			openLightbox(photos, Number(button.dataset.zoom), heading ? heading.textContent : '');
		});
	});
}

// Lamp met kleurkeuze: de gekozen kleur en de stand (aan/uit) bepalen de eerste foto. Alleen die foto wisselt;
// de rest van de galerij (sfeer, detail, opbouw) blijft staan.
function initKleuren() {
	const form = document.querySelector('.pdp-form');
	const dia = document.querySelector('[data-kleur-dia]');
	if (!form || !dia || !form.elements.kleur) return;
	const img = dia.querySelector('img');
	const zoom = dia.querySelector('[data-zoom]');
	const label = dia.querySelector('[data-weergave]');
	const knoppen = Array.from(dia.querySelectorAll('[data-licht]'));
	const thumb = document.querySelector('.pdp-thumb[data-slide="0"] img');
	const wens = form.querySelector('[data-kleur-wens]');
	let stand = 'aan';

	function gekozen() {
		return form.querySelector('input[name="kleur"]:checked');
	}

	function toon() {
		const keuze = gekozen();
		// "Eigen kleuren" heeft geen foto: dan blijft de laatst gekozen kleur staan
		const bron = keuze && keuze.dataset[stand] ? keuze : toon.vorige;
		if (!bron) return;
		toon.vorige = bron;
		const b = JSON.parse(bron.dataset[stand]);
		img.srcset = b.srcset;
		img.src = b.src;
		img.alt = b.alt;
		zoom.dataset.full = b.full;
		zoom.dataset.alt = b.alt;
		if (label) label.hidden = !b.d3;
		if (thumb) { thumb.srcset = b.srcset; thumb.src = b.src; }
		knoppen.forEach(function (k) { k.setAttribute('aria-pressed', String(k.dataset.licht === stand)); });
	}

	// Naar de eerste foto, zodat je de wissel ook ziet als je verder in de galerij stond
	function naarEerste() {
		const track = dia.parentElement;
		if (track.scrollLeft > 4) track.scrollTo({ left: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
	}

	knoppen.forEach(function (k) {
		k.addEventListener('click', function () {
			stand = k.dataset.licht;
			toon();
		});
	});

	form.addEventListener('change', function (event) {
		if (event.target.name !== 'kleur') return;
		const eigen = event.target.value === 'eigen';
		// Alleen tonen, niet de focus verplaatsen: wie met de pijltjes door de kleuren gaat, moet terug kunnen
		if (wens) wens.hidden = !eigen;
		toon();
		naarEerste();
	});
	toon();
}

function initBuyForm() {
	const form = document.querySelector('.pdp-form');
	if (!form) return;
	const priceEl = document.getElementById('pdp-price');
	const sticky = document.querySelector('[data-sticky]');
	const stickyPrice = sticky ? sticky.querySelector('[data-sticky-price]') : null;

	function selectedVariant() {
		const field = form.elements.variant;
		return field.value;
	}

	// Wens van de klant (bv. een kleurwens); gaat als tekst mee met de winkelwagenregel.
	// Met een kleurkeuze: de tekst van de gekozen combinatie, of "Eigen: ..." met wat de klant zelf typte.
	function wish() {
		const kleur = form.querySelector('input[name="kleur"]:checked');
		if (kleur && kleur.value !== 'eigen') return kleur.dataset.tekst;
		const eigen = form.elements.wish ? form.elements.wish.value.trim() : '';
		if (kleur) return 'Eigen: ' + (eigen || 'kleur nog afstemmen');
		return eigen;
	}

	form.addEventListener('change', function (event) {
		if (event.target.name !== 'variant') return;
		const label = euro(event.target.dataset.price);
		priceEl.textContent = label;
		if (stickyPrice) stickyPrice.textContent = label;
	});

	// Bij meerdere varianten toont de pagina eerst "Vanaf"; zet de prijs van de voorgeselecteerde variant
	const checked = form.querySelector('input[name="variant"]:checked');
	if (checked) {
		priceEl.textContent = euro(checked.dataset.price);
		if (stickyPrice) stickyPrice.textContent = euro(checked.dataset.price);
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		addAndShow(form.dataset.product, selectedVariant(), 'product', wish());
	});

	// Mobiele koopbalk: zichtbaar zolang de echte knop niet in beeld is. Dus ook direct bij
	// binnenkomst, zodat prijs en koopknop op een telefoon altijd zonder scrollen te zien zijn.
	if (sticky && 'IntersectionObserver' in window) {
		sticky.querySelector('[data-sticky-add]').addEventListener('click', function () {
			addAndShow(form.dataset.product, selectedVariant(), 'sticky', wish());
		});
		new IntersectionObserver(function (entries) {
			sticky.hidden = entries[0].isIntersecting;
			// Ruimte onderin voor focus en ankers zolang de balk staat (pages.css > scroll-padding-bottom)
			if (sticky.hidden) document.documentElement.style.removeProperty('--koopbalk-hoogte');
			else document.documentElement.style.setProperty('--koopbalk-hoogte', sticky.offsetHeight + 'px');
		}).observe(form.querySelector('.pdp-add'));
	}
}

function trackView() {
	const el = document.querySelector('[data-product]');
	const product = el && catalog[el.dataset.product];
	if (!product) return;
	const price = product.variants.length ? product.variants[0].price : undefined;
	trackEvent('view_item', { ecommerce: { currency: 'EUR', value: price, items: [{ item_id: el.dataset.product, item_name: product.name, price: price }] } });
}

export function initProduct() {
	initGallery();
	initKleuren();
	initBuyForm();
	trackView();
}
