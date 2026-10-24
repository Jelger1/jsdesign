// De hero op de home (src/pages/index.html): links in gewone woorden wat JS Design maakt, rechts het JS-teken als enige
// beeld. De drie delen van het teken zijn de drie pijlers; het bijschrift eronder noemt ze en linkt erheen. Onderaan
// een rij "Gemaakt voor" met opdrachtgevers uit site.json > homeBewijs.
// Het teken is eerst een SVG; src/js/held.js zet er de 3D-versie (src/3d/held-3d.js) overheen zodra die kan.
const h = require('./helpers');
const { DELEN, MIDDEN, RICHTING } = require('./teken');

const VOLGORDE = ['branding', 'digitaal', 'tastbaar'];
const VAK = 320; // breedte en hoogte van het vak rond het teken, in SVG-eenheden (held-3d.js gebruikt dezelfde maat)
const getal = function (n) { return Math.round(n * 10) / 10; };

// Het teken, opengewerkt in zijn drie delen. Voor schermlezers is het versiering (de links staan in het bijschrift);
// voor de muis is elk deel een extra klikvlak naar zijn pijler.
function teken(pillars) {
	// Branding als laatste: dat blokje ligt bovenop
	const delen = ['digitaal', 'tastbaar', 'branding'].map(function (id) {
		const pillar = pillars.find(function (p) { return p.id === id; });
		const r = RICHTING[id] * Math.PI / 180;
		return '<a class="held-deel" data-pillar="' + id + '" href="' + h.esc(pillar.path) + '" tabindex="-1" style="--rx:' + getal(Math.cos(r)) + ';--ry:' + getal(-Math.sin(r)) + '">'
			+ DELEN[id] + '</a>';
	}).join('');
	return '<svg class="held-svg" viewBox="' + getal(MIDDEN.x - VAK / 2) + ' ' + getal(MIDDEN.y - VAK / 2) + ' ' + VAK + ' ' + VAK + '" aria-hidden="true" focusable="false">'
		+ delen + '</svg>';
}

function legenda(pillars) {
	return VOLGORDE.map(function (id) {
		const pillar = pillars.find(function (p) { return p.id === id; });
		return '<li><a data-pillar="' + id + '" href="' + h.esc(pillar.path) + '">' + h.esc(pillar.label) + '</a></li>';
	}).join('\n\t\t\t\t\t');
}

// Een opdrachtgever met wat ik voor ze maakte; de link gaat naar de case. De komma is er alleen voor schermlezers.
function bewijs(ctx) {
	return ctx.site.homeBewijs.map(function (b) {
		const p = ctx.projects.find(function (x) { return x.id === b.project; });
		return '<li data-pillar="' + h.esc(p.pillar) + '"><a href="' + h.esc(h.projectUrl(p)) + '"><strong>' + h.esc(b.naam) + '</strong>'
			+ '<span class="sr-only">,</span> <span>' + h.esc(b.wat) + '</span></a></li>';
	}).join('\n\t\t\t\t');
}

function held(ctx) {
	return { teken: teken(ctx.pillars), legenda: legenda(ctx.pillars), bewijs: bewijs(ctx) };
}

module.exports = { held: held, VAK: VAK };
