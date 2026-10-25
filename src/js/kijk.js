// Het kijklabel (kijk.css): boven een projectbeeld of productfoto dat ergens heen gaat, staat bij de muis een klein
// label in de vorm van het label uit de header, met wat een klik doet: "Lees de case", "Bekijk het product". Het label
// leest de link zelf, dus het zegt nooit iets wat niet klopt. Waar een klik niets doet, staat geen label.
// - Alleen met een muis ((hover:hover) and (pointer:fine), pointerType "mouse"); op een aanraakscherm gebeurt niets.
// - Het label hangt onder de echte muisaanwijzer en gaat 1-op-1 mee (geen naijlen, geen spoor). Past het er onder niet,
//   dan springt het direct naar boven; past het daar ook niet, dan staat het vast in de hoek. Het schuift nooit over de
//   aanwijzer heen. De muisaanwijzer zelf blijft de muisaanwijzer.
// - Toetsenbord en "minder beweging": het label staat stil in de hoek van het beeld, op de plek van het pijltje. Op de
//   productfoto staat het altijd in de hoek (daar is de cursor al een vergrootglas).
// - Escape verbergt het label tot je de kaart verlaat of de focus verder gaat (WCAG 2.2, 1.4.13).
// - Hoog contrast: uit. Zonder JavaScript: er wordt niets toegevoegd.
// - Prestaties: pointermove bewaart alleen de positie; één requestAnimationFrame zet één transform. De maten worden
//   gemeten als je een kaart binnengaat (en opnieuw na scrollen of een andere venstermaat); per beeld wordt alleen de
//   plek van de kaart zelf gelezen (een productkaart tilt bij hover iets op), vóór het label verschuift.

const ONDER = 26; // bovenkant van het label onder de punt van de aanwijzer (de hand is ongeveer 22px hoog)
const BOVEN = 12; // onderkant van het label boven de punt, als er onder geen plek is
const MARGE = 10; // afstand tot de rand van het beeld
const WACHT = 70; // zo lang (ms) moet de muis boven het beeld zijn voor het label verschijnt (wie er alleen overheen
// beweegt op weg naar iets anders, ziet niets oplichten)

// Wat een klik doet: "naar" (een pagina op deze site), "uit" (een andere site), "hier" (gebeurt op deze pagina)
function leesLink(a) {
	if (!a || !a.getAttribute('href')) return null;
	let u;
	try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return null; }
	if (u.origin !== location.origin) return { tekst: 'Bekijk de site', soort: 'uit' };
	const p = u.pathname;
	if (/\/producten\/[^/]+\.html$/.test(p)) return { tekst: 'Bekijk het product', soort: 'naar' };
	if (/\/portfolio\/(index\.html)?$/.test(p) && u.hash) return { tekst: 'Naar het portfolio', soort: 'naar' };
	if (/\/portfolio\/[^/]+\.html$/.test(p) && !/\/index\.html$/.test(p)) return { tekst: 'Lees de case', soort: 'naar' };
	return null;
}

export function initKijk() {
	const fijn = window.matchMedia('(hover: hover) and (pointer: fine)');
	const minder = window.matchMedia('(prefers-reduced-motion: reduce)');
	const hoog = window.matchMedia('(forced-colors: active)');
	const alle = function (sel, f) { Array.prototype.forEach.call(document.querySelectorAll(sel), f); };

	// kaart: waar het label in komt; zone: waar het label bij de muis mag staan (het beeld); uit: tekst over het beeld,
	// waar het label wegblijft; plek: waar het in de vaste stand staat; heelKaart: in de vaste stand telt de hele kaart;
	// altijdVast: nooit volgen; veld + links: de links die hetzelfde doen als een klik op het beeld (bij toetsenbordfocus
	// staat het label vast in de hoek)
	const doelen = [];
	function voegToe(d) { if (d && d.kaart && d.zone && d.wat) doelen.push(d); }

	alle('.werk-kaart > a', function (a) {
		voegToe({ kaart: a, zone: a.querySelector('.werk-beeld'), uit: a.querySelector('.werk-tags'), wat: leesLink(a), plek: 'werk', heelKaart: true, veld: a, links: [a] });
	});
	alle('.pijler-case', function (li) {
		const a = li.querySelector('.pijler-case-titel a');
		voegToe({ kaart: li, zone: li.querySelector('.pijler-case-beeld'), wat: leesLink(a), plek: 'werk', heelKaart: true, veld: li, links: [a] });
	});
	alle('a.project-media', function (a) {
		const project = a.closest('.project');
		const links = project ? Array.prototype.filter.call(project.querySelectorAll('.project-text a[href]'), function (x) { return x.getAttribute('href') === a.getAttribute('href'); }) : [];
		voegToe({ kaart: a, zone: a, wat: leesLink(a), plek: a.querySelector('.project-browser') ? 'browser' : 'werk', heelKaart: true, veld: project, links: links });
	});
	alle('.verwant-kaart', function (li) {
		const a = li.querySelector('h3 a');
		voegToe({ kaart: li, zone: li.querySelector('.verwant-beeld'), wat: leesLink(a), plek: 'werk', heelKaart: true, veld: li, links: [a] });
	});
	alle('.product-card', function (art) {
		if (art.closest('.cart-sidebar, dialog')) return;
		const a = art.querySelector('.product-title a');
		voegToe({ kaart: art, zone: art.querySelector('.product-thumb'), wat: leesLink(a || art.querySelector('.product-thumb')), plek: 'hoek', pijler: 'tastbaar', veld: art, links: a ? [a] : [] });
	});
	const galerij = document.querySelector('.pdp-gallery[data-gallery]');
	if (galerij && galerij.querySelector('.pdp-zoom')) {
		voegToe({ kaart: galerij, zone: galerij.querySelector('.pdp-slides'), wat: { tekst: 'Vergroot de foto', soort: 'hier' }, plek: 'hoek', pijler: 'tastbaar', altijdVast: true, veld: galerij, links: Array.prototype.slice.call(galerij.querySelectorAll('.pdp-zoom')) });
	}
	if (!doelen.length) return;

	doelen.forEach(function (d) {
		const pijler = d.pijler || (d.kaart.closest('[data-pillar]') || document.body).getAttribute('data-pillar') || 'tastbaar';
		const label = document.createElement('span');
		label.className = 'kijk kijk--' + d.wat.soort;
		label.setAttribute('data-pillar', pijler);
		label.setAttribute('aria-hidden', 'true');
		label.innerHTML = '<span class="kijk-in"><span class="kijk-tekst"></span><span class="kijk-teken"></span></span>';
		label.querySelector('.kijk-tekst').textContent = d.wat.tekst;
		d.kaart.appendChild(label);
		d.kaart.classList.add('kijk-doel', 'kijk-doel--' + d.plek);
		if (d.veld && d.links.length) {
			d.veld.classList.add('kijk-veld');
			d.links.forEach(function (a) { a.classList.add('kijk-link'); });
		}
		d.label = label;
	});
	document.documentElement.classList.add('kijk-klaar');

	let actief = null;
	let px = 0, py = 0, raf = 0, losTimer = 0;

	const volgen = function (d) { return !minder.matches && !d.altijdVast; };
	const aan = function () { return fijn.matches && !hoog.matches; };

	function plek(d) {
		const k = d.kaart.getBoundingClientRect();
		d.kl = k.left + d.kaart.clientLeft;
		d.kt = k.top + d.kaart.clientTop;
		return k;
	}

	function meet(d) {
		const k = plek(d);
		const z = d.zone.getBoundingClientRect();
		d.z = { l: z.left - d.kl, t: z.top - d.kt, r: z.right - d.kl, b: z.bottom - d.kt };
		d.k = { l: -d.kaart.clientLeft, t: -d.kaart.clientTop, r: k.width - d.kaart.clientLeft, b: k.height - d.kaart.clientTop };
		d.u = d.uit ? d.uit.getBoundingClientRect().top - d.kt : null;
		if (!d.w) { d.w = d.label.offsetWidth; d.h = d.label.offsetHeight; }
		d.vuil = false;
	}

	function zet(d, zichtbaar, vast) {
		if (zichtbaar === d.zichtbaar && vast === d.vast) return;
		d.zichtbaar = zichtbaar;
		d.vast = vast;
		d.label.classList.toggle('is-vast', !!vast);
		d.label.classList.toggle('is-aan', !!zichtbaar);
		d.kaart.classList.toggle('kijk-vast-aan', !!(zichtbaar && vast));
		if (vast) d.label.style.transform = '';
	}

	function stap(nu) {
		raf = 0;
		const d = actief;
		if (!d || d.weg) return;
		if (d.vuil) meet(d); else plek(d);
		const x = px - d.kl, y = py - d.kt;
		let vast = !volgen(d);
		const gebied = vast && d.heelKaart ? d.k : d.z;
		const binnen = x >= gebied.l && x <= gebied.r && y >= gebied.t && y <= gebied.b && !(!vast && d.u !== null && y >= d.u);
		if (!binnen) { d.sinds = 0; zet(d, false, vast); return; }
		if (!d.sinds) d.sinds = nu;
		const klaar = d.zichtbaar || nu - d.sinds >= WACHT;
		if (!klaar) plan();
		let tx = 0, ty = 0;
		if (!vast) {
			// Het midden van het label onder de aanwijzer, binnen het beeld (en boven de titel die over het beeld staat).
			// Past het er onder niet, dan erboven; past het daar ook niet, dan vast in de hoek: nooit over de aanwijzer.
			const half = d.w / 2;
			const onderkant = d.u !== null ? Math.min(d.z.b, d.u) : d.z.b;
			let cx = Math.min(Math.max(x, d.z.l + half + MARGE), d.z.r - half - MARGE);
			if (d.z.r - d.z.l < d.w + 2 * MARGE) cx = (d.z.l + d.z.r) / 2;
			const onder = y + ONDER + d.h + MARGE <= onderkant;
			const boven = y - BOVEN - d.h - MARGE >= d.z.t;
			if (onder) ty = y + ONDER;
			else if (boven) ty = y - BOVEN - d.h;
			else vast = true;
			tx = cx - half;
		}
		if (vast) { if (klaar) zet(d, true, true); return; }
		d.label.style.transform = 'translate3d(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px,0)';
		if (klaar) zet(d, true, false);
	}

	function plan() { if (!raf) raf = requestAnimationFrame(stap); }

	function verberg() {
		if (!actief) return;
		actief.sinds = 0;
		zet(actief, false, actief.vast);
	}

	function opScroll() {
		if (!actief) return;
		actief.vuil = true;
		verberg();
	}

	function los(d) {
		clearTimeout(losTimer);
		d.label.classList.remove('is-druk');
	}

	doelen.forEach(function (d) {
		d.kaart.addEventListener('pointerenter', function (e) {
			if (e.pointerType !== 'mouse' || !aan()) return;
			if (actief && actief !== d) zet(actief, false, actief.vast);
			actief = d;
			d.vuil = true;
			d.weg = false;
			px = e.clientX; py = e.clientY;
			window.addEventListener('scroll', opScroll, { capture: true, passive: true });
			plan();
		});
		d.kaart.addEventListener('pointermove', function (e) {
			if (e.pointerType !== 'mouse' || actief !== d) return;
			px = e.clientX; py = e.clientY;
			plan();
		}, { passive: true });
		d.kaart.addEventListener('pointerleave', function () {
			if (actief !== d) return;
			d.sinds = 0;
			d.weg = false;
			zet(d, false, d.vast);
			los(d);
			actief = null;
			window.removeEventListener('scroll', opScroll, { capture: true });
		});
		// Indrukken: het omlijnde label wordt massief, zoals overal op de site "hier" massief is
		d.kaart.addEventListener('pointerdown', function (e) {
			if (e.pointerType !== 'mouse' || e.button !== 0 || !d.zichtbaar) return;
			d.label.classList.add('is-druk');
		});
		d.kaart.addEventListener('pointerup', function () {
			clearTimeout(losTimer);
			losTimer = setTimeout(function () { los(d); }, 700);
		});
		const stop = function () { if (actief === d) verberg(); los(d); };
		d.kaart.addEventListener('dragstart', stop);
		d.kaart.addEventListener('pointercancel', stop);
		// Na Escape blijft het label bij toetsenbordfocus weg tot de focus verder gaat
		if (d.veld) d.veld.addEventListener('focusout', function () { d.veld.classList.remove('kijk-weg'); });
	});

	// Escape: het label verdwijnt tot je de kaart verlaat of de focus verder gaat
	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape') return;
		if (actief && actief.zichtbaar) { actief.weg = true; verberg(); }
		const veld = document.activeElement && document.activeElement.closest && document.activeElement.closest('.kijk-veld');
		if (veld) veld.classList.add('kijk-weg');
	});
	window.addEventListener('resize', function () { if (actief) actief.vuil = true; }, { passive: true });
	// Terug met de knop "Vorige" (bfcache): alles weer in rust
	window.addEventListener('pageshow', function () {
		doelen.forEach(function (d) { zet(d, false, false); los(d); d.weg = false; });
		actief = null;
	});
	const wissel = function () { if (!aan()) { verberg(); actief = null; } };
	[fijn, hoog, minder].forEach(function (mq) { if (mq.addEventListener) mq.addEventListener('change', wissel); });
}
