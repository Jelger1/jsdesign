// Contactformulier op de contactpagina. De velden worden per veld gecontroleerd (validate.js): de melding staat onder
// het veld, het veld krijgt aria-invalid en de focus gaat naar het eerste veld dat niet klopt.
import { verstuur, track } from './util.js';
import { validateForm, watchForm } from './validate.js';

export function initForms() {
	const form = document.getElementById('contact-form');
	if (!form) return;
	const message = document.getElementById('form-msg');
	const submitBtn = form.querySelector('button[type="submit"]');
	const SUBMIT_LABEL = submitBtn.textContent;

	watchForm(form);

	// contact.html?onderwerp=branding (de knoppen op de pijlerpagina's): het onderwerp staat dan al goed
	const gekozen = new URLSearchParams(location.search).get('onderwerp');
	const onderwerp = form.elements.onderwerp;
	if (onderwerp && gekozen && Array.prototype.some.call(onderwerp.options, function (o) { return o.value === gekozen; })) onderwerp.value = gekozen;

	function say(text, ok) {
		message.textContent = text;
		message.className = 'form-msg ' + (ok ? 'form-msg-success' : 'form-msg-error');
	}

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		// Een oude melding (van een eerdere poging) weg; daarna per veld controleren
		message.textContent = '';
		message.className = 'form-msg';
		if (!validateForm(form)) return;
		const name = form.elements.name.value.trim();
		const email = form.elements.email.value.trim();
		const text = form.elements.message.value.trim();

		submitBtn.disabled = true;
		submitBtn.textContent = 'Verzenden...';

		verstuur({
			site: 'jsdesign',
			soort: 'contact',
			onderwerp: onderwerp ? onderwerp.value : '',
			naam: name,
			email: email,
			bericht: text,
			nieuwsbrief: Boolean(form.elements.nieuwsbrief && form.elements.nieuwsbrief.checked),
			akkoord: Boolean(form.elements.privacy && form.elements.privacy.checked),
			botcheck: Boolean(form.elements.botcheck && form.elements.botcheck.checked)
		}).then(function (antwoord) {
			track('generate_lead', { lead_type: 'contact' });
			const nieuwsbrief = antwoord.mail && form.elements.nieuwsbrief && form.elements.nieuwsbrief.checked;
			say('Bedankt! Je bericht is verstuurd.' + (antwoord.mail ? ' Je krijgt een bevestiging per mail' + (nieuwsbrief ? ', met daarin de knop om je aanmelding voor de nieuwsbrief te bevestigen.' : '.') : '') + ' Je hoort meestal binnen 3 tot 4 werkdagen van me.', true);
			form.reset();
			if (onderwerp && gekozen) onderwerp.value = gekozen;
		}).catch(function (error) {
			say(error.message, false);
			submitBtn.disabled = false;
			submitBtn.focus();
		}).finally(function () {
			submitBtn.disabled = false;
			submitBtn.textContent = SUBMIT_LABEL;
		});
	});
}
