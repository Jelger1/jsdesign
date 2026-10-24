// Het JS-teken (assets/brand/js-icon.svg) in zijn drie delen, één per pijler: aqua rechtsboven (Digitaal), raspberry
// linksboven (Branding) en de lichte J onder (Tastbaar). Het teken is getekend op een isometrisch raster: RICHTING is
// de as waarlangs elk deel naar buiten schuift als het teken opengewerkt staat (30°, 150° en 270°).
// Gebruikt door de hero op de home (src/templates/held.js) en "Je bent hier" op de pijlerpagina's (pillar.js).

// De delen in tekenvolgorde
const DELEN = {
	digitaal: '<path fill="#03bcca" d="M244.05,41.54l-56.7,39.7-9.35-4.97-21.23-11.27-13.63-7.23c-.8-.43-1.77-.37-2.52.15l-12.5,8.75-.19-.1-57.35-30.45,13.72-9.6,17.93-12.56c23.79-16.66,54.91-18.57,80.56-4.95l15.74,8.36,14.93,7.93,21.23,11.27,9.35,4.97Z"/>',
	tastbaar: '<path fill="#f3fffd" d="M253,149.99l-56.77,39.75-27.91,19.54-17.95,12.57c-23.79,16.66-54.91,18.57-80.56,4.95l-23.48-12.46-27.9-14.81-9.35-4.96,56.72-39.72,9.35,4.96,26.6,14.12c.8.43,1.77.37,2.52-.15l23.47-16.43c1.48-1.03,1.34-3.27-.25-4.11l-24.41-12.96-9.35-4.96-21.23-11.27,56.77-39.75,21.23,11.27,9.35,4.96,27.9,14.81,65.28,34.65Z"/>',
	branding: '<polygon fill="#f10067" points="114.31 76.36 57.54 116.11 0 85.57 56.77 45.81"/>'
};
const MIDDEN = { x: 126.5, y: 117.9 }; // midden van het teken (253 x 235,83)
const RICHTING = { digitaal: 30, branding: 150, tastbaar: 270 };

module.exports = { DELEN: DELEN, MIDDEN: MIDDEN, RICHTING: RICHTING };
