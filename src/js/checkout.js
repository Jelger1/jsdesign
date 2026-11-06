// afrekenen.html: overzicht van de winkelwagen, validatie en het versturen van de aanvraag naar de
// Supabase-functie "formulier", die de prijzen narekent, de bestelling opslaat en beide mails verstuurt.
// Na succes gaat de bezoeker naar bedankt.html; de bestelling reist mee via sessionStorage.
import * as cart from './cart.js';
import { esc, euro, verstuur, track, trackItems } from './util.js';
import { validateForm, watchForm } from './validate.js';

export const LAST_ORDER_KEY = 'js3d-last-order';
const root = document.body.dataset.root || '';

// Regels als HTML; wordt ook op de bedanktpagina gebruikt.
// total: het totaal van de regels; korting: { code, procent, bedrag } van de functie, dan staat het totaal na korting eronder.
export function linesHtml(lines, total, korting) {
	return '<ul class="checkout-line-list">' + lines.map(function (line) {
		return '<li class="checkout-line">'
			+ '<img src="' + root + esc(line.image) + '" alt="" width="56" height="70" loading="lazy">'
			+ '<div><strong>' + esc(line.name) + '</strong>'
			+ (line.label ? '<span>' + esc(line.label) + '</span>' : '')
			+ '<span>Aantal: ' + line.qty + '</span></div>'
			+ '<span class="checkout-line-price">' + euro(line.lineTotal) + '</span>'
			+ '</li>';
	}).join('') + '</ul>'
		+ (korting
			? '<div class="checkout-item"><span>Subtotaal</span><span>' + euro(total) + '</span></div>'
				+ '<div class="checkout-item checkout-item-korting"><span>Korting ' + korting.procent + '% (' + esc(korting.code) + ')</span><span>−' + euro(korting.bedrag) + '</span></div>'
			: '')
		+ '<div class="checkout-item checkout-item-total"><strong>Totaal</strong><strong>' + euro(korting ? Math.round((total - korting.bedrag) * 100) / 100 : total) + '</strong></div>';
}

// De regels zoals de functie ze narekent (alleen id, variant, aantal en een eventuele tekst)
function regelsVoorFunctie(lines) {
	return lines.map(function (line) { return { id: line.id, variant: line.variant, aantal: line.qty, tekst: line.text || '' }; });
}

export function initCheckout() {
	const form = document.getElementById('checkout-form');
	if (!form) return;
	const layout = document.getElementById('checkout-layout');
	const empty = document.getElementById('checkout-empty');
	const summary = document.getElementById('checkout-summary');
	const message = document.getElementById('checkout-msg');
	const submitBtn = document.getElementById('checkout-submit');
	const SUBMIT_LABEL = submitBtn.textContent;
	let sending = false;

	// Kortingscode: de functie controleert hem (bestaat, hoort bij dit e-mailadres, niet verlopen of gebruikt) en rekent
	// de korting uit over de producten waarvoor hij geldt. "korting" hoort bij precies deze code, dit adres en deze wagen.
	const codeVeld = form.elements.kortingscode;
	const codeStatus = document.getElementById('co-kortingscode-status');
	let korting = null;
	let controleVoor = '';
	function sleutel() {
		return [codeVeld ? codeVeld.value.trim().toUpperCase() : '', form.elements.email.value.trim().toLowerCase(), JSON.stringify(regelsVoorFunctie(cart.getLines()))].join('|');
	}
	function toonStatus(tekst, soort) {
		if (!codeStatus) return;
		codeStatus.textContent = tekst;
		codeStatus.className = 'kortingscode-status' + (soort ? ' is-' + soort : '');
		codeStatus.hidden = !tekst;
		if (codeVeld) codeVeld.setAttribute('aria-invalid', soort === 'fout' ? 'true' : 'false');
	}
	function controleerCode() {
		if (!codeVeld) return;
		const nu = sleutel();
		if (nu === controleVoor) return;
		controleVoor = nu;
		korting = null;
		render();
		const code = codeVeld.value.trim();
		if (!code) { toonStatus('', ''); return; }
		if (!form.elements.email.value.trim()) { toonStatus('Vul eerst je e-mailadres in: de code hoort bij het adres waarmee je je aanmeldde.', 'fout'); controleVoor = ''; return; }
		if (!cart.count()) return;
		toonStatus('Code controleren…', '');
		verstuur({ actie: 'korting', code: code, email: form.elements.email.value.trim(), regels: regelsVoorFunctie(cart.getLines()) }).then(function (a) {
			if (sleutel() !== nu) return; // intussen veranderd: de nieuwe controle telt
			korting = { code: a.code, procent: a.procent, bedrag: a.bedrag };
			codeVeld.value = a.code;
			controleVoor = sleutel();
			toonStatus('✓ ' + a.procent + '% korting: −' + euro(a.bedrag) + (a.uitgesloten && a.uitgesloten.length ? '. Niet op ' + a.uitgesloten.join(', ') + ', die zijn al voordeliger.' : '.'), 'ok');
			render();
		}).catch(function (error) {
			if (sleutel() !== nu) return;
			toonStatus(error.message, 'fout');
		});
	}

	function render() {
		if (sending) return; // tijdens het versturen wordt de wagen geleegd; laat de pagina dan met rust
		const lines = cart.getLines();
		layout.hidden = lines.length === 0;
		empty.hidden = lines.length !== 0;
		summary.innerHTML = linesHtml(lines, cart.total(), korting);
	}

	cart.subscribe(render);
	render();
	watchForm(form);

	if (codeVeld) {
		form.querySelector('[data-korting-controleer]').addEventListener('click', function () { controleVoor = ''; controleerCode(); });
		// Enter in het codeveld controleert de code in plaats van de bestelling te versturen
		codeVeld.addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); controleVoor = ''; controleerCode(); } });
		codeVeld.addEventListener('change', controleerCode);
		form.elements.email.addEventListener('change', function () { if (codeVeld.value.trim()) controleerCode(); });
		cart.subscribe(function () { if (codeVeld.value.trim() && !sending) controleerCode(); });
	}

	// Wie komt ophalen hoeft geen adres in te vullen. Een uitgeschakeld fieldset telt niet mee bij validatie en verzenden.
	const addressFields = form.querySelector('[data-address]');
	function syncDelivery() {
		const pickup = form.elements.delivery.value === 'Ophalen';
		addressFields.hidden = pickup;
		addressFields.disabled = pickup;
		syncMinimum();
	}

	// Verzenden kan vanaf een minimumbedrag aan producten (shop.json > shipping.minimum); zelf ophalen kan altijd.
	// Onder het minimum staat bij "Verzenden" wat er nog bij moet; versturen kan dan alleen met "Zelf ophalen".
	const MINIMUM = Number(form.dataset.verzendMinimum) || 0;
	const verzendMelding = form.querySelector('[data-verzend-melding]');
	function tekortVoorVerzenden() {
		return form.elements.delivery.value === 'Verzenden' ? Math.max(0, Math.round((MINIMUM - cart.total()) * 100) / 100) : 0;
	}
	function syncMinimum() {
		const tekort = tekortVoorVerzenden();
		verzendMelding.hidden = !tekort;
		if (tekort) verzendMelding.textContent = 'Verzenden kan vanaf ' + euro(MINIMUM) + ' aan producten (exclusief verzendkosten). Voeg nog ' + euro(tekort) + ' toe, of kies Zelf ophalen: dat kan bij elk bedrag.';
	}
	cart.subscribe(syncMinimum);
	form.addEventListener('change', function (event) { if (event.target.name === 'delivery') syncDelivery(); });
	syncDelivery();

	if (cart.count() > 0) {
		track('begin_checkout', { ecommerce: { currency: 'EUR', value: cart.total(), items: trackItems(cart.getLines()) } });
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		if (sending || cart.count() === 0) return;
		if (tekortVoorVerzenden()) {
			message.textContent = 'Verzenden kan vanaf ' + euro(MINIMUM) + ' aan producten. Voeg nog iets toe, of kies Zelf ophalen.';
			message.className = 'checkout-msg checkout-msg-error';
			form.querySelector('input[name="delivery"]:checked').focus();
			return;
		}
		if (!validateForm(form)) {
			message.textContent = 'Nog niet alles is goed ingevuld. Kijk even bij de gemarkeerde velden.';
			message.className = 'checkout-msg checkout-msg-error';
			return;
		}

		const values = {};
		new FormData(form).forEach(function (value, key) { values[key] = String(value).trim(); });
		const lines = cart.getLines();
		const total = cart.total();

		sending = true;
		submitBtn.disabled = true;
		submitBtn.textContent = 'Verzenden...';
		message.textContent = '';
		message.className = 'checkout-msg';

		// Alleen wat nodig is: de functie zoekt naam en prijs zelf op in de catalogus van de site
		verstuur({
			soort: 'bestelling',
			naam: values.name,
			email: values.email,
			telefoon: values.phone,
			nieuwsbrief: values.nieuwsbrief === 'ja',
			akkoord: Boolean(values.privacy),
			botcheck: form.elements.botcheck.checked,
			bestelling: {
				levering: values.delivery,
				adres: values.address,
				postcode: values.postcode,
				plaats: values.city,
				land: values.country,
				opmerkingen: values.notes,
				kortingscode: values.kortingscode || '', // de functie controleert hem opnieuw en markeert hem als gebruikt
				regels: regelsVoorFunctie(lines)
			}
		}).then(function (antwoord) {
			try {
				sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ id: antwoord.id, mail: antwoord.mail === true, nieuwsbrief: values.nieuwsbrief === 'ja', korting: antwoord.korting || null, lines: lines, total: total, tracked: false }));
			} catch (e) { /* zonder sessionStorage toont de bedanktpagina alleen de algemene tekst */ }
			cart.clear();
			location.href = form.dataset.thanks;
		}).catch(function (error) {
			sending = false;
			submitBtn.disabled = false;
			submitBtn.textContent = SUBMIT_LABEL;
			message.textContent = error.message + ' Je gegevens blijven staan.';
			message.className = 'checkout-msg checkout-msg-error';
			submitBtn.focus();
			// Lag het aan de kortingscode (verlopen, net gebruikt), dan staat dat ook bij het veld
			if (codeVeld && codeVeld.value.trim()) { controleVoor = ''; controleerCode(); }
		});
	});
}

// bedankt.html: toon wat er is aangevraagd en zet (één keer) de conversie klaar voor Ads/Analytics
export function initThanks() {
	const box = document.getElementById('thanks-order');
	if (!box) return;
	let order = null;
	try { order = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY)); } catch (e) {}
	if (!order || !order.lines || !order.lines.length) return;

	// Wie al een kortingscode gebruikte, staat al op de nieuwsbrief: dan geen aanmeldblok
	const korting = order.korting && typeof order.korting === 'object' ? order.korting : null;
	const newsletter = document.getElementById('thanks-newsletter');
	if (newsletter && korting) newsletter.hidden = true;

	// Korting op je volgende bestelling voor wie zich aanmeldt (shop.json > nieuwsbriefKorting): de code komt per mail
	// na het bevestigen (de functie maakt hem dan)
	const voorwaarden = document.getElementById('thanks-korting');
	const tekst = document.getElementById('thanks-newsletter-text');
	if (newsletter && !korting && voorwaarden) {
		voorwaarden.hidden = false;
		document.getElementById('thanks-newsletter-heading').textContent = voorwaarden.dataset.procent + '% korting op je volgende bestelling';
		tekst.textContent = 'Meld je hieronder aan voor de nieuwsbrief en bevestig je aanmelding via de mail. Je hoort als eerste over nieuwe ontwerpen, en afmelden kan altijd.';
	}

	// Vinkje voor de nieuwsbrief al aangezet: dan geen tweede aanmeldveld, maar een verwijzing naar de knop in de mail
	if (newsletter && !korting && order.nieuwsbrief && order.mail) {
		tekst.textContent = 'Je vinkte aan dat je op de hoogte wilt blijven. Bevestig dat met de knop in je bevestigingsmail; pas dan sta je op de lijst' + (voorwaarden ? ' en krijg je je kortingscode.' : '.');
		const form = newsletter.querySelector('form');
		if (form) form.remove();
	}

	document.getElementById('thanks-lines').innerHTML = linesHtml(order.lines, order.total, korting);
	box.hidden = false;
	// Bestelnummer, en alleen als de ontvangstbevestiging echt is verstuurd ook dat het in je mail staat
	const number = document.getElementById('thanks-number');
	if (number && order.id) {
		number.innerHTML = 'Je bestelnummer is <strong>' + esc(order.id) + '</strong>.' + (order.mail ? ' Je krijgt ook een ontvangstbevestiging per mail.' : '')
			+ (korting ? ' Je kortingscode ' + esc(korting.code) + ' is verrekend: −' + euro(korting.bedrag) + '.' : '');
		number.hidden = false;
	}

	if (!order.tracked) {
		const waarde = korting ? Math.round((order.total - korting.bedrag) * 100) / 100 : order.total;
		track('generate_lead', { ecommerce: { transaction_id: order.id, currency: 'EUR', value: waarde, coupon: korting ? 'nieuwsbrief' : undefined, items: trackItems(order.lines) } });
		order.tracked = true;
		try { sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
	}
}
