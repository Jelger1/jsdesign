// Het JS-teken in 3D, in het midden van de hub op de home. src/js/hub.js laadt deze bundel pas als de hub in beeld is.
// Drie blokken met printlaagjes op de zijkanten, een stukje uit elkaar in de richting van hun tak (30°, 150° en 270°,
// zoals de kubus in src/templates/hub.js). Een tak aanwijzen tilt zijn blok naar voren; een blok aanwijzen licht zijn
// tak op en klikken opent de pijler. Slepen draait het teken, daarna wiegt het rustig terug. Geen zwevende blokjes
// eromheen (huisstijl: geen losse decoratie). Bij "minder beweging" staat het teken stil en tekent de lus alleen als er
// iets verandert.
import {
	Scene, PerspectiveCamera, Group, Mesh, ExtrudeGeometry, MeshStandardMaterial, HemisphereLight, DirectionalLight,
	PointLight, Color, CanvasTexture, RepeatWrapping, SRGBColorSpace, Raycaster, Vector2
} from 'three';
import { DELEN, BREEDTE, vorm } from './lib/js-mark.js';
import { maakRenderer, renderLus, veer, minderBeweging } from './lib/util.js';

const SCHAAL = 2.5 / BREEDTE;          // het teken is 2,5 eenheden breed
const DIKTE = 34;                      // in SVG-eenheden, zoals het teken getekend is
const LAAG = 1.4;                      // hoogte van een printlaagje, in SVG-eenheden
const VAK = 392 * SCHAAL;              // het vak toont 392 SVG-eenheden, net als de viewBox van de SVG
const RICHTING = { digitaal: 30, branding: 150, tastbaar: 270 };
const RUST = 7 * SCHAAL;               // opengewerkt, zoals de SVG
const ACTIEF = 20 * SCHAAL;            // verder uit elkaar als de tak actief is
const AANKOMST = 46 * SCHAAL;          // waar de delen vandaan komen als de 3D-versie verschijnt

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

// opties: { onActief(tak|null), onKies(tak) }. Geeft { zetActief(tak|null) } terug.
export function startHub(container, opties) {
	const { renderer, grootte } = maakRenderer(container, { maxPixelRatio: 1.75 });
	const scene = new Scene();
	const camera = new PerspectiveCamera(30, 1, 0.1, 100);

	// Licht: helder van voren, aqua van links en een beetje raspberry van rechtsonder, zoals de gloed op de site. De
	// raspberry blijft zacht, zodat de lichte J (Tastbaar) sage blijft en niet roze wordt.
	scene.add(new HemisphereLight('#f3fffd', '#080a0d', 0.9));
	const hoofd = new DirectionalLight('#ffffff', 1.7);
	hoofd.position.set(2.5, 4, 6);
	scene.add(hoofd);
	const aqua = new PointLight('#03bcca', 16, 0, 2);
	aqua.position.set(-3.2, 1.8, 2.5);
	scene.add(aqua);
	const roze = new PointLight('#f10067', 7, 0, 2);
	roze.position.set(3.2, -2.6, 1.6);
	scene.add(roze);

	const teken = new Group();
	scene.add(teken);
	const lagen = laagjes();
	const delen = DELEN.map(function (deel) {
		const geo = new ExtrudeGeometry(vorm(deel.pad), { depth: DIKTE, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.4, bevelSegments: 3, curveSegments: 10 });
		geo.translate(0, 0, -DIKTE / 2);
		geo.scale(SCHAAL, SCHAAL, SCHAAL);
		const kleur = new Color(deel.kleur);
		// Aqua en raspberry gloeien iets, zodat ze verzadigd blijven; de lichte J kleurt alleen door het licht
		const basis = deel.tak === 'tastbaar' ? 0 : 0.16;
		const voorkant = new MeshStandardMaterial({ color: kleur, roughness: 0.4, metalness: 0.02, emissive: kleur, emissiveIntensity: basis });
		const zijkant = new MeshStandardMaterial({ color: new Color(deel.zijkant), roughness: 0.62, metalness: 0, map: lagen, emissive: kleur, emissiveIntensity: 0.04 });
		const mesh = new Mesh(geo, [voorkant, zijkant]);
		mesh.userData.tak = deel.tak;
		teken.add(mesh);
		const hoek = RICHTING[deel.tak] * Math.PI / 180;
		return {
			tak: deel.tak, mesh: mesh, voorkant: voorkant, basis: basis, gloed: basis,
			richting: { x: Math.cos(hoek), y: Math.sin(hoek) },
			uit: minderBeweging ? RUST : AANKOMST, uitSnel: 0, til: 0, tilSnel: 0
		};
	});

	// ------------------------------------------------------------------ interactie
	const canvas = renderer.domElement;
	canvas.setAttribute('aria-hidden', 'true');
	const muis = { x: 0, y: 0 }, zacht = { x: 0, y: 0 };
	const wijzer = new Vector2(9, 9);
	const raycaster = new Raycaster();
	let actief = null;       // van buitenaf (een tak) of door een blok aan te wijzen
	let aangewezen = null;   // het blok onder de muis
	let draai = 0, draaiSnel = 0;
	let sleept = false, start = null, vorigeX = 0;
	let wekken = function () {};

	window.addEventListener('pointermove', function (e) {
		muis.x = (e.clientX / window.innerWidth) * 2 - 1;
		muis.y = -(e.clientY / window.innerHeight) * 2 + 1;
		const r = canvas.getBoundingClientRect();
		if (e.pointerType === 'mouse') wijzer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
		if (sleept) {
			draaiSnel = (e.clientX - vorigeX) * 0.012;
			draai += draaiSnel;
			vorigeX = e.clientX;
		}
		if (!minderBeweging || sleept) wekken();
		else if (e.pointerType === 'mouse' && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) wekken();
	}, { passive: true });
	canvas.addEventListener('pointerleave', function () {
		wijzer.set(9, 9);
		wekken();
	});
	canvas.addEventListener('pointerdown', function (e) {
		sleept = true;
		start = { x: e.clientX, y: e.clientY, t: performance.now() };
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
		if (e.type === 'pointerup' && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6 && performance.now() - start.t < 450) {
			const r = canvas.getBoundingClientRect();
			const punt = new Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
			raycaster.setFromCamera(punt, camera);
			const raak = raycaster.intersectObjects(delen.map(function (d) { return d.mesh; }), false)[0];
			if (raak && opties && opties.onKies) opties.onKies(raak.object.userData.tak);
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
	function frame(dt, t) {
		zacht.x += (muis.x - zacht.x) * Math.min(1, dt * 3);
		zacht.y += (muis.y - zacht.y) * Math.min(1, dt * 3);

		// Aanwijzen (alleen met een muis): het blok onder de muis maakt zijn tak actief
		raycaster.setFromCamera(wijzer, camera);
		const raak = raycaster.intersectObjects(delen.map(function (d) { return d.mesh; }), false)[0];
		const nieuw = raak ? raak.object.userData.tak : null;
		if (nieuw !== aangewezen) {
			aangewezen = nieuw;
			if (!sleept) canvas.style.cursor = aangewezen ? 'pointer' : '';
			if (opties && opties.onActief) opties.onActief(aangewezen);
		}
		const doelTak = aangewezen || actief;

		let inRust = !sleept && Math.abs(draaiSnel) < 0.002 && Math.abs(draai) < 0.001;
		delen.forEach(function (d) {
			const doelUit = d.tak === doelTak ? ACTIEF : RUST;
			const doelTil = d.tak === doelTak ? 0.16 : 0;
			let uit = veer(d.uit, d.uitSnel, doelUit, dt, 70, 16.7);
			d.uit = uit[0]; d.uitSnel = uit[1];
			uit = veer(d.til, d.tilSnel, doelTil, dt, 70, 16.7);
			d.til = uit[0]; d.tilSnel = uit[1];
			d.mesh.position.set(d.richting.x * d.uit, d.richting.y * d.uit, d.til);
			const gloed = d.tak === doelTak ? d.basis + 0.2 : d.basis;
			d.gloed += (gloed - d.gloed) * Math.min(1, dt * 8);
			d.voorkant.emissiveIntensity = d.gloed;
			if (Math.abs(d.uit - doelUit) > 0.0005 || Math.abs(d.til - doelTil) > 0.0005 || Math.abs(d.gloed - gloed) > 0.002) inRust = false;
		});

		// Draaien: slepen geeft een zwiep die uitdempt; daarna wiegt het teken rustig terug naar zijn houding
		if (!sleept) {
			draaiSnel *= Math.exp(-dt * 2.2);
			draai = Math.atan2(Math.sin(draai + draaiSnel), Math.cos(draai + draaiSnel)); // de kortste weg terug
			if (Math.abs(draaiSnel) < 0.002) draai += (0 - draai) * Math.min(1, dt * 0.9);
		}
		const wieg = minderBeweging ? 0 : Math.sin(t * 0.4) * 0.16;
		const kantel = minderBeweging ? 0 : 1;
		teken.rotation.y = 0.26 + wieg + draai + zacht.x * 0.3 * kantel;
		teken.rotation.x = -0.1 - zacht.y * 0.16 * kantel;
		renderer.render(scene, camera);
		// Bij "minder beweging" stopt de lus zodra alles stilstaat; aanwijzen of slepen wekt hem weer
		return minderBeweging && inRust;
	}

	wekken = renderLus(container, frame, opnieuw);

	return {
		zetActief: function (tak) {
			actief = tak;
			wekken();
		}
	};
}
