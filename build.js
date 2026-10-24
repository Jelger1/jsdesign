// Bouwt de complete site in dist/ vanuit data/ en src/.
// Gebruik: npm run build   (of dubbelklik build.bat)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { processImages, slugify } = require('./tools/images');
const layout = require('./src/templates/layout');
const homePage = require('./src/templates/home');
const shopPage = require('./src/templates/shop');
const productPage = require('./src/templates/product');
const { checkoutPage, thanksPage } = require('./src/templates/checkout');
const { categoryPage, productsFor } = require('./src/templates/category');
const { privacyPage, termsPage, notFoundPage, printServicePage, newsletterPage, repliedPage, contactPage } = require('./src/templates/pages');
const { pillarPage } = require('./src/templates/pillar');
const overPage = require('./src/templates/over');
const { hubImages } = require('./src/templates/hub');
const portfolioPage = require('./src/templates/portfolio');
const discovery = require('./src/templates/discovery');
const h = require('./src/templates/helpers');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
// Bouwmodus. "preview" (standaard, ook lokaal): niets wordt geïndexeerd en er laadt geen analytics.
// "productie": alleen voor jsdesign.nl zelf, gezet door de deploy-workflow (repo-variabele SITE_MODE).
const MODE = process.env.SITE_MODE === 'productie' ? 'productie' : 'preview';
// De map waarin de site staat: "/" op jsdesign.nl, "/jsdesign/" in de preview op jelger1.github.io (alleen nodig
// voor 404.html, de enige pagina met adressen vanaf de hoofdmap)
const BASE = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
// Git Bash op Windows maakt van "/jsdesign/" ongemerkt "C:/Program Files/Git/jsdesign/"
if (!BASE.startsWith('/')) {
	console.error('\nBASE_PATH moet met "/" beginnen, maar is "' + BASE + '". In Git Bash: zet MSYS_NO_PATHCONV=1 ervoor, of gebruik PowerShell.\n');
	process.exit(1);
}
const SALE_TYPES = ['cart', 'external', 'request', 'soon'];
// Volgorde is van belang: later wint van eerder. Alles wordt samengevoegd tot één css/styles.css.
const CSS_FILES = ['fonts.css', 'tokens.css', 'reset.css', 'styles.css', 'components.css', 'product.css', 'shop.css', 'checkout.css', 'home.css', 'hub.css', 'pages.css', 'pijler.css', 'over.css', 'portfolio.css', 'keychain.css', 'header.css', 'footer.css', 'brand.css'];

// Lettertypen die elke pagina vooraf laadt: de koppen (Saira) en de lopende tekst (DM Sans). De rest staat in fonts.css.
const PRELOAD_FONTS = ['saira-latin.woff2', 'dm-sans-latin.woff2'];

function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
	} catch (e) {
		throw new Error('Kan ' + file + ' niet lezen: ' + e.message);
	}
}

function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

function write(file, content) {
	const target = path.join(DIST, file);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, content);
}

// Controleert de data. Fouten stoppen de build, waarschuwingen en todo's niet.
function validate(products, reviews, site) {
	const errors = [], warnings = [], todos = [];
	const ids = new Set();

	products.forEach(function (p, i) {
		const where = 'products.json > "' + (p.id || '#' + i) + '"';
		if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(where + ': id ontbreekt of bevat andere tekens dan a-z, 0-9 en -');
		if (ids.has(p.id)) errors.push(where + ': id komt dubbel voor');
		ids.add(p.id);
		if (!p.name) errors.push(where + ': name ontbreekt');
		if (!site.types[p.type]) errors.push(where + ': onbekend type "' + p.type + '" (voeg toe in site.json > types)');
		if (!site.collections[p.collection]) errors.push(where + ': onbekende collection "' + p.collection + '"');
		if (SALE_TYPES.indexOf(p.sale) === -1) errors.push(where + ': sale moet een van ' + SALE_TYPES.join(', ') + ' zijn');
		if (p.sale === 'cart' && !(p.variants && p.variants.length)) errors.push(where + ': een product in de winkelwagen heeft minstens één variant met prijs nodig');
		(p.variants || []).forEach(function (v) {
			if (!v.id || typeof v.price !== 'number' || !(v.price > 0)) errors.push(where + ': variant zonder id of geldige prijs');
		});
		if ((p.variants || []).length > 1 && p.variants.some(function (v) { return !v.label; })) errors.push(where + ': bij meerdere varianten heeft elke variant een label nodig');
		if (p.sale === 'external' && !p.externalUrl) errors.push(where + ': externalUrl ontbreekt');
		if (p.personalize && (p.sale !== 'cart' || (p.variants || []).length !== 1)) errors.push(where + ': een product met "personalize" moet sale "cart" hebben en precies één variant');
		if (p.intro) {
			if (!(p.intro.price > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(p.intro.until || '')) errors.push(where + ': "intro" heeft een price en een until nodig (datum als "2026-12-31")');
			else if ((p.variants || []).length !== 1) errors.push(where + ': een introductieprijs kan alleen bij precies één variant (anders is onduidelijk welke prijs verlaagd wordt)');
			else if (p.intro.price >= p.variants[0].price) errors.push(where + ': de introductieprijs moet lager zijn dan de gewone prijs in "variants"');
		}
		if (p.video) {
			if (!p.video.file || !fs.existsSync(path.join(ROOT, 'assets/video', p.video.file))) errors.push(where + ': video "' + (p.video.file || '') + '" staat niet in assets/video/ (maak hem met "npm run video")');
			if (!p.video.poster) errors.push(where + ': video heeft een "poster" nodig (een foto uit assets/ als voorbeeld)');
			if (!p.video.alt) warnings.push(where + ': video zonder "alt", beschrijf kort wat er te zien is');
		}
		if (!(p.images && p.images.length)) errors.push(where + ': minstens één afbeelding nodig');
		(p.images || []).forEach(function (image) {
			if (!fs.existsSync(path.join(ROOT, 'assets', image.file))) errors.push(where + ': afbeelding assets/' + image.file + ' bestaat niet');
			if (!image.alt) warnings.push(where + ': alt-tekst ontbreekt bij ' + image.file);
			const s = image.subject;
			if (!s) warnings.push(where + ': geen "subject" bij ' + image.file + ', de foto wordt vanuit het midden bijgesneden');
			else if (!Array.isArray(s) || s.length !== 4 || s.some(function (n) { return typeof n !== 'number' || n < 0 || n > 100; }) || s[0] >= s[2] || s[1] >= s[3]) {
				errors.push(where + ': "subject" bij ' + image.file + ' moet [links, boven, rechts, onder] zijn, in procenten van 0 tot 100');
			}
		});
		if (!p.seo || !p.seo.title || !p.seo.description) errors.push(where + ': seo.title en seo.description zijn verplicht');
		else {
			const volledigeTitel = p.seo.title.length + site.name.length + 3; // Google toont "<titel> | <sitenaam>"
			if (volledigeTitel > 60) warnings.push(where + ': de titel wordt met " | ' + site.name + '" ' + volledigeTitel + ' tekens; Google kapt af rond 60');
			if (p.seo.description.length > 160) warnings.push(where + ': seo.description is ' + p.seo.description.length + ' tekens (richtlijn: max 160)');
		}
		if (!p.material) todos.push(p.name + ': materiaal');
	});

	products.forEach(function (p) {
		(p.related || []).forEach(function (id) {
			if (!ids.has(id) || id === p.id) errors.push('products.json > "' + p.id + '": related "' + id + '" bestaat niet');
		});
	});
	(site.categoryPages || []).forEach(function (cat) {
		if (!/^[a-z0-9-]+$/.test(cat.slug || '')) errors.push('site.json > categoryPages: slug "' + cat.slug + '" mag alleen a-z, 0-9 en - bevatten');
		if (!productsFor(cat, products).length) errors.push('site.json > categoryPages > "' + cat.slug + '": geen enkel product past bij dit filter');
		if ((cat.seoTitle || '').length + site.name.length + 3 > 60) warnings.push('site.json > categoryPages > "' + cat.slug + '": de titel wordt met " | ' + site.name + '" te lang; Google kapt af rond 60 tekens');
		if ((cat.seoDescription || '').length > 160) warnings.push('site.json > categoryPages > "' + cat.slug + '": seoDescription is ' + cat.seoDescription.length + ' tekens (richtlijn: max 160)');
	});
	reviews.forEach(function (r) {
		(r.products || []).forEach(function (id) {
			if (!ids.has(id)) errors.push('reviews.json > ' + r.author + ': product "' + id + '" bestaat niet');
		});
	});

	// Een ID in het verkeerde veld breekt niets zichtbaars, er wordt dan alleen stilletjes niets gemeten
	const analytics = site.analytics || {};
	const idFormats = { gtm: ['GTM-', /^GTM-[A-Z0-9]+$/], ga4: ['G-', /^G-[A-Z0-9]+$/], googleAds: ['AW-', /^AW-\d+$/] };
	Object.keys(idFormats).forEach(function (key) {
		if (analytics[key] && !idFormats[key][1].test(analytics[key])) warnings.push('site.json > analytics.' + key + ': "' + analytics[key] + '" is geen geldig ID (dat begint met ' + idFormats[key][0] + ')');
	});
	if (!(site.backend && site.backend.url)) warnings.push('site.json > backend.url ontbreekt: bestellingen en formulieren kunnen dan nergens heen');
	if (analytics.gtm && !analytics.ga4 && !analytics.googleAds) warnings.push('site.json > analytics: zonder ga4 of googleAds vraagt de cookiemelding nergens toestemming voor, dus tags in Tag Manager die toestemming nodig hebben starten nooit');
	if (!analytics.gtm && (analytics.ga4 || analytics.googleAds)) warnings.push('site.json > analytics: Google Analytics en Google Ads worden alleen via Tag Manager geladen; zonder gtm meet de site niets');
	if ('adsConversionLabel' in analytics) warnings.push('site.json > analytics.adsConversionLabel wordt niet meer gebruikt: stel de Google Ads-conversie in Tag Manager in (gebeurtenis generate_lead)');

	return { errors: errors, warnings: warnings, todos: todos };
}

// De pijlers (data/pillars.json): elk een eigen pagina, titel en omschrijving binnen de grenzen van Google
function validatePillars(pillars, site, report) {
	const paths = new Set();
	pillars.forEach(function (p) {
		const where = 'pillars.json > "' + p.id + '"';
		if (!/^[a-z0-9-]+\.html$/.test(p.path || '')) report.errors.push(where + ': path moet eindigen op .html en alleen a-z, 0-9 en - bevatten');
		if (paths.has(p.path)) report.errors.push(where + ': path komt dubbel voor');
		paths.add(p.path);
		if (!p.seo || !p.seo.title || !p.seo.description) report.errors.push(where + ': seo.title en seo.description zijn verplicht');
		else {
			const titel = p.seo.title.length + site.name.length + 3;
			if (titel > 60) report.errors.push(where + ': de titel wordt met " | ' + site.name + '" ' + titel + ' tekens (maximaal 60)');
			if (p.seo.description.length > 155) report.errors.push(where + ': seo.description is ' + p.seo.description.length + ' tekens (maximaal 155)');
		}
	});
}

// De inhoud van de pijlerpagina's (pillars.json > pagina) en de vaardigheden (data/skills.json). Een case of bewijs
// dat (nog) niet in projects.json staat, slaat de pagina over: dat is een waarschuwing. Een vraag mag op de hele site
// maar één keer voorkomen (home, webshop, categoriepagina's en pijlers), anders spreken de FAQ-gegevens elkaar tegen.
function validatePagina(pillars, projects, site, skills, report) {
	const projectIds = projects.map(function (p) { return p.id; });
	const pillarIds = pillars.map(function (p) { return p.id; });
	const vragen = new Map();
	function vraag(q, where) {
		const key = String(q || '').trim().toLowerCase();
		if (vragen.has(key)) report.errors.push(where + ': de vraag "' + q + '" staat ook al bij ' + vragen.get(key));
		else vragen.set(key, where);
	}
	(site.homeFaq || []).forEach(function (item) { vraag(item.q, 'site.json > homeFaq'); });
	(site.faq || []).forEach(function (item) { vraag(item.q, 'shop.json > faq'); });
	(site.categoryPages || []).forEach(function (cat) { (cat.faq || []).forEach(function (item) { vraag(item.q, 'shop.json > categoryPages > "' + cat.slug + '"'); }); });
	pillars.forEach(function (p) {
		const where = 'pillars.json > "' + p.id + '" > pagina';
		const pagina = p.pagina;
		if (!pagina || !pagina.kort || !pagina.werkwoord) {
			report.errors.push(where + ': kort en werkwoord zijn verplicht');
			return;
		}
		const woorden = pagina.kort.split(/\s+/).length;
		if (woorden < 35 || woorden > 70) report.warnings.push(where + ' > kort: ' + woorden + ' woorden (richtlijn: 40 tot 60)');
		[['diensten', ['naam', 'tekst']], ['aanpak', ['stap', 'tekst']], ['faq', ['q', 'a']]].forEach(function (lijst) {
			const items = pagina[lijst[0]];
			if (!Array.isArray(items) || !items.length) report.errors.push(where + ': ' + lijst[0] + ' moet een lijst met minstens één item zijn');
			else if (items.some(function (item) { return lijst[1].some(function (key) { return !item[key]; }); })) report.errors.push(where + ' > ' + lijst[0] + ': elk item heeft ' + lijst[1].join(' en ') + ' nodig');
		});
		if (Array.isArray(pagina.aanpak) && (pagina.aanpak.length < 3 || pagina.aanpak.length > 6)) report.errors.push(where + ' > aanpak: 3 tot 6 stappen (de trap past er dan op)');
		(pagina.cases || []).forEach(function (id) {
			if (projectIds.indexOf(id) === -1) report.warnings.push(where + ' > cases: project "' + id + '" staat (nog) niet in projects.json en wordt overgeslagen');
		});
		(pagina.faq || []).forEach(function (item) { vraag(item.q, where + ' > faq'); });
	});
	const groepen = (skills && skills.groepen) || [];
	if (!groepen.length) report.errors.push('skills.json: groepen ontbreekt of is leeg');
	groepen.forEach(function (g, i) {
		const where = 'skills.json > groepen > "' + (g.groep || '#' + i) + '"';
		if (!g.groep || !Array.isArray(g.items) || !g.items.length) report.errors.push(where + ': groep en minstens één item zijn verplicht');
		if (g.pijler !== null && pillarIds.indexOf(g.pijler) === -1) report.errors.push(where + ': pijler moet een id uit pillars.json zijn, of null voor elk project');
		(g.bewijs || []).forEach(function (id) {
			if (projectIds.indexOf(id) === -1) report.warnings.push(where + ' > bewijs: project "' + id + '" staat (nog) niet in projects.json en wordt overgeslagen');
		});
	});
	((skills && skills.gereedschap) || []).forEach(function (g, i) {
		if (!g.groep || !Array.isArray(g.items) || !g.items.length) report.errors.push('skills.json > gereedschap > #' + (i + 1) + ': groep en minstens één item zijn verplicht');
	});
}

// De projecten (data/projects.json) op de portfoliopagina: het id is het anker (portfolio/#rolduc), de pijler een id
// uit pillars.json. Of de afbeelding bestaat (met de juiste hoofdletters), controleert de afbeeldingspipeline.
function validateProjects(projects, pillars, report) {
	const ids = new Set();
	const pillarIds = pillars.map(function (p) { return p.id; });
	projects.forEach(function (p, i) {
		const where = 'projects.json > "' + (p.id || '#' + i) + '"';
		if (!/^[a-z0-9-]+$/.test(p.id || '')) report.errors.push(where + ': id ontbreekt of bevat andere tekens dan a-z, 0-9 en -');
		if (ids.has(p.id)) report.errors.push(where + ': id komt dubbel voor');
		ids.add(p.id);
		if (pillarIds.indexOf(p.pillar) === -1) report.errors.push(where + ': onbekende pillar "' + p.pillar + '" (moet een id uit pillars.json zijn)');
		if (!p.title || !p.text || !p.image || !p.tags) report.errors.push(where + ': title, tags, text en image zijn verplicht');
		if (!p.alt) report.warnings.push(where + ': alt-tekst ontbreekt bij ' + p.image);
		if (p.url && !/^https:\/\//.test(p.url)) report.errors.push(where + ': url moet met https:// beginnen');
	});
}

// De hub op de home (pillars.json > hub): per pijler een korte omschrijving en twijgen. Een twijg is een project uit
// projects.json ({ "project": "rolduc" }) of een eigen link ({ "label", "href" }, eventueel met "note" en "image").
// Beelden moeten in assets/ staan, met de juiste hoofdletters (de online build draait op Linux).
function validateHub(pillars, projects, report) {
	const projectIds = projects.map(function (p) { return p.id; });
	const assets = fs.readdirSync(path.join(ROOT, 'assets'));
	pillars.forEach(function (p) {
		const where = 'pillars.json > "' + p.id + '" > hub';
		if (!p.hub || !p.hub.kort || !Array.isArray(p.hub.takken) || !p.hub.takken.length) {
			report.errors.push(where + ': kort en minstens één twijg (takken) zijn verplicht');
			return;
		}
		p.hub.takken.forEach(function (t, i) {
			const twijg = where + ' > takken[' + i + ']';
			if (t.project) {
				if (projectIds.indexOf(t.project) === -1) report.errors.push(twijg + ': onbekend project "' + t.project + '" (moet een id uit projects.json zijn)');
			} else if (!t.label || !t.href) {
				report.errors.push(twijg + ': een twijg zonder project heeft label en href nodig');
			}
			if (t.href && /^(?:https?:)?\/\//.test(t.href)) report.errors.push(twijg + ': href moet een pagina van de site zijn, geen extern adres');
			if (t.image && assets.indexOf(t.image) === -1) report.errors.push(twijg + ': afbeelding "' + t.image + '" staat niet in assets/ (let op hoofdletters)');
		});
	});
}

// Introductieprijs ("intro": { "price": 49.95, "until": "2026-12-31" }). Zolang die loopt is dat de echte prijs:
// op de kaart, op de productpagina, in de winkelwagen, in de productfeed en in schema.org. Is de datum voorbij,
// dan rekent de site vanaf de eerstvolgende build vanzelf weer de gewone prijs uit "variants".
// De ACM staat geen doorgestreepte "van"-prijs toe die niet echt is gevraagd; daarom noemt de pagina alleen
// "introductieprijs tot <datum>, daarna <prijs>". Die gewone prijs moet je daarna dus ook echt rekenen.
function applyIntro(products, today) {
	products.forEach(function (product) {
		if (!product.intro) return;
		product.intro.active = product.intro.until >= today; // ISO-datums zijn als tekst te vergelijken
		if (!product.intro.active) return;
		product.variants.forEach(function (variant) {
			variant.regularPrice = variant.price;
			variant.price = product.intro.price;
		});
		if (!product.badge) product.badge = 'Introductieprijs';
	});
}

// Zet ?v=<versie> achter relatieve imports, zodat browsers na een update nooit oude en nieuwe modules mengen
function versionImports(source, version) {
	return source.replace(/(from\s+|import\s+|import\s*\(\s*)(['"])(\.\/[^'"]+?\.js)\2/g, function (m, keyword, quote, spec) {
		return keyword + quote + spec + '?v=' + version + quote;
	});
}

function catalogData(products, images) {
	const catalog = {};
	products.forEach(function (p) {
		catalog[p.id] = {
			name: p.name,
			url: h.productUrl(p),
			image: h.imgPath(images, p.images[0].file, 400, '', true),
			sale: p.sale,
			variants: p.variants || [],
			related: p.related || [],
			personalize: Boolean(p.personalize),
			wish: Boolean(p.wish)
		};
	});
	return catalog;
}

function buildCatalog(products, images) {
	return 'export default ' + JSON.stringify(catalogData(products, images), null, '\t') + ';\n';
}

// Voor de Supabase-functie "formulier" (supabase/functions/formulier): bedrijfsgegevens, de actuele prijzen en de
// productfoto's voor de mails, zodat de bevestiging precies dezelfde prijzen noemt als de site. Eén bron: data/*.json.
// Het e-mailadres staat er net als op de pagina's gecodeerd in (zie mailCode in src/templates/helpers.js).
// De slogan is die van de webshop (shop.json), niet de merkregel van JS Design: de mails gaan over bestellingen.
function buildWinkel(products, images, site, shop) {
	const a = site.address || {};
	const catalogus = catalogData(products, images);
	products.forEach(function (p) { catalogus[p.id].mailImage = 'assets/mail/' + mailImageName(p, images); });
	return JSON.stringify({
		winkel: {
			naam: site.name, eigenaar: site.owner, mail: h.mailCode(site.email), url: site.url, instagram: site.instagram, slogan: shop.slogan,
			adres: [a.street, [a.postcode, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
			kvk: site.kvk, btw: site.btw, ophaalplaats: site.pickupLocation, levertijd: site.delivery.leadTimeLong
		},
		catalogus: catalogus,
		uploads: site.uploads || null // welke bestanden bij een aanvraag mogen (types, aantal, grootte, bewaartermijn)
	});
}

// Plaatjes voor die mails: het logo als PNG (Gmail toont geen SVG) en per product een kleine JPG van de uitsnede
// (klassiek Outlook toont geen WebP). Een plaatje wordt alleen opnieuw gemaakt als de bron nieuwer is.
function mailImageName(product, images) {
	return path.basename(h.imgPath(images, product.images[0].file, 400, '', true)).replace(/\.\w+$/, '.jpg');
}

async function buildMailImages(products, images) {
	const sharp = require('sharp');
	const dir = path.join(DIST, 'assets/mail');
	fs.mkdirSync(dir, { recursive: true });
	const jobs = [{
		src: path.join(ROOT, 'assets/brand/js-icon.svg'), out: 'logo.png',
		make: function () { return sharp(this.src, { density: 300 }).resize({ width: 88 }).png({ compressionLevel: 9 }); } // 2x van 44x41
	}].concat(products.map(function (p) {
		return {
			src: path.join(DIST, h.imgPath(images, p.images[0].file, 400, '', true)), out: mailImageName(p, images),
			make: function () { return sharp(this.src).resize(120, 150, { fit: 'cover' }).flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }); }
		};
	}));
	for (const job of jobs) {
		const out = path.join(dir, job.out);
		if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(job.src).mtimeMs) continue;
		await job.make().toFile(out);
	}
	const keep = new Set(jobs.map(function (job) { return job.out; }));
	fs.readdirSync(dir).forEach(function (f) { if (!keep.has(f)) fs.rmSync(path.join(dir, f)); });
}

// Kleine vierkante miniaturen voor de hub op de home (96 en 192 px). De kleinste gewone variant is 400 px breed, en de
// hub toont er zo'n tien tegelijk. Ze staan in een eigen map (assets/duim): assets/img ruimt de beeldpijplijn zelf op,
// en daar zouden ze bij elke build verdwijnen. Geeft per bronbestand de varianten terug: [{ file, w }].
async function buildThumbs(files) {
	const sharp = require('sharp');
	const dir = path.join(DIST, 'assets/duim');
	fs.mkdirSync(dir, { recursive: true });
	const thumbs = {};
	for (const file of files) {
		const src = path.join(ROOT, 'assets', file);
		if (!fs.existsSync(src)) throw new Error('Miniatuur voor de hub: bestand niet gevonden in assets/: ' + file);
		thumbs[file] = [96, 192].map(function (w) { return { file: slugify(file) + '-t' + w + '.webp', w: w }; });
		for (const v of thumbs[file]) {
			const out = path.join(dir, v.file);
			if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
			await sharp(src).resize(v.w, v.w, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 74, effort: 5 }).toFile(out);
		}
	}
	// Miniaturen van beelden die de hub niet meer toont, gaan weg
	const keep = new Set(Object.keys(thumbs).flatMap(function (f) { return thumbs[f].map(function (v) { return v.file; }); }));
	fs.readdirSync(dir).forEach(function (f) { if (!keep.has(f)) fs.rmSync(path.join(dir, f)); });
	return thumbs;
}

// Het JS-teken voor browsers en Google: de SVG's uit assets/brand, plus PNG's waar SVG niet werkt (app-icoon op de
// iPhone, favicon in de zoekresultaten, logo in de gestructureerde gegevens). Bron is de tegel: teken op Midnight Slate.
async function buildBrandImages() {
	const sharp = require('sharp');
	const src = path.join(ROOT, 'assets/brand');
	const dir = path.join(DIST, 'assets/brand');
	fs.mkdirSync(dir, { recursive: true });
	fs.readdirSync(src).filter(function (f) { return /\.svg$/i.test(f); }).forEach(function (f) {
		fs.copyFileSync(path.join(src, f), path.join(dir, f));
	});
	const tegelPad = path.join(src, 'js-icon-tegel.svg');
	const tegel = fs.readFileSync(tegelPad, 'utf8');
	const vierkant = Buffer.from(tegel.replace('rx="112"', 'rx="0"')); // de iPhone rondt de hoeken zelf af
	const jobs = [
		{ out: 'apple-touch-icon.png', input: vierkant, size: 180 },
		{ out: 'favicon-96.png', input: Buffer.from(tegel), size: 96 }, // Google wil een veelvoud van 48 px
		{ out: 'js-logo-512.png', input: vierkant, size: 512 }
	];
	for (const job of jobs) {
		const out = path.join(dir, job.out);
		if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(tegelPad).mtimeMs) continue;
		await sharp(job.input, { density: 300 }).resize(job.size, job.size).png({ compressionLevel: 9 }).toFile(out);
	}
}

// Productfeed voor Google Merchant Center (dist/feed.xml): één regel per bestelbare variant.
function buildFeed(products, images, site, shop) {
	function x(value) { return h.esc(value).replace(/'/g, '&apos;'); }
	const items = [];
	products.filter(function (p) { return p.sale === 'cart'; }).forEach(function (p) {
		p.variants.forEach(function (v) {
			const multi = p.variants.length > 1;
			items.push('\t\t<item>\n'
				+ '\t\t\t<g:id>' + x(p.id + (multi ? '-' + v.id : '')) + '</g:id>\n'
				+ (multi ? '\t\t\t<g:item_group_id>' + x(p.id) + '</g:item_group_id>\n' : '')
				+ '\t\t\t<g:title>' + x(p.name + (multi ? ' – ' + v.label : '')) + '</g:title>\n'
				+ '\t\t\t<g:description>' + x(p.description.join(' ')) + '</g:description>\n'
				+ '\t\t\t<g:link>' + x(site.url + '/' + h.productUrl(p)) + '</g:link>\n'
				+ '\t\t\t<g:image_link>' + x(site.url + '/' + h.imgPath(images, p.images[0].file, 1200, '', true)) + '</g:image_link>\n'
				+ p.images.slice(1, 10).map(function (image) { return '\t\t\t<g:additional_image_link>' + x(site.url + '/' + h.imgPath(images, image.file, 1200, '', true)) + '</g:additional_image_link>\n'; }).join('')
				+ '\t\t\t<g:price>' + v.price.toFixed(2) + ' EUR</g:price>\n'
				+ '\t\t\t<g:availability>in_stock</g:availability>\n'
				+ '\t\t\t<g:condition>new</g:condition>\n'
				+ '\t\t\t<g:brand>' + x(site.name) + '</g:brand>\n'
				+ '\t\t\t<g:identifier_exists>no</g:identifier_exists>\n'
				+ '\t\t\t<g:product_type>' + x(site.types[p.type].label) + '</g:product_type>\n'
				+ (p.material ? '\t\t\t<g:material>' + x(p.material) + '</g:material>\n' : '')
				+ '\t\t</item>');
		});
	});
	return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n\t<channel>\n'
		+ '\t\t<title>' + x(site.name) + '</title>\n\t\t<link>' + x(site.url) + '</link>\n\t\t<description>' + x(shop.slogan) + '</description>\n'
		+ items.join('\n') + '\n\t</channel>\n</rss>\n';
}

async function build() {
	const started = Date.now();
	// Merk en bedrijf (site.json) en de webshop (shop.json) zijn aparte bestanden. Templates lezen ze als één
	// object "site"; bij dezelfde sleutel wint het merk (site.json).
	const brand = readJson('data/site.json');
	const shop = readJson('data/shop.json');
	const site = Object.assign({}, shop, brand);
	const pillars = readJson('data/pillars.json');
	const projects = readJson('data/projects.json');
	const products = readJson('data/products.json');
	const reviews = readJson('data/reviews.json');
	const skills = readJson('data/skills.json');

	const today = new Date().toISOString().slice(0, 10);
	const report = validate(products, reviews, site); // eerst controleren, daarna pas prijzen aanpassen
	validatePillars(pillars, site, report);
	validateProjects(projects, pillars, report);
	validateHub(pillars, projects, report);
	validatePagina(pillars, projects, site, skills, report);
	if (report.errors.length) {
		console.error('\nBuild gestopt, los eerst deze fouten op:\n - ' + report.errors.join('\n - ') + '\n');
		process.exit(1);
	}
	applyIntro(products, today);

	// 1. Afbeeldingen (incrementeel)
	// Elke foto die een pagina als deelbeeld gebruikt, krijgt een OG-versie (1200x630). Eerder kreeg de foto bovenaan
	// de 3D-printservice er geen, waardoor die pagina og:image ".../og/undefined" had.
	const ogFor = products.map(function (p) { return p.images[0].file; })
		.concat(site.defaultOgImage, site.homeImages.hero.file, site.homeImages.about.file);
	// Elke productfoto krijgt een uitsnede met het product in het midden (zie "subject" in products.json)
	const crops = {};
	products.forEach(function (p) {
		p.images.forEach(function (image) {
			crops[image.file] = { subject: image.subject || null, background: image.background || null, fill: image.fill || null };
		});
	});
	// Alleen foto's die de site echt toont worden verwerkt en meegestuurd
	const used = products.flatMap(function (p) { return p.images.map(function (image) { return image.file; }); })
		.concat(products.filter(function (p) { return p.video; }).map(function (p) { return p.video.poster; })) // voorbeeldbeeld van de video
		.concat(site.defaultOgImage, site.homeImages.hero.file, site.homeImages.about.file)
		.concat(projects.map(function (p) { return p.image; }))
		.concat(hubImages(pillars, projects));
	const imageResult = await processImages({
		srcDir: path.join(ROOT, 'assets'),
		outDir: path.join(DIST, 'assets/img'),
		ogDir: path.join(DIST, 'assets/og'),
		ogFor: ogFor,
		only: used,
		crops: crops,
		frame: site.productFrame
	});
	const images = imageResult.manifest;

	// 2. Oude gegenereerde bestanden opruimen (de afbeeldingen blijven staan)
	['css', 'js', 'producten', 'portfolio', 'ai'].forEach(function (dir) {
		fs.rmSync(path.join(DIST, dir), { recursive: true, force: true });
	});

	// 3. CSS en JS, met een versienummer tegen verouderde browsercache
	const css = CSS_FILES.map(function (f) { return read('src/css/' + f); }).join('\n');
	const jsFiles = fs.readdirSync(path.join(ROOT, 'src/js')).filter(function (f) { return f.endsWith('.js'); });
	const catalog = buildCatalog(products, images);
	const hash = crypto.createHash('md5').update(css).update(catalog);
	jsFiles.forEach(function (f) { hash.update(read('src/js/' + f)); });
	// De 3D-modules (src/3d/) worden met Three.js erbij gebundeld tot één compact bestand per module.
	// De site laadt ze pas wanneer ze nodig zijn, zodat gewone pagina's er niet zwaarder van worden.
	const bundles = fs.readdirSync(path.join(ROOT, 'src/3d')).filter(function (f) { return f.endsWith('.js'); });
	bundles.forEach(function (f) { hash.update(read('src/3d/' + f)); });
	// Gedeelde stukken van de 3D-modules (src/3d/lib/) worden geen eigen bundel, maar tellen wel mee voor het versienummer
	const lib = path.join(ROOT, 'src/3d/lib');
	if (fs.existsSync(lib)) fs.readdirSync(lib).filter(function (f) { return f.endsWith('.js'); }).forEach(function (f) { hash.update(read('src/3d/lib/' + f)); });
	hash.update(JSON.parse(read('node_modules/three/package.json')).version);
	const version = hash.digest('hex').slice(0, 8);

	write('css/styles.css', css);
	write('js/catalog.js', catalog);
	write('js/winkel.json', buildWinkel(products, images, site, shop));
	jsFiles.forEach(function (f) { write('js/' + f, versionImports(read('src/js/' + f), version)); });
	if (bundles.length) {
		// Met splitting komt Three.js in één gedeeld bestand (js/3d-<hash>.js) dat de hub en de sleutelhanger allebei
		// gebruiken: wie van de home naar Tastbaar gaat, downloadt het maar één keer. De modules zelf houden hun naam
		// (js/hub-3d.js, js/keychain-3d.js); het gedeelde stuk heeft een inhoudshash en hoeft dus geen ?v= te hebben.
		require('esbuild').buildSync({
			entryPoints: bundles.map(function (f) { return path.join(ROOT, 'src/3d', f); }),
			outdir: path.join(DIST, 'js'),
			entryNames: '[name]', chunkNames: '3d-[hash]', splitting: true,
			bundle: true, minify: true, format: 'esm', target: 'es2020', legalComments: 'eof', logLevel: 'warning'
		});
	}

	// 4. Statische bestanden
	fs.readdirSync(path.join(ROOT, 'assets')).filter(function (f) { return /\.svg$/i.test(f); }).forEach(function (f) {
		fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(DIST, 'assets', f));
	});
	await buildBrandImages();

	// Video's worden niet door de build gecomprimeerd (daar is ffmpeg voor nodig): "npm run video" maakt de
	// webversie in assets/video/, hier gaat alleen de kopie naar dist/
	const videoDir = path.join(ROOT, 'assets/video');
	if (fs.existsSync(videoDir)) {
		fs.mkdirSync(path.join(DIST, 'assets/video'), { recursive: true });
		fs.readdirSync(videoDir).filter(function (f) { return /\.(mp4|webm)$/i.test(f); }).forEach(function (f) {
			fs.copyFileSync(path.join(videoDir, f), path.join(DIST, 'assets/video', f));
		});
	}

	fs.mkdirSync(path.join(DIST, 'assets/fonts'), { recursive: true });
	fs.readdirSync(path.join(ROOT, 'assets/fonts')).filter(function (f) { return /\.(woff2|json)$/i.test(f); }).forEach(function (f) { // .json = lettertype voor de 3D-letters
		fs.copyFileSync(path.join(ROOT, 'assets/fonts', f), path.join(DIST, 'assets/fonts', f));
	});

	await buildMailImages(products, images);
	const thumbs = await buildThumbs(hubImages(pillars, projects));

	// 5. Pagina's
	const byId = {};
	products.forEach(function (p) { byId[p.id] = p; });
	const ctx = {
		site: site, brand: brand, shop: shop, pillars: pillars, projects: projects, products: products, reviews: reviews, images: images, byId: byId,
		skills: skills,
		thumbs: thumbs,
		version: version, year: new Date().getFullYear(), mode: MODE, base: BASE,
		fonts: PRELOAD_FONTS,
		partials: {
			header: read('src/partials/header.html'),
			footer: read('src/partials/footer.html'),
			curtain: read('src/partials/curtain.html'),
			cart: read('src/partials/cart.html'),
			logo: read('src/partials/logo.svg').trim()
		}
	};

	// Alle pagina's van de site. Volgorde: home, de drie pijlers, Over, webshop, overige pagina's, producten.
	// De pijler Tastbaar krijgt na zijn eigen inhoud de webshopsecties uit src/pages/tastbaar.html.
	const tastbaarTemplate = read('src/pages/tastbaar.html');
	const pages = [homePage(ctx, read('src/pages/index.html'))]
		.concat(pillars.map(function (p) { return pillarPage(p, ctx, tastbaarTemplate); }))
		.concat([overPage(ctx, read('src/pages/over.html'))])
		.concat([portfolioPage(ctx), contactPage(ctx, read('src/pages/contact.html'))])
		.concat([shopPage(ctx)])
		.concat((site.categoryPages || []).map(function (cat) { return categoryPage(cat, ctx); }))
		.concat([checkoutPage(ctx), thanksPage(ctx), printServicePage(ctx, read('src/pages/3d-printservice.html')), privacyPage(ctx, read('src/pages/privacy.html')), termsPage(ctx, read('src/pages/voorwaarden.html')), notFoundPage(ctx), newsletterPage(ctx), repliedPage(ctx)])
		.concat(products.map(function (p) { return productPage(p, ctx); }));
	const seen = new Set();
	pages.forEach(function (page) {
		if (seen.has(page.path)) throw new Error('Twee pagina\'s met hetzelfde pad: ' + page.path);
		seen.add(page.path);
		write(page.path, layout(page, ctx));
	});

	// 6. Voor zoekmachines en AI-assistenten: sitemap.xml, robots.txt, llms.txt en de kennisbank van Jelly-bot
	write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
		+ pages.filter(function (p) { return !p.noindex; }).map(function (p) {
			const loc = p.path === 'index.html' ? '' : p.path.replace(/(^|\/)index\.html$/, '$1');
			return '\t<url><loc>' + site.url + '/' + loc + '</loc><lastmod>' + today + '</lastmod></url>';
		}).join('\n') + '\n</urlset>\n');
	write('feed.xml', buildFeed(products, images, site, shop));
	write('robots.txt', discovery.robots(site, MODE));
	write('llms.txt', discovery.llms(ctx, false));
	write('llms-full.txt', discovery.llms(ctx, true));
	write('ai/kennis.json', JSON.stringify(discovery.kennis(ctx), null, '\t') + '\n');
	// Bouwmarker: bij de livegang is hiermee te controleren dat jsdesign.nl echt de juiste build serveert
	write('build.txt', 'versie=' + version + '\nmodus=' + MODE + '\ncommit=' + (process.env.GITHUB_SHA || 'lokaal') + '\ngebouwd=' + new Date().toISOString() + '\n');

	// 7. Verslag
	console.log('\n✓ ' + pages.length + ' pagina\'s gebouwd in dist/ (' + products.length + ' producten, versie ' + version + ', modus ' + MODE + (MODE === 'preview' ? ': niet indexeerbaar, geen analytics' : '') + ')');
	console.log('✓ Afbeeldingen: ' + imageResult.processed + ' nieuw verwerkt, ' + imageResult.total + ' totaal');
	if (report.warnings.length) console.log('\nWaarschuwingen:\n - ' + report.warnings.join('\n - '));
	// Een introductieprijs is een belofte met een datum: laat zien wanneer hij afloopt of dat hij voorbij is
	products.filter(function (p) { return p.intro; }).forEach(function (p) {
		const days = Math.round((new Date(p.intro.until) - new Date(today)) / 86400000);
		if (!p.intro.active) console.log('\nDe introductieprijs van de ' + p.name + ' is voorbij (' + p.intro.until + '): de site rekent nu ' + h.euro(p.variants[0].price) + '.');
		else if (days <= 14) console.log('\nLet op: de introductieprijs van de ' + p.name + ' loopt nog ' + days + ' dag(en), tot ' + p.intro.until + '. Daarna wordt het vanzelf ' + h.euro(p.variants[0].regularPrice) + '.');
	});
	const address = site.address || {};
	if (!address.street && !address.onRequest) {
		console.log('\n⚠ WETTELIJK VERPLICHT: vul je vestigingsadres in bij data/site.json > address (street en postcode).\n  Nu staat alleen "' + (address.city || '') + '" in de footer, de privacyverklaring en de algemene voorwaarden.');
	} else if (address.street && !address.postcode) {
		console.log('\nLet op: bij data/site.json > address ontbreekt je postcode nog. Het adres staat nu als "' + address.street + ', ' + (address.city || '') + '" op de site.');
	}
	if (report.todos.length) console.log('\nNog in te vullen in data/products.json:\n - ' + report.todos.join('\n - '));
	console.log('\nKlaar in ' + ((Date.now() - started) / 1000).toFixed(1) + 's. Zet je wijzigingen op GitHub (branch main) om ze live te zetten.\n');
}

build().catch(function (error) {
	console.error('\nBuild mislukt: ' + error.message + '\n');
	process.exit(1);
});
