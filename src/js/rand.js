// De tekenrand op werktegels (components.css > .rand): zet in elke kaart met data-rand een SVG met twee lijnen langs de
// afgeronde rand, vanaf het midden van de hoek linksonder (waar het blokje van de pijler staat) naar het midden van de
// hoek rechtsboven (het pijltje): de ene langs links en boven, de andere langs onder en rechts. Ze zijn even lang, dus ze
// komen tegelijk bij het pijltje aan. pathLength="1" maakt het tekenen onafhankelijk van de maat: de CSS schuift alleen
// stroke-dashoffset van 1 naar 0. Een ResizeObserver houdt de lijnen passend als een kaart van maat verandert.
const NS = 'http://www.w3.org/2000/svg';

function r1(n) { return Math.round(n * 100) / 100; }

// w, h: de binnenmaat van de kaart; straal: de straal van de binnenrand
function paden(w, h, straal) {
	const s = 1; // de helft van de lijndikte: de lijn valt precies binnen de afgeronde rand
	const q = Math.max(0, straal - s);
	const x0 = s, y0 = s, x1 = w - s, y1 = h - s, k = Math.SQRT1_2;
	const linksonder = [r1(x0 + q - q * k), r1(y1 - q + q * k)];
	const rechtsboven = [r1(x1 - q + q * k), r1(y0 + q - q * k)];
	const boog = 'A' + q + ' ' + q + ' 0 0 ';
	const om = 'M' + linksonder + ' ' + boog + '1 ' + x0 + ' ' + r1(y1 - q) + ' V' + r1(y0 + q) + ' ' + boog + '1 ' + r1(x0 + q) + ' ' + y0
		+ ' H' + r1(x1 - q) + ' ' + boog + '1 ' + rechtsboven;
	const onder = 'M' + linksonder + ' ' + boog + '0 ' + r1(x0 + q) + ' ' + y1 + ' H' + r1(x1 - q) + ' ' + boog + '0 ' + x1 + ' ' + r1(y1 - q)
		+ ' V' + r1(y0 + q) + ' ' + boog + '0 ' + rechtsboven;
	return [om, onder];
}

export function initRand() {
	const kaarten = document.querySelectorAll('[data-rand]');
	if (!kaarten.length || !('ResizeObserver' in window)) return;
	const lijnen = new WeakMap();
	const meten = new ResizeObserver(function (entries) {
		entries.forEach(function (e) {
			const kaart = e.target;
			const stijl = getComputedStyle(kaart);
			// De straal van de binnenrand: border-radius min de rand zelf
			const straal = parseFloat(stijl.borderTopLeftRadius) - parseFloat(stijl.borderTopWidth);
			const d = paden(kaart.clientWidth, kaart.clientHeight, straal);
			lijnen.get(kaart).forEach(function (p, i) { p.setAttribute('d', d[i]); });
		});
	});
	kaarten.forEach(function (kaart) {
		const svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('class', 'rand');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('focusable', 'false');
		lijnen.set(kaart, [0, 1].map(function () {
			const p = document.createElementNS(NS, 'path');
			p.setAttribute('pathLength', '1');
			svg.appendChild(p);
			return p;
		}));
		kaart.appendChild(svg);
		meten.observe(kaart);
	});
}
