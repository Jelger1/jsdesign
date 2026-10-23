# JS Design · jsdesign.nl

Site en webshop van JS Design (voorheen JelgerS3D), de ontwerpstudio van Jelger Sieler in Kerkrade: branding, websites & interactieve verhalen, en 3D-printen.

Statische site, gegenereerd door `build.js` uit `data/*.json` en `src/`: pure HTML, CSS en JavaScript-modules, met three.js lazy voor 3D. Formulieren, bestellingen en de nieuwsbrief lopen via de Supabase-functie `formulier` (`supabase/`).

```bash
npm ci          # afhankelijkheden
npm run build   # bouwt dist/
npm run dev     # lokale server met automatisch herbouwen
npm run check   # links, SEO en structured data controleren
npm test        # tests van de formulierfunctie
```

Beheer en werkwijze: zie `docs/`.
