// De hero op de home (src/templates/held.js): houdt bij welke pijler aangewezen is (in het bijschrift onder het teken of
// op het teken zelf) en laadt het JS-teken in 3D zodra het in beeld is. Zonder JavaScript of WebGL blijft alles werken:
// het bijschrift bestaat uit gewone links en het teken is een SVG.
export function initHeld() {
	const held = document.querySelector('[data-held]');
	if (!held) return;
	const links = Array.from(held.querySelectorAll('.held-legenda a[data-pillar]'));
	let drieD = null;
	let actief = null;
	// Wie een pijler aanwijst: toetsenbordfocus, de muis (op een link of een deel van het teken) of het 3D-teken. Elk
	// houdt zijn eigen stand bij, zodat de een de ander niet uitzet (de focus wint).
	const bron = { focus: null, muis: null, teken: null };

	// De actieve pijler volgt uit de drie bronnen; de CSS doet de rest met data-actief (en :has zonder JavaScript)
	function bijwerken() {
		const id = bron.focus || bron.muis || bron.teken || null;
		if (id === actief) return;
		actief = id;
		if (id) held.dataset.actief = id;
		else delete held.dataset.actief;
		if (drieD) drieD.zetActief(id);
	}
	function zet(soort, id) { bron[soort] = id; bijwerken(); }

	// Aanraken telt niet als aanwijzen: scrollen over de hero mag geen pijler aanzetten
	links.concat(Array.from(held.querySelectorAll('.held-deel'))).forEach(function (el) {
		el.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') zet('muis', el.dataset.pillar); });
		el.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch' && bron.muis === el.dataset.pillar) zet('muis', null); });
	});
	links.forEach(function (link) {
		link.addEventListener('focus', function () { zet('focus', link.dataset.pillar); });
		link.addEventListener('blur', function () { if (bron.focus === link.dataset.pillar) zet('focus', null); });
	});

	laad3D(held, function (scene) {
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

// De bundel (js/held-3d.js) laadt pas als het teken in beeld is en de browser even niets doet. Het canvas verschijnt pas
// als het eerste beeld getekend is (onKlaar), zodat het SVG-teken nooit een moment wegvalt. Een klik op een deel van
// het 3D-teken opent zijn pijler, via dezelfde link als in het bijschrift.
function laad3D(held, klaar, opTeken) {
	const vak = held.querySelector('[data-held-3d]');
	if (!vak || !kan3D()) return;
	const naarPijler = function (id) {
		const link = held.querySelector('.held-legenda a[data-pillar="' + id + '"]');
		if (link) link.click();
	};
	const start = function () {
		import('./held-3d.js').then(function (module) {
			const scene = module.startTeken(vak, {
				onActief: opTeken,
				onKies: naarPijler,
				onKlaar: function () { held.classList.add('is-3d'); }
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
