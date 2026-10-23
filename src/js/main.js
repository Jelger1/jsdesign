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
import { initHub } from './hub.js';

const page = document.body.dataset.page;

initConsent(); // als eerste: de toestemmingsstatus moet vaststaan voordat er iets gemeten wordt
initUi();
initMail(); // e-mailadressen leesbaar maken (staan gecodeerd in de HTML, tegen spamrobots)
initCartUi();
initLightbox();
initNieuwsbrief(); // aanmelden onderaan elke pagina en op de bedanktpagina

initRails(); // productrails: op de home en de pijlerpagina Tastbaar; doet elders niets
initForms(); // contactformulier: op de contactpagina; doet elders niets
if (page === 'shop') initShop();
if (page === 'product') initProduct();
initRequest(); // aanvraagformulier: op productpagina's met maatwerk en op de printservicepagina
initKeychain(); // doet alleen iets op pagina's met de ontwerptool (productpagina) of de teaser (Tastbaar, oude homepage)
if (page === 'checkout') initCheckout();
if (page === 'thanks') initThanks();
if (page === 'confirm') initBevestig(); // links uit mails: nieuwsbrief bevestigen, "Ik heb gereageerd"
if (page === 'home') initHub(); // de hub bovenaan de home: lijnen, actieve tak en het teken in 3D
initTransition(); // als laatste: andere klik-afhandelingen gaan voor
