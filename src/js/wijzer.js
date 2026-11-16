// De voortgangslijn (components.js > spoor, wijzer.css) op de casepagina's en de pijlerpagina's. Elk onderdeel heeft
// een blokje op gelijke afstand; de lijn loopt van blokje naar blokje vol terwijl je dat onderdeel leest, gemeten langs
// een leeslijn op 35% van de hoogte van het venster (0 als de bovenkant van het onderdeel die lijn passeert, 1 als het
// volgende onderdeel dat doet). Het blokje "hier" zakt mee. De lijn staat er alleen zolang je in de onderdelen leest.
// Op de pijlerpagina's (een echte nav) krijgt het onderdeel waar je bent ook aria-current="location".
// Bij "minder beweging" loopt er niets vol tussen de blokjes: "hier" staat op het blokje van het onderdeel waar je bent.
const LEESLIJN = 0.35;

export function initWijzer() {
	const spoor = document.querySelector('.spoor');
	if (!spoor) return;
	const baan = spoor.querySelector('.spoor-baan');
	const nav = spoor.tagName === 'NAV';
	const delen = Array.from(spoor.querySelectorAll('.spoor-punt')).map(function (a) {
		return { link: a, el: document.getElementById(decodeURIComponent(a.hash.slice(1))) };
	}).filter(function (d) { return d.el; });
	if (!delen.length) return;
	const n = delen.length;

	const minder = window.matchMedia('(prefers-reduced-motion: reduce)');
	let vorigeNu = -2;
	let vorigeP = -1;
	let vorigAan = null;
	let gepland = false;

	function meet() {
		gepland = false;
		const lijn = window.innerHeight * LEESLIJN;
		// Eerst alles lezen, dan pas schrijven (geen gedwongen herberekening per onderdeel)
		const vakken = delen.map(function (d) { return d.el.getBoundingClientRect(); });
		const onderaan = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
		let nu = -1;
		vakken.forEach(function (r, i) { if (r.top <= lijn) nu = i; });
		let p = 0;
		if (nu > -1) {
			const r = vakken[nu];
			const eind = nu < n - 1 ? vakken[nu + 1].top : r.bottom;
			p = Math.min(1, Math.max(0, (lijn - r.top) / Math.max(1, eind - r.top)));
			// Kan de pagina niet verder, dan is het laatste onderdeel uit
			if (nu === n - 1 && onderaan) p = 1;
		}
		const waarde = nu < 0 ? 0 : (nu + (minder.matches ? 0 : p)) / n;
		const aan = nu > -1 && vakken[n - 1].bottom > window.innerHeight * 0.2;

		if (aan !== vorigAan) { spoor.classList.toggle('is-aan', aan); vorigAan = aan; }
		if (Math.abs(waarde - vorigeP) >= 0.0005) { baan.style.setProperty('--p', waarde.toFixed(4)); vorigeP = waarde; }
		if (nu === vorigeNu) return;
		vorigeNu = nu;
		delen.forEach(function (d, i) {
			d.link.classList.toggle('is-gelezen', i <= nu);
			d.link.classList.toggle('is-hier', i === nu);
			if (!nav) return;
			if (i === nu) d.link.setAttribute('aria-current', 'location'); else d.link.removeAttribute('aria-current');
		});
	}
	function plan() {
		if (gepland) return;
		gepland = true;
		requestAnimationFrame(meet);
	}
	window.addEventListener('scroll', plan, { passive: true });
	window.addEventListener('resize', plan);
	minder.addEventListener('change', function () { vorigeP = -1; plan(); });
	// Beelden die later laden, verschuiven de onderdelen
	window.addEventListener('load', plan);
	meet();
}
