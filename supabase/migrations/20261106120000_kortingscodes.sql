-- Kortingscodes voor de nieuwsbrief (keuzepagina webshopverkoop, 6-11-2026). Volgorde (zie docs/deploy-functie.md):
-- eerst dit bestand in de SQL Editor, dan de functie, dan pas de site (die zet winkel.korting in winkel.json aan).
--
-- Wie zijn aanmelding voor de nieuwsbrief bevestigt, krijgt één persoonlijke code: willekeurig, een paar maanden geldig,
-- één keer te gebruiken. Per e-mailadres bestaat er hooguit één code, ook na afmelden en opnieuw aanmelden. Het adres
-- staat er alleen als hash in (zoals in inzendingen_log): genoeg om na te gaan dat de code bij het adres van de
-- bestelling hoort. De functie ruimt codes twee jaar na het maken op.
create table if not exists public.kortingscodes (
	code text primary key check (code ~ '^JD-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
	email_hash text not null unique,
	procent integer not null check (procent between 1 and 50),
	aangemaakt timestamptz not null default now(),
	geldig_tot timestamptz not null,
	gebruikt_op timestamptz,
	bestelling text                              -- het bestelnummer (JS3D-...) waarop de code is gebruikt
);

alter table public.kortingscodes enable row level security;

-- Bezoekers (anon/authenticated) krijgen niets; alleen de functie leest en schrijft
revoke all on public.kortingscodes from anon, authenticated, service_role;
grant select, insert, update, delete on public.kortingscodes to service_role;

-- Bij een bestelling met korting: { code, procent, bedrag, over }. "totaal" is dan het bedrag ná korting.
alter table public.bestellingen add column if not exists korting jsonb;
