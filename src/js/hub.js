// De hub op de home (src/templates/hub.js): tekent vanaf 900px de drie lijnen van de kubushoeken naar de takken,
// houdt bij welke tak actief is (aanwijzen, focus of een blok van het 3D-teken) en laadt het JS-teken in 3D zodra de
// hub in beeld is. Zonder JavaScript of WebGL blijft alles werken: de takken zijn gewone links en het teken is een SVG.
const BREED = window.matchMedia('(min-width: 900px)');
const MINDER_BEWEGING = window.matchMedia('(prefers-reduced-motion: reduce)');
const NS = 'http://www.w3.org/2000/svg';
const RICHTING = { branding: 150, digitaal: 30, tastbaar: 270 };
const TAN30 = Math.tan(Math.PI / 6);

// Een pad door de punten, met afgeronde hoeken (straal r)
function rondPad(punten, r) {
	let d = 'M' + punten[0].x.toFixed(1) + ' ' + punten[0].y.toFixed(1);
	for (let i = 1; i < punten.length; i++) {
		const p = punten[i];
		const volgende = punten[i + 1];
		if (!volgende) { d += ' L' + p.x.toFixed(1) + ' ' + p.y.toFixed(1); break; }
		const vorige = punten[i - 1];
		const in1 = Math.hypot(p.x - vorige.x, p.y - vorige.y), uit1 = Math.hypot(volgende.x - p.x, volgende.y - p.y);
		const k = Math.min(r, in1 / 2, uit1 / 2);
		const a = { x: p.x - (p.x - vorige.x) / in1 * k, y: p.y - (p.y - vorige.y) / in1 * k };
		const b = { x: p.x + (volgende.x - p.x) / uit1 * k, y: p.y + (volgende.y - p.y) / uit1 * k };
		d += ' L' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
	}
	return d;
}

// Van de kubushoek schuin omhoog langs de isometrische as (30° of 150°), dan recht het blokje in. Ligt het blokje
// hoger dan de schuine lijn kan halen, dan gaat de lijn eerst een stukje recht omhoog: het schuine stuk blijft er
// altijd in. Tastbaar loopt recht omlaag, met zo nodig een knik als het blokje niet precies onder de hoek ligt.
function lijnPunten(id, hoek, blok) {
	const graden = RICHTING[id] * Math.PI / 180;
	const richting = { x: Math.cos(graden), y: -Math.sin(graden) };
	const start = { x: hoek.x + richting.x * 11, y: hoek.y + richting.y * 11 };
	if (id === 'tastbaar') {
		const eind = { x: blok.x, y: blok.top - 8 };
		if (Math.abs(eind.x - start.x) < 1) return [start, eind];
		const midden = (start.y + eind.y) / 2;
		return [start, { x: start.x, y: midden }, { x: eind.x, y: midden }, eind];
	}
	const kant = id === 'branding' ? -1 : 1;
	const eind = { x: id === 'branding' ? blok.right + 8 : blok.left - 8, y: blok.y };
	const stijging = start.y - eind.y; // positief: het blokje ligt hoger dan de hoek
	const ruimte = Math.abs(eind.x - start.x) - 12; // horizontaal beschikbaar voor het schuine stuk
	if (stijging <= 0 || ruimte <= 0) return [start, eind];
	const schuin = Math.min(stijging, ruimte * TAN30); // zoveel kan het schuine stuk stijgen
	const punten = [start];
	if (stijging > schuin) punten.push({ x: start.x, y: start.y - (stijging - schuin) });
	punten.push({ x: start.x + kant * schuin / TAN30, y: eind.y }, eind);
	return punten;
}

export function initHub() {
	const hub = document.querySelector('[data-hub]');
	if (!hub) return;
	const podium = hub.querySelector('.hub-podium');
	const svg = hub.querySelector('[data-hub-lijnen]');
	const takken = Array.from(hub.querySelectorAll('.hub-tak'));
	let getekend = false;
	let drieD = null;
	let actief = null;
	// Wie een tak actief maakt: toetsenbordfocus, de muis of een blok van het 3D-teken. Elk houdt zijn eigen stand
	// bij, zodat de een de ander niet uitzet (de focus wint).
	const bron = { focus: null, muis: null, teken: null };

	function teken() {
		svg.replaceChildren();
		if (!BREED.matches) return;
		const vlak = podium.getBoundingClientRect();
		svg.setAttribute('viewBox', '0 0 ' + vlak.width.toFixed(1) + ' ' + vlak.height.toFixed(1));
		takken.forEach(function (tak) {
			const id = tak.dataset.tak;
			const poort = hub.querySelector('[data-poort="' + id + '"]');
			const blok = tak.querySelector('.hub-blok');
			if (!poort || !blok) return;
			const p = poort.getBoundingClientRect();
			const b = blok.getBoundingClientRect();
			const hoek = { x: p.left + p.width / 2 - vlak.left, y: p.top + p.height / 2 - vlak.top };
			const doel = { x: b.left + b.width / 2 - vlak.left, y: b.top + b.height / 2 - vlak.top, left: b.left - vlak.left, right: b.right - vlak.left, top: b.top - vlak.top };
			const lijn = document.createElementNS(NS, 'path');
			lijn.setAttribute('d', rondPad(lijnPunten(id, hoek, doel), 14));
			lijn.setAttribute('pathLength', '1');
			lijn.setAttribute('data-pillar', id);
			lijn.dataset.tak = id;
			if (actief === id) lijn.classList.add('is-actief');
			svg.appendChild(lijn);
		});
		if (actief) puls(actief);
		if (!getekend) {
			getekend = true;
			svg.classList.add('is-klaar');
			if (MINDER_BEWEGING.matches) svg.classList.add('is-getekend');
			else requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.add('is-getekend'); }); });
		}
	}

	// Een lichtpuls die van de kubus naar de tak loopt, zolang de tak actief is
	function puls(id) {
		svg.querySelectorAll('circle').forEach(function (bol) { bol.remove(); });
		const lijn = id && svg.querySelector('path[data-tak="' + id + '"]');
		if (!lijn || MINDER_BEWEGING.matches) return;
		const bol = document.createElementNS(NS, 'circle');
		bol.setAttribute('r', '2.5');
		bol.setAttribute('data-pillar', id);
		const beweging = document.createElementNS(NS, 'animateMotion');
		beweging.setAttribute('dur', '1.4s');
		beweging.setAttribute('repeatCount', 'indefinite');
		beweging.setAttribute('path', lijn.getAttribute('d'));
		beweging.setAttribute('keyPoints', '0;1');
		beweging.setAttribute('keyTimes', '0;1');
		beweging.setAttribute('calcMode', 'spline');
		beweging.setAttribute('keySplines', '0.4 0 0.2 1');
		bol.appendChild(beweging);
		svg.appendChild(bol);
		if (beweging.beginElement) beweging.beginElement();
	}

	// De actieve tak volgt uit de drie bronnen; de CSS doet de rest met data-actief (en :has zonder JavaScript)
	function bijwerken() {
		const id = bron.focus || bron.muis || bron.teken || null;
		if (id === actief) return;
		actief = id;
		if (id) hub.dataset.actief = id;
		else delete hub.dataset.actief;
		svg.querySelectorAll('path').forEach(function (lijn) { lijn.classList.toggle('is-actief', lijn.dataset.tak === id); });
		puls(id);
		if (drieD) drieD.zetActief(id);
	}
	function zet(soort, id) { bron[soort] = id; bijwerken(); }

	// Aanraken telt niet als aanwijzen: scrollen over de hub mag geen tak aanzetten
	takken.forEach(function (tak) {
		tak.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') zet('muis', tak.dataset.tak); });
		tak.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch' && bron.muis === tak.dataset.tak) zet('muis', null); });
		tak.addEventListener('focusin', function () { zet('focus', tak.dataset.tak); });
		tak.addEventListener('focusout', function (e) { if (!tak.contains(e.relatedTarget)) zet('focus', null); });
	});
	hub.querySelectorAll('.hub-deel').forEach(function (deel) {
		deel.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') zet('muis', deel.dataset.tak); });
		deel.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch' && bron.muis === deel.dataset.tak) zet('muis', null); });
	});

	teken();
	if ('ResizeObserver' in window) new ResizeObserver(teken).observe(podium);
	else window.addEventListener('resize', teken);
	BREED.addEventListener('change', teken);
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(teken);

	laad3D(hub, function (scene) {
		drieD = scene;
		if (actief) scene.zetActief(actief);
	}, function (id) { zet('teken', id); });
}

// Three.js heeft WebGL 2 nodig en een grafische chip die het vlot kan tekenen. Met "databesparing" aan blijft het bij
// de SVG. De testcontext wordt meteen weer vrijgegeven.
function kan3D() {
	if (navigator.connection && navigator.connection.saveData) return false;
	try {
		if (!window.WebGL2RenderingContext) return false;
		const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
		if (!gl) return false;
		const vrij = gl.getExtension('WEBGL_lose_context');
		if (vrij) vrij.loseContext();
		return true;
	} catch (e) {
		return false;
	}
}

// De bundel (js/hub-3d.js) laadt pas als de hub in beeld is en de browser even niets doet. Het canvas verschijnt pas
// als het eerste beeld getekend is (onKlaar), zodat het SVG-teken nooit een moment wegvalt.
function laad3D(hub, klaar, opTeken) {
	const vak = hub.querySelector('[data-hub-3d]');
	if (!vak || !kan3D()) return;
	const naarTak = function (id) {
		const link = hub.querySelector('.hub-tak[data-tak="' + id + '"] .hub-hoofd');
		if (link) link.click();
	};
	const start = function () {
		import('./hub-3d.js').then(function (module) {
			const scene = module.startHub(vak, {
				onActief: opTeken,
				onKies: naarTak,
				onKlaar: function () { hub.classList.add('is-3d'); }
			});
			klaar(scene);
		}).catch(function (e) {
			console.warn('Het teken in 3D lukt niet; de SVG blijft staan', e);
		});
	};
	const wacht = window.requestIdleCallback || function (f) { return setTimeout(f, 600); };
	if (!('IntersectionObserver' in window)) { wacht(start); return; }
	const kijker = new IntersectionObserver(function (entries) {
		if (!entries[entries.length - 1].isIntersecting) return;
		kijker.disconnect();
		wacht(start, { timeout: 2000 });
	});
	kijker.observe(vak);
}
