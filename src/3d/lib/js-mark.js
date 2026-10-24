// Het JS-teken uit de huisstijl (assets/brand/js-icon.svg) als vormen voor Three.js. Het teken is getekend op een
// isometrisch raster; elk deel hoort bij een pijler en wordt in 3D een eigen blok (zie ../held-3d.js).
// Overgenomen uit het portfolio (Portfolio/src/3d/js-mark.js), met de pijlernamen als sleutel.
import { Shape } from 'three';

export const BREEDTE = 253;
export const HOOGTE = 235.83;

export const DELEN = [
	{
		pijler: 'digitaal', kleur: '#03bcca', zijkant: '#027f8a',
		pad: 'M244.05,41.54l-56.7,39.7-9.35-4.97-21.23-11.27-13.63-7.23c-.8-.43-1.77-.37-2.52.15l-12.5,8.75-.19-.1-57.35-30.45,13.72-9.6,17.93-12.56c23.79-16.66,54.91-18.57,80.56-4.95l15.74,8.36,14.93,7.93,21.23,11.27,9.35,4.97Z'
	},
	{
		pijler: 'tastbaar', kleur: '#f3fffd', zijkant: '#9db3b0',
		pad: 'M253,149.99l-56.77,39.75-27.91,19.54-17.95,12.57c-23.79,16.66-54.91,18.57-80.56,4.95l-23.48-12.46-27.9-14.81-9.35-4.96,56.72-39.72,9.35,4.96,26.6,14.12c.8.43,1.77.37,2.52-.15l23.47-16.43c1.48-1.03,1.34-3.27-.25-4.11l-24.41-12.96-9.35-4.96-21.23-11.27,56.77-39.75,21.23,11.27,9.35,4.96,27.9,14.81,65.28,34.65Z'
	},
	{
		pijler: 'branding', kleur: '#f10067', zijkant: '#a8004a',
		pad: 'M114.31,76.36L57.54,116.11L0,85.57L56.77,45.81Z'
	}
];

// Leest een SVG-pad (M, L, H, V, C en Z, absoluut en relatief) en geeft een Shape terug, met het midden van het
// teken op (0, 0) en de y-as omhoog zoals in Three.js.
export function vorm(pad) {
	const tokens = pad.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g);
	const shape = new Shape();
	const mx = BREEDTE / 2, my = HOOGTE / 2;
	const X = (x) => x - mx, Y = (y) => my - y;
	let i = 0, cmd = '', x = 0, y = 0;
	const getal = () => parseFloat(tokens[i++]);
	while (i < tokens.length) {
		if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
		const rel = cmd === cmd.toLowerCase();
		switch (cmd.toUpperCase()) {
			case 'M': {
				const nx = getal(), ny = getal();
				x = rel ? x + nx : nx; y = rel ? y + ny : ny;
				shape.moveTo(X(x), Y(y));
				cmd = rel ? 'l' : 'L'; // volgende paren zonder letter zijn lijnen
				break;
			}
			case 'L': {
				const nx = getal(), ny = getal();
				x = rel ? x + nx : nx; y = rel ? y + ny : ny;
				shape.lineTo(X(x), Y(y));
				break;
			}
			case 'H': { const n = getal(); x = rel ? x + n : n; shape.lineTo(X(x), Y(y)); break; }
			case 'V': { const n = getal(); y = rel ? y + n : n; shape.lineTo(X(x), Y(y)); break; }
			case 'C': {
				const a = [getal(), getal(), getal(), getal(), getal(), getal()];
				const b = rel ? a.map((v, k) => v + (k % 2 ? y : x)) : a;
				shape.bezierCurveTo(X(b[0]), Y(b[1]), X(b[2]), Y(b[3]), X(b[4]), Y(b[5]));
				x = b[4]; y = b[5];
				break;
			}
			case 'Z':
				shape.closePath();
				break;
			default:
				throw new Error('SVG-pad: onbekende opdracht ' + cmd);
		}
	}
	return shape;
}
