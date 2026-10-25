// Oude ankers (MERGEPLAN §6.6): een link als jelgers3d.nl/#miners of jelgersieler.nl/#projecten komt via de redirectlaag
// op de nieuwe home uit, met het anker erachter. Bestaat dat anker hier niet, dan stuurt dit script door naar waar die
// sectie nu staat. De kaart staat in data/legacy.json > ankers; de home zet hem in de pagina (#anker-kaart). Een lege
// waarde: bovenaan de home blijven (het anker gaat uit de adresbalk). Bestaat het id wel, dan gebeurt er niets: eigen
// ankers worden nooit gekaapt (check.js controleert ook dat geen alias een id op de home is).
export function initAnker() {
	const kaartEl = document.getElementById('anker-kaart');
	const naam = decodeURIComponent(location.hash.slice(1));
	if (!kaartEl || !naam || document.getElementById(naam)) return;
	let kaart;
	try { kaart = JSON.parse(kaartEl.textContent); } catch (e) { return; }
	if (!Object.prototype.hasOwnProperty.call(kaart, naam)) return;
	const doel = kaart[naam];
	if (doel) location.replace(doel);
	else history.replaceState(null, '', location.pathname + location.search);
}
