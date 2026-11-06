// De winkelwagen-zijbalk: tonen, aantallen aanpassen, feedback na toevoegen en suggesties ("Maak het compleet").
import * as cart from './cart.js';
import catalog from './catalog.js';
import { openDialog, closeDialog } from './dialog.js';
import { esc, euro, track } from './util.js';

const root = document.body.dataset.root || '';
const sidebar = document.getElementById('cart-sidebar');
const overlay = document.getElementById('cart-overlay');
const toggle = document.getElementById('cart-toggle');
const itemsEl = document.getElementById('cart-items');
const countEl = document.getElementById('cart-count');
const totalEl = document.getElementById('cart-total-price');
const addedEl = document.getElementById('cart-added');
const checkoutBtn = document.getElementById('cart-checkout');
const suggestEl = document.getElementById('cart-suggest');
const suggestList = document.getElementById('cart-suggest-list');
const MAX_SUGGESTIONS = 2;
// Verzenden kan vanaf een minimumbedrag aan producten (shop.json > shipping.minimum); zelf ophalen kan altijd
const verzendEl = document.getElementById('cart-verzend');
const VERZEND_MINIMUM = Number((document.getElementById('cart-sidebar') || {}).dataset ? document.getElementById('cart-sidebar').dataset.verzendMinimum : 0) || 0;
const ADDON_MAX = 15;

let highlightKey = null;

function render() {
	const lines = cart.getLines();
	const count = cart.count();

	countEl.textContent = count;
	countEl.hidden = count === 0;
	toggle.setAttribute('aria-label', 'Winkelwagen openen, ' + count + (count === 1 ? ' artikel' : ' artikelen'));
	totalEl.textContent = euro(cart.total());
	if (verzendEl) {
		const tekort = VERZEND_MINIMUM - cart.total();
		verzendEl.hidden = !lines.length || tekort <= 0;
		if (tekort > 0) verzendEl.textContent = 'Nog ' + euro(tekort) + ' tot verzenden (vanaf ' + euro(VERZEND_MINIMUM) + '). Zelf ophalen in Kerkrade kan altijd.';
	}
	checkoutBtn.hidden = lines.length === 0;
	renderSuggestions(lines);

	if (!lines.length) {
		itemsEl.innerHTML = '<div class="cart-empty"><p>Je winkelwagen is nog leeg.</p>'
			+ '<p><a class="btn outline" href="' + root + 'webshop.html">Bekijk de webshop</a></p></div>';
		return;
	}

	itemsEl.innerHTML = '<ul class="cart-list">' + lines.map(function (line) {
		return '<li class="cart-item' + (line.key === highlightKey ? ' is-new' : '') + '" data-key="' + esc(line.key) + '">'
			+ '<a href="' + root + esc(line.url) + '" tabindex="-1" aria-hidden="true"><img src="' + root + esc(line.image) + '" alt="" class="cart-item-image" width="64" height="64" loading="lazy"></a>'
			+ '<div class="cart-item-info">'
			+ '<h3><a href="' + root + esc(line.url) + '">' + esc(line.name) + '</a></h3>'
			+ (line.label ? '<p class="cart-item-variant">' + esc(line.label) + '</p>' : '')
			+ '<div class="cart-item-row">'
			+ '<div class="qty" role="group" aria-label="Aantal ' + esc(line.fullName) + '">'
			+ '<button type="button" class="qty-btn" data-qty="-1" aria-label="Eén minder">−</button>'
			+ '<span class="qty-value" aria-live="polite">' + line.qty + '</span>'
			+ '<button type="button" class="qty-btn" data-qty="1" aria-label="Eén meer">+</button>'
			+ '</div>'
			+ '<p class="cart-item-price">' + euro(line.lineTotal) + '</p>'
			+ '</div></div>'
			+ '<button type="button" class="cart-item-remove" data-remove aria-label="Verwijder ' + esc(line.fullName) + '">✕</button>'
			+ '</li>';
	}).join('') + '</ul>';
}

// Het product dat het verschil tot het verzendminimum dicht: de goedkoopste uitvoering die genoeg is, bij gelijke prijs
// eerst wat bij de wagen past. Ook producten met maten tellen mee (dan met die maat), maar geen set met iets erin dat
// al in de wagen ligt, en niets met een eigen tekst. Geeft { id, variant } of null.
function gapCloser(lines, inCart, tekort) {
	const related = new Set(lines.flatMap(function (line) { return catalog[line.id].related; }));
	const kandidaten = [];
	Object.keys(catalog).forEach(function (id) {
		const p = catalog[id];
		if (p.sale !== 'cart' || p.personalize || inCart.has(id)) return;
		if ((p.set || []).some(function (deel) { return inCart.has(deel); })) return;
		const v = p.variants.filter(function (x) { return x.price >= tekort; }).sort(function (a, b) { return a.price - b.price; })[0];
		if (v) kandidaten.push({ id: id, variant: v, related: related.has(id) });
	});
	kandidaten.sort(function (a, b) { return a.variant.price - b.variant.price || Number(b.related) - Number(a.related); });
	return kandidaten[0] || null;
}

function suggestItem(id, variant, note) {
	const p = catalog[id];
	const naam = p.name + (p.variants.length > 1 && variant.label ? ' ' + variant.label : '');
	return '<li class="cart-suggest-item' + (note ? ' cart-suggest-item--verzend' : '') + '">'
		+ '<img src="' + root + esc(p.image) + '" alt="" width="48" height="60" loading="lazy">'
		+ '<div><a href="' + root + esc(p.url) + '">' + esc(naam) + '</a><span>' + euro(variant.price) + (note ? ' · ' + esc(note) : '') + '</span></div>'
		+ '<button type="button" class="cart-suggest-add" data-add="' + esc(id) + '" data-variant="' + esc(variant.id) + '" data-source="' + (note ? 'suggestie-verzenden' : 'suggestie') + '" aria-label="' + esc(naam) + ' toevoegen">+</button>'
		+ '</li>';
}

// Suggesties zijn kleine extra's die je er makkelijk bij neemt (tot ADDON_MAX euro), niet nóg een vaas van €35.
// Eerst wat bij de artikelen in de wagen past ("related" in products.json), daarna de voordeligste.
// Alleen producten die je met één klik kunt toevoegen (dus zonder variantkeuze).
// Ligt de wagen onder het verzendminimum, dan staat bovenaan wat het verschil dicht (gapCloser).
function renderSuggestions(lines) {
	const inCart = new Set(lines.map(function (line) { return line.id; }));
	const price = function (id) { return catalog[id].variants[0].price; };
	const tekort = Math.round((VERZEND_MINIMUM - cart.total()) * 100) / 100;
	const closer = lines.length && tekort > 0 ? gapCloser(lines, inCart, tekort) : null;
	const isAddon = function (id) {
		const p = catalog[id];
		// Producten met een eigen tekst kun je niet met één klik toevoegen: die ontwerp je eerst
		return p && p.sale === 'cart' && p.variants.length === 1 && !p.personalize && !inCart.has(id) && price(id) <= ADDON_MAX
			&& !(closer && closer.id === id) && !(p.set || []).some(function (deel) { return inCart.has(deel); });
	};
	const related = lines.flatMap(function (line) { return catalog[line.id].related; });
	const cheapest = Object.keys(catalog).filter(isAddon).sort(function (a, b) { return price(a) - price(b); });
	const picks = Array.from(new Set(related.concat(cheapest))).filter(isAddon).slice(0, closer ? MAX_SUGGESTIONS - 1 : MAX_SUGGESTIONS);

	suggestEl.hidden = lines.length === 0 || (picks.length === 0 && !closer);
	suggestList.innerHTML = (closer ? suggestItem(closer.id, closer.variant, 'hiermee kun je laten verzenden') : '')
		+ picks.map(function (id) { return suggestItem(id, catalog[id].variants[0], ''); }).join('');
}

// Komt iemand terug met iets in de winkelwagen (de browser bewaart hem), dan één keer per bezoek een rustige melding.
// Alleen bij de eerste pagina van een bezoek: wie tijdens het bezoek zelf iets toevoegt, krijgt hem niet.
const TERUG_KEY = 'jd-wagen-bezoek';
function initTerugkeer() {
	let nieuwBezoek = false;
	try {
		nieuwBezoek = !sessionStorage.getItem(TERUG_KEY);
		sessionStorage.setItem(TERUG_KEY, '1');
	} catch (e) { return; }
	const pagina = document.body.dataset.page;
	if (!nieuwBezoek || !cart.count() || pagina === 'checkout' || pagina === 'thanks') return;

	const n = cart.count();
	const melding = document.createElement('div');
	melding.className = 'wagen-terug';
	melding.setAttribute('role', 'status');
	melding.innerHTML = '<p><strong>Je winkelwagen staat nog klaar</strong><span>' + n + (n === 1 ? ' artikel' : ' artikelen') + ' · ' + euro(cart.total()) + '</span></p>'
		+ '<button type="button" class="btn btn-primary" data-wagen-open>Bekijk</button>'
		+ '<button type="button" class="wagen-terug-sluit" data-wagen-sluit aria-label="Melding sluiten">✕</button>';
	document.body.appendChild(melding);
	const weg = function () { melding.remove(); };
	melding.querySelector('[data-wagen-open]').addEventListener('click', function () { weg(); openCart(); });
	melding.querySelector('[data-wagen-sluit]').addEventListener('click', weg);
	setTimeout(weg, 12000);
}

export function openCart() {
	overlay.setAttribute('aria-hidden', 'false');
	toggle.setAttribute('aria-expanded', 'true');
	openDialog(sidebar, {
		onClose: function () {
			overlay.setAttribute('aria-hidden', 'true');
			toggle.setAttribute('aria-expanded', 'false');
			addedEl.hidden = true;
			highlightKey = null;
		}
	});
}

export function closeCart() {
	closeDialog(sidebar);
}

// Toevoegen + directe feedback: de zijbalk opent met het nieuwe artikel uitgelicht
// en de keuze "Verder winkelen" of "Bestelling afronden".
// text: de persoonlijke tekst bij producten die je zelf ontwerpt (bv. de straatnaam-sleutelhanger)
export function addAndShow(id, variantId, source, text) {
	const key = cart.add(id, variantId, 1, text);
	if (!key) return;
	highlightKey = key;
	const added = cart.getLines().find(function (line) { return line.key === key; });
	track('add_to_cart', { source: source || 'product', ecommerce: { currency: 'EUR', value: added.price, items: [{ item_id: id, item_name: added.name, item_variant: added.label || undefined, price: added.price, quantity: 1 }] } });
	addedEl.textContent = '✓ ' + added.fullName + ' is toegevoegd';
	addedEl.hidden = false;
	openCart();

	toggle.classList.remove('is-bumped');
	void toggle.offsetWidth; // herstart de animatie
	toggle.classList.add('is-bumped');
}

export function initCartUi() {
	if (!sidebar) return;
	cart.subscribe(render);
	render();
	initTerugkeer();

	toggle.addEventListener('click', openCart);
	overlay.addEventListener('click', closeCart);
	document.getElementById('cart-close').addEventListener('click', closeCart);
	document.getElementById('cart-continue').addEventListener('click', closeCart);
	document.querySelectorAll('[data-open-cart]').forEach(function (button) { button.addEventListener('click', openCart); });

	itemsEl.addEventListener('click', function (event) {
		const item = event.target.closest('.cart-item');
		if (!item) return;
		const key = item.dataset.key;
		const qtyBtn = event.target.closest('[data-qty]');
		if (qtyBtn) {
			const line = cart.getLines().find(function (l) { return l.key === key; });
			if (line) cart.setQty(key, line.qty + Number(qtyBtn.dataset.qty));
			// Na het hertekenen de focus op dezelfde knop houden
			const again = Array.from(itemsEl.querySelectorAll('.cart-item')).find(function (el) { return el.dataset.key === key; });
			((again && again.querySelector('[data-qty="' + qtyBtn.dataset.qty + '"]')) || document.getElementById('cart-close')).focus();
		} else if (event.target.closest('[data-remove]')) {
			cart.remove(key);
			document.getElementById('cart-close').focus();
		}
	});

	// "In winkelwagen"-knoppen op productkaarten (overal op de site)
	document.addEventListener('click', function (event) {
		const button = event.target.closest('[data-add]');
		if (!button) return;
		addAndShow(button.dataset.add, button.dataset.variant, button.dataset.source || 'kaart');
	});
}
