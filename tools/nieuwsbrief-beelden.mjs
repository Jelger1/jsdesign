// Maakt de plaatjes voor de mail "JelgerS3D heet nu JelgersDesign" (tools/mail-nieuwe-naam.mjs) in
// assets/nieuwsbrief/2026-11/. De build zet ze op de site (dist/assets/nieuwsbrief/), zodat de mail ze daar laadt.
// JPG en PNG, want klassiek Outlook toont geen WebP. Alles op dubbele grootte voor scherpe schermen.
//
//   node tools/nieuwsbrief-beelden.mjs        (eerst een build, voor de productuitsneden in dist/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const UIT = path.join(ROOT, 'assets/nieuwsbrief/2026-11');
fs.mkdirSync(UIT, { recursive: true });

const jpg = { quality: 80, mozjpeg: true };
const bron = (p) => path.join(ROOT, p);

// Het portret naast de persoonlijke tekst: staand 4:5, hoofd en schouders (200x250 in de mail)
async function portret() {
	const m = await sharp(bron('assets/Jelger-Pic.jpg')).metadata();
	const hoogte = Math.round(m.width * 5 / 4);
	const boven = Math.min(Math.round(m.height * 0.15), m.height - hoogte);
	await sharp(bron('assets/Jelger-Pic.jpg'))
		.extract({ left: 0, top: boven, width: m.width, height: hoogte })
		.resize(400, 500).jpeg(jpg).toFile(path.join(UIT, 'jelger.jpg'));
}

// Productfoto's: dezelfde 4:5-uitsnede als op de site (de "c"-varianten die de build maakt)
const PRODUCTEN = [
	['3d-mijnlamp-c-800.webp', 'mijnwerkerslamp.jpg', 560],
	['oranje-nassau-1-3d-01-voorkant-c-800.webp', 'oranje-nassau.jpg', 360],
	['raadhuis-kerkrade-3d-01-voorgevel-c-800.webp', 'raadhuis.jpg', 360],
	['straatnaam-sleutelhanger-ontwerp-c-800.webp', 'straatnaam.jpg', 360]
];
async function producten() {
	for (const [van, naar, breed] of PRODUCTEN) {
		await sharp(path.join(ROOT, 'dist/assets/img', van)).resize(breed, Math.round(breed * 5 / 4), { fit: 'cover' })
			.flatten({ background: '#ffffff' }).jpeg(jpg).toFile(path.join(UIT, naar));
	}
}

// Het blokje uit de huisstijl (--js-blok in tokens.css) in de drie pijlerkleuren, voor de diensten
const BLOK = '100,43.5 50.3,100 0,56.5 49.7,0';
async function blokjes() {
	for (const [naam, kleur] of [['branding', '#f10067'], ['digitaal', '#03bcca'], ['tastbaar', '#f3fffd']]) {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><polygon points="' + BLOK + '" fill="' + kleur + '"/></svg>';
		await sharp(Buffer.from(svg)).resize(56, 56).png({ compressionLevel: 9 }).toFile(path.join(UIT, 'blok-' + naam + '.png'));
	}
}

async function jellybot() {
	await sharp(bron('assets/brand/jelly-bot-192.webp')).resize(112, 112).png({ compressionLevel: 9 }).toFile(path.join(UIT, 'jelly-bot.png'));
}

await Promise.all([portret(), producten(), blokjes(), jellybot()]);
for (const f of fs.readdirSync(UIT)) console.log(f, Math.round(fs.statSync(path.join(UIT, f)).size / 1024) + ' kB');
