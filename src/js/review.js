// review.html: een review sturen. Gaat als contactbericht naar de Supabase-functie (onderwerp "Iets anders"), met
// product, sterren en toestemming bovenaan het bericht. Er is dus geen nieuwe backend nodig; Jelger leest de review en
// zet hem, als je toestemming gaf, met je voornaam in data/reviews.json. review.html?product=<id> vult het product in.
import { verstuur, track } from './util.js';
import { validateForm, watchForm } from './validate.js';

export function initReview() {
	const form = document.getElementById('review-form');
	if (!form) return;
	const message = form.querySelector('[data-review-msg]');
	const success = document.querySelector('[data-review-success]');
	const submitBtn = form.querySelector('button[type="submit"]');
	const SUBMIT_LABEL = submitBtn.textContent;
	const product = form.elements.product;

	const gekozen = new URLSearchParams(location.search).get('product');
	if (gekozen && Array.prototype.some.call(product.options, function (o) { return o.value === gekozen; })) product.value = gekozen;

	watchForm(form);

	function fout(tekst) {
		message.textContent = tekst;
		message.className = 'checkout-msg checkout-msg-error';
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		message.textContent = '';
		message.className = 'checkout-msg';
		const ster = form.querySelector('input[name="sterren"]:checked');
		const geldig = validateForm(form);
		if (!ster) {
			fout('Kies hoeveel sterren je geeft.');
			if (geldig) form.querySelector('input[name="sterren"]').focus();
			return;
		}
		if (!geldig) return;

		const productNaam = product.value ? product.options[product.selectedIndex].text : 'niet gekozen';
		const plaatsen = form.elements.plaatsen.checked;
		const bericht = 'Review\n'
			+ 'Product: ' + productNaam + '\n'
			+ 'Sterren: ' + ster.value + ' van 5\n'
			+ 'Op de site: ' + (plaatsen ? 'ja, met voornaam' : 'nee') + '\n\n'
			+ form.elements.review.value.trim();

		submitBtn.disabled = true;
		submitBtn.textContent = 'Verzenden...';
		verstuur({
			site: 'jsdesign',
			soort: 'contact',
			onderwerp: 'anders',
			naam: form.elements.name.value.trim(),
			email: form.elements.email.value.trim(),
			bericht: bericht,
			nieuwsbrief: false,
			akkoord: Boolean(form.elements.privacy && form.elements.privacy.checked),
			botcheck: form.elements.botcheck.checked
		}).then(function () {
			track('review_verstuurd', { sterren: Number(ster.value) });
			form.hidden = true;
			success.hidden = false;
			success.focus();
		}).catch(function (error) {
			submitBtn.disabled = false;
			submitBtn.textContent = SUBMIT_LABEL;
			fout(error.message + ' Je review blijft staan.');
		});
	});
}
