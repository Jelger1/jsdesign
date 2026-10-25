// De werkwijze als trap die zich opbouwt (pijler.css > .trap), op de pijlerpagina's en de Over-pagina. Alleen een trap
// die bij het laden nog helemaal onder de rand van het venster staat, wordt een stippeltekening (.trap-wacht): zo zie je
// hem nooit afgebroken worden, en staat hij nooit half af in beeld. Komt hij in beeld, dan bouwt hij zich één keer op
// (.is-aan): breed de hele trap na elkaar zodra de helft in beeld is, smal elke stap zodra die grotendeels in beeld is.
// Bij "minder beweging" doet dit niets: dan staat de trap er meteen.
export function initTrap() {
	const trappen = document.querySelectorAll('.trap');
	if (!trappen.length || !('IntersectionObserver' in window)) return;
	const minder = window.matchMedia('(prefers-reduced-motion: reduce)');
	if (minder.matches) return;
	const breed = window.matchMedia('(min-width: 1100px)').matches;
	trappen.forEach(function (trap) {
		if (trap.getBoundingClientRect().top < window.innerHeight) return;
		const stappen = Array.from(trap.children);
		const bouw = function (li) { li.classList.add('is-aan'); };
		trap.classList.add('trap-wacht');
		// De overgangen pas een beeld later, anders zou de trap zichtbaar worden afgebroken
		requestAnimationFrame(function () { requestAnimationFrame(function () { trap.classList.add('trap-bouw'); }); });
		const kijker = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (!e.isIntersecting) return;
				if (e.target === trap) {
					stappen.forEach(bouw);
					kijker.disconnect();
				} else {
					bouw(e.target);
					kijker.unobserve(e.target);
				}
			});
		}, { threshold: breed ? 0.5 : 0.6 });
		if (breed) kijker.observe(trap);
		else stappen.forEach(function (li) { kijker.observe(li); });
		// Kies je onderweg alsnog voor minder beweging, dan staat alles meteen
		minder.addEventListener('change', function () {
			if (!minder.matches) return;
			stappen.forEach(bouw);
			kijker.disconnect();
		});
	});
}
