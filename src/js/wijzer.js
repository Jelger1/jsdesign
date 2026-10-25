// De wijzers (wijzer.css): op een casepagina de hoofdstukkaart in elke hoofdstukkop, op een pijlerpagina de balk met de
// onderdelen. Allebei laten ze zien hoe ver je bent: het stuk lijn van het onderdeel waar je bent loopt vol terwijl je
// leest, gemeten langs een leeslijn op 35% van de hoogte van het venster (0 als de bovenkant van het onderdeel die lijn
// passeert, 1 als het volgende onderdeel dat doet). Op de pijlerpagina zet dit script ook aria-current="location" op het
// onderdeel waar je bent, met de naam en "2 van 7" in de knop op een telefoon. Bij "minder beweging" loopt er niets
// vol: eerdere onderdelen zijn vol, het huidige leeg. Zonder dit script blijven het gewone inhoudsopgaven.
// Het paneel achter "Inhoud" is een popover: het opent onder de balk waar je op tikte, de focus gaat naar waar je bent,
// en het gaat dicht als je een onderdeel kiest of verder tabt. Staat die balk nog onderin beeld, dan schuift de pagina
// eerst tot de balk onder de header vastzit, zodat het paneel in beeld opent.
// Op een casepagina loopt de lijn vanaf 900px vol tot het eind van de romp: daar laat de kop los, de brede beelden
// van het hoofdstuk staan erna.
const LEESLIJN = 0.35;
const PLEK = 240;

function paneel(el) {
	let knop = null;
	// Welke knop het paneel opende (een popover weet dat zelf niet in elke browser)
	document.addEventListener('click', function (e) {
		const k = e.target.closest('[popovertarget="' + el.id + '"]');
		if (k) knop = k;
	}, true);
	// Plek en hoogte vóór het tonen (beforetoggle), anders staat het paneel één beeld lang op de oude plek
	el.addEventListener('beforetoggle', function (e) {
		if (e.newState !== 'open') return;
		const balk = knop && knop.closest('.wijzer, .case-stap-kop');
		if (balk && window.innerHeight - balk.getBoundingClientRect().bottom < PLEK) {
			const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 60;
			window.scrollBy({ top: balk.getBoundingClientRect().top - nav, behavior: 'instant' });
		}
		// Kan de pagina niet verder (vlak voor het eind), dan valt het paneel over de balk in plaats van onder het scherm
		const onder = balk ? Math.max(0, Math.min(balk.getBoundingClientRect().bottom, window.innerHeight - PLEK)) : 0;
		el.style.setProperty('--paneel-top', onder + 'px');
		el.style.setProperty('--paneel-max', Math.max(160, window.innerHeight - onder - 16) + 'px');
	});
	el.addEventListener('toggle', function (e) {
		if (e.newState !== 'open') return;
		// Op een casepagina: het hoofdstuk van de balk waar je op tikte
		const stap = knop && knop.closest('.case-stap');
		if (stap) {
			el.querySelectorAll('a').forEach(function (a) {
				if (a.hash === '#' + stap.id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
			});
		}
		const hier = el.querySelector('a[aria-current]') || el.querySelector('a');
		if (hier) hier.focus();
	});
	el.addEventListener('click', function (e) {
		if (e.target.closest('a')) el.hidePopover();
	});
	el.addEventListener('focusout', function (e) {
		if (el.matches(':popover-open') && e.relatedTarget && !el.contains(e.relatedTarget) && e.relatedTarget !== knop) el.hidePopover();
	});
}

export function initWijzer() {
	document.querySelectorAll('.wijzer-paneel[popover]').forEach(function (el) {
		if (typeof el.showPopover === 'function') paneel(el);
	});

	const balk = document.querySelector('.wijzer');
	let delen;
	if (balk) {
		const lijn = balk.querySelectorAll('.wijzer-lijn i');
		delen = Array.from(balk.querySelectorAll('.wijzer-lijst a')).map(function (a, i) {
			return { start: document.getElementById(a.hash.slice(1)), link: a, vul: [a.parentNode.querySelector('.wijzer-stuk'), lijn[i]].filter(Boolean) };
		}).filter(function (d) { return d.start; });
	} else {
		// Casepagina: elk hoofdstuk heeft zijn eigen kaart; alleen het stuk na "hier" loopt vol
		delen = Array.from(document.querySelectorAll('.case-stap[id^="hoofdstuk-"]')).map(function (s) {
			return { start: s, eigen: true, romp: s.querySelector('.case-stap-romp'), vul: Array.from(s.querySelectorAll('.hk-stap.is-hier .hk-vul')) };
		});
	}
	if (!delen.length) return;

	const minder = window.matchMedia('(prefers-reduced-motion: reduce)');
	// Onder 900px is de romp display:contents (de balk blijft ook boven de brede beelden), dan telt het hele hoofdstuk
	const breed = window.matchMedia('(min-width: 900px)');
	const knopNaam = balk && balk.querySelector('.wijzer-knop-naam');
	const knopTal = balk && balk.querySelector('.wijzer-knop-tal');
	let vorigeNu = -2;
	const vorigeP = delen.map(function () { return -1; });
	let gepland = false;

	function meet() {
		gepland = false;
		const lijn = window.innerHeight * LEESLIJN;
		// Eerst alles lezen, dan pas schrijven (geen gedwongen herberekening per onderdeel)
		const vakken = delen.map(function (d) { return d.start.getBoundingClientRect(); });
		const rompen = delen.map(function (d) { return d.romp && breed.matches ? d.romp.getBoundingClientRect() : null; });
		const p = vakken.map(function (r, i) {
			const eind = rompen[i] ? rompen[i].bottom : (delen[i].eigen || i === delen.length - 1 ? r.bottom : vakken[i + 1].top);
			return Math.min(1, Math.max(0, (lijn - r.top) / Math.max(1, eind - r.top)));
		});
		let nu = -1;
		p.forEach(function (x, i) { if (x > 0) nu = i; });
		p.forEach(function (x, i) {
			// Minder beweging: het huidige onderdeel loopt niet vol
			const waarde = minder.matches && (delen[i].eigen || i === nu) ? 0 : (i < nu ? 1 : x);
			if (Math.abs(waarde - vorigeP[i]) < 0.002) return;
			vorigeP[i] = waarde;
			delen[i].vul.forEach(function (el) { el.style.setProperty('--p', waarde.toFixed(3)); });
		});
		if (!balk || nu === vorigeNu) return;
		vorigeNu = nu;
		delen.forEach(function (d, i) {
			if (i === nu) d.link.setAttribute('aria-current', 'location'); else d.link.removeAttribute('aria-current');
		});
		if (knopNaam) knopNaam.textContent = nu > -1 ? delen[nu].link.querySelector('.wijzer-naam').textContent : 'Op deze pagina';
		if (knopTal) knopTal.textContent = nu > -1 ? (nu + 1) + ' van ' + delen.length : '';
	}
	function plan() {
		if (gepland) return;
		gepland = true;
		requestAnimationFrame(meet);
	}
	window.addEventListener('scroll', plan, { passive: true });
	window.addEventListener('resize', plan);
	minder.addEventListener('change', function () { vorigeP.fill(-1); plan(); });
	meet();
}
