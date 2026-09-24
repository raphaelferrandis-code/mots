-- ═════════════════════════════════════════════════════════════════════════════
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
  cote integer not null default 1000,
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
insert into public.mots_interdits (mot, entier) values ('con', true), ('cons', true), ('conne', true), ('connes', true), ('cul', true), ('culs', true), ('pute', true), ('putes', true), ('bite', true), ('bites', true), ('teub', true), ('zob', true), ('chatte', true), ('chattes', true), ('pd', true), ('pede', true), ('pedes', true), ('fdp', true), ('ntm', true), ('tg', true), ('gogol', true), ('garce', true), ('pouffe', true), ('chienne', true), ('chier', true), ('suce', true), ('baise', true), ('nique', true), ('niquer', true), ('sexe', true), ('sex', true), ('anal', true), ('anus', true), ('viol', true), ('pedo', true), ('milf', true), ('bdsm', true), ('cum', true), ('dick', true), ('cock', true), ('cunt', true), ('slut', true), ('shit', true), ('kys', true), ('bicot', true), ('youtre', true), ('kike', true), ('spic', true), ('chink', true), ('ss', true), ('kkk', true), ('isis', true), ('connard', false), ('connass', false), ('conass', false), ('salope', false), ('salaud', false), ('salopard', false), ('putain', false), ('encul', false), ('enfoir', false), ('batard', false), ('merd', false), ('chieur', false), ('chiasse', false), ('tapette', false), ('tafiole', false), ('tarlouze', false), ('tantouze', false), ('gouine', false), ('fiotte', false), ('lopette', false), ('pouffiass', false), ('poufiass', false), ('petasse', false), ('trouduc', false), ('couille', false), ('nichon', false), ('branl', false), ('suceu', false), ('baiseu', false), ('niquetam', false), ('abruti', false), ('debile', false), ('cretin', false), ('mongol', false), ('attarde', false), ('negr', false), ('nigg', false), ('bougnoul', false), ('bamboula', false), ('youpin', false), ('chinetoq', false), ('chintok', false), ('niakou', false), ('salearab', false), ('salejuif', false), ('salenoir', false), ('saleblanc', false), ('nazi', false), ('hitler', false), ('heil', false), ('fuhrer', false), ('genocid', false), ('terrorist', false), ('daesh', false), ('alqaida', false), ('alqaeda', false), ('jihad', false), ('djihad', false), ('mortaux', false), ('porn', false), ('penis', false), ('vagin', false), ('sodom', false), ('fellat', false), ('ejac', false), ('sperm', false), ('orgasm', false), ('violeu', false), ('violer', false), ('pedophil', false), ('incest', false), ('zoophil', false), ('hentai', false), ('gangbang', false), ('pussy', false), ('fuck', false), ('bitch', false), ('whore', false), ('fagg', false), ('asshole', false), ('bastard', false), ('wank', false), ('trann', false), ('suicid', false), ('admin', false), ('moderat', false), ('officiel', false);

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
  if char_length(propre) < 3 then return 'Il faut au moins 3 caractères.'; end if;
  if char_length(propre) > 16 then return 'Pas plus de 16 caractères.'; end if;
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
  if p_deck is null or p_savoirs is null or p_parades is null or jsonb_typeof(p_deck) <> 'array' or jsonb_array_length(p_deck) > 10 or jsonb_typeof(p_savoirs) <> 'object' or jsonb_typeof(p_parades) <> 'object'
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

  begin
    insert into public.profils (utilisateur, pseudo, pseudo_cle, deck, savoirs, parades)
    values (moi, propre, public.cle_du_pseudo(propre), p_deck, p_savoirs, p_parades)
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
  select coalesce(array_agg(defenseur), '{}') into recents from (select defenseur from public.joutes where attaquant = moi.id order by commencee_le desc limit 6) r;
  if to_regclass('public.combats') is not null then
    execute 'select coalesce(array_agg(defenseur), ''{}''::uuid[]) from (
      select defenseur from (
        select (etat->''adversaire''->''profil''->>''id'')::uuid defenseur, cree_le commencee_le
          from public.combats where utilisateur=$1 and etat->''adversaire''->>''type''=''joute''
        union all select defenseur, commencee_le from public.joutes where attaquant=$2
      ) historique order by commencee_le desc limit 6
    ) derniers' into recents using auth.uid(), moi.id;
  end if;

  foreach ecart in array array[-120, 0, 120] loop
    select p.* into choisi from (
      select * from public.profils
      where id <> moi.id and id <> all (pris) and id <> all (recents) and jsonb_array_length(deck) = 10
      order by abs(cote - (moi.cote + ecart)), id limit 8
    ) p order by random() limit 1;
    if not found then -- il ne reste que des adversaires récents : tant pis
      select p.* into choisi from (
        select * from public.profils
        where id <> moi.id and id <> all (pris) and jsonb_array_length(deck) = 10
        order by abs(cote - (moi.cote + ecart)), id limit 8
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
  if jsonb_array_length(public.deck_propre(auth.uid(), moi.deck)) <> 10
     or not exists (select 1 from public.profils where id=p_adversaire and jsonb_array_length(deck)=10)
  then raise exception 'Les deux decks doivent être complets.'; end if;
  perform public.autoriser_joute(auth.uid());
  if (select count(*) from public.joutes where attaquant = moi.id and commencee_le > now() - interval '1 hour') >= 40 then
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
  if not abandon and joute.commencee_le <= now() - interval '2 hours' then raise exception 'Cette joute a expiré : abandonne-la pour continuer.'; end if;

  select cote into cote_adverse from public.profils where id = joute.defenseur;
  cote_adverse := coalesce(joute.cote_adverse, cote_adverse);
  obtenu := case p_resultat when 'victoire' then 1 when 'nul' then 0.5 else 0 end;
  nouvelle := greatest(100, round(moi.cote + 32 * (obtenu - 1 / (1 + power(10::numeric, (cote_adverse - moi.cote)::numeric / 400)))));

  update public.profils set cote = nouvelle, jouees = jouees + 1, gagnees = gagnees + (p_resultat = 'victoire')::integer, maj_le = now() where id = moi.id;
  -- L'Encre de la joute, si le serveur tient la collection du joueur (même plafond quotidien que les duels d'entraînement).
  gain_enregistre := jsonb_build_object('avant', moi.cote, 'apres', nouvelle) || case when abandon
    then jsonb_build_object('encre', 0, 'reduite', false)
    else coalesce(public.recompenser(moi.utilisateur, 35, p_resultat), '{}'::jsonb) end;
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
  perform pg_advisory_xact_lock(20260923);
  delete from auth.users where id = auth.uid();
end $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- LES COLLECTIONS SUR LE SERVEUR (BRIEF-marche.md, §5a)
-- Le serveur tient l'Encre, la réserve de paquets, le deck et les timbres de chaque joueur, tire lui-même les
-- paquets (avec son horloge), verse l'Encre des duels, et importe une seule fois la collection de l'appareil.
-- Les règles sont celles de src/jeu/ ; les chiffres viennent de src/config/equilibrage.ts.
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Les tables ───────────────────────────────────────────────────────────────
-- Les cartes de l'édition (copie de public/data/edition-1.index.json, chargée par 3-cartes.sql).
create table if not exists public.cartes (
  id text primary key,
  rarete text not null,
  registre text[] not null default '{}'
);
create index if not exists cartes_par_rarete on public.cartes (rarete);

-- Le compte d'un joueur : ce qui a de la valeur, et que l'appareil ne fait plus qu'afficher.
create table if not exists public.comptes (
  utilisateur uuid primary key references auth.users (id) on delete cascade,
  encre integer not null default 0 check (encre >= 0),
  stock integer not null default 3,
  reference timestamptz not null default now(), -- début du compte à rebours du prochain paquet
  ouverts integer not null default 0,
  sans_legendaire integer not null default 0,
  deck jsonb not null default '[]'::jsonb,
  jour date, -- le jour des dernières victoires comptées (plafond quotidien des récompenses)
  victoires_du_jour integer not null default 0,
  importee_le timestamptz, -- la collection de l'appareil a été importée, une seule fois
  -- La version payante (décision n° 34, offre arrêtée le 22/09/2026 : voir BRIEF-version-payante.md).
  achat_unique boolean not null default false, -- la formule « Le nécessaire », versée une seule fois
  abonnement text not null default 'aucun' check (abonnement in ('aucun', 'collectionneur', 'expert')),
  abonnement_jusqu_au timestamptz,
  -- L'Encre reçue contre de l'argent (achetée, ou versée par la rente de la formule Expert). Elle ne peut servir
  -- qu'au marché, jamais à acheter un paquet. Anciennes bourses conservées pour compatibilité.
  encre_achetee integer not null default 0 check (encre_achetee >= 0),
  annee_de_naissance integer, -- demandée seulement à qui veut payer, pas à tout le monde
  rente_le date, -- le jour du dernier versement de la rente quotidienne
  code_hache text, -- l'empreinte du code de secours (recuperation.ts) ; jamais le code lui-même
  code_defini_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
-- (Pour un serveur installé avant : le code de secours, puis les colonnes de la version payante.)
alter table public.comptes add column if not exists code_hache text, add column if not exists code_defini_le timestamptz;
alter table public.comptes
  add column if not exists achat_unique boolean not null default false,
  add column if not exists abonnement text not null default 'aucun',
  add column if not exists abonnement_jusqu_au timestamptz,
  add column if not exists encre_achetee integer not null default 0,
  add column if not exists annee_de_naissance integer,
  add column if not exists rente_le date;
alter table public.comptes add column if not exists personnalisations text[] not null default '{}';
-- Le quota survit au retrait du profil classé ; il disparaît avec le compte complet.
alter table public.comptes add column if not exists debuts_joutes timestamptz[] not null default '{}';
create index if not exists comptes_par_code on public.comptes (code_hache);

-- Une ancienne sauvegarde doit être validée par l'administrateur : le client ne
-- peut pas prouver l'ancienneté ou les ressources d'un fichier local non signé.
create table if not exists public.importations_validees (
  utilisateur uuid primary key references auth.users(id) on delete cascade,
  sauvegarde jsonb not null,
  validee_le timestamptz not null default now()
);
alter table public.importations_validees enable row level security;
revoke all on public.importations_validees from public, anon, authenticated;

-- Les timbres d'un joueur : pour chaque carte, ses finitions et ses doublons (changés en Encre).
create table if not exists public.possessions (
  utilisateur uuid not null references public.comptes (utilisateur) on delete cascade,
  carte text not null,
  finitions jsonb not null default '{}'::jsonb,
  doublons integer not null default 0,
  obtenue_le timestamptz not null default now(),
  primary key (utilisateur, carte)
);

-- Les duels d'entraînement en cours : un ticket au départ, la récompense à l'arrivée.
create table if not exists public.duels (
  id bigint generated always as identity primary key,
  utilisateur uuid not null references public.comptes (utilisateur) on delete cascade,
  niveau text not null,
  commence_le timestamptz not null default now(),
  termine_le timestamptz
);
create index if not exists duels_par_joueur on public.duels (utilisateur, commence_le desc);
alter table public.duels add column if not exists resultat text, add column if not exists recompense jsonb,
  add column if not exists abandonne boolean not null default false;

-- La récupération par code transfère un compte à un autre joueur : ses timbres et ses duels doivent le suivre.
alter table public.possessions drop constraint if exists possessions_utilisateur_fkey,
  add constraint possessions_utilisateur_fkey foreign key (utilisateur) references public.comptes (utilisateur) on delete cascade on update cascade;
alter table public.duels drop constraint if exists duels_utilisateur_fkey,
  add constraint duels_utilisateur_fkey foreign key (utilisateur) references public.comptes (utilisateur) on delete cascade on update cascade;

alter table public.cartes enable row level security;
alter table public.comptes enable row level security;
alter table public.possessions enable row level security;
alter table public.duels enable row level security;
revoke all on public.cartes, public.comptes, public.possessions, public.duels from anon, authenticated;

-- ── Les aides internes (jamais appelées par le jeu) ─────────────────────────

alter table public.comptes
  add column if not exists progression_active boolean not null default false,
  add column if not exists progression_id uuid not null default gen_random_uuid(),
  add column if not exists xp bigint not null default 0,
  add column if not exists bonus_xp_reste integer not null default 0,
  add column if not exists combats_joues integer not null default 0,
  add column if not exists combats_gagnes integer not null default 0,
  add column if not exists parades_verifiees jsonb not null default '{}',
  add column if not exists heritage_progression jsonb not null default '{}',
  add column if not exists heritage_importe boolean not null default false;

create table if not exists public.apprentissages (
  utilisateur uuid not null references public.comptes(utilisateur) on update cascade on delete cascade,
  carte text not null references public.cartes(id),
  posees integer not null default 0 check (posees >= 0),
  reussites integer not null default 0 check (reussites between 0 and posees),
  maitrisee_le timestamptz,
  primary key(utilisateur, carte)
);
create table if not exists public.progressions_validees (
  utilisateur uuid primary key references public.comptes(utilisateur) on update cascade on delete cascade,
  sauvegarde jsonb not null
);
alter table public.apprentissages enable row level security;
alter table public.progressions_validees enable row level security;
revoke all on public.apprentissages, public.progressions_validees from public, anon, authenticated;

create or replace function public.savoirs_verifies(p_utilisateur uuid, p_deck jsonb) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(carte, jsonb_build_object('posees', posees, 'reussies', reussites)), '{}')
  from public.apprentissages where utilisateur=p_utilisateur and p_deck ? carte
$$;

create or replace function public.progression_du_compte(p_utilisateur uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select case when c.progression_active then jsonb_build_object(
    'version', 1, 'id', c.progression_id,
    'xp', c.xp + coalesce((c.heritage_progression->>'xp')::bigint, 0), 'bonusXpReste', c.bonus_xp_reste,
    'duels', jsonb_build_object('joues', c.combats_joues, 'gagnes', c.combats_gagnes),
    'parades', c.parades_verifiees, 'heritageImporte', c.heritage_importe,
    'apprentissages', (
      select coalesce(jsonb_object_agg(k.id, jsonb_build_object(
        'posees', coalesce(a.posees,0) + coalesce((h.v->>'posees')::integer,0),
        'reussites', coalesce(a.reussites,0) + coalesce((h.v->>'reussites')::integer,0),
        'maitriseeLe', coalesce((h.v->>'maitriseeLe')::bigint, (extract(epoch from a.maitrisee_le)*1000)::bigint)
      )), '{}')
      from (select carte id from public.apprentissages where utilisateur=c.utilisateur
            union select jsonb_object_keys(coalesce(c.heritage_progression->'apprentissages','{}'))) k
      left join public.apprentissages a on a.utilisateur=c.utilisateur and a.carte=k.id
      left join lateral (select c.heritage_progression->'apprentissages'->k.id v) h on true
    )
  ) else null end from public.comptes c where c.utilisateur=p_utilisateur
$$;

create or replace function public.gagner_xp(p_utilisateur uuid, p_base integer, p_combat boolean) returns integer
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; gain integer := p_base; centiemes integer;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if not found or not c.progression_active then return 0; end if;
  if p_base is null or p_base < 0 then raise exception 'Gain d’expérience invalide.'; end if;
  centiemes := c.bonus_xp_reste;
  if p_combat and public.niveau(c) >= 2 then
    centiemes := centiemes + p_base * 25;
    gain := gain + centiemes / 100;
    centiemes := centiemes % 100;
  end if;
  update public.comptes set xp=xp+gain, bonus_xp_reste=centiemes where utilisateur=p_utilisateur;
  return gain;
end $$;

create or replace function public.noter_reponse_verifiee(p_utilisateur uuid, p_reponse jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; cle text := p_reponse->>'carte'; juste boolean := (p_reponse->>'reussie')::boolean;
  rarete text := p_reponse->>'rarete'; avant jsonb; ancienne integer;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if (p_reponse->>'apprentissage')::boolean then
    ancienne := coalesce((c.heritage_progression->'apprentissages'->cle->>'reussites')::integer,0);
    insert into public.apprentissages(utilisateur, carte, posees, reussites, maitrisee_le)
      values(p_utilisateur, cle, 1, juste::integer, case when juste and ancienne+1 >= 5 then now() end)
    on conflict (utilisateur,carte) do update set posees=public.apprentissages.posees+1,
      reussites=public.apprentissages.reussites+juste::integer,
      maitrisee_le=coalesce(public.apprentissages.maitrisee_le, case when juste and public.apprentissages.reussites+ancienne+1 >= 5 then now() end);
  end if;
  if (p_reponse->>'parade')::boolean then
    avant := coalesce(c.parades_verifiees->rarete,'{"posees":0,"reussies":0}');
    update public.comptes set parades_verifiees=jsonb_set(parades_verifiees,array[rarete],jsonb_build_object(
      'posees',(avant->>'posees')::integer+1,'reussies',(avant->>'reussies')::integer+juste::integer)) where utilisateur=p_utilisateur;
  end if;
  update public.profils p set savoirs=public.savoirs_verifies(p_utilisateur,p.deck),
    parades=(select parades_verifiees from public.comptes where utilisateur=p_utilisateur), maj_le=now() where p.utilisateur=p_utilisateur;
end $$;

-- Seul l'administrateur peut approuver des progrès issus de l'ancien client.
-- Ils sont conservés pour le profil personnel ; le double classé n'utilise que les réponses vérifiées.
create or replace function public.importer_progression_validee(p_utilisateur uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare archive jsonb; c public.comptes%rowtype; a record;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if not found or c.heritage_importe then raise exception 'Progression déjà importée ou compte absent.'; end if;
  select sauvegarde into archive from public.progressions_validees where utilisateur=p_utilisateur for update;
  if not found then raise exception 'La progression doit être approuvée.'; end if;
  if coalesce(archive->>'xp','') !~ '^[0-9]{1,9}$' or jsonb_typeof(archive->'apprentissages') is distinct from 'object' then raise exception 'Archive de progression invalide.'; end if;
  for a in select key,value from jsonb_each(archive->'apprentissages') loop
    if not exists(select 1 from public.cartes where id=a.key)
      or coalesce(a.value->>'posees','') !~ '^[0-9]{1,8}$' or coalesce(a.value->>'reussites','') !~ '^[0-9]{1,8}$'
    then raise exception 'Apprentissage invalide.'; end if;
    if (a.value->>'reussites')::integer > (a.value->>'posees')::integer
      or (a.value->>'maitriseeLe' is not null and (a.value->>'maitriseeLe') !~ '^[0-9]{1,15}$') then raise exception 'Apprentissage invalide.'; end if;
  end loop;
  update public.comptes set heritage_progression=jsonb_build_object('xp',(archive->>'xp')::bigint,'apprentissages',archive->'apprentissages'), heritage_importe=true where utilisateur=p_utilisateur;
  delete from public.progressions_validees where utilisateur=p_utilisateur;
end $$;

create or replace function public.autoriser_joute(p_utilisateur uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare debuts timestamptz[];
begin
  select debuts_joutes into debuts from public.comptes where utilisateur=p_utilisateur for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  select coalesce(array_agg(d), '{}') into debuts from unnest(debuts) d where d > now() - interval '1 hour';
  if cardinality(debuts) >= 40 then raise exception 'Trop de joutes en peu de temps : fais une pause.'; end if;
  update public.comptes set debuts_joutes = array_append(debuts, now()) where utilisateur=p_utilisateur;
end $$;

create or replace function public.nombre_entier(t text) returns bigint language sql immutable set search_path = ''
as $$ select case when t ~ '^[0-9]{1,15}$' then t::bigint end $$;

-- Le niveau d'un compte : 0 gratuit, 1 « Le nécessaire », 2 « Collectionneur », 3 « Expert ». Un abonnement échu
-- retombe au niveau de l'achat unique, s'il a été fait. C'est la seule fonction qui dit ce qu'un joueur a payé.
create or replace function public.niveau(c public.comptes) returns integer language sql stable set search_path = ''
as $$ select case
  when c.abonnement = 'expert' and c.abonnement_jusqu_au > now() then 3
  when c.abonnement = 'collectionneur' and c.abonnement_jusqu_au > now() then 2
  when c.achat_unique then 1
  else 0 end $$;

-- La rente quotidienne de la formule « Expert » : de l'Encre qui ne sert qu'au marché, comme l'Encre achetée.
create or replace function public.verser_la_rente(p_utilisateur uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  aujourd_hui date := (now() at time zone 'utc')::date;
begin
  select * into c from public.comptes where utilisateur = p_utilisateur for update;
  if not found or public.niveau(c) < 3 then return; end if;
  if c.rente_le is not null and c.rente_le >= aujourd_hui then return; end if;
  update public.comptes set encre_achetee = encre_achetee + 0, rente_le = aujourd_hui, maj_le = now()
    where utilisateur = p_utilisateur;
end $$;


alter table public.comptes
  add column if not exists cadeau_achat_reclame boolean not null default false,
  add column if not exists reserve_hebdo integer not null default 0,
  add column if not exists prochain_hebdo timestamptz;

-- Calcule aussi les droits gagnés hors connexion, sans créditer après l'expiration.
create or replace function public.actualiser_offres(c public.comptes) returns public.comptes
language plpgsql set search_path = '' as $$
declare limite timestamptz; nombre integer;
begin
  if c.abonnement = 'aucun' or c.abonnement_jusqu_au is null or c.prochain_hebdo is null then return c; end if;
  limite := least(now(), c.abonnement_jusqu_au - interval '1 microsecond');
  if c.prochain_hebdo <= limite then
    nombre := floor(extract(epoch from (limite - c.prochain_hebdo)) / (7 * 86400))::integer + 1;
    c.reserve_hebdo := c.reserve_hebdo + nombre;
    c.prochain_hebdo := c.prochain_hebdo + nombre * interval '7 days';
  end if;
  return c;
end $$;


-- Un moment en millisecondes, comme le jeu compte le temps.
create or replace function public.en_millisecondes(t timestamptz) returns bigint language sql immutable set search_path = ''
as $$ select (extract(epoch from t) * 1000)::bigint $$;

-- L'état du compte, tel que le jeu l'affiche (voir src/jeu/synchronisation.ts).
-- (Volontairement pas « stable » : une fonction stable lirait l'état d'avant l'instruction qui l'appelle.)
create or replace function public.etat_du_compte(p_utilisateur uuid) returns jsonb
language sql security definer set search_path = ''
as $$
  select jsonb_build_object(
    'encre', c.encre,
    'achatsPersonnalisation', to_jsonb(c.personnalisations),
    'paquets', jsonb_build_object('stock', c.stock, 'reference', public.en_millisecondes(c.reference), 'ouverts', c.ouverts, 'sansLegendaire', c.sans_legendaire),
    'deck', c.deck,
    'progression', public.progression_du_compte(p_utilisateur),
    'plafondDuJour', jsonb_build_object('jour', coalesce(c.jour::text, ''), 'victoires', c.victoires_du_jour),
    'classementPersonnel', (select jsonb_build_object('pseudo', p.pseudo, 'cote', p.cote, 'jouees', p.jouees, 'gagnees', p.gagnees) from public.profils p where p.utilisateur = c.utilisateur),
    'codeDeSecoursLe', public.en_millisecondes(c.code_defini_le),
    'formule', jsonb_build_object(
      'niveau', public.niveau(c),
      'achatUnique', c.achat_unique,
      'abonnement', c.abonnement,
      'jusquAu', public.en_millisecondes(c.abonnement_jusqu_au),
      'encreAchetee', c.encre_achetee,
      'anneeDeNaissance', c.annee_de_naissance,
      'cadeauAchatReclame', c.cadeau_achat_reclame,
      'paquetsHebdomadaires', (public.actualiser_offres(c)).reserve_hebdo,
      'prochainPaquetHebdomadaire', public.en_millisecondes((public.actualiser_offres(c)).prochain_hebdo)
    ),
    'maintenant', public.en_millisecondes(now()),
    'cartes', (select coalesce(jsonb_object_agg(p.carte, jsonb_build_object('obtenueLe', public.en_millisecondes(p.obtenue_le), 'doublons', p.doublons, 'finitions', p.finitions)), '{}'::jsonb)
               from public.possessions p where p.utilisateur = c.utilisateur)
  )
  from public.comptes c where c.utilisateur = p_utilisateur
$$;

-- La recharge des paquets (src/jeu/recharge.ts) : un paquet toutes les 10 minutes, 10 en réserve au plus.
create or replace function public.recharger(c public.comptes) returns public.comptes
language plpgsql stable set search_path = ''
as $$
declare
  gagnes integer;
  limite timestamptz;
  -- La version payante (décision n° 34) : un paquet plus souvent, et une réserve plus grande.
  paye integer := public.niveau(c);
  minutes integer := case when paye >= 2 then 8 else 10 end;
  maximum integer := case when paye >= 2 then 15 else 10 end;
begin
  if c.abonnement <> 'aucun' and c.abonnement_jusqu_au is not null and c.reference < c.abonnement_jusqu_au and c.abonnement_jusqu_au <= now() then
    limite := c.abonnement_jusqu_au;
    if c.stock < 15 then
      gagnes := floor(extract(epoch from (limite - c.reference)) / (8 * 60));
      c.stock := least(15, c.stock + greatest(0, gagnes));
    end if;
    c.reference := limite;
  end if;
  -- Le stock déjà acquis reste disponible après expiration.
  -- Réserve pleine : le compte à rebours est à l'arrêt. Il repart quand un paquet est ouvert.
  if c.stock >= maximum or now() < c.reference then c.reference := now(); return c; end if;
  gagnes := floor(extract(epoch from (now() - c.reference)) / (minutes * 60));
  c.stock := least(maximum, c.stock + gagnes);
  -- Le temps déjà écoulé vers le paquet suivant est conservé, sauf si la réserve vient de se remplir.
  c.reference := case when c.stock >= maximum then now() else c.reference + gagnes * interval '1 minute' * minutes end;
  return c;
end $$;

-- Un deck propre : des cartes possédées, chacune une fois, dans l'ordre donné, 10 au plus.
create or replace function public.deck_propre(p_utilisateur uuid, p_deck jsonb) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(i.id order by i.ordinalite), '[]'::jsonb)
  from (
    select u.id, u.ordinalite from (
      select distinct on (e.value) e.value as id, e.ordinality as ordinalite
      from jsonb_array_elements_text(case when jsonb_typeof(p_deck) = 'array' then p_deck else '[]'::jsonb end) with ordinality as e
      order by e.value, e.ordinality
    ) u
    where exists (select 1 from public.possessions p where p.utilisateur = p_utilisateur and p.carte = u.id)
    order by u.ordinalite
    limit 10
  ) i
$$;

-- Le double suit le deck du compte, notamment après la mise en vente du dernier exemplaire.
create or replace function public.actualiser_deck_public() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profils set deck = new.deck, maj_le = now() where utilisateur = new.utilisateur;
  if new.progression_active then
    update public.profils set savoirs=public.savoirs_verifies(new.utilisateur,new.deck),parades=new.parades_verifiees where utilisateur=new.utilisateur;
  end if;
  return new;
end $$;
drop trigger if exists deck_public_a_jour on public.comptes;
create trigger deck_public_a_jour after update of deck on public.comptes
  for each row execute function public.actualiser_deck_public();
update public.profils p set deck = public.deck_propre(p.utilisateur, p.deck) where p.utilisateur is not null;

-- Des finitions propres : seulement les finitions du jeu, avec des nombres entiers positifs ; à défaut, une Normale.
create or replace function public.finitions_propres(j jsonb) returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(e.key, least(public.nombre_entier(e.value), 10000)) filter (where e.key in ('Normale', 'Brillante', 'Holographique') and public.nombre_entier(e.value) > 0),
    '{"Normale": 1}'::jsonb)
  from jsonb_each_text(case when jsonb_typeof(j) = 'object' then j else '{}'::jsonb end) e
$$;

-- La récompense d'un duel ou d'une joute (src/jeu/progression.ts) : les 3 premières victoires du jour
-- rapportent toute leur Encre, les suivantes 25 % ; une défaite 5. Rien si le joueur n'a pas de compte ici.
create or replace function public.recompenser(p_utilisateur uuid, p_pleine integer, p_resultat text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  aujourd_hui date := (now() at time zone 'utc')::date;
  victoires integer;
  gagne boolean := p_resultat = 'victoire';
  reduite boolean;
  gain integer;
begin
  select * into c from public.comptes where utilisateur = p_utilisateur for update;
  if not found then return null; end if;
  victoires := case when c.jour = aujourd_hui then c.victoires_du_jour else 0 end;
  reduite := gagne and victoires >= 3;
  gain := case when not gagne then 5 when reduite then greatest(1, round(p_pleine * 0.25)::integer) else p_pleine end;
  -- Ancien multiplicateur neutralisé : aucune offre ne donne de bonus d'Encre.
  if public.niveau(c) >= 2 then gain := gain * 1; end if;
  update public.comptes set encre = encre + gain, jour = aujourd_hui, victoires_du_jour = victoires + gagne::integer, maj_le = now() where utilisateur = p_utilisateur;
  return jsonb_build_object('encre', gain, 'reduite', reduite);
end $$;

-- Le tirage d'un paquet (src/jeu/paquets.ts), rangé dans la collection (src/jeu/partie.ts). L'appelant a vérifié la
-- réserve ou l'Encre, et verrouillé le compte. Rend les cartes tirées, avec ce qu'elles apportent.
create or replace function public.tirer_les_cartes(p_utilisateur uuid, p_masques text[], p_mode text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  emplacements jsonb := '[{"Commune":70,"Peu commune":25,"Rare":5},{"Commune":70,"Peu commune":25,"Rare":5},{"Commune":70,"Peu commune":25,"Rare":5},{"Peu commune":75,"Rare":20,"Épique":5},{"Rare":74,"Épique":22,"Légendaire":4}]'::jsonb;
  chances jsonb;
  numero integer := 0;
  dernier boolean;
  garantie boolean;
  depart boolean;
  masques text[] := coalesce(p_masques, '{}');
  seuil numeric;
  rarete text;
  r text;
  ordre text[];
  id_choisie text;
  rarete_choisie text;
  pris text[] := '{}';
  finition text;
  tirage double precision;
  possession public.possessions%rowtype;
  gain integer;
  tirees jsonb := '[]'::jsonb;
  legendaire boolean := false;
begin
  select * into c from public.comptes where utilisateur = p_utilisateur;
  -- Au plus tard au 40e paquet sans Légendaire, la dernière carte en est une.
  if p_mode = 'achat' then emplacements := '[{"Hors-série":100}]'::jsonb;
  elsif p_mode = 'hebdomadaire' then
    emplacements := jsonb_set(emplacements, array[(jsonb_array_length(emplacements)-1)::text], '{"Épique":89,"Légendaire":10,"Hors-série":1}'::jsonb);
  elsif p_mode <> 'normal' then raise exception 'Tirage inconnu.';
  end if;
  garantie := p_mode = 'normal' and c.sans_legendaire + 1 >= 40;
  -- Les 3 paquets de départ ne contiennent que des cartes nouvelles, pour composer un deck tout de suite.
  depart := p_mode = 'normal' and c.ouverts < 3;

  for chances in select * from jsonb_array_elements(emplacements) loop
    numero := numero + 1;
    dernier := numero = jsonb_array_length(emplacements);

    -- La rareté de l'emplacement, selon ses chances.
    seuil := random() * (select sum(e.value::numeric) from jsonb_each_text(chances) e);
    rarete := null;
    foreach r in array array['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire', 'Hors-série'] loop
      seuil := seuil - coalesce((chances ->> r)::numeric, 0);
      if seuil < 0 then rarete := r; exit; end if;
    end loop;
    if rarete is null then rarete := 'Commune'; end if;
    if dernier and p_mode = 'normal' then
      -- La garantie de Légendaire passe avant tout ; sinon, une toute petite chance de carte Hors-série.
      if garantie then rarete := 'Légendaire';
      elsif exists (select 1 from public.cartes k where k.rarete = 'Hors-série' and not (k.registre && masques)) and random() < 0.001 then rarete := 'Hors-série';
      end if;
    end if;

    -- La carte : de cette rareté, sinon de la plus proche ; jamais deux fois la même dans un paquet.
    ordre := case rarete when 'Commune' then array['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'] when 'Peu commune' then array['Peu commune', 'Commune', 'Rare', 'Épique', 'Légendaire'] when 'Rare' then array['Rare', 'Peu commune', 'Commune', 'Épique', 'Légendaire'] when 'Épique' then array['Épique', 'Rare', 'Peu commune', 'Commune', 'Légendaire'] when 'Légendaire' then array['Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] when 'Hors-série' then array['Hors-série', 'Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] end;
    if p_mode = 'achat' or (p_mode = 'hebdomadaire' and dernier) then
      -- Ne jamais dégrader la garantie en cas de catalogue ou filtre incompatible.
      ordre := array[rarete];
    end if;
    id_choisie := null;
    foreach r in array ordre loop
      select k.id, k.rarete into id_choisie, rarete_choisie from public.cartes k
      where k.rarete = r and not (k.registre && masques) and k.id <> all (pris)
        and (not depart or not exists (select 1 from public.possessions p where p.utilisateur = p_utilisateur and p.carte = k.id))
      order by random() limit 1;
      if found then exit; end if;
    end loop;
    if id_choisie is null then raise exception 'Aucune carte disponible pour ce tirage.'; end if;
    pris := pris || id_choisie;

    -- La finition, tirée à part (une Hors-série a sa propre impression : pas de finition).
    if rarete_choisie = 'Hors-série' then finition := 'Normale';
    else
      tirage := random();
      finition := case when tirage < 0.0125 then 'Holographique' when tirage < 0.09583333333333333 then 'Brillante' else 'Normale' end;
    end if;
    if rarete_choisie = 'Légendaire' then legendaire := true; end if;

    -- Rangement : carte nouvelle, finition nouvelle, ou vrai doublon changé en Encre.
    select * into possession from public.possessions p where p.utilisateur = p_utilisateur and p.carte = id_choisie for update;
    if not found then
      insert into public.possessions (utilisateur, carte, finitions) values (p_utilisateur, id_choisie, jsonb_build_object(finition, 1));
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', true, 'nouvelleFinition', true, 'encre', 0);
    elsif coalesce((possession.finitions ->> finition)::integer, 0) = 0 then
      update public.possessions set finitions = finitions || jsonb_build_object(finition, 1) where utilisateur = p_utilisateur and carte = id_choisie;
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', false, 'nouvelleFinition', true, 'encre', 0);
    else
      gain := (case rarete_choisie when 'Commune' then 1 when 'Peu commune' then 3 when 'Rare' then 10 when 'Épique' then 30 when 'Légendaire' then 100 when 'Hors-série' then 500 else 0 end)
            * (case finition when 'Normale' then 1 when 'Brillante' then 3 when 'Holographique' then 10 else 1 end)
            * (case when public.niveau(c) >= 2 then 1 else 1 end);
      update public.possessions
        set doublons = doublons + 1
        where utilisateur = p_utilisateur and carte = id_choisie;
      c.encre := c.encre + gain;
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', false, 'nouvelleFinition', false, 'encre', gain);
    end if;
  end loop;

  update public.comptes
    set encre = c.encre, ouverts = ouverts + case when p_mode = 'normal' then 1 else 0 end, sans_legendaire = case when p_mode <> 'normal' then sans_legendaire when legendaire then 0 else sans_legendaire + 1 end, maj_le = now()
    where utilisateur = p_utilisateur;
  perform public.gagner_xp(p_utilisateur, case when p_mode='achat' then 0 else 20 end
    + 15 * (select count(*)::integer from jsonb_array_elements(tirees) t where (t->>'nouvelle')::boolean), false);
  return tirees;
end $$;

-- Compatibilité de l’ouverture ordinaire : le client ne choisit jamais les probabilités.
create or replace function public.tirer_un_paquet(p_utilisateur uuid, p_masques text[]) returns jsonb
language sql security definer set search_path = '' as $$
  select public.tirer_les_cartes(p_utilisateur, p_masques, 'normal')
$$;

-- ── Les fonctions appelées par le jeu ────────────────────────────────────────

-- Le compte du joueur, ou rien s'il n'en a pas encore ici. (Au passage, les enchères échues sont clôturées : un vendeur
-- retrouve ainsi son Encre en ouvrant le jeu, sans que personne ait à visiter le marché.)
create or replace function public.mon_compte() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  perform public.verser_la_rente(auth.uid());
  return public.etat_du_compte(auth.uid());
end $$;

-- Un compte neuf : les 3 paquets de départ, rien d'autre.
create or replace function public.ouvrir_mon_compte() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  insert into public.comptes (utilisateur, stock) values (auth.uid(), 3) on conflict (utilisateur) do nothing;
  return public.etat_du_compte(auth.uid());
end $$;

-- L'importation, une seule fois, de la collection qui vivait sur l'appareil. Ce qui dépasse le plausible est ramené
-- aux bornes : au plus 200 paquets par jour depuis la création de la partie, 5 cartes par paquet (les plus
-- anciennes d'abord), et 2000 + 30 Encre par paquet.
create or replace function public.importer_ma_collection(p_cree_le bigint, p_encre integer, p_paquets jsonb, p_cartes jsonb, p_deck jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  jours integer;
  ouverts integer;
  carte record;
  validee jsonb;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(moi::text, 1));
  if exists (select 1 from public.comptes where utilisateur = moi) then raise exception 'Ce compte a déjà une collection.'; end if;
  select sauvegarde into validee from public.importations_validees where utilisateur = moi for update;
  if not found then raise exception 'Cette ancienne collection doit être validée avant son transfert. Conserve son export et contacte le support.'; end if;
  -- Seule la copie approuvée fait foi ; les paramètres du navigateur sont ignorés.
  p_cree_le := (validee ->> 'creeLe')::bigint;
  p_encre := (validee ->> 'encre')::integer;
  p_paquets := validee -> 'paquets';
  p_cartes := validee -> 'cartes';
  p_deck := validee -> 'deck';
  if jsonb_typeof(p_paquets) <> 'object' or jsonb_typeof(p_cartes) <> 'object' or jsonb_typeof(p_deck) <> 'array' or pg_column_size(p_cartes) > 3000000 then
    raise exception 'Cette sauvegarde ne peut pas être importée.';
  end if;

  jours := greatest(1, ceil(extract(epoch from (now() - to_timestamp(least(coalesce(p_cree_le, 0), public.en_millisecondes(now())) / 1000.0))) / 86400));
  ouverts := least(greatest(coalesce(public.nombre_entier(p_paquets ->> 'ouverts'), 0), 0), 3 + jours * 200);

  insert into public.comptes (utilisateur, encre, stock, reference, ouverts, sans_legendaire, importee_le) values (
    moi,
    least(greatest(coalesce(p_encre, 0), 0), 2000 + ouverts * 30),
    least(greatest(coalesce(public.nombre_entier(p_paquets ->> 'stock'), 0), 0), 10),
    least(to_timestamp(coalesce(public.nombre_entier(p_paquets ->> 'reference'), 0) / 1000.0), now()),
    ouverts,
    least(greatest(coalesce(public.nombre_entier(p_paquets ->> 'sansLegendaire'), 0), 0), 40),
    now());

  for carte in
    select e.key as id, e.value as v from jsonb_each(p_cartes) e
    join public.cartes k on k.id = e.key
    where jsonb_typeof(e.value) = 'object'
    order by coalesce(public.nombre_entier(e.value ->> 'obtenueLe'), 0), e.key
    limit ouverts * 5
  loop
    insert into public.possessions (utilisateur, carte, finitions, doublons, obtenue_le) values (
      moi, carte.id,
      public.finitions_propres(carte.v -> 'finitions'),
      least(coalesce(public.nombre_entier(carte.v ->> 'doublons'), 0), 10000),
      least(to_timestamp(coalesce(public.nombre_entier(carte.v ->> 'obtenueLe'), 0) / 1000.0), now()));
  end loop;
  update public.comptes set deck = public.deck_propre(moi, p_deck) where utilisateur = moi;
  delete from public.importations_validees where utilisateur = moi;
  return public.etat_du_compte(moi);
end $$;

-- Un paquet de la réserve. « p_masques » : les registres que le joueur a choisi de ne plus voir (Familier, Injurieux).
create or replace function public.ouvrir_un_paquet(p_masques text[]) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  tirees jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  c := public.recharger(c);
  if c.stock < 1 then raise exception 'Aucun paquet en réserve pour l''instant.'; end if;
  update public.comptes set stock = c.stock - 1, reference = c.reference where utilisateur = c.utilisateur;
  tirees := public.tirer_un_paquet(c.utilisateur, p_masques);
  return jsonb_build_object('cartes', tirees, 'etat', public.etat_du_compte(c.utilisateur));
end $$;

-- Depuis le 23/09/2026, aucune Encre ne permet d’acheter un paquet.
-- Supprime aussi la fonction des serveurs déjà installés.
drop function if exists public.acheter_un_paquet(text[]);

-- L'âge, déclaré par le joueur au moment où il regarde la version payante (décision du 22/09/2026 : le paiement
-- est réservé aux majeurs). On ne garde que l'année : c'est assez pour savoir, et c'est le moins qu'on puisse demander.
create or replace function public.declarer_mon_age(p_annee integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  annee_actuelle integer := extract(year from now())::integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_annee is null or p_annee < annee_actuelle - 120 or p_annee > annee_actuelle then raise exception 'Cette année de naissance n''est pas possible.'; end if;
  update public.comptes set annee_de_naissance = p_annee, maj_le = now() where utilisateur = auth.uid();
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  return public.etat_du_compte(auth.uid());
end $$;

-- Le deck : seulement des cartes possédées, 10 au plus. Rend le deck tel qu'il est enregistré.
create or replace function public.changer_de_deck(p_deck jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  propre jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if not exists (select 1 from public.comptes where utilisateur = auth.uid()) then raise exception 'Ouvre d''abord ton compte.'; end if;
  propre := public.deck_propre(auth.uid(), p_deck);
  update public.comptes set deck = propre, maj_le = now() where utilisateur = auth.uid();
  return propre;
end $$;

-- Un duel d'entraînement commence : un ticket, comme pour les joutes (au plus 40 par heure).
create or replace function public.commencer_un_duel(p_niveau text) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  ticket bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if p_niveau is null or p_niveau not in ('Facile', 'Normal', 'Difficile') then raise exception 'Niveau inconnu.'; end if;
  if exists(select 1 from public.comptes where utilisateur=auth.uid() and progression_active) then raise exception 'Utilise le serveur des combats vérifiés.'; end if;
  if not exists (select 1 from public.comptes where utilisateur = auth.uid()) then raise exception 'Ouvre d''abord ton compte.'; end if;
  if (select count(*) from public.duels where utilisateur = auth.uid() and commence_le > now() - interval '1 hour') >= 40 then
    raise exception 'Trop de duels en peu de temps : fais une pause.';
  end if;
  perform public.terminer_un_duel(id, 'abandon') from public.duels where utilisateur=auth.uid() and termine_le is null order by id;
  insert into public.duels (utilisateur, niveau) values (auth.uid(), p_niveau) returning id into ticket;
  return ticket;
end $$;

-- Un duel d'entraînement se termine : l'Encre est versée par le serveur.
create or replace function public.terminer_un_duel(p_ticket bigint, p_resultat text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  duel public.duels%rowtype;
  gain_enregistre jsonb;
  abandon boolean := p_resultat = 'abandon';
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if exists(select 1 from public.comptes where utilisateur=auth.uid() and progression_active) then raise exception 'Utilise le serveur des combats vérifiés.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if p_resultat is null or p_resultat not in ('victoire', 'defaite', 'nul', 'abandon') then raise exception 'Résultat inconnu.'; end if;
  if abandon then p_resultat := 'defaite'; end if;
  select * into duel from public.duels where id = p_ticket and utilisateur = auth.uid() for update;
  if not found then raise exception 'Ce duel ne peut plus être enregistré.'; end if;
  if duel.termine_le is not null then
    if duel.resultat is distinct from p_resultat or duel.abandonne <> abandon or duel.recompense is null
    then raise exception 'Ce duel est déjà enregistré avec un autre résultat.'; end if;
    return duel.recompense || jsonb_build_object('etat', public.etat_du_compte(auth.uid()));
  end if;
  if not abandon and duel.commence_le <= now() - interval '2 hours' then raise exception 'Ce duel a expiré : abandonne-le pour continuer.'; end if;
  gain_enregistre := case when abandon then jsonb_build_object('encre', 0, 'reduite', false)
    else public.recompenser(auth.uid(), case duel.niveau when 'Facile' then 20 when 'Normal' then 30 when 'Difficile' then 45 else 0 end, p_resultat) end;
  update public.duels set termine_le = now(), resultat = p_resultat, recompense = gain_enregistre, abandonne = abandon where id = duel.id;
  return coalesce(gain_enregistre, '{}'::jsonb) || jsonb_build_object('etat', public.etat_du_compte(auth.uid()));
end $$;

create or replace function public.acheter_personnalisation(p_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'L’Encre est réservée aux enchères.';
end $$;

-- Les droits ne sont activés que par une écriture administrative, jamais par le client.
-- Régler l'ancien rythme avant de modifier les dates évite une recharge rétroactive au tarif abonné.
create or replace function public.changement_offre() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ancien public.comptes;
begin
  if tg_op = 'UPDATE' then
    ancien := public.actualiser_offres(old);
    new.reserve_hebdo := ancien.reserve_hebdo;
    new.prochain_hebdo := ancien.prochain_hebdo;
    ancien := public.recharger(ancien);
    if new.stock = old.stock then new.stock := ancien.stock; end if;
    new.reference := now();
  end if;
  if new.abonnement <> 'aucun' and new.abonnement_jusqu_au > now() then
    if tg_op = 'INSERT' then new.prochain_hebdo := now();
    elsif old.abonnement = 'aucun' or old.abonnement_jusqu_au is null or old.abonnement_jusqu_au <= now() or new.prochain_hebdo is null then
      new.prochain_hebdo := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists changement_offre on public.comptes;
create trigger changement_offre before insert or update of abonnement, abonnement_jusqu_au on public.comptes
for each row execute function public.changement_offre();
-- Les comptes de test existants démarrent leurs droits hebdomadaires à la migration, sans rétroactivité.
update public.comptes set prochain_hebdo = now()
where abonnement <> 'aucun' and abonnement_jusqu_au > now() and prochain_hebdo is null;

create or replace function public.reclamer_recompense(p_type text, p_masques text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.comptes; tirees jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Compte introuvable.'; end if;
  if p_type = 'achat' then
    if not c.achat_unique or c.cadeau_achat_reclame then raise exception 'Aucune Hors-série à recevoir.'; end if;
    update public.comptes set cadeau_achat_reclame = true where utilisateur = c.utilisateur;
  elsif p_type = 'hebdomadaire' then
    c := public.actualiser_offres(c);
    if c.reserve_hebdo < 1 then raise exception 'Aucun paquet hebdomadaire disponible.'; end if;
    update public.comptes set reserve_hebdo = c.reserve_hebdo - 1, prochain_hebdo = c.prochain_hebdo where utilisateur = c.utilisateur;
  else raise exception 'Récompense inconnue.';
  end if;
  tirees := public.tirer_les_cartes(c.utilisateur, p_masques, p_type);
  return jsonb_build_object('cartes', tirees, 'etat', public.etat_du_compte(c.utilisateur));
end $$;



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
as $$ select case when c ~ '^(PHIL|MOTS)[A-Z0-9]{20}$' then substr(c, 5) else c end from (select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) as c) t $$;

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
  if char_length(propre) <> 20 then raise exception 'Ce code ne peut pas servir de code de secours.'; end if;
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
  if (select count(*) from public.tentatives_de_recuperation where utilisateur = moi and quand > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('refus', 'Trop d''essais : attends une heure.');
  end if;
  insert into public.tentatives_de_recuperation (utilisateur) values (moi);
  select utilisateur into ancien from public.comptes where code_hache is not null and code_hache = public.empreinte_du_code(p_code);
  if not found then return jsonb_build_object('refus', 'Ce code ne correspond à aucune collection.'); end if;
  if ancien <> moi then
    perform pg_advisory_xact_lock(20260923);
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


-- ═════════════════════════════════════════════════════════════════════════════
-- LE MARCHÉ : LES ENCHÈRES ENTRE JOUEURS (BRIEF-marche.md, décisions n° 37 à 42)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Les tables ───────────────────────────────────────────────────────────────
-- La version payante (décision n° 34) : pas de limite au marché. Personne ne l'a encore ; la colonne est prête.
alter table public.comptes add column if not exists payant boolean not null default false;
-- Le cachet de provenance : le pseudonyme du vendeur, sur un timbre acheté au marché.
alter table public.possessions add column if not exists provenance text;

create table if not exists public.encheres (
  id bigint generated always as identity primary key,
  vendeur uuid not null references public.comptes (utilisateur) on delete cascade on update cascade,
  carte text not null,
  finition text not null,
  obtenue_le timestamptz not null, -- pour rendre le timbre tel quel s'il n'est pas vendu
  mise_de_depart integer not null check (mise_de_depart >= 1),
  achat_immediat integer check (achat_immediat is null or achat_immediat >= mise_de_depart),
  ouverte_le timestamptz not null default now(),
  ferme_le timestamptz not null,
  meilleure_mise integer,
  meilleur_encherisseur uuid references public.comptes (utilisateur) on delete set null on update cascade,
  etat text not null default 'ouverte' check (etat in ('ouverte', 'vendue', 'invendue', 'retiree')),
  cloturee_le timestamptz,
  prix_final integer,
  acheteur uuid references public.comptes (utilisateur) on delete set null on update cascade
);
create index if not exists encheres_ouvertes on public.encheres (ferme_le) where etat = 'ouverte';
create index if not exists encheres_par_vendeur on public.encheres (vendeur, ouverte_le desc);
create index if not exists encheres_par_acheteur on public.encheres (acheteur, cloturee_le desc);
create index if not exists encheres_par_carte on public.encheres (carte, cloturee_le desc) where etat = 'vendue';

-- Chaque mise, pour l'historique (et pour rendre son Encre à celui qui est dépassé).
create table if not exists public.mises (
  id bigint generated always as identity primary key,
  enchere bigint not null references public.encheres (id) on delete cascade,
  encherisseur uuid not null references public.comptes (utilisateur) on delete cascade on update cascade,
  montant integer not null,
  -- Ce que cette mise a pris sur l'Encre achetée (le reste vient de l'Encre gagnée en jouant). Sert à rendre
  -- exactement ce qui a été pris quand une mise plus haute arrive.
  part_achetee integer not null default 0,
  quand timestamptz not null default now()
);
create index if not exists mises_par_enchere on public.mises (enchere, quand desc);
alter table public.mises add column if not exists part_achetee integer not null default 0;

alter table public.encheres enable row level security;
alter table public.mises enable row level security;
revoke all on public.encheres, public.mises from anon, authenticated;

-- La cote du jour de chaque timbre, par finition (décision n° 38) : relevée une fois par jour, gardée jour après jour.
create table if not exists public.cotes (
  carte text not null,
  finition text not null,
  jour date not null,
  cote integer not null, -- la médiane des prix des ventes des 30 derniers jours
  ventes integer not null, -- combien de ventes ont compté
  primary key (carte, finition, jour)
);
-- Les jours déjà relevés (même un jour sans aucune vente).
create table if not exists public.cotes_calculees (jour date primary key, calculees_le timestamptz not null default now());
alter table public.cotes enable row level security;
alter table public.cotes_calculees enable row level security;
revoke all on public.cotes, public.cotes_calculees from anon, authenticated;

-- ── Les aides internes ───────────────────────────────────────────────────────
-- Le pseudonyme d'un joueur (celui des joutes), ou un nom neutre.
create or replace function public.pseudonyme_de(p_utilisateur uuid) returns text language sql stable set search_path = ''
as $$ select coalesce((select p.pseudo from public.profils p where p.utilisateur = p_utilisateur), 'Un collectionneur') $$;

-- Rend un timbre à un joueur : une finition de plus, ou une carte qui revient dans l'album.
create or replace function public.rendre_un_timbre(p_utilisateur uuid, p_carte text, p_finition text, p_obtenue_le timestamptz, p_provenance text) returns void
language plpgsql set search_path = ''
as $$
begin
  insert into public.possessions (utilisateur, carte, finitions, obtenue_le, provenance)
  values (p_utilisateur, p_carte, jsonb_build_object(p_finition, 1), p_obtenue_le, p_provenance)
  on conflict (utilisateur, carte) do update
    set finitions = jsonb_set(public.possessions.finitions, array[p_finition], to_jsonb(coalesce((public.possessions.finitions ->> p_finition)::integer, 0) + 1)),
        provenance = coalesce(excluded.provenance, public.possessions.provenance);
end $$;

-- Toute suppression (y compris auth.users et récupération) solde les engagements
-- avant les cascades. La mise reste dans sa bourse d'origine lors du remboursement.
create or replace function public.solder_compte_supprime() returns trigger
language plpgsql security definer set search_path = '' as $$
declare e public.encheres%rowtype; achetee integer;
begin
  perform pg_advisory_xact_lock(20260923);
  for e in select * from public.encheres
    where etat = 'ouverte' and (vendeur = old.utilisateur or meilleur_encherisseur = old.utilisateur)
    order by id for update loop
    if e.vendeur = old.utilisateur then
      if e.meilleur_encherisseur is not null and e.meilleur_encherisseur <> old.utilisateur then
        select part_achetee into achetee from public.mises
          where enchere = e.id and encherisseur = e.meilleur_encherisseur order by id desc limit 1;
        update public.comptes set encre_achetee = encre_achetee + coalesce(achetee, 0),
          encre = encre + e.meilleure_mise - coalesce(achetee, 0) where utilisateur = e.meilleur_encherisseur;
      end if;
    else
      perform public.rendre_un_timbre(e.vendeur, e.carte, e.finition, e.obtenue_le, null);
    end if;
    update public.encheres set etat = 'invendue', cloturee_le = now(),
      meilleure_mise = null, meilleur_encherisseur = null where id = e.id;
  end loop;
  return old;
end $$;
drop trigger if exists solder_compte_supprime on public.comptes;
create trigger solder_compte_supprime before delete on public.comptes
  for each row execute function public.solder_compte_supprime();

-- Relève les cotes du jour si ce n'est pas encore fait : une seule fois par jour, quel que soit le joueur qui passe.
create or replace function public.calculer_les_cotes() returns void
language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.cotes_calculees where jour = current_date) then return; end if;
  perform pg_advisory_xact_lock(20260922); -- deux joueurs à la même seconde : un seul relève
  if exists (select 1 from public.cotes_calculees where jour = current_date) then return; end if;
  insert into public.cotes (carte, finition, jour, cote, ventes)
  select e.carte, e.finition, current_date,
         round(percentile_cont(0.5) within group (order by e.prix_final))::integer, count(*)::integer
  from public.encheres e
  where e.etat = 'vendue' and e.cloturee_le > now() - make_interval(days => 30)
  group by e.carte, e.finition
  on conflict do nothing;
  insert into public.cotes_calculees (jour) values (current_date) on conflict do nothing;
  delete from public.cotes where jour < current_date - 400;
  delete from public.cotes_calculees where jour < current_date - 400;
end $$;

-- La cote du jour d'un timbre dans une finition ; null tant qu'il n'a pas de vente depuis 30 jours.
create or replace function public.cote_du_jour(p_carte text, p_finition text) returns integer language sql stable set search_path = ''
as $$ select c.cote from public.cotes c where c.carte = p_carte and c.finition = p_finition and c.jour = (select max(jour) from public.cotes_calculees) $$;

-- Une enchère vue par le jeu.
create or replace function public.enchere_en_json(e public.encheres) returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'carte', e.carte, 'finition', e.finition, 'vendeur', public.pseudonyme_de(e.vendeur), 'mienne', e.vendeur = auth.uid(),
    'miseDeDepart', e.mise_de_depart, 'achatImmediat', e.achat_immediat, 'meilleureMise', e.meilleure_mise,
    'enTete', e.meilleur_encherisseur is not null and e.meilleur_encherisseur = auth.uid(),
    'fermeLe', public.en_millisecondes(e.ferme_le), 'etat', e.etat, 'prixFinal', e.prix_final,
    'acheteur', case when e.acheteur is null then null else public.pseudonyme_de(e.acheteur) end,
    'remportee', e.acheteur is not null and e.acheteur = auth.uid(),
    'cote', public.cote_du_jour(e.carte, e.finition),
    'cloturee_le', public.en_millisecondes(e.cloturee_le)
  )
$$;

-- Clôt les enchères échues (50 au plus par appel) : le timbre à l'acheteur, l'Encre au vendeur moins la commission,
-- ou le timbre rendu au vendeur s'il n'y a pas eu de mise. Appelée par toutes les fonctions du marché et par mon_compte.
create or replace function public.cloturer_une_enchere(p_id bigint) returns void
language plpgsql set search_path = ''
as $$
declare
  e public.encheres%rowtype;
  vendeur_recoit integer;
begin
  perform pg_advisory_xact_lock(20260923);
  select * into e from public.encheres where id = p_id and etat = 'ouverte' and ferme_le <= now() for update;
  if not found then return; end if;
    if e.meilleure_mise is null or e.meilleur_encherisseur is null then
      perform public.rendre_un_timbre(e.vendeur, e.carte, e.finition, e.obtenue_le, null);
      update public.encheres set etat = 'invendue', cloturee_le = now() where id = e.id;
    else
      -- L'Encre de la mise est déjà bloquée : le vendeur en reçoit 90 %, le reste disparaît.
      vendeur_recoit := e.meilleure_mise - ceil(e.meilleure_mise * 0.1)::integer;
      perform public.rendre_un_timbre(e.meilleur_encherisseur, e.carte, e.finition, now(), public.pseudonyme_de(e.vendeur));
      update public.comptes set encre = encre + vendeur_recoit, maj_le = now() where utilisateur = e.vendeur;
      update public.encheres set etat = 'vendue', cloturee_le = now(), prix_final = e.meilleure_mise, acheteur = e.meilleur_encherisseur where id = e.id;
    end if;
end $$;

create or replace function public.cloturer_les_encheres() returns void
language plpgsql set search_path = '' as $$
declare e record;
begin
  perform pg_advisory_xact_lock(20260923);
  for e in select id from public.encheres where etat = 'ouverte' and ferme_le <= now() order by ferme_le, id limit 50 for update skip locked loop
    perform public.cloturer_une_enchere(e.id);
  end loop;
  -- Au passage, les cotes du jour (une fois par jour).
  perform public.calculer_les_cotes();
end $$;

-- ── Les fonctions appelées par le jeu ────────────────────────────────────────

-- Mettre un timbre en vente : il quitte l'album (et le deck) tout de suite.
create or replace function public.mettre_en_vente(p_carte text, p_finition text, p_mise integer, p_achat_immediat integer, p_heures integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  c public.comptes%rowtype;
  possession public.possessions%rowtype;
  rarete text;
  plancher integer;
  restantes jsonb;
  e public.encheres%rowtype;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  if not exists (select 1 from public.profils where utilisateur = moi) then raise exception 'Choisis d''abord ton pseudonyme (dans les joutes) : c''est lui que verront les acheteurs.'; end if;
  if p_heures is null or p_heures not in (12, 24, 48) then raise exception 'Durée inconnue.'; end if;
  if p_finition is null or p_finition not in ('Normale', 'Brillante', 'Holographique') then raise exception 'Finition inconnue.'; end if;
  -- Les plafonds ne s'appliquent plus à partir de la formule « Collectionneur ».
  if (select count(*) from public.encheres where vendeur = moi and etat = 'ouverte') >= 10 then
    raise exception 'Tu as déjà 10 ventes en cours : attends qu''elles se terminent.';
  end if;
  select k.rarete into rarete from public.cartes k where k.id = p_carte;
  if not found then raise exception 'Cette carte est inconnue.'; end if;
  plancher := case rarete when 'Commune' then 5 when 'Peu commune' then 10 when 'Rare' then 30 when 'Épique' then 100 when 'Légendaire' then 300 when 'Hors-série' then 1000 else 1 end;
  if p_mise is null or p_mise < plancher then raise exception 'La mise de départ d''un timbre % est d''au moins % Encre.', lower(rarete), plancher; end if;
  if p_achat_immediat is not null and p_achat_immediat < p_mise then raise exception 'Le prix d''achat immédiat ne peut pas être plus bas que la mise de départ.'; end if;
  if p_mise > 1000000 or coalesce(p_achat_immediat, 0) > 1000000 then raise exception 'Ce prix est déraisonnable.'; end if;

  select * into possession from public.possessions where utilisateur = moi and carte = p_carte for update;
  if not found or coalesce((possession.finitions ->> p_finition)::integer, 0) < 1 then raise exception 'Tu ne possèdes pas ce timbre dans cette finition.'; end if;
  -- Le timbre sort de l'album : une finition de moins, ou la carte entière s'il ne reste rien.
  restantes := case when (possession.finitions ->> p_finition)::integer > 1
    then jsonb_set(possession.finitions, array[p_finition], to_jsonb((possession.finitions ->> p_finition)::integer - 1))
    else possession.finitions - p_finition end;
  if restantes = '{}'::jsonb then
    delete from public.possessions where utilisateur = moi and carte = p_carte;
    update public.comptes set deck = (select coalesce(jsonb_agg(d) filter (where d <> p_carte), '[]'::jsonb) from jsonb_array_elements_text(deck) d), maj_le = now() where utilisateur = moi;
  else
    update public.possessions set finitions = restantes where utilisateur = moi and carte = p_carte;
  end if;

  insert into public.encheres (vendeur, carte, finition, obtenue_le, mise_de_depart, achat_immediat, ferme_le)
  values (moi, p_carte, p_finition, possession.obtenue_le, p_mise, p_achat_immediat, now() + make_interval(hours => p_heures))
  returning * into e;
  return jsonb_build_object('enchere', public.enchere_en_json(e), 'etat', public.etat_du_compte(moi));
end $$;

-- Retirer une vente qui n'a pas encore reçu de mise : le timbre revient dans l'album.
create or replace function public.retirer_de_la_vente(p_enchere bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  e public.encheres%rowtype;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  select * into e from public.encheres where id = p_enchere and vendeur = moi for update;
  if not found then raise exception 'Cette vente n''existe pas.'; end if;
  if e.etat <> 'ouverte' then raise exception 'Cette vente est déjà terminée.'; end if;
  if e.meilleure_mise is not null then raise exception 'Quelqu''un a déjà misé : la vente ne peut plus être retirée.'; end if;
  perform public.rendre_un_timbre(moi, e.carte, e.finition, e.obtenue_le, null);
  update public.encheres set etat = 'retiree', cloturee_le = now() where id = e.id;
  return public.etat_du_compte(moi);
end $$;

-- Miser, ou acheter tout de suite quand la mise atteint le prix d'achat immédiat. L'Encre est bloquée aussitôt ;
-- celle de l'enchérisseur dépassé lui revient dans le même mouvement.
create or replace function public.encherir(p_enchere bigint, p_montant integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  c public.comptes%rowtype;
  e public.encheres%rowtype;
  minimum integer;
  montant integer := p_montant;
  achats integer;
  pris_achetee integer;
  precedente public.mises%rowtype;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  if not exists (select 1 from public.profils where utilisateur = moi) then raise exception 'Choisis d''abord ton pseudonyme (dans les joutes) : c''est lui que verra le vendeur.'; end if;
  select * into e from public.encheres where id = p_enchere for update;
  if not found or e.etat <> 'ouverte' or e.ferme_le <= now() then raise exception 'Cette enchère est terminée.'; end if;
  if e.vendeur = moi then raise exception 'C''est ta propre vente.'; end if;
  -- Celui qui est déjà en tête n'a pas à surenchérir sur lui-même — sauf pour acheter tout de suite.
  if e.meilleur_encherisseur = moi and (e.achat_immediat is null or coalesce(p_montant, 0) < e.achat_immediat) then raise exception 'Tu es déjà en tête.'; end if;
  -- Les joueurs gratuits : 10 achats par jour au plus (les mises en tête comptent comme des achats en cours).
  if true then
    select count(*) into achats from public.encheres where (meilleur_encherisseur = moi and etat = 'ouverte' and id <> e.id)
      or (acheteur = moi and etat = 'vendue' and cloturee_le >= date_trunc('day', now() at time zone 'utc') at time zone 'utc');
    if achats >= 10 then raise exception 'Tu as déjà 10 achats aujourd''hui : reviens demain.'; end if;
  end if;
  minimum := case when e.meilleure_mise is null then e.mise_de_depart else e.meilleure_mise + greatest(1, ceil(e.meilleure_mise * 0.05)::integer) end;
  if e.achat_immediat is not null and montant >= e.achat_immediat then montant := e.achat_immediat;
  elsif montant is null or montant < minimum then raise exception 'La mise doit être d''au moins % Encre.', minimum;
  end if;
  -- Au marché, l'Encre achetée compte autant que celle gagnée en jouant (elle ne sert qu'ici).
  if c.encre + c.encre_achetee + (case when e.meilleur_encherisseur = moi then e.meilleure_mise else 0 end) < montant then
    raise exception 'Pas assez d''Encre : il te faut % Encre.', montant;
  end if;

  -- L'Encre change de mains : la mienne est bloquée, celle du précédent lui revient — chacune dans sa bourse.
  if e.meilleur_encherisseur is not null then
    select * into precedente from public.mises where enchere = e.id and encherisseur = e.meilleur_encherisseur order by id desc limit 1;
    update public.comptes
      set encre_achetee = encre_achetee + coalesce(precedente.part_achetee, 0),
          encre = encre + e.meilleure_mise - coalesce(precedente.part_achetee, 0), maj_le = now()
      where utilisateur = e.meilleur_encherisseur;
  end if;
  select * into c from public.comptes where utilisateur = moi;
  pris_achetee := least(c.encre_achetee, montant);
  update public.comptes set encre_achetee = encre_achetee - pris_achetee, encre = encre - (montant - pris_achetee), maj_le = now()
    where utilisateur = moi;
  insert into public.mises (enchere, encherisseur, montant, part_achetee) values (e.id, moi, montant, pris_achetee);
  update public.encheres set meilleure_mise = montant, meilleur_encherisseur = moi,
    -- Une mise dans les 5 dernières minutes prolonge l'enchère d'autant.
    ferme_le = case when e.achat_immediat is not null and montant >= e.achat_immediat then now()
                    when e.ferme_le - now() < interval '5 minutes' then now() + interval '5 minutes'
                    else e.ferme_le end
    where id = e.id;
  -- Un achat immédiat se règle sur-le-champ.
  if e.achat_immediat is not null and montant >= e.achat_immediat then perform public.cloturer_une_enchere(e.id); end if;
  select * into e from public.encheres where id = p_enchere;
  return jsonb_build_object('enchere', public.enchere_en_json(e), 'etat', public.etat_du_compte(moi));
end $$;

-- Le marché : les enchères en cours, les plus proches de la fin d'abord, avec une recherche par mot.
create or replace function public.marche(p_recherche text, p_page integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  cherche text := lower(coalesce(p_recherche, ''));
  page integer := greatest(0, coalesce(p_page, 0));
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  return jsonb_build_object(
    'encheres', (select coalesce(jsonb_agg(public.enchere_en_json(e) order by e.ferme_le), '[]'::jsonb) from (
      select * from public.encheres e where e.etat = 'ouverte' and (cherche = '' or e.carte like cherche || '%') order by e.ferme_le limit 30 offset page * 30
    ) e),
    'total', (select count(*) from public.encheres e where e.etat = 'ouverte' and (cherche = '' or e.carte like cherche || '%')),
    'maintenant', public.en_millisecondes(now())
  );
end $$;

-- Mes ventes et mes mises : en cours, et terminées depuis peu.
create or replace function public.mes_encheres() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  return jsonb_build_object(
    'ventes', (select coalesce(jsonb_agg(public.enchere_en_json(e) order by e.etat = 'ouverte' desc, coalesce(e.cloturee_le, e.ferme_le) desc), '[]'::jsonb)
               from public.encheres e where e.vendeur = moi and (e.etat = 'ouverte' or e.cloturee_le > now() - interval '7 days')),
    'mises', (select coalesce(jsonb_agg(public.enchere_en_json(e) order by e.etat = 'ouverte' desc, coalesce(e.cloturee_le, e.ferme_le) desc), '[]'::jsonb)
              from public.encheres e where e.id in (select m.enchere from public.mises m where m.encherisseur = moi) and e.vendeur <> moi and (e.etat = 'ouverte' or e.cloturee_le > now() - interval '7 days')),
    'maintenant', public.en_millisecondes(now())
  );
end $$;

-- La cote d'un timbre, pour tous : par finition, la cote du jour et le nombre de ventes qui ont compté.
create or replace function public.cotes(p_carte text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  jour_releve date;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  jour_releve := (select max(jour) from public.cotes_calculees);
  return jsonb_build_object(
    'jour', jour_releve,
    'cotes', (select coalesce(jsonb_agg(jsonb_build_object('finition', c.finition, 'cote', c.cote, 'ventes', c.ventes) order by c.finition), '[]'::jsonb)
              from public.cotes c where c.carte = p_carte and c.jour = jour_releve),
    'maintenant', public.en_millisecondes(now())
  );
end $$;

-- L'histoire de la cote et les statistiques : la version payante (décision n° 38).
create or replace function public.historique_de_la_cote(p_carte text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  if (select public.niveau(c) from public.comptes c where c.utilisateur = moi) < 3 then
    raise exception 'L''histoire des prix et les statistiques font partie de la formule Expert.';
  end if;
  perform public.cloturer_les_encheres();
  return jsonb_build_object(
    'serie', (select coalesce(jsonb_agg(jsonb_build_object('jour', c.jour, 'finition', c.finition, 'cote', c.cote, 'ventes', c.ventes) order by c.jour, c.finition), '[]'::jsonb)
              from public.cotes c where c.carte = p_carte and c.jour > current_date - 90),
    'ventes', (select coalesce(jsonb_agg(jsonb_build_object('quand', public.en_millisecondes(e.cloturee_le), 'finition', e.finition, 'prix', e.prix_final) order by e.cloturee_le desc), '[]'::jsonb)
               from (select * from public.encheres v where v.carte = p_carte and v.etat = 'vendue' order by v.cloturee_le desc limit 30) e),
    'stats', (select coalesce(jsonb_agg(s.stat order by s.finition), '[]'::jsonb)
              from (select e.finition, jsonb_build_object('finition', e.finition, 'mini', min(e.prix_final), 'maxi', max(e.prix_final), 'nombre', count(*)) as stat
                    from public.encheres e where e.carte = p_carte and e.etat = 'vendue' and e.cloturee_le > now() - make_interval(days => 90)
                    group by e.finition) s),
    'maintenant', public.en_millisecondes(now())
  );
end $$;


create table if not exists public.amities (
  demandeur uuid not null references public.profils(id) on delete cascade,
  destinataire uuid not null references public.profils(id) on delete cascade,
  acceptee boolean not null default false,
  cree_le timestamptz not null default now(),
  primary key(demandeur,destinataire), check(demandeur <> destinataire)
);
create unique index if not exists amitie_unique on public.amities(least(demandeur,destinataire),greatest(demandeur,destinataire));
create index if not exists amities_destinataire on public.amities(destinataire);
create table if not exists public.echanges (
  id uuid primary key,
  expediteur uuid not null references public.profils(id) on delete cascade,
  destinataire uuid not null references public.profils(id) on delete cascade,
  offerte text not null references public.cartes(id), finition_offerte text not null check(finition_offerte in ('Normale','Brillante','Holographique')),
  demandee text not null references public.cartes(id), finition_demandee text not null check(finition_demandee in ('Normale','Brillante','Holographique')),
  etat text not null default 'attente' check(etat in ('attente','accepte','refuse','annule')),
  cree_le timestamptz not null default now(), expire_le timestamptz not null default now()+interval '7 days',
  check(expediteur <> destinataire), check(offerte <> demandee or finition_offerte <> finition_demandee)
);
create index if not exists echanges_expediteur on public.echanges(expediteur,cree_le desc);
create index if not exists echanges_destinataire on public.echanges(destinataire,cree_le desc);
alter table public.amities enable row level security;
alter table public.echanges enable row level security;
revoke all on public.amities,public.echanges from public,anon,authenticated;

create or replace function public.sont_amis(p_a uuid,p_b uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists(select 1 from public.amities where acceptee and
    ((demandeur=p_a and destinataire=p_b) or (demandeur=p_b and destinataire=p_a)))
$$;

create or replace function public.mes_amis() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi public.profils%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into moi from public.profils where utilisateur=auth.uid();
  return jsonb_build_object('moi',case when moi.id is null then null else jsonb_build_object('id',moi.id,'pseudo',moi.pseudo) end,
    'relations',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'pseudo',p.pseudo,
      'etat',case when a.acceptee then 'ami' when a.demandeur=moi.id then 'envoyee' else 'recue' end,
      'defiable',jsonb_array_length(public.deck_propre(p.utilisateur,p.deck))=10) order by p.pseudo),'[]')
      from public.amities a join public.profils p on p.id=case when a.demandeur=moi.id then a.destinataire else a.demandeur end
      where moi.id in (a.demandeur,a.destinataire)),
    'echanges',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from (
      select e.id,e.expediteur=moi.id as envoye,p.pseudo,e.offerte,e.finition_offerte,e.demandee,e.finition_demandee,
        case when e.etat='attente' and e.expire_le<=now() then 'expire' else e.etat end as etat,
        extract(epoch from e.expire_le)*1000 as expire_le
      from public.echanges e join public.profils p on p.id=case when e.expediteur=moi.id then e.destinataire else e.expediteur end
      where moi.id in (e.expediteur,e.destinataire)
      order by (e.etat='attente' and e.expire_le>now()) desc,e.cree_le desc limit 100
    ) t));
end $$;

create or replace function public.demander_ami(p_pseudo text) returns void
language plpgsql security definer set search_path = '' as $$
declare moi uuid; autre uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  select id into moi from public.profils where utilisateur=auth.uid();
  if moi is null then raise exception 'Publie d''abord ton pseudonyme.'; end if;
  select id into autre from public.profils where pseudo_cle=public.cle_du_pseudo(p_pseudo) and not maison and utilisateur is not null;
  if autre is null then raise exception 'Aucun joueur trouvé avec ce pseudonyme.'; end if;
  if moi=autre then raise exception 'Ce pseudonyme est le tien.'; end if;
  if exists(select 1 from public.amities where (demandeur=moi and destinataire=autre) or (demandeur=autre and destinataire=moi)) then
    raise exception 'Vous êtes déjà amis ou une demande est en attente.';
  end if;
  if (select count(*) from public.amities where not acceptee and (demandeur=moi or destinataire=autre))>=30
    then raise exception 'Trop de demandes en attente. Réessaie plus tard.'; end if;
  if (select count(*) from public.amities where moi in (demandeur,destinataire))>=200
    or (select count(*) from public.amities where autre in (demandeur,destinataire))>=200 then raise exception 'La liste d''amis est pleine.'; end if;
  insert into public.amities(demandeur,destinataire) values(moi,autre);
end $$;

create or replace function public.repondre_ami(p_ami uuid,p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare moi uuid; a public.amities%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  select id into moi from public.profils where utilisateur=auth.uid();
  select * into a from public.amities where (demandeur=moi and destinataire=p_ami) or (demandeur=p_ami and destinataire=moi) for update;
  if not found then raise exception 'Cette relation n''existe plus. Actualise la liste.'; end if;
  if p_action='accepter' and a.destinataire=moi then
    update public.amities set acceptee=true where demandeur=a.demandeur and destinataire=a.destinataire;
  elsif (p_action='refuser' and not a.acceptee and a.destinataire=moi)
    or (p_action='annuler' and not a.acceptee and a.demandeur=moi)
    or (p_action='retirer' and a.acceptee) then
    update public.echanges set etat='annule' where etat='attente' and
      ((expediteur=moi and destinataire=p_ami) or (expediteur=p_ami and destinataire=moi));
    delete from public.amities where demandeur=a.demandeur and destinataire=a.destinataire;
  else raise exception 'Cette action n''est pas permise.'; end if;
end $$;

-- Seules les cartes et leurs finitions sont partagées avec les amis, jamais les apprentissages ou le compte.
create or replace function public.album_ami(p_ami uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid;
begin
  select id into moi from public.profils where utilisateur=auth.uid();
  if moi is null or not public.sont_amis(moi,p_ami) then raise exception 'Ajoute d''abord ce joueur à tes amis.'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('carte',s.carte,'finitions',s.finitions) order by s.carte),'[]')
    from public.possessions s join public.profils p on p.utilisateur=s.utilisateur where p.id=p_ami);
end $$;

create or replace function public.proposer_echange(p_id uuid,p_ami uuid,p_offerte text,p_finition_offerte text,p_demandee text,p_finition_demandee text) returns void
language plpgsql security definer set search_path = '' as $$
declare moi uuid; autre uuid; ancien public.echanges%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  select id into moi from public.profils where utilisateur=auth.uid();
  select * into ancien from public.echanges where id=p_id;
  if found then
    if ancien.expediteur is distinct from moi or ancien.destinataire is distinct from p_ami
      or ancien.offerte is distinct from p_offerte or ancien.finition_offerte is distinct from p_finition_offerte
      or ancien.demandee is distinct from p_demandee or ancien.finition_demandee is distinct from p_finition_demandee
      then raise exception 'Identifiant d''échange déjà utilisé.'; end if;
    return;
  end if;
  if moi is null or not public.sont_amis(moi,p_ami) then raise exception 'Ajoute d''abord ce joueur à tes amis.'; end if;
  if p_finition_offerte is null or p_finition_demandee is null or p_finition_offerte not in ('Normale','Brillante','Holographique')
    or p_finition_demandee not in ('Normale','Brillante','Holographique') then raise exception 'Finition inconnue.'; end if;
  if p_offerte=p_demandee and p_finition_offerte=p_finition_demandee then raise exception 'Choisis deux timbres différents.'; end if;
  select utilisateur into autre from public.profils where id=p_ami;
  if not exists(select 1 from public.possessions where utilisateur=auth.uid() and carte=p_offerte and coalesce((finitions->>p_finition_offerte)::integer,0)>0)
    or not exists(select 1 from public.possessions where utilisateur=autre and carte=p_demandee and coalesce((finitions->>p_finition_demandee)::integer,0)>0)
    then raise exception 'Un des timbres n''est plus disponible. Actualise les collections.'; end if;
  if (select count(*) from public.echanges where etat='attente' and expire_le>now() and (expediteur=moi or destinataire=p_ami))>=20
    then raise exception 'Trop d''échanges en attente. Termine-les avant de continuer.'; end if;
  insert into public.echanges(id,expediteur,destinataire,offerte,finition_offerte,demandee,finition_demandee)
    values(p_id,moi,p_ami,p_offerte,p_finition_offerte,p_demandee,p_finition_demandee);
end $$;

-- Appelée seulement après verrouillage des deux comptes. Un échec annule toute la transaction.
create or replace function public.prelever_echange(p_utilisateur uuid,p_carte text,p_finition text) returns void
language plpgsql set search_path = '' as $$
declare s public.possessions%rowtype; restantes jsonb;
begin
  select * into s from public.possessions where utilisateur=p_utilisateur and carte=p_carte for update;
  if not found or coalesce((s.finitions->>p_finition)::integer,0)<1 then raise exception 'Un des timbres n''est plus disponible. Aucun timbre n''a été transféré.'; end if;
  restantes:=case when (s.finitions->>p_finition)::integer>1 then jsonb_set(s.finitions,array[p_finition],to_jsonb((s.finitions->>p_finition)::integer-1)) else s.finitions-p_finition end;
  if restantes='{}'::jsonb then delete from public.possessions where utilisateur=p_utilisateur and carte=p_carte;
  else update public.possessions set finitions=restantes where utilisateur=p_utilisateur and carte=p_carte; end if;
end $$;

create or replace function public.repondre_echange(p_id uuid,p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid; e public.echanges%rowtype; a uuid; b uuid; voulu text;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923); -- même ordre que le marché et la récupération de compte
  select id into moi from public.profils where utilisateur=auth.uid();
  select * into e from public.echanges where id=p_id and moi in (expediteur,destinataire) for update;
  if not found then raise exception 'Échange introuvable.'; end if;
  voulu:=case when p_action='accepter' and moi=e.destinataire then 'accepte'
    when p_action='refuser' and moi=e.destinataire then 'refuse'
    when p_action='annuler' and moi=e.expediteur then 'annule' else null end;
  if voulu is null then raise exception 'Cette action n''est pas permise.'; end if;
  if e.etat=voulu then return public.etat_du_compte(auth.uid()); end if;
  if e.etat<>'attente' or e.expire_le<=now() then raise exception 'Cet échange est terminé ou expiré.'; end if;
  if voulu='accepte' then
    if not public.sont_amis(e.expediteur,e.destinataire) then raise exception 'Vous n''êtes plus amis.'; end if;
    select utilisateur into a from public.profils where id=e.expediteur;
    select utilisateur into b from public.profils where id=e.destinataire;
    perform 1 from public.comptes where utilisateur in (a,b) order by utilisateur for update;
    perform public.prelever_echange(a,e.offerte,e.finition_offerte);
    perform public.prelever_echange(b,e.demandee,e.finition_demandee);
    perform public.rendre_un_timbre(b,e.offerte,e.finition_offerte,now(),public.pseudonyme_de(a));
    perform public.rendre_un_timbre(a,e.demandee,e.finition_demandee,now(),public.pseudonyme_de(b));
    update public.comptes set deck=public.deck_propre(utilisateur,deck),maj_le=now() where utilisateur in (a,b);
    update public.profils set deck=public.deck_propre(utilisateur,deck),maj_le=now() where utilisateur in (a,b);
  end if;
  update public.echanges set etat=voulu where id=p_id;
  return public.etat_du_compte(auth.uid());
end $$;

revoke execute on function public.sont_amis(uuid,uuid),public.prelever_echange(uuid,text,text) from public,anon,authenticated;
revoke execute on function public.mes_amis(),public.demander_ami(text),public.repondre_ami(uuid,text),public.album_ami(uuid),
  public.proposer_echange(uuid,uuid,text,text,text,text),public.repondre_echange(uuid,text) from public,anon;
grant execute on function public.mes_amis(),public.demander_ami(text),public.repondre_ami(uuid,text),public.album_ami(uuid),
  public.proposer_echange(uuid,uuid,text,text,text,text),public.repondre_echange(uuid,text) to authenticated;


create table if not exists public.equipes (
  id uuid primary key,
  nom text not null,
  nom_cle text not null unique,
  embleme text not null check(embleme in ('plume','etoile','feuille','eclair','lune','soleil')),
  cree_le timestamptz not null default now()
);
create table if not exists public.equipiers (
  profil uuid primary key references public.profils(id) on delete cascade,
  equipe uuid not null references public.equipes(id) on delete cascade,
  place integer not null check(place in (1,2)),
  rejoint_le timestamptz not null default now(),
  unique(equipe,place)
);
create table if not exists public.invitations_equipe (
  id uuid primary key default gen_random_uuid(),
  equipe uuid not null unique references public.equipes(id) on delete cascade,
  destinataire uuid not null references public.profils(id) on delete cascade,
  expire_le timestamptz not null default now()+interval '7 days'
);
create index if not exists invitations_equipe_destinataire on public.invitations_equipe(destinataire);
alter table public.equipes enable row level security;
alter table public.equipiers enable row level security;
alter table public.invitations_equipe enable row level security;
revoke all on public.equipes,public.equipiers,public.invitations_equipe from public,anon,authenticated;

create or replace function public.apres_depart_equipier() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(20260923);
  if not exists(select 1 from public.equipes where id=old.equipe) then return old; end if;
  delete from public.invitations_equipe where equipe=old.equipe;
  if not exists(select 1 from public.equipiers where equipe=old.equipe) then
    delete from public.equipes where id=old.equipe;
  elsif old.place=1 then
    update public.equipiers set place=1 where equipe=old.equipe;
  end if;
  return old;
end $$;
drop trigger if exists depart_equipier on public.equipiers;
create trigger depart_equipier after delete on public.equipiers for each row execute function public.apres_depart_equipier();

create or replace function public.mon_equipe() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid; mon_equipe uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select id into moi from public.profils where utilisateur=auth.uid();
  select equipe into mon_equipe from public.equipiers where profil=moi;
  return jsonb_build_object('moi',moi,
    'equipe',(select jsonb_build_object('id',e.id,'nom',e.nom,'embleme',e.embleme,
      'membres',(select jsonb_agg(jsonb_build_object('id',p.id,'pseudo',p.pseudo,'capitaine',m.place=1) order by m.place)
        from public.equipiers m join public.profils p on p.id=m.profil where m.equipe=e.id),
      'invitation',(select jsonb_build_object('id',i.id,'pseudo',p.pseudo,'expire_le',extract(epoch from i.expire_le)*1000)
        from public.invitations_equipe i join public.profils p on p.id=i.destinataire where i.equipe=e.id and i.expire_le>now()))
      from public.equipes e where e.id=mon_equipe),
    'invitations',(select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'nom',e.nom,'embleme',e.embleme,'capitaine',p.pseudo,
      'expire_le',extract(epoch from i.expire_le)*1000) order by e.nom),'[]')
      from public.invitations_equipe i join public.equipes e on e.id=i.equipe
      join public.equipiers m on m.equipe=e.id and m.place=1 join public.profils p on p.id=m.profil
      where i.destinataire=moi and i.expire_le>now() and mon_equipe is null and public.sont_amis(moi,p.id)),
    'amis',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'pseudo',p.pseudo) order by p.pseudo),'[]')
      from public.amities a join public.profils p on p.id=case when a.demandeur=moi then a.destinataire else a.demandeur end
      where a.acceptee and moi in (a.demandeur,a.destinataire) and not exists(select 1 from public.equipiers where profil=p.id)));
end $$;

create or replace function public.creer_equipe(p_id uuid,p_nom text,p_embleme text) returns void
language plpgsql security definer set search_path = '' as $$
declare moi uuid; refus text; propre text:=btrim(regexp_replace(coalesce(p_nom,''),'\s+',' ','g'));
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  select id into moi from public.profils where utilisateur=auth.uid() and not maison;
  if moi is null then raise exception 'Choisis d''abord ton pseudonyme dans les amis.'; end if;
  if exists(select 1 from public.equipiers where profil=moi and equipe=p_id and place=1) then return; end if;
  if exists(select 1 from public.equipiers where profil=moi) then raise exception 'Tu fais déjà partie d''une équipe.'; end if;
  refus:=public.pseudo_refuse(propre);
  if refus is not null then raise exception '%',refus; end if;
  if p_embleme is null or p_embleme not in ('plume','etoile','feuille','eclair','lune','soleil') then raise exception 'Choisis un emblème.'; end if;
  if p_id is null then raise exception 'Identifiant manquant.'; end if;
  if exists(select 1 from public.equipes where nom_cle=public.cle_du_pseudo(propre)) then raise exception 'Ce nom d''équipe est déjà pris.'; end if;
  insert into public.equipes(id,nom,nom_cle,embleme) values(p_id,propre,public.cle_du_pseudo(propre),p_embleme);
  insert into public.equipiers(profil,equipe,place) values(moi,p_id,1);
  delete from public.invitations_equipe where destinataire=moi;
end $$;

create or replace function public.modifier_equipe(p_equipe uuid,p_nom text,p_embleme text) returns void
language plpgsql security definer set search_path = '' as $$
declare refus text; propre text:=btrim(regexp_replace(coalesce(p_nom,''),'\s+',' ','g'));
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  if not exists(select 1 from public.equipiers m join public.profils p on p.id=m.profil
    where p.utilisateur=auth.uid() and m.equipe=p_equipe and m.place=1) then raise exception 'Seul le capitaine peut modifier l''équipe.'; end if;
  refus:=public.pseudo_refuse(propre);
  if refus is not null then raise exception '%',refus; end if;
  if p_embleme is null or p_embleme not in ('plume','etoile','feuille','eclair','lune','soleil') then raise exception 'Choisis un emblème.'; end if;
  if exists(select 1 from public.equipes where nom_cle=public.cle_du_pseudo(propre) and id<>p_equipe) then raise exception 'Ce nom d''équipe est déjà pris.'; end if;
  update public.equipes set nom=propre,nom_cle=public.cle_du_pseudo(propre),embleme=p_embleme where id=p_equipe;
end $$;

create or replace function public.inviter_equipier(p_equipe uuid,p_ami uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare moi uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  select p.id into moi from public.equipiers m join public.profils p on p.id=m.profil
    where p.utilisateur=auth.uid() and m.equipe=p_equipe and m.place=1;
  if moi is null then raise exception 'Seul le capitaine peut inviter un ami.'; end if;
  if not public.sont_amis(moi,p_ami) then raise exception 'Choisis un ami pour ton équipe.'; end if;
  if (select count(*) from public.equipiers where equipe=p_equipe)>=2 then raise exception 'L''équipe est complète.'; end if;
  if exists(select 1 from public.equipiers where profil=p_ami) then raise exception 'Cet ami fait déjà partie d''une équipe.'; end if;
  delete from public.invitations_equipe where equipe=p_equipe and expire_le<=now();
  if exists(select 1 from public.invitations_equipe where equipe=p_equipe and destinataire=p_ami) then return; end if;
  if exists(select 1 from public.invitations_equipe where equipe=p_equipe) then raise exception 'Annule d''abord l''invitation en attente.'; end if;
  if (select count(*) from public.invitations_equipe where destinataire=p_ami and expire_le>now())>=10 then raise exception 'Cet ami a trop d''invitations en attente.'; end if;
  insert into public.invitations_equipe(equipe,destinataire) values(p_equipe,p_ami);
end $$;

create or replace function public.repondre_invitation_equipe(p_id uuid,p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare moi uuid; invitation public.invitations_equipe%rowtype; capitaine uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  select id into moi from public.profils where utilisateur=auth.uid();
  select * into invitation from public.invitations_equipe where id=p_id;
  if not found then raise exception 'Cette invitation n''est plus disponible.'; end if;
  select profil into capitaine from public.equipiers where equipe=invitation.equipe and place=1;
  if (p_action='refuser' and invitation.destinataire=moi) or (p_action='annuler' and capitaine=moi) then
    delete from public.invitations_equipe where id=p_id; return;
  end if;
  if p_action is distinct from 'accepter' or invitation.destinataire is distinct from moi then raise exception 'Cette action n''est pas permise.'; end if;
  if invitation.expire_le<=now() then raise exception 'Cette invitation a expiré.'; end if;
  if not public.sont_amis(moi,capitaine) then raise exception 'Vous devez être amis pour former une équipe.'; end if;
  if exists(select 1 from public.equipiers where profil=moi) then raise exception 'Tu fais déjà partie d''une équipe.'; end if;
  if (select count(*) from public.equipiers where equipe=invitation.equipe)>=2 then raise exception 'L''équipe est complète.'; end if;
  insert into public.equipiers(profil,equipe,place) values(moi,invitation.equipe,2);
  delete from public.invitations_equipe where destinataire=moi or equipe=invitation.equipe;
end $$;

create or replace function public.quitter_equipe(p_equipe uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  delete from public.equipiers where equipe=p_equipe and profil in (select id from public.profils where utilisateur=auth.uid());
end $$;

create or replace function public.dissoudre_equipe(p_equipe uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  if not exists(select 1 from public.equipiers m join public.profils p on p.id=m.profil
    where p.utilisateur=auth.uid() and m.equipe=p_equipe and m.place=1) then raise exception 'Seul le capitaine peut dissoudre l''équipe.'; end if;
  delete from public.equipes where id=p_equipe;
end $$;

revoke execute on function public.apres_depart_equipier() from public,anon,authenticated;
revoke execute on function public.mon_equipe(),public.creer_equipe(uuid,text,text),public.modifier_equipe(uuid,text,text),
  public.inviter_equipier(uuid,uuid),public.repondre_invitation_equipe(uuid,text),public.quitter_equipe(uuid),public.dissoudre_equipe(uuid) from public,anon;
grant execute on function public.mon_equipe(),public.creer_equipe(uuid,text,text),public.modifier_equipe(uuid,text,text),
  public.inviter_equipier(uuid,uuid),public.repondre_invitation_equipe(uuid,text),public.quitter_equipe(uuid),public.dissoudre_equipe(uuid) to authenticated;

-- ── Les droits ───────────────────────────────────────────────────────────────
-- Seuls les joueurs connectés (compte anonyme compris) peuvent appeler les fonctions du jeu ; les aides internes, personne.
revoke execute on function public.publier_mon_profil(text, jsonb, jsonb, jsonb), public.adversaires(), public.commencer_une_joute(uuid), public.terminer_une_joute(bigint, text), public.classement(), public.supprimer_mon_profil(), public.supprimer_mon_compte(), public.pseudo_refuse(text), public.reclamer_recompense(text, text[]), public.acheter_personnalisation(text), public.mon_compte(), public.ouvrir_mon_compte(), public.importer_ma_collection(bigint, integer, jsonb, jsonb, jsonb), public.ouvrir_un_paquet(text[]), public.changer_de_deck(jsonb), public.commencer_un_duel(text), public.terminer_un_duel(bigint, text), public.declarer_mon_age(integer), public.definir_un_code_de_secours(text), public.recuperer_par_code(text), public.mettre_en_vente(text, text, integer, integer, integer), public.retirer_de_la_vente(bigint), public.encherir(bigint, integer), public.marche(text, integer), public.mes_encheres(), public.cotes(text), public.historique_de_la_cote(text), public.progression_du_compte(uuid), public.savoirs_verifies(uuid, jsonb), public.gagner_xp(uuid, integer, boolean), public.noter_reponse_verifiee(uuid, jsonb), public.importer_progression_validee(uuid), public.autoriser_joute(uuid), public.actualiser_deck_public(), public.nombre_entier(text), public.en_millisecondes(timestamptz), public.etat_du_compte(uuid), public.recharger(public.comptes), public.deck_propre(uuid, jsonb), public.finitions_propres(jsonb), public.recompenser(uuid, integer, text), public.tirer_un_paquet(uuid, text[]), public.actualiser_offres(public.comptes), public.changement_offre(), public.tirer_les_cartes(uuid, text[], text), public.niveau(public.comptes), public.verser_la_rente(uuid), public.code_propre(text), public.empreinte_du_code(text), public.cloturer_une_enchere(bigint), public.solder_compte_supprime(), public.pseudonyme_de(uuid), public.rendre_un_timbre(uuid, text, text, timestamptz, text), public.enchere_en_json(public.encheres), public.cloturer_les_encheres(), public.calculer_les_cotes(), public.cote_du_jour(text, text) from public, anon;
revoke execute on function public.pseudo_refuse(text), public.progression_du_compte(uuid), public.savoirs_verifies(uuid, jsonb), public.gagner_xp(uuid, integer, boolean), public.noter_reponse_verifiee(uuid, jsonb), public.importer_progression_validee(uuid), public.autoriser_joute(uuid), public.actualiser_deck_public(), public.nombre_entier(text), public.en_millisecondes(timestamptz), public.etat_du_compte(uuid), public.recharger(public.comptes), public.deck_propre(uuid, jsonb), public.finitions_propres(jsonb), public.recompenser(uuid, integer, text), public.tirer_un_paquet(uuid, text[]), public.actualiser_offres(public.comptes), public.changement_offre(), public.tirer_les_cartes(uuid, text[], text), public.niveau(public.comptes), public.verser_la_rente(uuid), public.code_propre(text), public.empreinte_du_code(text), public.cloturer_une_enchere(bigint), public.solder_compte_supprime(), public.pseudonyme_de(uuid), public.rendre_un_timbre(uuid, text, text, timestamptz, text), public.enchere_en_json(public.encheres), public.cloturer_les_encheres(), public.calculer_les_cotes(), public.cote_du_jour(text, text) from authenticated; -- le contrôle des pseudonymes ne sert qu'à publier_mon_profil
grant execute on function public.publier_mon_profil(text, jsonb, jsonb, jsonb), public.adversaires(), public.commencer_une_joute(uuid), public.terminer_une_joute(bigint, text), public.classement(), public.supprimer_mon_profil(), public.supprimer_mon_compte(), public.reclamer_recompense(text, text[]), public.acheter_personnalisation(text), public.mon_compte(), public.ouvrir_mon_compte(), public.importer_ma_collection(bigint, integer, jsonb, jsonb, jsonb), public.ouvrir_un_paquet(text[]), public.changer_de_deck(jsonb), public.commencer_un_duel(text), public.terminer_un_duel(bigint, text), public.declarer_mon_age(integer), public.definir_un_code_de_secours(text), public.recuperer_par_code(text), public.mettre_en_vente(text, text, integer, integer, integer), public.retirer_de_la_vente(bigint), public.encherir(bigint, integer), public.marche(text, integer), public.mes_encheres(), public.cotes(text), public.historique_de_la_cote(text) to authenticated;

-- Les RPC privées ci-dessous ne sont appelées que par la fonction serveur authentifiée.
create table if not exists public.combats (
  id uuid primary key,
  utilisateur uuid not null references public.comptes(utilisateur) on update cascade on delete cascade,
  revision integer not null default 0,
  etat jsonb not null, vue jsonb not null,
  commandes jsonb not null default '{}',
  termine boolean not null default false,
  archive boolean not null default false,
  recompense jsonb,
  xp integer not null default 0,
  cree_le timestamptz not null default now(), maj_le timestamptz not null default now()
);
create unique index if not exists un_combat_ouvert_par_compte on public.combats(utilisateur) where not archive;
create index if not exists combats_par_date on public.combats(maj_le);
alter table public.combats enable row level security;
revoke all on public.combats from public, anon, authenticated;

-- Activer une seule fois : pas de remise à zéro des apprentissages aux déploiements suivants.
update public.comptes set progression_active=true where not progression_active;
alter table public.comptes alter column progression_active set default true;
update public.profils p set savoirs=public.savoirs_verifies(p.utilisateur,p.deck),
  parades=c.parades_verifiees from public.comptes c where c.utilisateur=p.utilisateur;

create or replace function public.combat_reponse(p_utilisateur uuid, p_id uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('etat',public.etat_du_compte(p_utilisateur),'combat',(
    select jsonb_build_object('id',id,'revision',revision,'vue',vue,'xp',xp,'recompense',recompense)
    from public.combats where id=p_id and utilisateur=p_utilisateur and not archive))
$$;

create or replace function public.combat_contexte(p_utilisateur uuid, p_id uuid, p_adversaire uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ligne public.combats%rowtype; compte jsonb; profil jsonb;
begin
  -- Le compte et la révision doivent appartenir au même instantané logique.
  perform 1 from public.comptes where utilisateur=p_utilisateur for update;
  compte := public.etat_du_compte(p_utilisateur);
  if compte is null then raise exception 'Ouvre d''abord ton compte.'; end if;
  select * into ligne from public.combats where utilisateur=p_utilisateur and
    ((p_id is not null and id=p_id) or (p_id is null and not archive)) order by cree_le desc limit 1;
  if p_id is not null and ligne.id is null then raise exception 'Ce combat est introuvable pour ton compte.'; end if;
  select jsonb_build_object('id',p.id,'pseudo',p.pseudo,'cote',p.cote,'deck',p.deck,'maison',p.maison,
    'savoirs',case when p.maison then p.savoirs else public.savoirs_verifies(p.utilisateur,p.deck) end,
    'parades',case when p.maison then p.parades else coalesce(c.parades_verifiees,'{}') end)
    into profil from public.profils p left join public.comptes c on c.utilisateur=p.utilisateur
    where p.id=p_adversaire and p.utilisateur is distinct from p_utilisateur;
  return jsonb_build_object('ligne',case when ligne.id is not null then to_jsonb(ligne) else null end,'compte',compte,'profil',profil);
end $$;

create or replace function public.combat_creer(p_utilisateur uuid, p_requete uuid, p_action jsonb, p_etat jsonb, p_vue jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; ancien public.combats%rowtype;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if not found or not c.progression_active then raise exception 'Le serveur des combats n''est pas disponible.'; end if;
  select * into ancien from public.combats where id=p_requete;
  if found then
    if ancien.utilisateur <> p_utilisateur or (ancien.commandes->p_requete::text) is distinct from p_action then raise exception 'Identifiant de commande déjà utilisé.'; end if;
    return public.combat_reponse(p_utilisateur,ancien.id);
  end if;
  select * into ancien from public.combats where utilisateur=p_utilisateur and not archive for update;
  if found and not ancien.termine then return public.combat_reponse(p_utilisateur,ancien.id); end if;
  if p_etat->'deckDepart' is distinct from c.deck or jsonb_array_length(c.deck) <> 10 or public.deck_propre(p_utilisateur,c.deck) <> c.deck
    then raise exception 'Ton deck a changé pendant la préparation. Réessaie.'; end if;
  if p_etat->'adversaire'->>'type' = 'joute' then
    if not exists(select 1 from public.profils where utilisateur=p_utilisateur) then raise exception 'Publie d''abord ton profil.'; end if;
    if not exists(select 1 from public.profils where id=(p_etat->'adversaire'->'profil'->>'id')::uuid and utilisateur is distinct from p_utilisateur)
      then raise exception 'Cet adversaire n''est plus disponible.'; end if;
    if coalesce((p_etat->'adversaire'->>'amical')::boolean,false) and not public.sont_amis(
      (select id from public.profils where utilisateur=p_utilisateur),(p_etat->'adversaire'->'profil'->>'id')::uuid)
      then raise exception 'Ajoute d''abord ce joueur à tes amis.'; end if;
  end if;
  perform public.autoriser_joute(p_utilisateur); -- quota commun, conservé après retrait du profil
  update public.combats set archive=true where utilisateur=p_utilisateur and not archive and termine;
  insert into public.combats(id,utilisateur,etat,vue,commandes) values(p_requete,p_utilisateur,p_etat,p_vue,jsonb_build_object(p_requete::text,p_action));
  -- Le détail des parties n'est utile qu'aux reprises et aux litiges récents. Les totaux restent dans le compte.
  delete from public.combats where utilisateur=p_utilisateur and archive and maj_le < now()-interval '30 days';
  return public.combat_reponse(p_utilisateur,p_requete);
end $$;

create or replace function public.combat_appliquer(p_utilisateur uuid, p_id uuid, p_revision integer, p_requete uuid, p_action jsonb, p_etat jsonb, p_vue jsonb, p_reponse jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare b public.combats%rowtype; gain_enregistre jsonb; gain_xp integer := 0; base integer; resultat text;
  moi public.profils%rowtype; nouvelle integer; cote_adverse integer; obtenu numeric;
begin
  perform 1 from public.comptes where utilisateur=p_utilisateur for update;
  select * into b from public.combats where id=p_id and utilisateur=p_utilisateur for update;
  if not found then raise exception 'Ce combat est introuvable pour ton compte.'; end if;
  if b.commandes ? p_requete::text then
    if b.commandes->p_requete::text <> p_action then raise exception 'Identifiant de commande déjà utilisé.'; end if;
    return public.combat_reponse(p_utilisateur,p_id);
  end if;
  if b.revision <> p_revision or b.archive then raise exception 'La partie a avancé sur un autre écran. Reprends-la.'; end if;
  if b.termine and (p_etat->>'resultat' is distinct from b.etat->>'resultat' or not (p_etat->>'termine')::boolean or p_reponse is not null)
    then raise exception 'Le résultat de ce combat est définitif.'; end if;
  gain_enregistre := b.recompense;
  if p_reponse is not null then
    if b.termine or b.etat->'etape'->>'nom' <> 'parade'
      or p_reponse->>'carte' is distinct from b.etat->'etape'->'epreuve'->>'idCarte' then raise exception 'Réponse hors séquence.'; end if;
    perform public.noter_reponse_verifiee(p_utilisateur,p_reponse);
    if (p_reponse->>'reussie')::boolean then gain_xp := public.gagner_xp(p_utilisateur,5,true); end if;
  end if;
  if not b.termine and (p_etat->>'termine')::boolean then
    resultat := p_etat->>'resultat';
    if resultat is null or resultat not in ('victoire','defaite','nul') then raise exception 'Résultat serveur invalide.'; end if;
    if (p_etat->>'abandonne')::boolean then gain_enregistre := jsonb_build_object('encre',0,'reduite',false,'cote',null);
    else
      base := case when b.etat->'adversaire'->>'type'='joute' then 35
        else case b.etat->'adversaire'->>'niveau' when 'Facile' then 20 when 'Normal' then 30 when 'Difficile' then 45 end end;
      gain_enregistre := public.recompenser(p_utilisateur,base,resultat) || jsonb_build_object('cote',null);
      gain_xp := gain_xp + public.gagner_xp(p_utilisateur,30 + case when resultat='victoire' then 20 else 0 end,true);
    end if;
    update public.comptes set combats_joues=combats_joues+1, combats_gagnes=combats_gagnes+(resultat='victoire')::integer where utilisateur=p_utilisateur;
    if b.etat->'adversaire'->>'type'='joute' and not coalesce((b.etat->'adversaire'->>'amical')::boolean,false) then
      select * into moi from public.profils where utilisateur=p_utilisateur for update;
      if not found then raise exception 'Le profil du joueur a disparu.'; end if;
      cote_adverse := (b.etat->'adversaire'->'profil'->>'cote')::integer;
      obtenu := case resultat when 'victoire' then 1 when 'nul' then 0.5 else 0 end;
      nouvelle := greatest(100,round(moi.cote+32*(obtenu-1/(1+power(10::numeric,(cote_adverse-moi.cote)::numeric/400)))));
      update public.profils set cote=nouvelle,jouees=jouees+1,gagnees=gagnees+(resultat='victoire')::integer,maj_le=now() where id=moi.id;
      gain_enregistre := gain_enregistre || jsonb_build_object('cote',jsonb_build_object('avant',moi.cote,'apres',nouvelle));
    end if;
  end if;
  update public.combats set revision=revision+1, etat=p_etat, vue=p_vue,
    termine=(p_etat->>'termine')::boolean, archive=(p_etat->>'archive')::boolean,
    commandes=commandes||jsonb_build_object(p_requete::text,p_action), recompense=gain_enregistre, xp=xp+gain_xp, maj_le=now() where id=p_id;
  return public.combat_reponse(p_utilisateur,p_id);
end $$;

revoke execute on function public.combat_reponse(uuid,uuid), public.combat_contexte(uuid,uuid,uuid),
  public.combat_creer(uuid,uuid,jsonb,jsonb,jsonb), public.combat_appliquer(uuid,uuid,integer,uuid,jsonb,jsonb,jsonb,jsonb)
  from public,anon,authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.combat_contexte(uuid,uuid,uuid),public.combat_creer(uuid,uuid,jsonb,jsonb,jsonb),
      public.combat_appliquer(uuid,uuid,integer,uuid,jsonb,jsonb,jsonb,jsonb) to service_role;
  end if;
end $$;

-- Fermer toutes les anciennes entrées déclaratives. Les fonctions restent seulement pour l'historique SQL.
revoke execute on function public.commencer_un_duel(text),public.terminer_un_duel(bigint,text),
  public.commencer_une_joute(uuid),public.terminer_une_joute(bigint,text) from authenticated,anon,public;
