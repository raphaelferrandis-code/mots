// Fabrique les trois scripts à coller dans Supabase (voir docs/GUIDE-supabase.md) :
//   serveur/1-structure.sql       les tables, les règles d'accès et les fonctions des joutes et des collections ;
//   serveur/2-joueurs-maison.sql  les joueurs maison, pour que les joutes aient du monde dès le premier jour ;
//   serveur/3-cartes.sql          les cartes de l'édition, pour que le serveur tire lui-même les paquets.
// Les chiffres (classement, pseudonymes) et la liste des mots interdits viennent des fichiers du jeu : il n'y a
// qu'un seul endroit où les changer. Après une modification : « npm run serveur:script », puis recoller dans Supabase.
//
// Usage : npm run serveur:script

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { PSEUDOS_INTERDITS } from '../src/config/pseudos-interdits.ts';
import { fabriquerLesJoueursMaison } from '../src/jeu/joueursMaison.ts';
import { LONGUEUR_DU_PSEUDO } from '../src/jeu/pseudo.ts';
import type { IndexEdition } from '../src/partage/types.ts';
import { DEMANDES_TRAITEES_SQL, FONCTIONS_DES_COLLECTIONS, FONCTIONS_INTERNES, INDEX_DU_CODE_SQL, cartes, collections, migrationPersonnalisation } from './collections.ts';
import { FONCTIONS_DU_MARCHE, FONCTIONS_INTERNES_DU_MARCHE, VENDEUR_FACULTATIF_SQL, marche } from './marche.ts';
import { FONCTIONS_DE_RECUPERATION, FONCTIONS_INTERNES_DE_RECUPERATION, recuperation } from './recuperation.ts';
import { combats } from './combats.ts';
import { amis } from './amis.ts';
import { equipes } from './equipes.ts';
import { comptesNeufs, parrainage } from './parrainage.ts';
import { secours } from './secours.ts';
import { activite } from './activite.ts';
import { portraits } from './portraits.ts';
import { direct, OUBLIER_L_EQUIPE_SQL } from './direct.ts';
import { classement } from './classement.ts';
import { paiementsSuppressionEtVerification } from './paiements.ts';
import { VERROU_DU_DIRECT, VERROU_DU_MARCHE } from './verrous.ts';

const RACINE = path.join(import.meta.dirname, '..');
const J = EQUILIBRAGE.joute;
const TAILLE_DU_DECK = EQUILIBRAGE.duel.tailleDuDeck;

// Limites de fréquence et de validité. Elles ne prouvent pas le résultat : le moteur reste côté navigateur.
const JOUTES_PAR_HEURE = 40;
const HEURES_DE_VALIDITE_DU_TICKET = 2;

const texte = (valeur: string): string => `'${valeur.replaceAll("'", "''")}'`;

const FONCTIONS_DES_JOUTES = ['public.publier_mon_profil(text, jsonb, jsonb, jsonb)', 'public.adversaires()', 'public.commencer_une_joute(uuid)', 'public.terminer_une_joute(bigint, text)', 'public.classement()', 'public.supprimer_mon_profil()', 'public.supprimer_mon_compte()'];

export function structure(options: { combats: boolean } = { combats: true }): string {
  const interdits = [
    ...PSEUDOS_INTERDITS.motsEntiers.map((mot) => `(${texte(mot)}, true)`),
    ...PSEUDOS_INTERDITS.fragments.map((mot) => `(${texte(mot)}, false)`),
  ].join(', ');

  return String.raw`-- ═════════════════════════════════════════════════════════════════════════════
-- PHILAMOTS — le serveur du jeu (1/3 : la structure — joutes classées et collections)
-- Fichier fabriqué par « npm run serveur:script » : ne pas le modifier à la main.
-- À coller dans Supabase : SQL Editor → New query → coller → Run. Peut être relancé sans danger.
-- Avant « Run » : le petit menu à gauche du bouton « Save » doit indiquer « Database », et non « Logs ».
-- ═════════════════════════════════════════════════════════════════════════════

create extension if not exists unaccent with schema extensions;

-- ── Les tables ───────────────────────────────────────────────────────────────
create table if not exists public.profils (
  id uuid primary key default gen_random_uuid(),
  utilisateur uuid unique references auth.users (id) on delete cascade, -- vide pour un joueur maison
  maison boolean not null default false,
  pseudo text not null,
  pseudo_cle text not null unique, -- le pseudonyme sans majuscules, accents ni espaces : deux joueurs ne peuvent pas porter « le même »
  cote integer not null default ${J.coteDeDepart},
  jouees integer not null default 0,
  gagnees integer not null default 0,
  deck jsonb not null default '[]'::jsonb,
  savoirs jsonb not null default '{}'::jsonb,
  parades jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index if not exists profils_par_cote on public.profils (cote);

create table if not exists public.joutes (
  id bigint generated always as identity primary key,
  attaquant uuid not null references public.profils (id) on delete cascade,
  defenseur uuid not null references public.profils (id) on delete cascade,
  commencee_le timestamptz not null default now(),
  terminee_le timestamptz,
  resultat text check (resultat in ('victoire', 'defaite', 'nul')),
  cote_avant integer,
  cote_apres integer
);
create index if not exists joutes_par_attaquant on public.joutes (attaquant, commencee_le desc);
alter table public.joutes add column if not exists recompense jsonb,
  add column if not exists abandonnee boolean not null default false,
  add column if not exists cote_adverse integer;

create table if not exists public.mots_interdits (mot text primary key, entier boolean not null);

-- Personne ne lit ni n'écrit ces tables directement : tout passe par les fonctions ci-dessous.
alter table public.profils enable row level security;
alter table public.joutes enable row level security;
alter table public.mots_interdits enable row level security;
revoke all on public.profils, public.joutes, public.mots_interdits from anon, authenticated;

-- ── Les mots interdits dans les pseudonymes (copie de src/config/pseudos-interdits.ts) ──────────
delete from public.mots_interdits;
insert into public.mots_interdits (mot, entier) values ${interdits};

-- ── Le contrôle des pseudonymes (même logique que src/jeu/pseudo.ts) ──────────────────────────
create or replace function public.sans_accents(t text) returns text language sql stable set search_path = ''
as $$ select lower(extensions.unaccent('extensions.unaccent'::regdictionary, replace(replace(t, 'œ', 'oe'), 'Œ', 'OE'))) $$;

create or replace function public.sans_repetitions(t text) returns text language sql immutable set search_path = ''
as $$ select regexp_replace(t, '(.)\1+', '\1', 'g') $$;

create or replace function public.cle_du_pseudo(p text) returns text language sql stable set search_path = ''
as $$ select regexp_replace(public.sans_accents(p), '[^a-z0-9]', '', 'g') $$;

-- Rend la raison du refus, ou rien si le pseudonyme est acceptable.
create or replace function public.pseudo_refuse(p text) returns text language plpgsql stable set search_path = ''
as $$
declare
  propre text := btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g'));
  simple text := public.sans_accents(propre);
  decoupe text;
  deguisement text;
  morceau text;
  lettres text;
  mots text[];
  colle text;
begin
  if char_length(propre) < ${LONGUEUR_DU_PSEUDO.minimum} then return 'Il faut au moins ${LONGUEUR_DU_PSEUDO.minimum} caractères.'; end if;
  if char_length(propre) > ${LONGUEUR_DU_PSEUDO.maximum} then return 'Pas plus de ${LONGUEUR_DU_PSEUDO.maximum} caractères.'; end if;
  if simple !~ '^[a-z0-9][a-z0-9 ''’_-]*$' then return 'Seulement des lettres, des chiffres, des espaces, des tirets et des apostrophes.'; end if;
  if char_length(regexp_replace(simple, '[^a-z]', '', 'g')) < 2 then return 'Il faut au moins deux lettres.'; end if;

  -- Une majuscule au milieu d'un mot le coupe en deux (« GrosCon » se lit « gros con »).
  decoupe := public.sans_accents(regexp_replace(extensions.unaccent('extensions.unaccent'::regdictionary, propre), '([a-z])([A-Z])', '\1 \2', 'g'));

  -- Deux lectures : le « 1 » et le « ! » valent tantôt « i », tantôt « l ».
  foreach deguisement in array array['oieastbasie', 'oleastbasle'] loop
    mots := '{}';
    colle := '';
    foreach morceau in array regexp_split_to_array(decoupe, '[\s''’_-]+') loop
      lettres := regexp_replace(translate(morceau, '0134578@$!€', deguisement), '[^a-z]', '', 'g');
      colle := colle || lettres;
      -- Un nombre isolé (« Éric 55 ») n'est pas lu comme un mot.
      if morceau ~ '[a-z]' and lettres <> '' then mots := mots || lettres || public.sans_repetitions(lettres); end if;
    end loop;
    mots := mots || colle || public.sans_repetitions(colle);

    -- Les lettres répétées sont retirées du pseudonyme, jamais des mots courts de la liste (« trann » réduit à « tran »
    -- ferait refuser « tranche ») : seuls les fragments encore assez longs une fois réduits sont cherchés sous cette forme.
    if exists (
      select 1 from public.mots_interdits i
      where (i.entier and i.mot = any (mots))
         or (not i.entier and (position(i.mot in colle) > 0 or position(i.mot in public.sans_repetitions(colle)) > 0
             or (char_length(public.sans_repetitions(i.mot)) >= 5 and position(public.sans_repetitions(i.mot) in public.sans_repetitions(colle)) > 0)))
    ) then return 'Ce pseudonyme n''est pas accepté : choisis-en un autre.'; end if;
  end loop;
  return null;
end $$;

-- ── Les fonctions appelées par le jeu ────────────────────────────────────────
-- Chacune agit pour le joueur connecté (auth.uid()) ; une exception porte un message écrit pour lui.

create or replace function public.publier_mon_profil(p_pseudo text, p_deck jsonb, p_savoirs jsonb, p_parades jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  propre text := btrim(regexp_replace(coalesce(p_pseudo, ''), '\s+', ' ', 'g'));
  refus text;
  ma_cote integer;
  precedent jsonb;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  -- Un seul envoi à la fois pour un même joueur : deux envois simultanés de son tout premier profil se gêneraient
  -- (constaté à la première mise en route : le second revenait en erreur).
  perform pg_advisory_xact_lock(hashtextextended(moi::text, 0));
  perform 1 from public.comptes where utilisateur = moi for update;
  refus := public.pseudo_refuse(propre);
  if refus is not null then return jsonb_build_object('accepte', false, 'raison', refus); end if;
  if exists (select 1 from public.profils where pseudo_cle = public.cle_du_pseudo(propre) and utilisateur is distinct from moi) then
    return jsonb_build_object('accepte', false, 'raison', 'Ce pseudonyme est déjà pris.');
  end if;
  if p_deck is null or p_savoirs is null or p_parades is null or jsonb_typeof(p_deck) <> 'array' or jsonb_array_length(p_deck) > ${TAILLE_DU_DECK} or jsonb_typeof(p_savoirs) <> 'object' or jsonb_typeof(p_parades) <> 'object'
     or pg_column_size(p_deck) > 2000 or pg_column_size(p_savoirs) > 4000 or pg_column_size(p_parades) > 2000 then
    raise exception 'Ce profil ne peut pas être enregistré.';
  end if;
  if p_deck <> public.deck_propre(moi, p_deck) then
    raise exception 'Le deck doit contenir des cartes distinctes de ta collection.';
  end if;
  if exists (
    select 1 from (select value from jsonb_each(p_savoirs) union all select value from jsonb_each(p_parades)) s
    where jsonb_typeof(value) <> 'object'
       or coalesce(value->>'posees', '') !~ '^[0-9]{1,8}$'
       or coalesce(value->>'reussies', '') !~ '^[0-9]{1,8}$'
  ) then raise exception 'Statistiques de maîtrise invalides.'; end if;

  if exists(select 1 from public.comptes where utilisateur=moi and progression_active) then
    p_savoirs := public.savoirs_verifies(moi,p_deck);
    select parades_verifiees into p_parades from public.comptes where utilisateur=moi;
  end if;
  if exists (
    select 1 from (select value from jsonb_each(p_savoirs) union all select value from jsonb_each(p_parades)) s
    where (value->>'reussies')::integer > (value->>'posees')::integer
  ) then raise exception 'Statistiques de maîtrise invalides.'; end if;

  -- Un profil recréé reprend l'identité et la cote du précédent (serveur/classement.ts) : on n'efface pas ses défaites
  -- en recommençant. Les cotes des joutes en direct, rangées sous cette identité, reviennent avec elle.
  select c.profil_precedent into precedent from public.comptes c where c.utilisateur = moi;
  if exists (select 1 from public.profils where id = (precedent->>'id')::uuid) then precedent := null; end if;
  begin
    insert into public.profils (id, utilisateur, pseudo, pseudo_cle, deck, savoirs, parades, cote, jouees, gagnees)
    values (coalesce((precedent->>'id')::uuid, gen_random_uuid()), moi, propre, public.cle_du_pseudo(propre), p_deck, p_savoirs, p_parades,
      coalesce((precedent->>'cote')::integer, ${J.coteDeDepart}), coalesce((precedent->>'jouees')::integer, 0), coalesce((precedent->>'gagnees')::integer, 0))
    on conflict (utilisateur) do update set pseudo = excluded.pseudo, pseudo_cle = excluded.pseudo_cle, deck = excluded.deck, savoirs = excluded.savoirs, parades = excluded.parades, maj_le = now()
    returning cote into ma_cote;
  exception when unique_violation then
    -- Deux joueurs ont demandé le même pseudonyme au même instant : le premier arrivé le garde.
    return jsonb_build_object('accepte', false, 'raison', 'Ce pseudonyme est déjà pris.');
  end;
  return jsonb_build_object('accepte', true, 'cote', ma_cote);
end $$;

-- Trois adversaires : un par écart de cote visé, tiré au hasard parmi les plus proches, en évitant les derniers affrontés.
create or replace function public.adversaires() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi public.profils%rowtype;
  ecart integer;
  choisi public.profils%rowtype;
  pris uuid[] := '{}';
  recents uuid[];
  resultat jsonb := '[]'::jsonb;
begin
  select * into moi from public.profils where utilisateur = auth.uid();
  if not found then raise exception 'Publie d''abord ton profil.'; end if;
  select coalesce(array_agg(defenseur), '{}') into recents from (select defenseur from public.joutes where attaquant = moi.id order by commencee_le desc limit ${J.adversairesRecentsEvites}) r;
  if to_regclass('public.combats') is not null then
    execute 'select coalesce(array_agg(defenseur), ''{}''::uuid[]) from (
      select defenseur from (
        select (etat->''adversaire''->''profil''->>''id'')::uuid defenseur, cree_le commencee_le
          from public.combats where utilisateur=$1 and etat->''adversaire''->>''type''=''joute''
        union all select defenseur, commencee_le from public.joutes where attaquant=$2
      ) historique order by commencee_le desc limit ${J.adversairesRecentsEvites}
    ) derniers' into recents using auth.uid(), moi.id;
  end if;

  foreach ecart in array array[${J.ecartsDeCoteProposes.join(', ')}] loop
    select p.* into choisi from (
      select * from public.profils
      where id <> moi.id and id <> all (pris) and id <> all (recents) and jsonb_array_length(deck) = ${TAILLE_DU_DECK}
      order by abs(cote - (moi.cote + ecart)), id limit ${J.joueursProchesParProposition}
    ) p order by random() limit 1;
    if not found then -- il ne reste que des adversaires récents : tant pis
      select p.* into choisi from (
        select * from public.profils
        where id <> moi.id and id <> all (pris) and jsonb_array_length(deck) = ${TAILLE_DU_DECK}
        order by abs(cote - (moi.cote + ecart)), id limit ${J.joueursProchesParProposition}
      ) p order by random() limit 1;
    end if;
    if found then
      pris := pris || choisi.id;
      resultat := resultat || jsonb_build_object('id', choisi.id, 'pseudo', choisi.pseudo, 'maison', choisi.maison, 'cote', choisi.cote, 'deck', choisi.deck, 'savoirs', choisi.savoirs, 'parades', choisi.parades);
    end if;
  end loop;
  return (select coalesce(jsonb_agg(a order by (a ->> 'cote')::integer), '[]'::jsonb) from jsonb_array_elements(resultat) a);
end $$;

-- Début d'une joute : le serveur note l'heure et rend un numéro de ticket.
create or replace function public.commencer_une_joute(p_adversaire uuid) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  moi public.profils%rowtype;
  ticket bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if exists(select 1 from public.comptes where utilisateur=auth.uid() and progression_active) then raise exception 'Utilise le serveur des combats vérifiés.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  select * into moi from public.profils where utilisateur = auth.uid();
  if not found then raise exception 'Publie d''abord ton profil.'; end if;
  if p_adversaire = moi.id or not exists (select 1 from public.profils where id = p_adversaire) then raise exception 'Cet adversaire n''est plus disponible.'; end if;
  if jsonb_array_length(public.deck_propre(auth.uid(), moi.deck)) <> ${TAILLE_DU_DECK}
     or not exists (select 1 from public.profils where id=p_adversaire and jsonb_array_length(deck)=${TAILLE_DU_DECK})
  then raise exception 'Les deux decks doivent être complets.'; end if;
  perform public.autoriser_joute(auth.uid());
  if (select count(*) from public.joutes where attaquant = moi.id and commencee_le > now() - interval '1 hour') >= ${JOUTES_PAR_HEURE} then
    raise exception 'Trop de joutes en peu de temps : fais une pause.';
  end if;
  -- Recommencer après avoir fermé l'onglet compte comme un abandon de la joute précédente.
  perform public.terminer_une_joute(id, 'abandon') from public.joutes where attaquant=moi.id and terminee_le is null order by id;
  insert into public.joutes (attaquant, defenseur, cote_avant, cote_adverse)
    select moi.id, p.id, moi.cote, p.cote from public.profils p where p.id=p_adversaire returning id into ticket;
  return ticket;
end $$;

-- Fin d'une joute : le serveur calcule la nouvelle cote (classement de type Elo) — seul l'attaquant voit sa cote bouger.
create or replace function public.terminer_une_joute(p_ticket bigint, p_resultat text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi public.profils%rowtype;
  joute public.joutes%rowtype;
  cote_adverse integer;
  obtenu numeric;
  nouvelle integer;
  gain_enregistre jsonb;
  abandon boolean := p_resultat = 'abandon';
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if exists(select 1 from public.comptes where utilisateur=auth.uid() and progression_active) then raise exception 'Utilise le serveur des combats vérifiés.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if p_resultat is null or p_resultat not in ('victoire', 'defaite', 'nul', 'abandon') then raise exception 'Résultat inconnu.'; end if;
  if abandon then p_resultat := 'defaite'; end if;
  perform 1 from public.comptes where utilisateur = auth.uid() for update;
  select * into moi from public.profils where utilisateur = auth.uid() for update;
  if not found then raise exception 'Publie d''abord ton profil.'; end if;
  select * into joute from public.joutes where id = p_ticket and attaquant = moi.id for update;
  if not found then raise exception 'Cette joute ne peut plus être enregistrée.'; end if;
  if joute.terminee_le is not null then
    if joute.resultat is distinct from p_resultat or joute.abandonnee <> abandon or joute.recompense is null
    then raise exception 'Cette joute est déjà enregistrée avec un autre résultat.'; end if;
    return joute.recompense || jsonb_build_object('etat', public.etat_du_compte(moi.utilisateur));
  end if;
  if not abandon and joute.commencee_le <= now() - interval '${HEURES_DE_VALIDITE_DU_TICKET} hours' then raise exception 'Cette joute a expiré : abandonne-la pour continuer.'; end if;

  select cote into cote_adverse from public.profils where id = joute.defenseur;
  cote_adverse := coalesce(joute.cote_adverse, cote_adverse);
  obtenu := case p_resultat when 'victoire' then 1 when 'nul' then 0.5 else 0 end;
  nouvelle := greatest(${J.coteMinimale}, round(moi.cote + ${J.facteurK} * (obtenu - 1 / (1 + power(10::numeric, (cote_adverse - moi.cote)::numeric / ${J.echelle})))));

  update public.profils set cote = nouvelle, jouees = jouees + 1, gagnees = gagnees + (p_resultat = 'victoire')::integer, maj_le = now() where id = moi.id;
  -- L'Encre de la joute, si le serveur tient la collection du joueur (même plafond quotidien que les duels d'entraînement).
  gain_enregistre := jsonb_build_object('avant', moi.cote, 'apres', nouvelle) || case when abandon
    then jsonb_build_object('encre', 0, 'reduite', false)
    else coalesce(public.recompenser(moi.utilisateur, ${J.encreParVictoire}, p_resultat), '{}'::jsonb) end;
  update public.joutes set terminee_le = now(), resultat = p_resultat, cote_avant = moi.cote, cote_apres = nouvelle,
    recompense = gain_enregistre, abandonnee = abandon where id = joute.id;
  return gain_enregistre || jsonb_build_object('etat', public.etat_du_compte(moi.utilisateur));
end $$;

-- Le classement : les dix premiers, et les voisins du joueur.
create or replace function public.classement() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  mon_profil public.profils%rowtype;
  mon_rang integer;
begin
  select * into mon_profil from public.profils where utilisateur = auth.uid();
  if not found then raise exception 'Publie d''abord ton profil.'; end if;
  select 1 + count(*) into mon_rang from public.profils where cote > mon_profil.cote;
  return (
    with ranges as (
      select row_number() over (order by p.cote desc, (p.id = mon_profil.id) desc, p.pseudo) as rang, p.pseudo, p.maison, p.cote, (p.id = mon_profil.id) as moi from public.profils p
    )
    select jsonb_build_object(
      'joueurs', (select count(*) from ranges),
      'rang', mon_rang,
      'tete', (select coalesce(jsonb_agg(to_jsonb(r) order by r.rang), '[]'::jsonb) from ranges r where r.rang <= 10),
      'voisins', (select coalesce(jsonb_agg(to_jsonb(r) order by r.rang), '[]'::jsonb) from ranges r where r.rang between mon_rang - 2 and mon_rang + 2)
    )
  );
end $$;

-- Le droit à l'effacement : le joueur supprime son profil, ses joutes et son compte anonyme.
create or replace function public.supprimer_mon_profil() returns void
language plpgsql security definer set search_path = ''
as $$
declare en_cours boolean;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  -- Le verrou du direct d'abord (le retrait du profil le demande), puis celui du joueur : dans l'ordre (serveur/verrous.ts).
  perform pg_advisory_xact_lock(${VERROU_DU_DIRECT});
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  perform 1 from public.comptes where utilisateur=auth.uid() for update;
  if to_regclass('public.combats') is not null then
    execute 'select exists(select 1 from public.combats where utilisateur=$1 and not termine)' into en_cours using auth.uid();
    if en_cours then raise exception 'Termine ou abandonne ton combat avant de retirer ton profil.'; end if;
  end if;
  delete from public.profils where utilisateur = auth.uid();
end $$;

-- Effacement complet, distinct du retrait des joutes. Le trigger du marché
-- rembourse les tiers avant la suppression en cascade des possessions.
create or replace function public.supprimer_mon_compte() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE});
  perform pg_advisory_xact_lock(${VERROU_DU_DIRECT}); -- l'effacement retire aussi le profil : dans l'ordre (serveur/verrous.ts)
  -- Un effacement voulu par le joueur, et non le remplacement d'une collection : ses achats ne l'empêchent pas, sauf un
  -- abonnement qui se renouvelle encore (serveur/paiements.ts).
  perform set_config('philamots.effacement_voulu', 'oui', true);
  delete from auth.users where id = auth.uid();
end $$;

${collections()}
${classement()}
${recuperation()}
${comptesNeufs()}
${marche()}
${portraits()}
${amis()}
${equipes()}
${activite()}
-- ── Les droits ───────────────────────────────────────────────────────────────
-- Seuls les joueurs connectés (compte anonyme compris) peuvent appeler les fonctions du jeu ; les aides internes, personne.
revoke execute on function ${[...FONCTIONS_DES_JOUTES, 'public.pseudo_refuse(text)', ...FONCTIONS_DES_COLLECTIONS, ...FONCTIONS_DE_RECUPERATION, ...FONCTIONS_DU_MARCHE, ...FONCTIONS_INTERNES, ...FONCTIONS_INTERNES_DE_RECUPERATION, ...FONCTIONS_INTERNES_DU_MARCHE].join(', ')} from public, anon;
revoke execute on function ${['public.pseudo_refuse(text)', ...FONCTIONS_INTERNES, ...FONCTIONS_INTERNES_DE_RECUPERATION, ...FONCTIONS_INTERNES_DU_MARCHE].join(', ')} from authenticated; -- le contrôle des pseudonymes ne sert qu'à publier_mon_profil
grant execute on function ${[...FONCTIONS_DES_JOUTES, ...FONCTIONS_DES_COLLECTIONS, ...FONCTIONS_DE_RECUPERATION, ...FONCTIONS_DU_MARCHE].join(', ')} to authenticated;
${options.combats ? combats().trimEnd() : ''}
`;
}

export function migrationOffres(): string {
  return '-- Mise à jour des deux offres — remplace les migrations 4 et 5.\n-- À appliquer avant de publier le client. Aucun droit payant attribué automatiquement.\nbegin;\n' + structure({ combats: false }) + '\ncommit;\n';
}

export function migrationIntegrite(): string {
  return '-- Intégrité des comptes, du marché et de l’enregistrement des résultats.\n-- Étape historique : compléter par 9-combats.sql et la fonction combats pour le client actuel.\nbegin;\n' + structure({ combats: false }) + '\ncommit;\n';
}

export function migrationCombats(): string {
  return '-- Combats vérifiés et progression serveur. Installer aussi la fonction combats avant le client.\nbegin;\n' + structure() + '\ncommit;\n';
}

export function migrationAmis(): string {
  return '-- Amis, échanges atomiques et défis amicaux. Après 9-combats.sql.\n-- Redéployer aussi la fonction combats avant le client.\nbegin;\n' + amis() + combats() + '\ncommit;\n';
}

export function migrationEquipes(): string {
  return '-- Équipes de deux joueurs. Après 10-amis.sql.\nbegin;\n' + equipes() + '\ncommit;\n';
}

// L'adversaire de secours des joutes en direct et le parrainage. Après 12-joutes-direct.sql.
// Seule combat_creer change parmi les fonctions déjà installées : elle est reprise telle quelle de combats().
export function migrationSecoursEtParrainage(): string {
  const creer = combats().match(/create or replace function public\.combat_creer\([\s\S]*?\nend \$\$;/)?.[0];
  if (!creer) throw new Error('combat_creer introuvable dans combats()');
  return '-- L’adversaire de secours des joutes en direct et le parrainage. Après 12-joutes-direct.sql.\n'
    + '-- Aucune fonction serveur (Edge) à redéployer : le client peut être publié avant ou après ce script.\nbegin;\n'
    + creer + '\n' + secours() + parrainage() + 'commit;\n';
}

// Le fil d'activité de l'accueil. Après 13-secours-et-parrainage.sql. Ne modifie aucune fonction existante.
export function migrationFilDActivite(): string {
  return '-- Le fil d’activité de l’accueil (trouvailles remarquables, victoires en joute, arrivées). Après 13-secours-et-parrainage.sql.\n'
    + '-- Ne modifie aucune fonction existante : le client peut être publié avant ou après ce script.\nbegin;\n' + activite() + 'commit;\n';
}

// Portraits, niveaux, présence et vitrines des amis ; cote de l’équipe. Après 14-fil-d-activite.sql.
// Seules mes_amis et mon_equipe changent parmi les fonctions déjà installées : elles sont reprises telles quelles.
export function migrationPortraits(): string {
  const reprise = (source: string, nom: string) => {
    const f = source.match(new RegExp(`create or replace function public\\.${nom}\\(\\)[\\s\\S]*?\\nend \\$\\$;`))?.[0];
    if (!f) throw new Error(`${nom} introuvable`);
    return f;
  };
  return '-- Portraits, niveaux, présence et vitrines des amis ; cote 2v2 de l’équipe. Après 14-fil-d-activite.sql.\n'
    + '-- Publier le client après ce script : il appelle signaler_presence et lit les nouveaux champs.\nbegin;\n'
    + portraits() + '\n' + reprise(amis(), 'mes_amis') + '\n\n' + reprise(equipes(), 'mon_equipe') + '\n\ncommit;\n';
}

// Le parrainage confirmé et les comptes neufs (décisions du 25/09/2026). Après 15-portraits-et-presence.sql.
// Seules les quatre fonctions qui font passer un timbre ou de l'Encre changent parmi celles du marché et des amis :
// elles sont reprises telles quelles.
// Une fonction SQL reprise telle quelle d'un script fabriqué, pour une migration qui ne change qu'elle
// (en plpgsql, elle finit par « end $$; » ; en SQL, par « $$; »).
function reprise(source: string, nom: string): string {
  const f = source.match(new RegExp(`create or replace function public\\.${nom}\\([\\s\\S]*?\\n(?:end )?\\$\\$;`))?.[0];
  if (!f) throw new Error(`${nom} introuvable`);
  return f;
}

export function migrationParrainageConfirme(): string {
  return '-- Le parrainage confirmé et les comptes neufs. Après 15-portraits-et-presence.sql.\n'
    + '-- Aucune fonction serveur (Edge) à redéployer : le client peut être publié avant ou après ce script.\nbegin;\n'
    + comptesNeufs() + parrainage()
    + ['proposer_echange', 'repondre_echange'].map((nom) => reprise(amis(), nom)).join('\n\n') + '\n\n'
    + ['mettre_en_vente', 'encherir'].map((nom) => reprise(marche(), nom)).join('\n\n') + '\n\ncommit;\n';
}

// La tenue du serveur et le match à accepter (décisions du 25/09/2026). Après 16-parrainage-confirme.sql.
// Chaque domaine a son verrou (serveur/verrous.ts) ; la clôture des enchères ne verrouille plus rien quand rien n'est
// échu ; une partie en direct doit être acceptée par tous. Le direct et les équipes sont repris en entier (scripts
// rejouables), le reste fonction par fonction.
export function migrationTenueDuServeur(): string {
  return '-- La tenue du serveur et le match à accepter. Après 16-parrainage-confirme.sql.\n'
    + '-- Redéployer d’abord la fonction joutes-direct (elle sait lire l’ancien serveur). Dans l’autre ordre, rien ne casse :\n'
    + '-- l’ancienne fonction lancerait seulement les parties sans attendre que chacun accepte.\nbegin;\n'
    + direct() + equipes()
    + ['cloturer_les_encheres', 'mettre_en_vente', 'retirer_de_la_vente', 'encherir'].map((nom) => reprise(marche(), nom)).join('\n\n') + '\n\n'
    + ['supprimer_mon_profil', 'supprimer_mon_compte'].map((nom) => reprise(structure(), nom)).join('\n\n') + '\n\n'
    + reprise(recuperation(), 'recuperer_par_code') + '\n\ncommit;\n';
}

// Le classement (décisions du 25/09/2026). Après 17-tenue-du-serveur.sql. Filtres normalisés, rencontres limitées à
// ${J.rencontresClasseesParJour} par jour, récompense du gagnant d'un abandon, cote retrouvée en recréant son profil, seuil d'entrée
// au classement. Le direct est repris en entier (script rejouable), publier_mon_profil seule.
export function migrationClassement(): string {
  return '-- Le classement : filtres normalisés, rencontres limitées, récompense du gagnant, cote retrouvée, seuil d’entrée.\n'
    + '-- Après 17-tenue-du-serveur.sql. Aucune fonction serveur (Edge) à redéployer : le jeu peut être publié avant ou après.\nbegin;\n'
    + classement() + direct() + reprise(structure(), 'publier_mon_profil') + '\n\ncommit;\n';
}

// Les paiements (décisions du 25/09/2026). Après 18-classement.sql, et après 8-paiements-test.sql et
// 9-paiements-production.sql. Le joueur supprime lui-même son compte (abonnement résilié d'abord), déclare son mois et
// son année de naissance une fois pour toutes ; les règles des deux environnements sont dans serveur/paiements.ts.
export function migrationPaiements(): string {
  return '-- Les paiements : suppression par le joueur, mois et année de naissance, vérifications Stripe. Après 18-classement.sql.\n'
    + '-- Puis redéployer les quatre fonctions de paiement (elles lisent les nouvelles colonnes).\nbegin;\n'
    + 'alter table public.comptes add column if not exists mois_de_naissance smallint;\n\n'
    + ['etat_du_compte', 'declarer_ma_naissance', 'declarer_mon_age', 'supprimer_mon_compte'].map((nom) => reprise(structure(), nom)).join('\n\n')
    + '\nrevoke execute on function public.declarer_ma_naissance(integer, integer) from public, anon;\n'
    + 'grant execute on function public.declarer_ma_naissance(integer, integer) to authenticated;\n'
    + paiementsSuppressionEtVerification() + '\ncommit;\n';
}

// Les points secondaires de l'audit (25/09/2026). Après 19-paiements.sql. Paquet, cadeau et vente sans doublon après
// une coupure de réseau ; filtres des paquets contrôlés ; fil d'activité réservé aux paquets ; code de secours unique
// et de l'alphabet du jeu ; vieux essais de récupération oubliés ; vente conclue gardée sans son vendeur ; histoire des
// prix fermée aux comptes inconnus ; la cote 2v2 d'une équipe dissoute effacée.
export function migrationPointsSecondaires(): string {
  return '-- Les points secondaires de l’audit. Après 19-paiements.sql. Redéployer aussi les fonctions combats et joutes-direct.\nbegin;\n'
    + INDEX_DU_CODE_SQL + '\n' + DEMANDES_TRAITEES_SQL + '\n' + VENDEUR_FACULTATIF_SQL + '\n\n'
    + 'drop function if exists public.ouvrir_un_paquet(text[]);\n'
    + 'drop function if exists public.reclamer_recompense(text, text[]);\n'
    + 'drop function if exists public.mettre_en_vente(text, text, integer, integer, integer);\n\n'
    + ['tirer_les_cartes', 'ouvrir_un_paquet', 'reclamer_recompense', 'mettre_en_vente', 'mes_encheres', 'historique_de_la_cote',
      'definir_un_code_de_secours', 'recuperer_par_code', 'activite_trouvaille'].map((nom) => reprise(structure(), nom)).join('\n\n')
    + '\n\n' + OUBLIER_L_EQUIPE_SQL + '\n'
    + '\nrevoke execute on function public.ouvrir_un_paquet(text[], uuid), public.reclamer_recompense(text, text[], uuid), public.mettre_en_vente(text, text, integer, integer, integer, uuid) from public, anon;\n'
    + 'grant execute on function public.ouvrir_un_paquet(text[], uuid), public.reclamer_recompense(text, text[], uuid), public.mettre_en_vente(text, text, integer, integer, integer, uuid) to authenticated;\n'
    + '\ncommit;\n';
}

export function joueursMaison(edition: IndexEdition): string {
  const joueurs = fabriquerLesJoueursMaison(edition.cartes).map((p) => ({ id: p.id, pseudo: p.pseudo, cote: p.cote, deck: p.deck, savoirs: p.savoirs, parades: p.parades }));
  return `-- ═════════════════════════════════════════════════════════════════════════════
-- PHILAMOTS — le serveur du jeu (2/3 : les ${joueurs.length} joueurs maison des joutes)
-- Fichier fabriqué par « npm run serveur:script » : ne pas le modifier à la main.
-- À coller dans Supabase APRÈS 1-structure.sql. Peut être relancé sans danger : il ne touche qu'aux joueurs maison.
-- Avant « Run » : le petit menu à gauche du bouton « Save » doit indiquer « Database », et non « Logs ».
-- Pour les retirer un jour, quand il y aura assez de vrais joueurs :   delete from public.profils where maison;
-- ═════════════════════════════════════════════════════════════════════════════

insert into public.profils (id, maison, pseudo, pseudo_cle, cote, deck, savoirs, parades)
select j.id, true, j.pseudo, public.cle_du_pseudo(j.pseudo), j.cote, j.deck, j.savoirs, j.parades
from jsonb_to_recordset(${texte(JSON.stringify(joueurs))}::jsonb) as j (id uuid, pseudo text, cote integer, deck jsonb, savoirs jsonb, parades jsonb)
on conflict (id) do update set pseudo = excluded.pseudo, pseudo_cle = excluded.pseudo_cle, cote = excluded.cote, deck = excluded.deck, savoirs = excluded.savoirs, parades = excluded.parades, maj_le = now();
`;
}

// Lancé directement (npm run serveur:script) : écrit les trois fichiers. Importé par les tests : ne fait rien.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const edition: IndexEdition = JSON.parse(readFileSync(path.join(RACINE, 'public', 'data', 'edition-1.index.json'), 'utf8'));
  writeFileSync(path.join(RACINE, 'serveur', '1-structure.sql'), structure());
  writeFileSync(path.join(RACINE, 'serveur', '2-joueurs-maison.sql'), joueursMaison(edition));
  writeFileSync(path.join(RACINE, 'serveur', '3-cartes.sql'), cartes(edition));
  writeFileSync(path.join(RACINE, 'serveur', '4-personnalisation.sql'), migrationPersonnalisation());
  writeFileSync(path.join(RACINE, 'serveur', '6-offres.sql'), migrationOffres());
  writeFileSync(path.join(RACINE, 'serveur', '8-integrite.sql'), migrationIntegrite());
  writeFileSync(path.join(RACINE, 'serveur', '9-combats.sql'), migrationCombats());
  writeFileSync(path.join(RACINE, 'serveur', '10-amis.sql'), migrationAmis());
  writeFileSync(path.join(RACINE, 'serveur', '11-equipes.sql'), migrationEquipes());
  writeFileSync(path.join(RACINE, 'serveur', '13-secours-et-parrainage.sql'), migrationSecoursEtParrainage());
  writeFileSync(path.join(RACINE, 'serveur', '14-fil-d-activite.sql'), migrationFilDActivite());
  writeFileSync(path.join(RACINE, 'serveur', '15-portraits-et-presence.sql'), migrationPortraits());
  writeFileSync(path.join(RACINE, 'serveur', '16-parrainage-confirme.sql'), migrationParrainageConfirme());
  writeFileSync(path.join(RACINE, 'serveur', '17-tenue-du-serveur.sql'), migrationTenueDuServeur());
  writeFileSync(path.join(RACINE, 'serveur', '18-classement.sql'), migrationClassement());
  writeFileSync(path.join(RACINE, 'serveur', '19-paiements.sql'), migrationPaiements());
  writeFileSync(path.join(RACINE, 'serveur', '20-points-secondaires.sql'), migrationPointsSecondaires());
  console.log('Scripts générés : structure, joueurs maison, cartes, personnalisation, offres, intégrité et combats (9-combats.sql).');
}
