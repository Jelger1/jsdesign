/* Jelly-bot: de server achter de chat op jelgersdesign.nl (src/js/chat.js). Draait op Render (jellybot-backend,
   gratis, Frankfurt) vanuit de map server/ van deze repo; zie docs/jellybot.md voor uitrol en terugdraaien.
   De OpenAI-sleutel staat alleen hier: lokaal in server/.env, op Render bij Environment. Nooit in de site.
   De kennis komt van de site zelf (/ai/kennis.json en de sitemap) en wordt elk half uur opnieuw opgehaald: wat op de
   site verandert, weet de bot dus vanzelf, zonder nieuwe uitrol. Gesprekken worden niet opgeslagen of gelogd. */

require('dotenv').config();
const express = require('express');
const L = require('./logica');

/* ---------- Instellingen ---------- */
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const OPENAI_TIMEOUT_MS = 30000;
const OP_RENDER = Boolean(process.env.RENDER); // Render zet deze variabele zelf
const SITE = (process.env.SITE_URL || 'https://jelgersdesign.nl').replace(/\/+$/, '');
const HERKOMST = (process.env.ALLOWED_ORIGINS || SITE + ',' + SITE.replace('://', '://www.'))
	.split(',').map(function (s) { return s.trim().replace(/\/+$/, ''); }).filter(Boolean);
const KENNIS_VERS_MS = 30 * 60000;

// Rem op misbruik en kosten. Alles in het werkgeheugen: na een herstart begint de telling opnieuw. De echte grens
// is de maandlimiet in het OpenAI-dashboard (docs/jellybot.md).
const LIMIET = {
	perMinuut: 12, // per IP-adres
	perDag: 120, // per IP-adres
	totaalPerDag: Number(process.env.DAGLIMIET) || 1500 // alle bezoekers samen
};

if (!OPENAI_API_KEY) console.error('OPENAI_API_KEY ontbreekt. Zet hem in server/.env (lokaal) of bij Render > Environment.');

const app = express();
app.set('trust proxy', 1); // Render zet de bezoeker in X-Forwarded-For; nodig voor req.ip
app.disable('x-powered-by');

/* ---------- CORS: alleen de site zelf (en lokaal elke localhost-poort) ---------- */
app.use(function (req, res, next) {
	const herkomst = req.headers.origin;
	if (L.herkomstToegestaan(herkomst, HERKOMST, !OP_RENDER)) {
		res.header('Access-Control-Allow-Origin', herkomst);
		res.header('Vary', 'Origin');
	}
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.header('Access-Control-Max-Age', '86400');
	if (req.method === 'OPTIONS') return res.sendStatus(204);
	next();
});

app.use(express.json({ limit: '50kb' }));

/* ---------- De kennis van de site ---------- */
let kennis = null; // { data, links, datum, opgehaald }
let bezigMetLaden = null;

async function haal(url) {
	const r = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Jelly-bot (' + SITE + ')' } });
	if (!r.ok) throw new Error(url + ' gaf ' + r.status);
	return r.text();
}

async function laadKennis() {
	const data = JSON.parse(await haal(SITE + '/ai/kennis.json'));
	let urls = [];
	try {
		const index = L.locs(await haal(SITE + '/sitemap.xml'));
		const delen = await Promise.all(index.filter(function (u) { return /\.xml$/.test(u); }).map(function (u) { return haal(u).then(L.locs); }));
		urls = index.filter(function (u) { return !/\.xml$/.test(u); }).concat(...delen);
	} catch (e) {
		console.error('Sitemap niet geladen; alleen de adressen uit de kennisbank gelden als link.', e.message);
	}
	kennis = {
		data: data,
		links: L.toegestaneLinks(data, urls),
		datum: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' }),
		opgehaald: Date.now()
	};
	console.log('Kennis geladen: ' + kennis.links.size + ' adressen.');
}

// Haalt de kennis op als die er nog niet is of ouder is dan een half uur. Lukt dat niet, dan blijft de vorige gelden.
function verseKennis() {
	if (kennis && Date.now() - kennis.opgehaald < KENNIS_VERS_MS) return Promise.resolve(kennis);
	if (!bezigMetLaden) {
		bezigMetLaden = laadKennis()
			.catch(function (e) { console.error('Kennis ophalen mislukt:', e.message); })
			.finally(function () { bezigMetLaden = null; });
	}
	return kennis ? Promise.resolve(kennis) : bezigMetLaden.then(function () { return kennis; });
}

/* ---------- Limieten ---------- */
const tellers = new Map(); // ip -> { minuut, minuutStart, dag }
let totaal = 0;
let dag = new Date().toDateString();

function limiet(req, res, next) {
	const nu = Date.now();
	const vandaag = new Date().toDateString();
	if (vandaag !== dag) { dag = vandaag; totaal = 0; tellers.clear(); }
	const ip = req.ip || 'onbekend';
	let t = tellers.get(ip);
	if (!t) { t = { minuut: 0, minuutStart: nu, dag: 0 }; tellers.set(ip, t); }
	if (nu - t.minuutStart > 60000) { t.minuut = 0; t.minuutStart = nu; }
	if (totaal >= LIMIET.totaalPerDag) {
		return res.status(503).json({ error: 'Jelly-bot heeft vandaag al heel veel vragen beantwoord. Probeer het morgen opnieuw, of stuur Jelger een bericht via de contactpagina.' });
	}
	if (t.minuut >= LIMIET.perMinuut || t.dag >= LIMIET.perDag) {
		return res.status(429).json({ error: 'Rustig aan, je stuurt veel berichten achter elkaar. Probeer het over een minuutje opnieuw.' });
	}
	t.minuut++; t.dag++; totaal++;
	next();
}

/* ---------- Routes ---------- */
// Health check: voor Render, en de chat wekt hiermee de server zodra iemand de knop aanwijst
app.get(['/', '/api/health'], function (req, res) {
	res.json({ ok: true, service: 'jellybot', klaar: Boolean(OPENAI_API_KEY && kennis), kennis: kennis ? kennis.datum : null });
	verseKennis();
});

app.post('/api/chat', function (req, res, next) {
	// Alleen vanaf de site. Dat houdt geen vastberaden misbruiker tegen (een Origin is na te maken), wel de rest.
	if (!L.herkomstToegestaan(req.headers.origin, HERKOMST, !OP_RENDER)) return res.status(403).json({ error: 'Niet toegestaan.' });
	next();
}, limiet, async function (req, res) {
	if (!OPENAI_API_KEY) return res.status(503).json({ error: 'Jelly-bot is nog niet klaar. Stuur Jelger een bericht via de contactpagina.' });
	const berichten = L.schoonBerichten(req.body && req.body.messages);
	if (!berichten) return res.status(400).json({ error: 'Ongeldig verzoek.' });
	const k = await verseKennis();
	if (!k) return res.status(503).json({ error: 'Jelly-bot kan even niet bij zijn kennis. Probeer het zo opnieuw, of kijk op de contactpagina.' });

	const prompt = L.bouwPrompt(k.data, { site: SITE, datum: k.datum, pagina: L.paginaUrl(req.body.pagina, SITE, k.links) });
	try {
		const r = await fetch(OPENAI_BASE_URL + '/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_API_KEY },
			body: JSON.stringify({
				model: OPENAI_MODEL,
				messages: [{ role: 'system', content: prompt }].concat(berichten),
				max_tokens: 500,
				temperature: 0.4
			}),
			signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS)
		});
		if (!r.ok) {
			const fout = await r.text();
			if (r.status === 401) console.error('OpenAI weigert de sleutel (401). Zet een nieuwe in OPENAI_API_KEY.');
			else console.error('OpenAI gaf ' + r.status + ':', fout.slice(0, 500));
			return res.status(502).json({ error: r.status === 429
				? 'Jelly-bot is even druk bezet. Probeer het zo opnieuw.'
				: 'Er ging iets mis bij het maken van een antwoord. Probeer het later opnieuw.' });
		}
		const data = await r.json();
		const ruw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
		if (!ruw || !ruw.trim()) return res.status(502).json({ error: 'Sorry, ik kon geen antwoord bedenken. Probeer je vraag anders te stellen.' });
		const schoon = L.filterLinks(ruw.trim(), k.links);
		if (schoon.weg) console.log('Links uit een antwoord gehaald: ' + schoon.weg);
		res.json({ reply: schoon.tekst });
	} catch (e) {
		if (e.name === 'TimeoutError' || e.name === 'AbortError') {
			console.error('OpenAI reageerde niet binnen ' + OPENAI_TIMEOUT_MS / 1000 + ' s');
			return res.status(504).json({ error: 'Het antwoord duurt te lang. Probeer het opnieuw.' });
		}
		console.error('Serverfout:', e.message);
		res.status(500).json({ error: 'Serverfout. Probeer het later opnieuw.' });
	}
});

app.use('/api', function (req, res) { res.status(404).json({ error: 'Niet gevonden.' }); });

// Ongeldige of te grote JSON: een nette fout in plaats van een HTML-pagina
// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
	if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Ongeldige JSON.' });
	if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Bericht te groot.' });
	console.error('Onverwachte fout:', err.message);
	res.status(500).json({ error: 'Serverfout.' });
});

/* ---------- Start ---------- */
app.listen(PORT, function () {
	console.log('Jelly-bot draait op poort ' + PORT + ' (model ' + OPENAI_MODEL + ', sleutel ' + (OPENAI_API_KEY ? 'aanwezig' : 'ONTBREEKT') + ', site ' + SITE + ')');
	verseKennis();
});
