// Het JS-teken in 3D, in de hero op de home. src/js/held.js laadt deze bundel pas als het teken in beeld is.
// Drie blokken met printlaagjes op de zijkanten, een stukje uit elkaar langs hun as (30°, 150° en 270°, zoals de SVG in
// src/templates/held.js). Een pijler aanwijzen in het bijschrift tilt zijn blok naar voren; een blok aanwijzen licht
// zijn link op en klikken opent de pijler. Slepen draait het teken. Geen zwevende blokjes eromheen (huisstijl: geen
// losse decoratie).
// Beweging: het teken wiegt alleen de eerste 4,5 seconden na het verschijnen (WCAG 2.2.2: wat vanzelf beweegt, stopt
// binnen 5 seconden); daarna beweegt het alleen nog als reactie op de bezoeker, en staat de renderlus stil zodra alles
// in rust is. Bij "minder beweging" wiegt en kantelt het niet.
import {
	Scene, PerspectiveCamera, Group, Mesh, ExtrudeGeometry, MeshBasicMaterial, MeshStandardMaterial, HemisphereLight,
	DirectionalLight, Color, CanvasTexture, RepeatWrapping, SRGBColorSpace, Raycaster, Vector2
} from 'three';
import { DELEN, BREEDTE, vorm } from './lib/js-mark.js';
import { maakRenderer, renderLus, veer, minderBeweging } from './lib/util.js';

const SCHAAL = 2.5 / BREEDTE;          // het teken is 2,5 eenheden breed
const DIKTE = 34;                      // in SVG-eenheden, zoals het teken getekend is
const LAAG = 1.4;                      // hoogte van een printlaagje, in SVG-eenheden
const VAK = 320 * SCHAAL;              // het vak toont 320 SVG-eenheden, net als de viewBox van de SVG (VAK in held.js)
const RICHTING = { digitaal: 30, branding: 150, tastbaar: 270 };
const RUST = 7 * SCHAAL;               // opengewerkt, zoals de SVG
const ACTIEF = 20 * SCHAAL;            // verder uit elkaar als de pijler aangewezen is
const WIEGEN = 4.5;                    // seconden dat het teken na het verschijnen wiegt

// Printlaagjes: dunne lichtere en donkere strepen langs de dikte, herhaald over de zijkanten
function laagjes() {
	const canvas = document.createElement('canvas');
	canvas.width = 4;
	canvas.height = 32;
	const ctx = canvas.getContext('2d');
	const verloop = ctx.createLinearGradient(0, 0, 0, 32);
	verloop.addColorStop(0, '#ffffff');
	verloop.addColorStop(0.55, '#e6e6e6');
	verloop.addColorStop(0.8, '#bdbdbd');
	verloop.addColorStop(1, '#ffffff');
	ctx.fillStyle = verloop;
	ctx.fillRect(0, 0, 4, 32);
	const textuur = new CanvasTexture(canvas);
	textuur.wrapS = textuur.wrapT = RepeatWrapping;
	textuur.repeat.set(0.01, 1 / LAAG);
	textuur.colorSpace = SRGBColorSpace;
	return textuur;
}

// opties: { onActief(pijler|null), onKies(pijler), onKlaar() }. Geeft { zetActief(pijler|null) } terug.
export function startTeken(container, opties) {
	const { renderer, grootte } = maakRenderer(container, { maxPixelRatio: 1.75 });
	const scene = new Scene();
	const camera = new PerspectiveCamera(30, 1, 0.1, 100);

	// Licht alleen voor de zijkanten: de voorkanten zijn onverlicht, zodat ze precies de merkkleuren houden
	scene.add(new HemisphereLight('#f3fffd', '#080a0d', 1.1));
	const hoofd = new DirectionalLight('#ffffff', 1.6);
	hoofd.position.set(2.5, 4, 6);
	scene.add(hoofd);

	const teken = new Group();
	scene.add(teken);
	const lagen = laagjes();
	const delen = DELEN.map(function (deel) {
		const geo = new ExtrudeGeometry(vorm(deel.pad), { depth: DIKTE, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.4, bevelSegments: 3, curveSegments: 10 });
		geo.translate(0, 0, -DIKTE / 2);
		geo.scale(SCHAAL, SCHAAL, SCHAAL);
		const voorkant = new MeshBasicMaterial({ color: new Color(deel.kleur) });
		const zijkant = new MeshStandardMaterial({ color: new Color(deel.zijkant), roughness: 0.62, metalness: 0, map: lagen });
		const mesh = new Mesh(geo, [voorkant, zijkant]);
		mesh.userData.pijler = deel.pijler;
		teken.add(mesh);
		const hoek = RICHTING[deel.pijler] * Math.PI / 180;
		return {
			pijler: deel.pijler, mesh: mesh,
			richting: { x: Math.cos(hoek), y: Math.sin(hoek) },
			// De SVG heeft het teken al laten opengaan: de 3D-versie begint in rust, zonder tweede intro
			uit: RUST, uitSnel: 0, til: 0, tilSnel: 0
		};
	});

	// ------------------------------------------------------------------ interactie
	const canvas = renderer.domElement;
	canvas.setAttribute('aria-hidden', 'true');
	const muis = { x: 0, y: 0 }, zacht = { x: 0, y: 0 };
	const wijzer = new Vector2(9, 9);
	const raycaster = new Raycaster();
	let gewezen = false;     // pas raycasten als de muis echt boven het teken is geweest
	let actief = null;       // van buitenaf (het bijschrift)
	let aangewezen = null;   // het blok onder de muis
	let draai = 0, draaiSnel = 0;
	let sleept = false, start = null, vorigeX = 0;
	let wekken = function () {};

	window.addEventListener('pointermove', function (e) {
		muis.x = (e.clientX / window.innerWidth) * 2 - 1;
		muis.y = -(e.clientY / window.innerHeight) * 2 + 1;
		const r = canvas.getBoundingClientRect();
		if (e.pointerType === 'mouse') {
			wijzer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
			if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) gewezen = true;
		}
		if (sleept) {
			draaiSnel = (e.clientX - vorigeX) * 0.012;
			draai += draaiSnel;
			vorigeX = e.clientX;
		}
		if (sleept || !minderBeweging() || gewezen) wekken();
	}, { passive: true });
	canvas.addEventListener('pointerleave', function () {
		wijzer.set(9, 9);
		wekken();
	});
	canvas.addEventListener('pointerdown', function (e) {
		sleept = true;
		// Alleen de gewone knop zonder ctrl, cmd, shift of alt telt straks als klik
		start = { x: e.clientX, y: e.clientY, t: performance.now(), klik: e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey };
		vorigeX = e.clientX;
		draaiSnel = 0;
		canvas.classList.add('is-dragging');
		wekken();
	});
	function loslaten(e) {
		if (!sleept) return;
		sleept = false;
		canvas.classList.remove('is-dragging');
		// Kort getikt zonder te slepen: het blok onder de vinger of muis opent zijn pijler
		if (e.type === 'pointerup' && start && start.klik && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6 && performance.now() - start.t < 450) {
			const r = canvas.getBoundingClientRect();
			const punt = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
			raycaster.setFromCamera(punt, camera);
			const raak = raycaster.intersectObjects(delen.map(function (d) { return d.mesh; }), false)[0];
			if (raak && opties && opties.onKies) opties.onKies(raak.object.userData.pijler);
		}
		start = null;
		wekken();
	}
	window.addEventListener('pointerup', loslaten);
	window.addEventListener('pointercancel', loslaten); // de browser neemt het over om te scrollen

	// Het vak is vierkant; de camera staat op de afstand waarop VAK eenheden precies in beeld passen
	function opnieuw() {
		const g = grootte();
		renderer.setSize(g.b, g.h, false);
		camera.aspect = g.b / g.h;
		camera.position.set(0, 0, (VAK / 2) / Math.tan(camera.fov * Math.PI / 360) * Math.max(1, 1 / camera.aspect));
		camera.updateProjectionMatrix();
	}
	opnieuw();

	// ------------------------------------------------------------------ animatie
	let klaar = false;       // shaders gecompileerd
	let gemeld = false;      // onKlaar is aangeroepen
	let verschenen = 0;      // tijd (s) waarop het eerste beeld er stond
	function frame(dt, t) {
		if (!klaar) return true; // wacht op de shaders; compileer() wekt de lus daarna
		zacht.x += (muis.x - zacht.x) * Math.min(1, dt * 3);
		zacht.y += (muis.y - zacht.y) * Math.min(1, dt * 3);

		// Aanwijzen (alleen met een muis): het blok onder de muis maakt zijn pijler actief
		let nieuw = null;
		if (gewezen) {
			raycaster.setFromCamera(wijzer, camera);
			const raak = raycaster.intersectObjects(delen.map(function (d) { return d.mesh; }), false)[0];
			nieuw = raak ? raak.object.userData.pijler : null;
		}
		if (nieuw !== aangewezen) {
			aangewezen = nieuw;
			if (!sleept) canvas.style.cursor = aangewezen ? 'pointer' : '';
			if (opties && opties.onActief) opties.onActief(aangewezen);
		}
		const doel = aangewezen || actief;

		let inRust = !sleept && Math.abs(draaiSnel) < 0.002 && Math.abs(draai) < 0.001;
		delen.forEach(function (d) {
			const doelUit = d.pijler === doel ? ACTIEF : RUST;
			const doelTil = d.pijler === doel ? 0.16 : 0;
			let uit = veer(d.uit, d.uitSnel, doelUit, dt, 70, 16.7);
			d.uit = uit[0]; d.uitSnel = uit[1];
			uit = veer(d.til, d.tilSnel, doelTil, dt, 70, 16.7);
			d.til = uit[0]; d.tilSnel = uit[1];
			// Het actieve blok komt naar voren en houdt precies zijn merkkleur (zoals de SVG, die alleen een gloed krijgt)
			d.mesh.position.set(d.richting.x * d.uit, d.richting.y * d.uit, d.til);
			if (Math.abs(d.uit - doelUit) > 0.0005 || Math.abs(d.til - doelTil) > 0.0005) inRust = false;
		});

		// Draaien: slepen geeft een zwiep die uitdempt; daarna draait het teken rustig terug naar zijn houding
		if (!sleept) {
			draaiSnel *= Math.exp(-dt * 2.2);
			draai = Math.atan2(Math.sin(draai + draaiSnel), Math.cos(draai + draaiSnel)); // de kortste weg terug
			if (Math.abs(draaiSnel) < 0.002) draai += (0 - draai) * Math.min(1, dt * 0.9);
		}
		// Wiegen: alleen de eerste WIEGEN seconden, uitlopend naar nul
		if (!verschenen) verschenen = t;
		const rest = minderBeweging() ? 0 : Math.max(0, 1 - (t - verschenen) / WIEGEN);
		const wieg = Math.sin((t - verschenen) * 0.9) * 0.16 * rest * rest;
		const kantel = minderBeweging() ? 0 : 1;
		teken.rotation.y = 0.26 + wieg + draai + zacht.x * 0.3 * kantel;
		teken.rotation.x = -0.1 - zacht.y * 0.16 * kantel;
		if (rest > 0) inRust = false;
		if (kantel && (Math.abs(muis.x - zacht.x) > 0.001 || Math.abs(muis.y - zacht.y) > 0.001)) inRust = false;
		renderer.render(scene, camera);
		if (!gemeld) { gemeld = true; if (opties && opties.onKlaar) opties.onKlaar(); }
		return inRust;
	}

	wekken = renderLus(container, frame, opnieuw);
	// De shaders vooraf compileren (zonder de pagina te laten haperen) en pas daarna het eerste beeld tekenen
	const compileer = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve();
	compileer.catch(function () {}).then(function () { klaar = true; wekken(); });

	return {
		zetActief: function (pijler) {
			actief = pijler;
			wekken();
		}
	};
}
