// La récupération du compte (décision n° 36, BRIEF-marche.md §7 bis) : le code de secours.
// Le joueur note un code ; sur un autre appareil, ce code transfère sa collection et son profil de joute au compte
// anonyme de l'appareil. Le serveur n'en garde que l'empreinte. (L'e-mail par lien magique viendra à part : le service
// d'e-mail fourni par Supabase est limité à deux messages par heure.)
// Ce fichier est utilisé par fabriquer-le-script.ts ; les colonnes qu'il utilise sont créées dans collections.ts.

import { LONGUEUR_DU_CODE } from '../src/jeu/codeDeSecours.ts';

export const ESSAIS_DE_RECUPERATION_PAR_HEURE = 10;

export function recuperation(): string {
  return String.raw`
-- ═════════════════════════════════════════════════════════════════════════════
-- LA RÉCUPÉRATION DU COMPTE : LE CODE DE SECOURS (BRIEF-marche.md, §7 bis)
-- ═════════════════════════════════════════════════════════════════════════════

-- Les essais de récupération, pour qu'un code ne puisse pas se deviner à force d'essayer.
create table if not exists public.tentatives_de_recuperation (
  utilisateur uuid not null,
  quand timestamptz not null default now()
);
create index if not exists tentatives_par_joueur on public.tentatives_de_recuperation (utilisateur, quand desc);
alter table public.tentatives_de_recuperation enable row level security;
revoke all on public.tentatives_de_recuperation from anon, authenticated;

-- Le code tel qu'on le compare : majuscules, sans tirets ni espaces, sans le préfixe « MOTS » (même règle que src/jeu/codeDeSecours.ts).
create or replace function public.code_propre(p_code text) returns text language sql immutable set search_path = ''
as $$ select case when c ~ '^(PHIL|MOTS)[A-Z0-9]{${LONGUEUR_DU_CODE}}$' then substr(c, 5) else c end from (select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) as c) t $$;

-- L'empreinte d'un code (SHA-256). Le code lui-même n'est jamais gardé.
create or replace function public.empreinte_du_code(p_code text) returns text language sql immutable set search_path = ''
as $$ select encode(sha256(convert_to(public.code_propre(p_code), 'UTF8')), 'hex') $$;

-- Le joueur choisit (le jeu tire) un code ; un nouveau code remplace l'ancien.
create or replace function public.definir_un_code_de_secours(p_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  propre text := public.code_propre(p_code);
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if char_length(propre) <> ${LONGUEUR_DU_CODE} then raise exception 'Ce code ne peut pas servir de code de secours.'; end if;
  update public.comptes set code_hache = public.empreinte_du_code(propre), code_defini_le = now(), maj_le = now() where utilisateur = auth.uid();
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  return public.etat_du_compte(auth.uid());
end $$;

-- Sur un autre appareil : le code transfère la collection (et le profil de joute) au compte anonyme de l'appareil.
-- La partie commencée sur cet appareil disparaît ; l'ancien compte anonyme est fermé. Le code reste valable ensuite.
-- Un mauvais code est un « refus » rendu, pas une exception : une exception annulerait l'enregistrement de l'essai,
-- et la limite d'essais ne servirait à rien.
create or replace function public.recuperer_par_code(p_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  ancien uuid;
  p public.profils%rowtype;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(moi::text, 2));
  if (select count(*) from public.tentatives_de_recuperation where utilisateur = moi and quand > now() - interval '1 hour') >= ${ESSAIS_DE_RECUPERATION_PAR_HEURE} then
    return jsonb_build_object('refus', 'Trop d''essais : attends une heure.');
  end if;
  insert into public.tentatives_de_recuperation (utilisateur) values (moi);
  select utilisateur into ancien from public.comptes where code_hache is not null and code_hache = public.empreinte_du_code(p_code);
  if not found then return jsonb_build_object('refus', 'Ce code ne correspond à aucune collection.'); end if;
  if ancien <> moi then
    perform 1 from public.comptes where utilisateur = ancien for update;
    delete from public.comptes where utilisateur = moi;
    delete from public.profils where utilisateur = moi;
    update public.comptes set utilisateur = moi, maj_le = now() where utilisateur = ancien; -- les timbres et les duels suivent
    update public.profils set utilisateur = moi, maj_le = now() where utilisateur = ancien;
    delete from public.tentatives_de_recuperation where utilisateur in (moi, ancien);
    delete from auth.users where id = ancien;
  end if;
  select * into p from public.profils where utilisateur = moi;
  return public.etat_du_compte(moi) || jsonb_build_object('profil', case when p.id is null then null else jsonb_build_object('pseudo', p.pseudo, 'cote', p.cote, 'jouees', p.jouees, 'gagnees', p.gagnees) end);
end $$;
`;
}

export const FONCTIONS_DE_RECUPERATION = ['public.definir_un_code_de_secours(text)', 'public.recuperer_par_code(text)'];
export const FONCTIONS_INTERNES_DE_RECUPERATION = ['public.code_propre(text)', 'public.empreinte_du_code(text)'];
