// node tools/handleiding-pdf.mjs [--voorbeeld <map>]
// Maakt van elke handleiding in data/handleidingen.json een print-pdf in A5 (twee kanten) in de huisstijl, voor in de
// doos bij het product: assets/handleidingen/<pdf>. Dezelfde tekst staat als pagina op de site
// (src/templates/handleiding.js). Printen: A5 dubbelzijdig, of "2 pagina's per vel" op A4 en doorknippen.
// Met --voorbeeld <map> komen er ook PNG's van elke kant in die map, om te controleren.
// De QR-code (assets/handleidingen/<id>-qr.svg) is één keer gemaakt met het npm-pakket qrcode (1.5.4, niveau M) en
// wijst naar de pagina op de site; verandert dat adres, maak hem dan opnieuw.
// Edge headless via het DevTools-protocol; een ander pad naar Edge of Chrome kan via EDGE=<pad>.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const i = process.argv.indexOf('--voorbeeld');
const VOORBEELD = i > -1 ? process.argv[i + 1] : '';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const accent = (s) => esc(s).replace(/\*(.+?)\*/g, '<em>$1</em>');
const url = (f) => 'file:///' + path.join(ROOT, f).split(path.sep).join('/');

function schema(stappen, groot) {
	return '<div class="schema' + (groot ? ' schema--groot' : '') + '">' + stappen.map((s) => '<span class="' + (s === 'AAN' ? 'aan' : 'uit') + '">' + esc(s) + '</span>').join('<span class="pijl">›</span>') + '</div>';
}

function html(id, hd) {
	const logo = readFileSync(path.join(ROOT, 'src/partials/logo.svg'), 'utf8');
	const qrPad = path.join(ROOT, 'assets/handleidingen', id + '-qr.svg');
	const qr = existsSync(qrPad) ? readFileSync(qrPad, 'utf8') : '';
	const kop = (n) => '<header class="kop">' + logo + '<p class="kop-label">Handleiding<br><strong>' + esc(hd.titelKort) + '</strong></p></header>';
	const voet = (n) => '<footer class="voet"><span>jelgersdesign.nl</span><span>' + n + ' / 2</span></footer>';
	return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${esc(hd.label)}</title><style>
@font-face{font-family:Saira;font-weight:600 900;font-stretch:100% 125%;src:url('${url('assets/fonts/saira-latin.woff2')}')}
@font-face{font-family:'DM Sans';font-weight:300 700;src:url('${url('assets/fonts/dm-sans-latin.woff2')}')}
@font-face{font-family:'Instrument Serif';font-style:italic;src:url('${url('assets/fonts/instrument-serif-italic-latin.woff2')}')}
@font-face{font-family:'JetBrains Mono';font-weight:300 800;src:url('${url('assets/fonts/jetbrains-mono-latin.woff2')}')}
@page{size:148mm 210mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font:400 8.6pt/1.45 'DM Sans',sans-serif;color:#080a0d;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pagina{position:relative;width:148mm;height:210mm;padding:11mm 11mm 10mm;background:#f3fffd;overflow:hidden;page-break-after:always;break-after:page}
.pagina:last-child{page-break-after:auto;break-after:auto}
.pagina::before{content:'';position:absolute;left:0;right:0;top:0;height:2.2mm;background:#f10067}
.kop{display:flex;align-items:center;justify-content:space-between;margin:0 0 7mm}
.kop svg{width:34mm;height:auto;display:block}
.kop svg path{fill:#080a0d}
.kop svg .logo-deel--branding{fill:#f10067}
.kop svg .logo-deel--digitaal{fill:#03bcca}
.kop-label{margin:0;text-align:right;font:500 6.6pt/1.35 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#3c4450}
.kop-label strong{color:#080a0d;font-weight:700}
h1{margin:0 0 3mm;font:900 21pt/1.02 Saira,sans-serif;font-stretch:112%;letter-spacing:-.01em}
h1 em{font:italic 400 25pt/1 'Instrument Serif',serif;letter-spacing:0;background:linear-gradient(90deg,#f10067,#03bcca);-webkit-background-clip:text;background-clip:text;color:transparent;padding-right:1mm}
.intro{margin:0 0 3.5mm;font-size:9pt;color:#2a313b;max-width:118mm}
.nodig{display:flex;align-items:center;gap:3mm;flex-wrap:wrap;margin:0 0 6mm;font-size:8.6pt}
.label{display:inline-flex;align-items:center;gap:2mm;padding:1.4mm 3.2mm;border-radius:99px;background:#080a0d;color:#f3fffd;font-weight:700;font-size:7.6pt}
.blok{display:inline-block;width:4.2mm;height:2.6mm;clip-path:polygon(100% 43.5%, 50.3% 100%, 0 56.5%, 49.7% 0);background:#f10067;flex:none}
.stappen{list-style:none;margin:0;padding:0;position:relative}
.stappen li{position:relative;display:grid;grid-template-columns:11mm 1fr;column-gap:3.5mm;padding:0 0 4.8mm}
.stappen li::before{content:'';position:absolute;left:5.3mm;top:7mm;bottom:.6mm;width:.35mm;background:#080a0d;opacity:.35}
.stappen li:last-child::before{display:none}
.nr{width:11mm;height:6.8mm;display:grid;place-items:center;clip-path:polygon(100% 43.5%, 50.3% 100%, 0 56.5%, 49.7% 0);background:#080a0d;color:#f3fffd;font:800 9pt/1 Saira,sans-serif}
.stappen h2{margin:.4mm 0 1mm;font:800 10.6pt/1.2 Saira,sans-serif}
.stappen p{margin:0;color:#2a313b}
.schema{display:flex;align-items:center;gap:1.8mm;margin:2.4mm 0 0}
.schema .aan,.schema .uit{display:grid;place-items:center;width:13mm;height:6.4mm;border-radius:99px;font:700 7pt/1 'JetBrains Mono',monospace;letter-spacing:.06em}
.schema .pijl{color:#5b6370;font:700 10pt/1 'DM Sans',sans-serif}
.schema .aan{background:#03bcca;color:#080a0d}
.schema .uit{border:.35mm dashed #080a0d;color:#080a0d}
.schema--groot .aan,.schema--groot .uit{width:17mm;height:8.4mm;font-size:8.4pt}
.schema--groot .pijl{color:#9aa5a4}
.schema--groot .uit{border-color:#f3fffd;color:#f3fffd}
.belangrijk{display:flex;gap:3mm;align-items:flex-start;margin:1mm 0 0;padding:3.6mm 4.2mm;border-radius:3.4mm;background:#080a0d;color:#f3fffd;font-size:8.6pt}
.belangrijk .blok{margin-top:1.1mm}
.belangrijk strong{font-family:Saira,sans-serif;font-weight:800}
.reset{margin:0 0 5mm;padding:4.6mm 5mm 5mm;border-radius:3.4mm;background:#080a0d;color:#f3fffd}
.reset h2{margin:0 0 1.4mm;font:800 11pt/1.2 Saira,sans-serif}
.reset p{margin:0 0 3mm;color:#d7e3e2}
.problemen{display:grid;grid-template-columns:1fr 1fr;gap:4mm 5mm;margin:0 0 4mm}
.probleem h2{display:flex;align-items:center;gap:2mm;margin:0 0 1mm;font:800 9.4pt/1.2 Saira,sans-serif}
.probleem h2 span{font:700 7pt/1 'JetBrains Mono',monospace;color:#027a84;letter-spacing:.06em}
.probleem p{margin:0;color:#2a313b;font-size:8.2pt}
.letop{margin:0 0 5mm;font-size:7.6pt;color:#4a525e}
.hulp{position:absolute;left:11mm;right:11mm;bottom:17mm;display:grid;grid-template-columns:24mm 1fr;gap:5mm;align-items:center;padding-top:4mm;border-top:.3mm solid rgba(8,10,13,.18)}
.hulp svg{width:24mm;height:24mm;display:block}
.hulp p{margin:0 0 1.6mm;font-size:8.4pt}
.hulp strong{font-family:Saira,sans-serif;font-weight:800}
.nw{white-space:nowrap}
.naam{font:italic 400 15pt/1 'Instrument Serif',serif}
.voet{position:absolute;left:11mm;right:11mm;bottom:7mm;display:flex;justify-content:space-between;font:500 6.6pt/1 'JetBrains Mono',monospace;letter-spacing:.08em;color:#5b6370}
</style></head><body>
<section class="pagina">
${kop(1)}
<h1>${accent(hd.titel)}</h1>
<p class="intro">${esc(hd.intro)}</p>
<p class="nodig"><span>${esc(hd.nodig)}</span> <span class="label"><i class="blok"></i>${esc(hd.label24)}</span></p>
<ol class="stappen">
${hd.stappen.map((s, n) => `<li><span class="nr">${n + 1}</span><div><h2>${esc(s.kop)}</h2><p>${esc(s.tekst)}</p>${s.schema ? schema(hd.schema) : ''}</div></li>`).join('\n')}
</ol>
<p class="belangrijk"><i class="blok"></i><span><strong>Belangrijk:</strong> ${esc(hd.belangrijk)}</span></p>
${voet(1)}
</section>
<section class="pagina">
${kop(2)}
<h1>${accent(hd.hulpKop)}</h1>
<p class="intro">${esc(hd.hulpIntro)}</p>
<div class="reset"><h2>${esc(hd.reset.kop)}</h2><p>${esc(hd.reset.tekst)}</p>${schema(hd.schema, true)}</div>
<div class="problemen">
${hd.problemen.map((p, n) => `<div class="probleem"><h2><span>0${n + 1}</span>${esc(p.kop)}</h2><p>${esc(p.tekst)}</p></div>`).join('\n')}
</div>
<p class="letop">${esc(hd.letOp)}</p>
<div class="hulp">${qr}<div><p><strong>Liever op je telefoon?</strong> Scan de code of ga naar <span class="nw">jelgersdesign.nl/${esc(hd.pagina.replace(/\.html$/, ''))}</span>.</p><p>${esc(hd.hulp)}</p><p class="naam">Jelger</p></div></div>
${voet(2)}
</section>
</body></html>`;
}

async function maak() {
	const alle = JSON.parse(readFileSync(path.join(ROOT, 'data/handleidingen.json'), 'utf8'));
	const profiel = mkdtempSync(path.join(os.tmpdir(), 'handleiding-'));
	const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', '--remote-debugging-port=0', '--user-data-dir=' + profiel, 'about:blank'], { stdio: 'ignore' });
	const slaap = (ms) => new Promise((r) => setTimeout(r, ms));
	const pb = path.join(profiel, 'DevToolsActivePort'); let poort;
	for (let n = 0; n < 150 && !poort; n++) { await slaap(100); if (existsSync(pb)) poort = readFileSync(pb, 'utf8').split('\n')[0].trim(); }
	const v = await (await fetch('http://127.0.0.1:' + poort + '/json/version')).json();
	const ws = new WebSocket(v.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
	let n = 1; const open = new Map();
	ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && open.has(m.id)) { const { r, j } = open.get(m.id); open.delete(m.id); m.error ? j(new Error(JSON.stringify(m.error))) : r(m.result); } };
	const s = (method, params = {}, sessionId) => new Promise((r, j) => { const id = n++; open.set(id, { r, j }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
	try {
		for (const id of Object.keys(alle).filter((k) => k.charAt(0) !== '_')) {
			const hd = alle[id];
			const tmp = path.join(profiel, id + '.html');
			writeFileSync(tmp, html(id, hd));
			const { targetId } = await s('Target.createTarget', { url: 'about:blank' });
			const { sessionId } = await s('Target.attachToTarget', { targetId, flatten: true });
			await s('Page.enable', {}, sessionId);
			await s('Page.navigate', { url: 'file:///' + tmp.split(path.sep).join('/') }, sessionId);
			await slaap(1200);
			const fonts = await s('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => [...document.fonts].filter(f => f.status !== "loaded").map(f => f.family).join(", "))', awaitPromise: true, returnByValue: true }, sessionId);
			if (fonts.result.value) throw new Error('Lettertype niet geladen: ' + fonts.result.value);
			const pdf = await s('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 }, sessionId);
			const uit = path.join(ROOT, 'assets/handleidingen', hd.pdf);
			mkdirSync(path.dirname(uit), { recursive: true });
			writeFileSync(uit, Buffer.from(pdf.data, 'base64'));
			console.log('✓ ' + path.relative(ROOT, uit));
			if (VOORBEELD) {
				mkdirSync(VOORBEELD, { recursive: true });
				// 148 x 210 mm bij 96 dpi = 559 x 794 px; twee keer zo scherp
				await s('Emulation.setDeviceMetricsOverride', { width: 559, height: 794, deviceScaleFactor: 2, mobile: false }, sessionId);
				for (const k of [0, 1]) {
					const shot = await s('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: k * 794, width: 559, height: 794, scale: 1 }, captureBeyondViewport: true }, sessionId);
					writeFileSync(path.join(VOORBEELD, id + '-' + (k + 1) + '.png'), Buffer.from(shot.data, 'base64'));
				}
			}
			await s('Target.closeTarget', { targetId });
		}
	} finally {
		ws.close(); edge.kill(); try { rmSync(profiel, { recursive: true, force: true }); } catch {}
	}
}

maak().then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
