// Jelly-bot: de AI-assistent rechtsonder op elke pagina (behalve afrekenen). De chat praat met de server op Render
// (server/, zie docs/jellybot.md), die met OpenAI praat; hier staat dus geen sleutel. De server onthoudt niets: het
// gesprek blijft in deze browsertab (sessionStorage) tot je die sluit, zodat het meegaat als je doorklikt.
// De gratis server slaapt na een kwartier zonder bezoek. Hij wordt pas gewekt als je de knop aanwijst of de chat
// opent: wie de chat niet gebruikt, maakt ook geen verbinding met de server (zo staat het in de privacyverklaring).
// Links in een antwoord heeft de server al nagekeken (alleen adressen van de site en uit de kennisbank); links naar
// de site zelf openen in hetzelfde tabblad, met de paginaovergang, andere in een nieuw tabblad.
import { esc } from './util.js';

const ENDPOINT = (document.documentElement.dataset.chat || '').replace(/\/+$/, '');
const OPSLAG = 'jd-chat-v1';
const MAX_BERICHTEN = 16; // zoveel neemt de server ook mee
const TRAAG_MS = 5000; // daarna de melding dat de server wakker wordt
const OPGEVEN_MS = 75000; // wakker worden (tot een minuut) plus het antwoord
const WEKKEN_NA_MS = 10 * 60000;
const GEEN_VERBINDING = 'Ik kan even geen verbinding maken. Probeer het zo opnieuw, of stuur Jelger een bericht via de contactpagina.';
const TE_LANG = 'Het antwoord blijft uit. Probeer het zo opnieuw, of stuur Jelger een bericht via de contactpagina.';

const ICOON = {
	sluit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
	opnieuw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/></svg>',
	stuur: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

// Voorbeeldvragen bij een leeg gesprek, passend bij de pagina. Alleen vragen waar de kennisbank antwoord op heeft.
function tips() {
	const page = document.body.dataset.page;
	const pijler = document.body.dataset.pillar;
	if (page === 'product') return ['Hoe snel heb ik dit in huis?', 'Hoe werkt bestellen?', 'Kan ik het ophalen in Kerkrade?'];
	if (page === 'shop' || page === 'category' || pijler === 'tastbaar') return ['Kan ik mijn eigen 3D-bestand laten printen?', 'Hoe werkt bestellen?', 'Wat kost verzenden?'];
	if (pijler === 'branding') return ['Wat kun je voor mijn huisstijl doen?', 'Welke brandingprojecten heb je gedaan?', 'Hoe begin ik?'];
	if (pijler === 'digitaal') return ['Wat voor websites maak je?', 'Wat is een interactief verhaal?', 'Hoe begin ik?'];
	return ['Wat doet JelgersDesign?', 'Kan ik mijn eigen 3D-bestand laten printen?', 'Hoe begin ik?'];
}

// De vragen die de bezoeker in de chat stelde (voor het contactformulier, als hij doorklikt met "Stuur je vraag naar
// Jelger": forms.js zet ze alvast in het berichtveld, waar hij ze kan aanpassen voor hij verstuurt)
export function chatVragen() {
	return lees().berichten.filter(function (b) { return b.role === 'user'; }).map(function (b) { return b.content; });
}

function lees() {
	try {
		const g = JSON.parse(sessionStorage.getItem(OPSLAG));
		if (g && Array.isArray(g.berichten)) return { berichten: g.berichten.slice(-MAX_BERICHTEN), open: g.open === true };
	} catch (e) { /* geen opslag (privévenster): het gesprek blijft dan alleen op deze pagina */ }
	return { berichten: [], open: false };
}

export function initChat() {
	if (!ENDPOINT || document.body.dataset.page === 'checkout') return;

	const naam = (document.querySelector('meta[property="og:site_name"]') || {}).content || 'JelgersDesign';
	const canoniek = document.querySelector('link[rel="canonical"]');
	const eigen = new Set([location.hostname]);
	if (canoniek) {
		const host = new URL(canoniek.href).hostname.replace(/^www\./, '');
		eigen.add(host);
		eigen.add('www.' + host);
	}
	const root = document.body.dataset.root || '';
	const avatar = root + 'assets/brand/jelly-bot-192.webp';
	const pijler = document.body.dataset.pillar;
	const naarJelger = root + 'contact.html?bron=jellybot' + (pijler ? '&onderwerp=' + encodeURIComponent(pijler) : '');
	const welkom = 'Hoi! Ik ben **Jelly-bot**, de AI-assistent van ' + naam + '. Vraag me gerust iets over branding, websites, 3D-prints of de webshop.';

	const chat = document.createElement('div');
	chat.className = 'chat';
	chat.innerHTML = ''
		+ '<section class="chat-venster" id="chat-venster" role="dialog" aria-labelledby="chat-naam" tabindex="-1" hidden>'
		+ '<div class="chat-kop">'
		+ '<img src="' + esc(avatar) + '" alt="" width="44" height="44" decoding="async">'
		+ '<div class="chat-wie"><p class="chat-naam" id="chat-naam">Jelly-bot</p><p class="chat-sub">AI-assistent · kan fouten maken</p></div>'
		+ '<button type="button" class="chat-actie" data-chat-opnieuw aria-label="Nieuw gesprek" title="Nieuw gesprek">' + ICOON.opnieuw + '</button>'
		+ '<button type="button" class="chat-actie" data-chat-sluit aria-label="Sluit de chat" title="Sluiten">' + ICOON.sluit + '</button>'
		+ '</div>'
		+ '<div class="chat-log" aria-label="Gesprek met Jelly-bot" tabindex="0"></div>'
		+ '<div class="chat-tips"></div>'
		+ '<p class="chat-status" role="status"></p>'
		+ '<a class="chat-mens" href="' + esc(naarJelger) + '" hidden>Liever een mens? <strong>Stuur je vraag naar Jelger</strong></a>'
		+ '<p class="sr-only" aria-live="polite" data-chat-voorlezen></p>'
		+ '<form class="chat-invoer" novalidate>'
		+ '<label class="sr-only" for="chat-vraag">Je vraag aan Jelly-bot</label>'
		+ '<input id="chat-vraag" type="text" maxlength="1000" autocomplete="off" enterkeyhint="send" placeholder="Stel je vraag…">'
		+ '<button type="submit" aria-label="Verstuur">' + ICOON.stuur + '</button>'
		+ '</form>'
		+ '<p class="chat-voet">Zet geen persoonlijke gegevens in de chat. <a href="' + esc(root) + 'privacy.html#chat">Hoe de chat werkt</a></p>'
		+ '</section>'
		+ '<button type="button" class="chat-knop" aria-expanded="false" aria-controls="chat-venster">'
		+ '<img src="' + esc(avatar) + '" alt="" width="42" height="42" decoding="async" loading="lazy">'
		+ '<span class="chat-knop-tekst">Vraag het Jelly-bot</span>'
		+ '</button>';
	document.body.appendChild(chat);

	const venster = chat.querySelector('.chat-venster');
	const knop = chat.querySelector('.chat-knop');
	const knopTekst = chat.querySelector('.chat-knop-tekst');
	const log = chat.querySelector('.chat-log');
	const tipsEl = chat.querySelector('.chat-tips');
	const mens = chat.querySelector('.chat-mens');
	const status = chat.querySelector('.chat-status');
	const voorlezen = chat.querySelector('[data-chat-voorlezen]');
	const form = chat.querySelector('.chat-invoer');
	const invoer = chat.querySelector('#chat-vraag');
	const klein = window.matchMedia('(max-width: 600px)');
	const muis = window.matchMedia('(hover: hover)');

	let gesprek = lees();
	let bezig = false;
	let gewekt = 0;

	function bewaar() {
		try { sessionStorage.setItem(OPSLAG, JSON.stringify({ berichten: gesprek.berichten.slice(-MAX_BERICHTEN), open: gesprek.open })); } catch (e) { /* zie lees() */ }
	}

	// De server wakker maken; hooguit eens per tien minuten
	function wek() {
		if (Date.now() - gewekt < WEKKEN_NA_MS) return;
		gewekt = Date.now();
		fetch(ENDPOINT + '/api/health').catch(function () { /* geeft niet: de vraag zelf wekt hem ook */ });
	}

	/* ---------- Tekst van de bot naar veilige HTML ---------- */
	function link(url, label) {
		let u;
		try { u = new URL(url.replace(/&amp;/g, '&')); } catch (e) { return label; }
		if (eigen.has(u.hostname)) {
			return '<a href="' + esc(root + u.pathname.replace(/^\//, '') + u.search + u.hash) + '" data-chat-link>' + label + '</a>';
		}
		return '<a href="' + esc(u.href) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
	}

	function inline(regel) {
		return regel.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/(?:(?!&quot;|&lt;|&gt;)[^\s<>"])+/g, function (heel, label, mdUrl) {
			if (mdUrl) return link(mdUrl, label);
			const staart = (heel.match(/[.,;:!?)]+$/) || [''])[0];
			const url = heel.slice(0, heel.length - staart.length);
			return link(url, url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + staart;
		}).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	}

	function opmaak(tekst) {
		let html = '';
		let lijst = false;
		esc(tekst).split('\n').forEach(function (regel) {
			const item = regel.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
			if (item) {
				if (!lijst) { html += '<ul>'; lijst = true; }
				html += '<li>' + inline(item[1]) + '</li>';
				return;
			}
			if (lijst) { html += '</ul>'; lijst = false; }
			if (regel.trim()) html += '<p>' + inline(regel) + '</p>';
		});
		return html + (lijst ? '</ul>' : '');
	}

	/* ---------- Berichten in beeld ---------- */
	function naarOnder() { log.scrollTop = log.scrollHeight; }

	function toon(rol, tekst) {
		const el = document.createElement('div');
		el.className = 'chat-bericht chat-' + (rol === 'user' ? 'jij' : rol === 'fout' ? 'fout' : 'bot');
		if (rol === 'user') el.textContent = tekst;
		else el.innerHTML = opmaak(tekst) + (rol === 'fout' ? '<p><a href="' + esc(root) + 'contact.html">Naar de contactpagina</a></p>' : '');
		log.appendChild(el);
		naarOnder();
		return el;
	}

	// Bij een leeg gesprek de voorbeeldvragen, daarna de weg naar Jelger zelf
	function toonTips() {
		tipsEl.innerHTML = gesprek.berichten.length ? '' : tips().map(function (t) {
			return '<button type="button" class="chat-tip">' + esc(t) + '</button>';
		}).join('');
		tipsEl.hidden = !tipsEl.firstChild;
		mens.hidden = !gesprek.berichten.length;
	}

	function begin() {
		log.innerHTML = '';
		toon('assistant', welkom);
		gesprek.berichten.forEach(function (b) { toon(b.role, b.content); });
		toonTips();
	}

	/* ---------- Open en dicht ---------- */
	function zet(open, focus) {
		venster.hidden = !open;
		knop.setAttribute('aria-expanded', String(open));
		knopTekst.textContent = open ? 'Sluit de chat' : 'Vraag het Jelly-bot';
		gesprek.open = open;
		bewaar();
		if (open) {
			wek();
			naarOnder();
			// Op een telefoon niet meteen het toetsenbord omhoog: dan zie je de welkomsttekst en de tips niet
			if (focus) (muis.matches ? invoer : venster).focus();
		} else if (focus) {
			knop.focus();
		}
	}

	knop.addEventListener('click', function () { zet(venster.hidden, true); });
	knop.addEventListener('pointerenter', wek);
	knop.addEventListener('focus', wek);
	chat.querySelector('[data-chat-sluit]').addEventListener('click', function () { zet(false, true); });
	chat.querySelector('[data-chat-opnieuw]').addEventListener('click', function () {
		if (bezig) return;
		gesprek.berichten = [];
		bewaar();
		begin();
		status.textContent = '';
		voorlezen.textContent = 'Nieuw gesprek begonnen.';
		invoer.focus();
	});
	venster.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') { e.stopPropagation(); zet(false, true); }
	});
	// Een link naar de site op een telefoon: de chat dicht, anders bedekt hij straks de pagina die je wilde zien
	log.addEventListener('click', function (e) {
		if (e.target.closest('[data-chat-link]') && klein.matches) { gesprek.open = false; bewaar(); }
	});
	// Naar het contactformulier: de chat dicht, zodat hij het formulier niet afdekt
	mens.addEventListener('click', function () { gesprek.open = false; bewaar(); });
	tipsEl.addEventListener('click', function (e) {
		const tip = e.target.closest('.chat-tip');
		if (tip) vraag(tip.textContent);
	});
	form.addEventListener('submit', function (e) {
		e.preventDefault();
		const tekst = invoer.value.trim();
		if (!tekst || bezig) return;
		invoer.value = '';
		vraag(tekst);
	});

	/* ---------- Vragen ---------- */
	function slaap(ms) { return new Promise(function (klaar) { setTimeout(klaar, ms); }); }

	// Eén keer opnieuw proberen als de server (nog) niet antwoordt; een melding van de server zelf (te veel vragen,
	// limiet) komt meteen in beeld
	async function antwoord() {
		const stop = new AbortController();
		const wekker = setTimeout(function () { stop.abort(); }, OPGEVEN_MS);
		try {
			for (let poging = 0; poging < 2; poging++) {
				let r = null;
				let data = null;
				try {
					r = await fetch(ENDPOINT + '/api/chat', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ messages: gesprek.berichten.slice(-MAX_BERICHTEN), pagina: location.pathname }),
						signal: stop.signal
					});
					data = await r.json().catch(function () { return null; });
				} catch (e) {
					if (stop.signal.aborted) throw new Error(TE_LANG);
				}
				if (r && r.ok && data && data.reply) return data.reply;
				if (data && data.error) throw new Error(data.error);
				if (poging === 0) await slaap(2500);
			}
			throw new Error(GEEN_VERBINDING);
		} finally {
			clearTimeout(wekker);
		}
	}

	async function vraag(tekst) {
		if (bezig) return;
		bezig = true;
		log.setAttribute('aria-busy', 'true');
		gesprek.berichten.push({ role: 'user', content: tekst.slice(0, 1000) });
		bewaar();
		toon('user', tekst);
		toonTips();
		const typt = document.createElement('div');
		typt.className = 'chat-bericht chat-bot chat-typt';
		typt.setAttribute('aria-hidden', 'true');
		typt.innerHTML = '<span></span><span></span><span></span>';
		log.appendChild(typt);
		naarOnder();
		status.textContent = 'Jelly-bot denkt na…';
		const traag = setTimeout(function () {
			status.textContent = 'Jelly-bot wordt wakker. De eerste vraag kan zo een halve minuut duren.';
		}, TRAAG_MS);
		try {
			const tekstBot = await antwoord();
			gesprek.berichten.push({ role: 'assistant', content: tekstBot });
			bewaar();
			typt.remove();
			toon('assistant', tekstBot);
			voorlezen.textContent = 'Jelly-bot: ' + tekstBot.replace(/\*\*/g, '');
		} catch (e) {
			typt.remove();
			toon('fout', e.message || GEEN_VERBINDING);
			voorlezen.textContent = e.message || GEEN_VERBINDING;
		} finally {
			clearTimeout(traag);
			status.textContent = '';
			bezig = false;
			log.removeAttribute('aria-busy');
		}
	}

	begin();
	// Stond de chat open op de vorige pagina (een link uit een antwoord), dan blijft hij open; niet op een telefoon,
	// waar hij het hele scherm vult
	if (gesprek.open && !klein.matches) zet(true, false);
	else if (gesprek.open) { gesprek.open = false; bewaar(); }
}
