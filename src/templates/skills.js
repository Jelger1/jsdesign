// Wat ik kan (data/skills.json): vaardigheden per groep, elk met projecten als bewijs, en het gereedschap. De
// pijlerpagina's tonen de groepen van hun pijler, de Over-pagina alles en de home een korte versie.
// Ook het adres van een case staat hier, zodat pijler- en Over-pagina naar dezelfde plek linken.
const h = require('./helpers');

// Projecten met een eigen casepagina (portfolio/<id>.html). Tot die pagina's er zijn, linkt een case naar zijn anker
// op het portfolio (portfolio/#rolduc).
const CASEPAGINAS = [];

function caseUrl(id, root) {
	return (root || '') + 'portfolio/' + (CASEPAGINAS.indexOf(id) > -1 ? id + '.html' : '#' + id);
}

// De groepen van een pijler, gevolgd door de algemene groepen (pijler null: onderzoek, concepting, testen). Zonder pijler:
// alle groepen in de volgorde van skills.json.
function groepen(ctx, pijler) {
	const alle = (ctx.skills && ctx.skills.groepen) || [];
	if (!pijler) return alle;
	return alle.filter(function (g) { return g.pijler === pijler; })
		.concat(alle.filter(function (g) { return !g.pijler; }));
}

// De projecten die een groep bewijzen, als links. Een id die (nog) niet in projects.json staat, wordt overgeslagen.
function bewijs(groep, ctx, root, max) {
	return (groep.bewijs || []).map(function (id) { return ctx.projects.find(function (p) { return p.id === id; }); })
		.filter(Boolean).slice(0, max || 2)
		.map(function (p) { return '<a href="' + caseUrl(p.id, root) + '">' + h.esc(p.title) + '</a>'; });
}

function chips(items, max) {
	return '<ul class="kunde-chips">' + items.slice(0, max || items.length).map(function (item) {
		return '<li>' + h.esc(item) + '</li>';
	}).join('') + '</ul>';
}

// Een lijst met groepen. opts: { heading: 'h3', root, max (aantal chips), bewijs (true: "Bijvoorbeeld: ..."), pijler
// (de groepen van deze pijler krijgen het blokje in de pijlerkleur) }
function lijst(lijstGroepen, ctx, opts) {
	opts = opts || {};
	const heading = opts.heading || 'h3';
	return '<ul class="kunde-lijst">\n' + lijstGroepen.map(function (g) {
		const links = opts.bewijs ? bewijs(g, ctx, opts.root) : [];
		return '\t<li class="kunde"' + (g.pijler ? ' data-pillar="' + h.esc(g.pijler) + '"' : '') + '>'
			+ '<' + heading + ' class="kunde-naam">' + h.esc(g.groep) + '</' + heading + '>'
			+ chips(g.items, opts.max)
			+ (links.length ? '<p class="kunde-bewijs">Bijvoorbeeld: ' + links.join(' · ') + '</p>' : '')
			+ '</li>';
	}).join('\n') + '\n</ul>';
}

module.exports = { caseUrl: caseUrl, groepen: groepen, lijst: lijst, chips: chips };
