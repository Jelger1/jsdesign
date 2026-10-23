// De hub bovenaan de home: het JS-teken in het midden, opengewerkt in zijn drie delen, en vanuit elk deel een tak naar
// een pijler. Elke tak vertakt in twijgen: diensten, projecten (data/projects.json) en plekken zoals de webshop.
//
// Meetkunde: het teken staat in een isometrische kubus (een zeshoek met een punt boven). De drie binnenranden van die
// kubus wijzen naar 30°, 150° en 270°, precies de richtingen waarin de delen van het teken liggen: aqua rechtsboven
// (Digitaal), raspberry linksboven (Branding) en de lichte J onder (Tastbaar). De takken lopen vanaf die hoeken verder.
// De lijnen tussen hoeken, takken en twijgen tekent src/js/hub.js, omdat hun lengte van de schermbreedte afhangt.
const h = require('./helpers');

// De delen van het teken (assets/brand/js-icon.svg), in tekenvolgorde
const DELEN = {
	digitaal: '<path fill="#03bcca" d="M244.05,41.54l-56.7,39.7-9.35-4.97-21.23-11.27-13.63-7.23c-.8-.43-1.77-.37-2.52.15l-12.5,8.75-.19-.1-57.35-30.45,13.72-9.6,17.93-12.56c23.79-16.66,54.91-18.57,80.56-4.95l15.74,8.36,14.93,7.93,21.23,11.27,9.35,4.97Z"/>',
	tastbaar: '<path fill="#f3fffd" d="M253,149.99l-56.77,39.75-27.91,19.54-17.95,12.57c-23.79,16.66-54.91,18.57-80.56,4.95l-23.48-12.46-27.9-14.81-9.35-4.96,56.72-39.72,9.35,4.96,26.6,14.12c.8.43,1.77.37,2.52-.15l23.47-16.43c1.48-1.03,1.34-3.27-.25-4.11l-24.41-12.96-9.35-4.96-21.23-11.27,56.77-39.75,21.23,11.27,9.35,4.96,27.9,14.81,65.28,34.65Z"/>',
	branding: '<polygon fill="#f10067" points="114.31 76.36 57.54 116.11 0 85.57 56.77 45.81"/>'
};
const MIDDEN = { x: 126.5, y: 117.9 }; // midden van het teken (253 x 235,83)
const STRAAL = 182;                    // van het midden naar een hoek van de zeshoek
const RICHTING = { digitaal: 30, branding: 150, tastbaar: 270 };
const VOLGORDE = ['branding', 'digitaal', 'tastbaar'];

function hoek(graden, straal) {
	const r = graden * Math.PI / 180;
	return { x: MIDDEN.x + Math.cos(r) * straal, y: MIDDEN.y - Math.sin(r) * straal };
}
const getal = function (n) { return Math.round(n * 10) / 10; };

// Het teken in zijn kubus. Alles hierin is versiering voor schermlezers (de echte links staan in de lijst ernaast);
// de delen zijn wel een extra klikvlak voor de muis.
function teken(pillars) {
	const zeshoek = [90, 150, 210, 270, 330, 30].map(function (g) { const p = hoek(g, STRAAL); return getal(p.x) + ',' + getal(p.y); }).join(' ');
	// De binnenranden van de kubus, van het midden naar de hoeken waar de takken vertrekken
	const binnen = VOLGORDE.map(function (id) {
		const p = hoek(RICHTING[id], STRAAL);
		return '<line data-pillar="' + id + '" data-binnen="' + id + '" x1="' + MIDDEN.x + '" y1="' + MIDDEN.y + '" x2="' + getal(p.x) + '" y2="' + getal(p.y) + '"/>';
	}).join('');
	const delen = VOLGORDE.slice().sort(function (a, b) { return a === 'branding' ? 1 : b === 'branding' ? -1 : 0; }).map(function (id) {
		const pillar = pillars.find(function (p) { return p.id === id; });
		const r = RICHTING[id] * Math.PI / 180;
		return '<a class="hub-deel" data-tak="' + id + '" href="' + h.esc(pillar.path) + '" tabindex="-1" style="--rx:' + getal(Math.cos(r)) + ';--ry:' + getal(-Math.sin(r)) + '">'
			+ DELEN[id] + '</a>';
	}).join('');
	// Poorten: het raspberry-blokje (verkleind) op de drie hoeken waar de takken vertrekken
	const poorten = VOLGORDE.map(function (id) {
		const p = hoek(RICHTING[id], STRAAL);
		return '<polygon class="hub-poort" data-pillar="' + id + '" data-poort="' + id + '" points="'
			+ [[10, -0.8], [0.05, 6.1], [-10, 0.8], [-0.05, -6.1]].map(function (q) { return getal(p.x + q[0]) + ' ' + getal(p.y + q[1]); }).join(' ') + '"/>';
	}).join('');
	const vak = STRAAL + 14;
	return '<svg class="hub-teken" viewBox="' + getal(MIDDEN.x - vak) + ' ' + getal(MIDDEN.y - vak) + ' ' + vak * 2 + ' ' + vak * 2 + '" aria-hidden="true" focusable="false">'
		+ '<polygon class="hub-kubus" points="' + zeshoek + '"/>'
		+ '<g class="hub-binnen">' + binnen + '</g>'
		+ '<g class="hub-delen">' + delen + '</g>'
		+ poorten
		+ '</svg>';
}

// Kleine vierkante miniatuur (build.js maakt ze in 96 en 192 px)
function duim(ctx, file) {
	const t = ctx.thumbs && ctx.thumbs[file];
	if (!t) throw new Error('Geen miniatuur voor de hub: ' + file + ' (zie buildThumbs in build.js)');
	return '<img src="assets/img/' + t[0].file + '" srcset="' + t.map(function (v) { return 'assets/img/' + v.file + ' ' + v.w + 'w'; }).join(', ')
		+ '" sizes="48px" width="96" height="96" alt="" loading="lazy" decoding="async">';
}

function twijg(t, ctx) {
	let item = t;
	if (t.project) {
		const p = ctx.projects.find(function (x) { return x.id === t.project; });
		if (!p) throw new Error('Hub: onbekend project ' + t.project);
		item = { label: t.label || p.title, note: t.note || p.short, href: 'portfolio/index.html#' + p.id, image: p.image, soort: 'project' };
	}
	const soort = item.soort || (item.image ? 'plek' : 'dienst');
	const merk = item.image
		? '<span class="hub-twijg-beeld" data-anker>' + duim(ctx, item.image) + '</span>'
		: '<span class="hub-twijg-stip" data-anker aria-hidden="true"></span>';
	return '<li class="hub-twijg hub-twijg--' + soort + '"><a href="' + h.esc(item.href) + '">'
		+ merk
		+ '<span class="hub-twijg-tekst"><span class="hub-twijg-naam">' + h.esc(item.label) + '</span>'
		+ (item.note ? '<span class="hub-twijg-wat">' + h.esc(item.note) + '</span>' : '')
		+ (soort === 'project' ? '<span class="sr-only"> (project)</span>' : '')
		+ '</span></a></li>';
}

function tak(pillar, i, ctx) {
	return '\t\t\t<li class="hub-tak" data-tak="' + pillar.id + '" data-pillar="' + pillar.id + '">\n'
		+ '\t\t\t\t<a class="hub-hoofd" href="' + h.esc(pillar.path) + '">'
		+ '<span class="hub-blok" data-anker aria-hidden="true">0' + (i + 1) + '</span>'
		+ '<span class="hub-hoofd-tekst"><span class="hub-naam">' + h.esc(pillar.label) + '</span>'
		+ '<span class="hub-wat">' + h.esc(pillar.hub.kort) + '</span></span></a>\n'
		+ '\t\t\t\t<ul class="hub-twijgen">\n\t\t\t\t\t'
		+ pillar.hub.takken.map(function (t) { return twijg(t, ctx); }).join('\n\t\t\t\t\t')
		+ '\n\t\t\t\t</ul>\n'
		+ '\t\t\t</li>';
}

function hub(ctx) {
	const pillars = VOLGORDE.map(function (id) { return ctx.pillars.find(function (p) { return p.id === id; }); });
	return '<div class="hub-kern" data-hub-kern>\n'
		+ '\t\t\t' + teken(pillars) + '\n'
		+ '\t\t\t<div class="hub-3d" data-hub-3d aria-hidden="true"></div>\n'
		+ '\t\t</div>\n'
		+ '\t\t<nav class="hub-takken" aria-label="Wat ik doe">\n'
		+ '\t\t\t<ol class="hub-lijst">\n'
		+ pillars.map(function (p, i) { return tak(p, i, ctx); }).join('\n') + '\n'
		+ '\t\t\t</ol>\n'
		+ '\t\t</nav>\n'
		+ '\t\t<svg class="hub-lijnen" data-hub-lijnen aria-hidden="true" focusable="false"></svg>';
}

// Alle beelden die de hub als miniatuur toont (build.js maakt ze vooraf)
function hubImages(pillars, projects) {
	const files = [];
	pillars.forEach(function (p) {
		((p.hub && p.hub.takken) || []).forEach(function (t) {
			if (t.image) files.push(t.image);
			if (t.project) {
				const project = projects.find(function (x) { return x.id === t.project; });
				if (project) files.push(project.image);
			}
		});
	});
	return Array.from(new Set(files));
}

module.exports = { hub: hub, hubImages: hubImages };
