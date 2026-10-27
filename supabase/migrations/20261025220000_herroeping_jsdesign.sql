-- Twee uitbreidingen van de berichten, nodig vóór de functie die ze gebruikt (zie docs/deploy-functie.md):
-- - soort 'herroeping': de knop "Bestelling herroepen" op jelgersdesign.nl (art. 6:230oa BW, verplicht sinds juni 2026);
-- - site 'jelgersdesign.nl': berichten van de nieuwe site (en de preview) zijn zo te onderscheiden van de oude sites.
-- Alleen ruimer: alle bestaande rijen blijven geldig.
alter table public.berichten drop constraint berichten_soort_check;
alter table public.berichten add constraint berichten_soort_check
	check (soort in ('contact', 'offerte', 'printservice', 'beschikbaarheid', 'herroeping'));

alter table public.berichten drop constraint berichten_site_check;
alter table public.berichten add constraint berichten_site_check
	check (site in ('jelgers3d.nl', 'jelgersieler.nl', 'jelgersdesign.nl'));
