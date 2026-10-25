// "Je bent hier" op een pijlerpagina (pijler.css > .pijler-tegel). Op een telefoon of tablet staat de tegel onder de
// tekst. Staat hij bij het laden nog helemaal buiten beeld, dan krijgt hij daar zijn beginstand (.wacht: het hele teken
// massief) en speelt de aankomst zodra hij voor de helft in beeld komt (.speelt). Staat hij al (deels) in beeld, dan
// beweegt er niets, want dan lees je de kop. Op de desktop speelt de aankomst met CSS alleen.
// Na de aankomst (of als hij niet speelt) krijgt de tegel .klaar, zodat hij niet opnieuw speelt als je een tablet draait
// of het venster smaller en weer breder maakt dan 900px.
export function initTegel() {
	const tegel = document.querySelector('.pijler-tegel');
	if (!tegel) return;
	tegel.addEventListener('animationend', function (e) {
		if (e.animationName === 'tegel-lijn') tegel.classList.add('klaar');
	});
	if (!('IntersectionObserver' in window)) return;
	if (window.matchMedia('(prefers-reduced-motion: reduce), (min-width: 900px)').matches) return;
	if (tegel.getBoundingClientRect().top < window.innerHeight) {
		tegel.classList.add('klaar');
		return;
	}
	tegel.classList.add('wacht');
	const kijker = new IntersectionObserver(function (entries) {
		if (!entries[entries.length - 1].isIntersecting) return;
		kijker.disconnect();
		tegel.classList.remove('wacht');
		tegel.classList.add('speelt');
	}, { threshold: 0.5 });
	kijker.observe(tegel);
}
