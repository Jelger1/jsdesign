// Bestelling herroepen (herroepen.html): het formulier achter de link "Bestelling herroepen" in de footer
// (art. 6:230oa BW). Na "Herroeping bevestigen" mailt de functie "formulier" de klant meteen een ontvangstbevestiging
// met de inhoud en het tijdstip. De pagina toont zelf ook het tijdstip, voor als die mail niet aankomt.
import { verstuur } from './util.js';
import { validateForm, watchForm } from './validate.js';

export function initHerroep() {
	const form = document.getElementById('herroep-form');
	if (!form) return;
	const message = document.getElementById('herroep-msg');
	const knop = form.querySelector('button[type="submit"]');
	const LABEL = knop.textContent;
	const klaar = document.querySelector('[data-herroep-klaar]');

	watchForm(form);

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		message.textContent = '';
		message.className = 'form-msg';
		if (!validateForm(form)) return;
		knop.disabled = true;
		knop.textContent = 'Versturen...';

		verstuur({
			site: 'jsdesign',
			soort: 'herroeping',
			naam: form.elements.name.value.trim(),
			email: form.elements.email.value.trim(),
			bestelling: form.elements.bestelling.value.trim(),
			producten: form.elements.producten.value.trim(),
			botcheck: Boolean(form.elements.botcheck && form.elements.botcheck.checked)
		}).then(function (antwoord) {
			// Dezelfde tijdzone als de bevestigingsmail (die rekent in Nederlandse tijd)
			klaar.querySelector('[data-herroep-tijd]').textContent = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
			// Zonder id is er niets opgeslagen (de functie hield het voor een robot): dan niet beweren dat het binnen is
			klaar.querySelector('[data-herroep-mail]').textContent = !antwoord.id
				? 'Krijg je binnen een paar minuten geen ontvangstbevestiging per mail? Mail me dan via het adres hieronder.'
				: antwoord.mail
					? 'Je krijgt een ontvangstbevestiging per mail, met wat je hebt verstuurd.'
					: 'De ontvangstbevestiging per mail lukte niet: bewaar deze pagina of maak een schermafbeelding. Je herroeping is wel binnen.';
			form.hidden = true;
			klaar.hidden = false;
			klaar.focus();
		}).catch(function (error) {
			message.textContent = error.message;
			message.className = 'form-msg form-msg-error';
			knop.disabled = false;
			knop.focus();
		}).finally(function () {
			knop.disabled = false;
			knop.textContent = LABEL;
		});
	});
}
