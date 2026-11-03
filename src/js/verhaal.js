// "Zo werk ik" als scrollverhaal (pijler.css > .verhaal), op de pijlerpagina's en de Over-pagina, vanaf 1100 px breed en
// 700 px hoog. Links scrollen de stappen gewoon mee; rechts blijft een tekening staan: een isometrische trap met één
// blok per stap, elk een trede hoger. Zodra je een stap leest (zijn kop komt halverwege het venster), wordt zijn blok
// geprint: laag voor laag, met de printkop, van stippellijn naar massief, net als de beelden. Scrol je terug, dan gaat
// het weer terug. De site neemt het scrollen niet over: dit leest alleen af waar je bent. Smaller, lager of bij minder
// beweging blijft het de gewone trap (trap.js).
export const VERHAAL = '(min-width: 1100px) and (min-height: 700px)';

const SVG = 'http://www.w3.org/2000/svg';
const A = 80; // de halve breedte van een bovenvlak
const B = A * Math.tan(Math.PI / 6); // de halve hoogte (lijnen onder 30°)
const U = 46; // een trede
const LIJN = 0.5; // waar in het venster een stap begint: halverwege

export function maakVerhaal(trap) {
	const stappen = Array.from(trap.children);
	const tekening = teken(stappen.length);
	const verhaal = document.createElement('div');
	verhaal.className = 'verhaal';
	trap.parentNode.insertBefore(verhaal, trap);
	verhaal.appendChild(trap);
	verhaal.appendChild(tekening);
	trap.classList.add('trap--verhaal');
	const blokken = Array.from(tekening.querySelectorAll('.vb')).reverse(); // getekend van achter naar voor
	const koppen = stappen.map(function (li) { return li.querySelector('h3') || li; });
	// Elk blok in de kleur van zijn stap: op een pijlerpagina de pijler, op Over om en om de drie merkkleuren (over.css)
	stappen.forEach(function (li, k) { blokken[k].style.setProperty('--pillar', getComputedStyle(li).getPropertyValue('--pillar')); });

	let nu = null;
	function bij() {
		const lijn = window.innerHeight * LIJN;
		let i = -1;
		koppen.forEach(function (kop, k) { if (kop.getBoundingClientRect().top < lijn) i = k; });
		if (i === nu) return;
		nu = i;
		[stappen, blokken].forEach(function (rij) {
			rij.forEach(function (el, k) {
				el.classList.toggle('is-klaar', k <= i);
				el.classList.toggle('is-nu', k === i);
			});
		});
	}
	let gepland = false;
	function plan() {
		if (gepland) return;
		gepland = true;
		requestAnimationFrame(function () { gepland = false; bij(); });
	}
	window.addEventListener('scroll', plan, { passive: true });
	window.addEventListener('resize', plan);
	bij();
}

// De trap als SVG: n blokken langs de as naar rechtsachter, blok i is i + 1 treden hoog. Elk blok heeft een
// stippeltekening (gevuld met de achtergrond, zodat de lijnen van de blokken erachter wegvallen), een massieve versie
// (boven, links, rechts) en een printkop die van de onderkant naar de bovenkant loopt.
function teken(n) {
	const breed = (n + 1) * A;
	const hoog = (n + 1) * B + n * U;
	const svg = document.createElementNS(SVG, 'svg');
	svg.setAttribute('viewBox', [-12, -8, breed + 24, hoog + 16].map(rond).join(' '));
	svg.setAttribute('focusable', 'false');
	const x0 = A;
	const y0 = hoog - B;
	for (let i = n - 1; i >= 0; i--) {
		const cx = x0 + i * A;
		const h = (i + 1) * U;
		const cy = y0 - i * B - h;
		const g = el('g', { class: 'vb' });
		const stip = el('g', { class: 'vb-stip' });
		stip.appendChild(el('path', { class: 'vb-rand', d: pad([[cx - A, cy], [cx, cy - B], [cx + A, cy], [cx + A, cy + h], [cx, cy + B + h], [cx - A, cy + h]]) }));
		stip.appendChild(el('path', { class: 'vb-rand', d: pad([[cx - A, cy], [cx, cy + B], [cx + A, cy]], true) + ' ' + pad([[cx, cy + B], [cx, cy + B + h]], true) }));
		stip.appendChild(cijfer(cx, cy, i + 1));
		const vol = el('g', { class: 'vb-vol' });
		vol.appendChild(el('path', { class: 'vb-links', d: pad([[cx - A, cy], [cx, cy + B], [cx, cy + B + h], [cx - A, cy + h]]) }));
		vol.appendChild(el('path', { class: 'vb-rechts', d: pad([[cx, cy + B], [cx + A, cy], [cx + A, cy + h], [cx, cy + B + h]]) }));
		vol.appendChild(el('path', { class: 'vb-top', d: pad([[cx - A, cy], [cx, cy - B], [cx + A, cy], [cx, cy + B]]) }));
		vol.appendChild(cijfer(cx, cy, i + 1));
		const kop = el('line', { class: 'vb-kop', x1: rond(cx - A - 8), y1: rond(cy + B + h), x2: rond(cx + A + 8), y2: rond(cy + B + h) });
		kop.style.setProperty('--reis', rond(-(h + 2 * B)) + 'px');
		g.appendChild(stip);
		g.appendChild(vol);
		g.appendChild(kop);
		svg.appendChild(g);
	}
	const vak = document.createElement('div');
	vak.className = 'verhaal-tekening';
	vak.setAttribute('aria-hidden', 'true');
	vak.appendChild(svg);
	return vak;
}

function cijfer(x, y, n) {
	const t = el('text', { x: rond(x), y: rond(y), 'text-anchor': 'middle', 'dominant-baseline': 'central' });
	t.textContent = n;
	return t;
}

function el(naam, attrs) {
	const e = document.createElementNS(SVG, naam);
	Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
	return e;
}

function pad(punten, open) {
	return punten.map(function (p, k) { return (k ? 'L' : 'M') + rond(p[0]) + ',' + rond(p[1]); }).join(' ') + (open ? '' : ' Z');
}

function rond(v) { return Math.round(v * 10) / 10; }
