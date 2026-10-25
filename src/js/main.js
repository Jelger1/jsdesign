// Startpunt van alle JavaScript. Elke pagina laadt dit bestand;
// paginaspecifieke onderdelen starten op basis van <body data-page="...">.
import { initConsent } from './consent.js';
import { initUi } from './ui.js';
import { initCartUi } from './cart-ui.js';
import { initLightbox } from './lightbox.js';
import { initRails } from './rail.js';
import { initForms } from './forms.js';
import { initProduct } from './product.js';
import { initRequest } from './request.js';
import { initShop } from './shop.js';
import { initCheckout, initThanks } from './checkout.js';
import { initKeychain } from './keychain.js';
import { initMail } from './mail.js';
import { initBevestig } from './bevestig.js';
import { initNieuwsbrief } from './nieuwsbrief.js';
import { initTransition } from './transition.js';
import { initHeld } from './held.js';
import { initRand } from './rand.js';
import { initTrap } from './trap.js';
import { initTegel } from './tegel.js';
import { initWijzer } from './wijzer.js';
import { initKijk } from './kijk.js';
import { initHerroep } from './herroep.js';

const page = document.body.dataset.page;

initConsent(); // als eerste: de toestemmingsstatus moet vaststaan voordat er iets gemeten wordt
initUi();
initMail(); // e-mailadressen leesbaar maken (staan gecodeerd in de HTML, tegen spamrobots)
initCartUi();
initLightbox();
initRand(); // de tekenrand op werktegels (home, pijlerpagina's, cases, portfolio); doet elders niets
initTrap(); // de werkwijze die zich opbouwt (pijlerpagina's en Over); doet elders niets
initNieuwsbrief(); // aanmelden onderaan elke pagina en op de bedanktpagina

initRails(); // productrails: op de home en de pijlerpagina Tastbaar; doet elders niets
initForms(); // contactformulier: op de contactpagina; doet elders niets
initHerroep(); // bestelling herroepen: op herroepen.html; doet elders niets
if (page === 'shop') initShop();
if (page === 'product') initProduct();
initRequest(); // aanvraagformulier: op productpagina's met maatwerk en op de printservicepagina
initKeychain(); // doet alleen iets op pagina's met de ontwerptool (productpagina) of de teaser (Tastbaar, oude homepage)
if (page === 'checkout') initCheckout();
if (page === 'thanks') initThanks();
if (page === 'confirm') initBevestig(); // links uit mails: nieuwsbrief bevestigen, "Ik heb gereageerd"
if (page === 'home') initHeld(); // de hero bovenaan de home: aangewezen pijler en het teken in 3D
if (page === 'pillar') initTegel(); // "Je bent hier" op een smal scherm: de aankomst als de tegel in beeld komt
if (page === 'pillar' || page === 'case') initWijzer(); // de sectiewijzer en de hoofdstukwijzer
initKijk(); // het kijklabel bij de muis boven projectbeelden en productfoto's; na de winkel en de rails, die de kaarten neerzetten
initTransition(); // als laatste: andere klik-afhandelingen gaan voor
