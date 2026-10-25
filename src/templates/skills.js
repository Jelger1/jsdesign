// Wat ik kan (data/skills.json): bewijs in plaats van een opsomming. Een klant koopt geen lijst vaardigheden, maar
// vertrouwen dat het goed komt. Daarom:
// - de home en de pijlerpagina's tonen een paar korte beweringen, elk met één zin bewijs uit een echte case en een link
//   naar het hoofdstuk (of het product) waar dat staat (skills.json > bewijzen, bewijsHome, bewijsPijler; bewijsLijst);
// - de Over-pagina toont alles, als rustige index per vak, met de onderdelen achter een uitklap (index).
// Ook het adres van een case staat hier, zodat pijler- en Over-pagina naar dezelfde plek linken.
const h = require('./helpers');
const c = require('./components');
const { hoofdstukAnker } = require('./case');

// Een project uit tier A heeft een eigen casepagina (portfolio/<id>.html), een project uit tier B alleen een anker op
// het portfolio (portfolio/#dekentje); zie projectUrl in helpers.js
function caseUrl(project, root) {
	return h.projectUrl(project, root);
}

// Waar een kaart van een project naartoe linkt, en wat er op de knop staat. Een case: "Lees de case". Kleiner werk
// zonder eigen case (tier B) met een vervolg (projects.json > vervolg): het product ("Bekijk het product") of het
// hoofdstuk van een case waarin het staat ("Lees de case"). Zonder vervolg de korte vermelding op het portfolio
// ("Kort bekijken"), zodat niemand op "Bekijk het project" klikt en bij twee zinnen uitkomt.
function vervolg(p, ctx, root) {
	if (p.tier === 'A') return { href: caseUrl(p, root), label: 'Lees de case' };
	const v = p.vervolg;
	if (v && v.product) {
		const product = ctx.products.find(function (x) { return x.id === v.product; });
		if (product) return { href: h.productUrl(product, root), label: 'Bekijk het product' };
	}
	if (v && v.project) {
		const doel = ctx.projects.find(function (x) { return x.id === v.project; });
		if (doel) return { href: caseUrl(doel, root) + (v.hoofdstuk ? hoofdstukAnker(doel, v.hoofdstuk) : ''), label: 'Lees de case' };
	}
	return { href: caseUrl(p, root), label: 'Kort bekijken' };
}

// Alle groepen in de volgorde van skills.json (de pijler null: in elk vak, zoals onderzoek en testen)
function groepen(ctx) {
	return (ctx.skills && ctx.skills.groepen) || [];
}

// Het gestippelde blokje van de open rij: niet hier, alles staat op de Over-pagina (zoals "Meer werk bekijken" op de
// pijlerpagina's)
const OPEN_BLOK = '<svg class="bewijs-blok" viewBox="-1 -1 58 37" aria-hidden="true" focusable="false"><polygon points="56,15.2 28.2,35 0,19.8 27.8,0"/></svg>';

// Waar een bewijs naartoe linkt: het hoofdstuk in de case waar het staat, of "Het verhaal" op de productpagina (daar
// staat het bewijs; bovenaan staan foto, prijs en aanvraag)
function bewijsUrl(b, ctx, root) {
	if (b.product) return h.productUrl(ctx.products.find(function (x) { return x.id === b.product; }), root) + '#story-heading';
	const p = ctx.projects.find(function (x) { return x.id === b.project; });
	return caseUrl(p, root) + (b.hoofdstuk ? hoofdstukAnker(p, b.hoofdstuk) : '');
}

// Een lijst beweringen. rijen: [{ id, pijler, label? }] (zonder label het label uit het bewijs; op de home de naam van
// de pijler). opts: { root, open: de linktekst van de laatste rij, naar alles op de Over-pagina }.
// De bewering is de link (in de h3) en dekt de hele rij; de projectnaam in het bewijs staat vet en de zin is de
// beschrijving van de link. Het label staat voor schermlezers in de kop, zodat kopnavigatie "Branding: Een huisstijl
// die meegroeit" leest.
function bewijsLijst(rijen, ctx, opts) {
	opts = opts || {};
	const root = opts.root || '';
	const alle = (ctx.skills && ctx.skills.bewijzen) || [];
	return '<ul class="bewijs-lijst">\n' + rijen.map(function (r) {
		const b = alle.find(function (x) { return x.id === r.id; });
		if (!b) throw new Error('skills.json: onbekend bewijs "' + r.id + '"');
		const label = h.esc(r.label || b.label);
		return '\t<li class="bewijs" data-pillar="' + h.esc(r.pijler) + '">'
			+ '<p class="bewijs-label" aria-hidden="true">' + label + '</p>'
			+ '<h3 class="bewijs-kop"><span class="sr-only">' + label + ': </span>'
			+ '<a class="bewijs-link" href="' + bewijsUrl(b, ctx, root) + '" aria-describedby="bewijs-' + h.esc(b.id) + '">' + h.esc(b.kop) + '</a></h3>'
			+ '<p class="bewijs-tekst" id="bewijs-' + h.esc(b.id) + '">' + h.esc(b.tekst).replace(/\{([^}]+)\}/, '<strong>$1</strong>') + '</p>'
			+ '<span class="bewijs-pijl" aria-hidden="true"></span></li>';
	}).join('\n')
		+ (opts.open ? '\n\t<li class="bewijs bewijs--open"><p class="bewijs-label" aria-hidden="true">' + OPEN_BLOK + '</p>'
			+ '<p class="bewijs-kop"><a class="bewijs-link" href="' + root + 'over.html#kunde">' + h.esc(opts.open) + '</a></p>'
			+ '<span class="bewijs-pijl" aria-hidden="true"></span></li>' : '')
		+ '\n</ul>';
}

// De vakken op de Over-pagina: eerst wat in elk vak terugkomt (onderzoek, concepting, testen), dan per pijler
const VAKKEN = [{ id: null, naam: 'In elk vak' }, { id: 'branding' }, { id: 'digitaal' }, { id: 'tastbaar' }];

// Eén voorbeeld per groep: het eerste bewijsproject dat in dit vak nog niet genoemd is (anders het eerste), zodat
// hetzelfde project niet steeds terugkomt. De korte naam is de titel tot de dubbele punt ("Klankstad"). Breed staat er
// één kopregel boven de voorbeelden; het label "Bijvoorbeeld" is er dan alleen voor schermlezers (over.css).
function voorbeeld(groep, ctx, root, gebruikt) {
	const projecten = (groep.bewijs || []).map(function (id) { return ctx.projects.find(function (p) { return p.id === id; }); }).filter(Boolean);
	if (!projecten.length) return '';
	const p = projecten.find(function (x) { return gebruikt.indexOf(x.id) === -1; }) || projecten[0];
	gebruikt.push(p.id);
	return '<p class="kunde-voorbeeld"><span class="kunde-voorbeeld-label">Bijvoorbeeld</span> <a href="' + caseUrl(p, root) + '">' + h.esc(p.title.split(':')[0]) + '</a></p>';
}

// Alles op de Over-pagina: per vak een kop, en per groep het blokje als knop (components.js > blokKnop, in de kleur van
// het vak) met de onderdelen achter een uitklap, en één voorbeeld. Het verloop #kunde-drie kleurt het blokje van de
// groepen die in elk vak terugkomen in de drie pijlerkleuren.
function index(ctx, opts) {
	opts = opts || {};
	const root = opts.root || '';
	const alle = groepen(ctx);
	return '<svg class="kunde-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs><linearGradient id="kunde-drie" x1="0" x2="1" y1="0" y2="0">'
		+ '<stop offset="0.34" stop-color="#f10067"/><stop offset="0.34" stop-color="#03bcca"/><stop offset="0.67" stop-color="#03bcca"/><stop offset="0.67" stop-color="#f3fffd"/>'
		+ '</linearGradient></defs></svg>\n'
		+ '<div class="kunde-index">\n'
		+ '\t<p class="kunde-index-kop" aria-hidden="true"><span>Onderdeel</span><span>Voorbeeld uit mijn werk</span></p>\n'
		+ VAKKEN.map(function (v) {
			const eigen = alle.filter(function (g) { return (g.pijler || null) === v.id; });
			if (!eigen.length) return '';
			const pijler = v.id && ctx.pillars.find(function (p) { return p.id === v.id; });
			const gebruikt = [];
			return '\t<div class="kunde-vak"' + (v.id ? ' data-pillar="' + v.id + '"' : '') + '>\n'
				+ '\t\t<h3 class="kunde-vak-naam">' + h.esc(pijler ? pijler.label : v.naam) + '</h3>\n'
				+ '\t\t<ul class="kunde-groepen">\n' + eigen.map(function (g) {
					return '\t\t\t<li class="kunde-groep"><details class="kunde-open uitklap"><summary>' + c.blokKnop
						+ '<span class="kunde-groep-naam">' + h.esc(g.groep) + '</span></summary>'
						+ '<ul class="kunde-items">' + g.items.map(function (i) { return '<li>' + h.esc(i) + '</li>'; }).join('') + '</ul></details>'
						+ voorbeeld(g, ctx, root, gebruikt) + '</li>';
				}).join('\n') + '\n\t\t</ul>\n'
				+ '\t</div>';
		}).filter(Boolean).join('\n') + '\n</div>';
}

module.exports = { caseUrl: caseUrl, vervolg: vervolg, groepen: groepen, bewijsLijst: bewijsLijst, index: index };
