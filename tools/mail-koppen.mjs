// Koppen voor mails als plaatje, in precies de letters van de site. Mailprogramma's als Gmail laden geen eigen
// lettertypen en tonen dan Arial; een plaatje ziet er overal hetzelfde uit. De tekst staat in de alt, dus wie
// plaatjes uit heeft, leest de kop gewoon.
//
// Opmaak zoals de site (src/css/styles.css en brand.css): Saira ExtraBold op 125% breedte voor h1/h2, 112% en 700 voor
// h3, en het accent (.highlight) in Instrument Serif cursief met het verloop van roze naar aqua. De lettertypen komen uit
// assets/fonts via de build (dist/assets/fonts). Edge (headless) tekent ze op dubbele grootte; de achtergrond van het
// paneel zit in het plaatje, zodat een donkere modus de kop niet onleesbaar maakt.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BROWSERS = [
	process.env.MAIL_BROWSER,
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Google/Chrome/Application/chrome.exe'
].filter(Boolean);

function css(fonts) {
	const f = (naam, bestand, extra) => '@font-face{font-family:"' + naam + '";' + extra + 'src:url("' + fonts + '/' + bestand + '") format("woff2")}';
	return f('Saira', 'saira-latin.woff2', 'font-weight:600 900;font-stretch:100% 125%;')
		+ f('Instrument Serif', 'instrument-serif-italic-latin.woff2', 'font-style:italic;font-weight:400;')
		+ f('DM Sans', 'dm-sans-latin.woff2', 'font-weight:300 700;')
		+ 'html,body{margin:0;padding:0;background:transparent}'
		+ '.kop{display:inline-block;font-family:Saira;line-height:1.1;-webkit-font-smoothing:antialiased;padding:0.06em 0.12em 0.14em 0}'
		+ '.h1{font-weight:800;font-stretch:125%}'
		+ '.h2{font-weight:800;font-stretch:125%;letter-spacing:-0.01em}'
		+ '.h3{font-weight:700;font-stretch:112%}'
		+ '.hl{font-family:"Instrument Serif";font-style:italic;font-weight:400;font-stretch:normal;font-size:1.14em;letter-spacing:-0.01em;padding-right:0.08em;'
		+ 'background:linear-gradient(100deg,#f10067,#03bcca 75%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}'
		+ '.hl-effen{background:none;-webkit-text-fill-color:currentColor}'
		+ '.weg{text-decoration:line-through;text-decoration-thickness:0.08em}';
}

// koppen: [{ naam, html, niveau: 'h1'|'h2'|'h3', grootte (px), kleur, achter, max (px) }]
// html mag <span class="hl">accent</span> en <br> bevatten. Geeft { naam: { breedte, hoogte } } terug (CSS-pixels).
export async function maakKoppen(koppen, uitDir, fontsDir) {
	const browser = BROWSERS.find((b) => fs.existsSync(b));
	if (!browser) throw new Error('Geen Edge of Chrome gevonden; zet MAIL_BROWSER op het pad van de browser');
	const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'mailkop-'));
	const proces = spawn(browser, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', '--remote-debugging-port=0', '--user-data-dir=' + profiel, 'about:blank'], { stdio: 'ignore' });
	const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
	let poort;
	for (let i = 0; i < 150 && !poort; i++) { await slaap(100); const f = path.join(profiel, 'DevToolsActivePort'); if (fs.existsSync(f)) poort = fs.readFileSync(f, 'utf8').split('\n')[0].trim(); }
	if (!poort) throw new Error('De browser startte niet');
	const v = await (await fetch('http://127.0.0.1:' + poort + '/json/version')).json();
	const ws = new WebSocket(v.webSocketDebuggerUrl);
	await new Promise((r) => { ws.onopen = r; });
	let id = 0; const wacht = new Map();
	ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && wacht.has(m.id)) { wacht.get(m.id)(m.result || m.error); wacht.delete(m.id); } };
	const stuur = (method, params = {}, sessionId) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params, sessionId })); return new Promise((r) => wacht.set(i, r)); };
	const { targetId } = await stuur('Target.createTarget', { url: 'about:blank' });
	const { sessionId } = await stuur('Target.attachToTarget', { targetId, flatten: true });
	const s = (m, p) => stuur(m, p, sessionId);
	await s('Page.enable');
	await s('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 2, mobile: false });

	const fonts = 'file:///' + path.resolve(fontsDir).replace(/\\/g, '/');
	const maten = {};
	try {
		for (const k of koppen) {
			const html = '<!doctype html><html><head><meta charset="utf-8"><style>' + css(fonts) + '</style></head><body>'
				+ '<div style="width:' + k.max + 'px;padding:4px 0"><span id="k" class="kop ' + k.niveau + '" style="font-size:' + k.grootte + 'px;color:' + k.kleur + ';background-color:' + k.achter + '">' + k.html + '</span></div></body></html>';
			const pad = path.join(profiel, 'kop.html');
			fs.writeFileSync(pad, html);
			await s('Page.navigate', { url: 'file:///' + pad.replace(/\\/g, '/') });
			await slaap(300);
			// Precies het vlak van de kop (afgerond naar binnen, zodat er geen rand van de pagina mee komt)
			const r = await s('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>{const b=document.getElementById("k").getBoundingClientRect();return JSON.stringify({x:Math.ceil(b.left),y:Math.ceil(b.top),w:Math.floor(b.right)-Math.ceil(b.left),h:Math.floor(b.bottom)-Math.ceil(b.top),fonts:[...document.fonts].filter(f=>f.status==="loaded").length})})', awaitPromise: true, returnByValue: true });
			const b = JSON.parse(r.result.value);
			if (b.fonts < 1) throw new Error('Lettertypen niet geladen voor ' + k.naam);
			const foto = await s('Page.captureScreenshot', { format: 'png', clip: { x: b.x, y: b.y, width: b.w, height: b.h, scale: 1 }, captureBeyondViewport: true });
			fs.writeFileSync(path.join(uitDir, 'kop-' + k.naam + '.png'), Buffer.from(foto.data, 'base64'));
			maten[k.naam] = { breedte: b.w, hoogte: b.h };
		}
	} finally {
		ws.close();
		proces.kill();
	}
	return maten;
}
