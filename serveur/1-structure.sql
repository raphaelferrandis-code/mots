-- ═════════════════════════════════════════════════════════════════════════════
-- MOTS — le serveur du jeu (1/3 : la structure — joutes classées et collections)
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
  refus := public.pseudo_refuse(propre);
  if refus is not null then return jsonb_build_object('accepte', false, 'raison', refus); end if;
  if exists (select 1 from public.profils where pseudo_cle = public.cle_du_pseudo(propre) and utilisateur is distinct from moi) then
    return jsonb_build_object('accepte', false, 'raison', 'Ce pseudonyme est déjà pris.');
  end if;
  if jsonb_typeof(p_deck) <> 'array' or jsonb_array_length(p_deck) > 10 or jsonb_typeof(p_savoirs) <> 'object' or jsonb_typeof(p_parades) <> 'object'
     or pg_column_size(p_deck) > 2000 or pg_column_size(p_savoirs) > 4000 or pg_column_size(p_parades) > 2000 then
    raise exception 'Ce profil ne peut pas être enregistré.';
  end if;

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
      resultat := resultat || jsonb_build_object('id', choisi.id, 'pseudo', choisi.pseudo, 'cote', choisi.cote, 'deck', choisi.deck, 'savoirs', choisi.savoirs, 'parades', choisi.parades);
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
  select * into moi from public.profils where utilisateur = auth.uid();
  if not found then raise exception 'Publie d''abord ton profil.'; end if;
  if p_adversaire = moi.id or not exists (select 1 from public.profils where id = p_adversaire) then raise exception 'Cet adversaire n''est plus disponible.'; end if;
  if (select count(*) from public.joutes where attaquant = moi.id and commencee_le > now() - interval '1 hour') >= 40 then
    raise exception 'Trop de joutes en peu de temps : fais une pause.';
  end if;
  insert into public.joutes (attaquant, defenseur, cote_avant) values (moi.id, p_adversaire, moi.cote) returning id into ticket;
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
  recompense jsonb;
begin
  if p_resultat not in ('victoire', 'defaite', 'nul') then raise exception 'Résultat inconnu.'; end if;
  select * into moi from public.profils where utilisateur = auth.uid() for update;
  if not found then raise exception 'Publie d''abord ton profil.'; end if;
  select * into joute from public.joutes where id = p_ticket and attaquant = moi.id and terminee_le is null and commencee_le > now() - interval '2 hours' for update;
  if not found then raise exception 'Cette joute ne peut plus être enregistrée.'; end if;
  if now() - joute.commencee_le < interval '45 seconds' then raise exception 'Cette joute est trop courte pour être comptée.'; end if;

  select cote into cote_adverse from public.profils where id = joute.defenseur;
  obtenu := case p_resultat when 'victoire' then 1 when 'nul' then 0.5 else 0 end;
  nouvelle := greatest(100, round(moi.cote + 32 * (obtenu - 1 / (1 + power(10::numeric, (cote_adverse - moi.cote)::numeric / 400)))));

  update public.profils set cote = nouvelle, jouees = jouees + 1, gagnees = gagnees + (p_resultat = 'victoire')::integer, maj_le = now() where id = moi.id;
  update public.joutes set terminee_le = now(), resultat = p_resultat, cote_avant = moi.cote, cote_apres = nouvelle where id = joute.id;
  -- L'Encre de la joute, si le serveur tient la collection du joueur (même plafond quotidien que les duels d'entraînement).
  recompense := public.recompenser(moi.utilisateur, 35, p_resultat);
  return jsonb_build_object('avant', moi.cote, 'apres', nouvelle) || coalesce(recompense, '{}'::jsonb);
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
      select row_number() over (order by p.cote desc, (p.id = mon_profil.id) desc, p.pseudo) as rang, p.pseudo, p.cote, (p.id = mon_profil.id) as moi from public.profils p
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
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  delete from public.profils where utilisateur = auth.uid();
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
  payant boolean not null default false, -- la version payante (décision n° 34) : pas de limite au marché
  code_hache text, -- l'empreinte du code de secours (recuperation.ts) ; jamais le code lui-même
  code_defini_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
-- (Pour un serveur installé avant le 22/09/2026 au soir : les deux colonnes du code de secours.)
alter table public.comptes add column if not exists code_hache text, add column if not exists code_defini_le timestamptz, add column if not exists payant boolean not null default false;
create index if not exists comptes_par_code on public.comptes (code_hache);

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
create or replace function public.nombre_entier(t text) returns bigint language sql immutable set search_path = ''
as $$ select case when t ~ '^[0-9]{1,15}$' then t::bigint end $$;

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
    'paquets', jsonb_build_object('stock', c.stock, 'reference', public.en_millisecondes(c.reference), 'ouverts', c.ouverts, 'sansLegendaire', c.sans_legendaire),
    'deck', c.deck,
    'codeDeSecoursLe', public.en_millisecondes(c.code_defini_le),
    'payant', c.payant,
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
begin
  c.stock := least(c.stock, 10);
  -- Réserve pleine : le compte à rebours est à l'arrêt. Il repart quand un paquet est ouvert.
  if c.stock >= 10 or now() < c.reference then c.reference := now(); return c; end if;
  gagnes := floor(extract(epoch from (now() - c.reference)) / 600);
  c.stock := least(10, c.stock + gagnes);
  -- Le temps déjà écoulé vers le paquet suivant est conservé, sauf si la réserve vient de se remplir.
  c.reference := case when c.stock >= 10 then now() else c.reference + gagnes * interval '10 minutes' end;
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
  update public.comptes set encre = encre + gain, jour = aujourd_hui, victoires_du_jour = victoires + gagne::integer, maj_le = now() where utilisateur = p_utilisateur;
  return jsonb_build_object('encre', gain, 'reduite', reduite);
end $$;

-- Le tirage d'un paquet (src/jeu/paquets.ts), rangé dans la collection (src/jeu/partie.ts). L'appelant a vérifié la
-- réserve ou l'Encre, et verrouillé le compte. Rend les cartes tirées, avec ce qu'elles apportent.
create or replace function public.tirer_un_paquet(p_utilisateur uuid, p_masques text[]) returns jsonb
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
  garantie := c.sans_legendaire + 1 >= 40;
  -- Les 3 paquets de départ ne contiennent que des cartes nouvelles, pour composer un deck tout de suite.
  depart := c.ouverts < 3;

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
    if dernier then
      -- La garantie de Légendaire passe avant tout ; sinon, une toute petite chance de carte Hors-série.
      if garantie then rarete := 'Légendaire';
      elsif exists (select 1 from public.cartes k where k.rarete = 'Hors-série' and not (k.registre && masques)) and random() < 0.001 then rarete := 'Hors-série';
      end if;
    end if;

    -- La carte : de cette rareté, sinon de la plus proche ; jamais deux fois la même dans un paquet.
    ordre := case rarete when 'Commune' then array['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'] when 'Peu commune' then array['Peu commune', 'Commune', 'Rare', 'Épique', 'Légendaire'] when 'Rare' then array['Rare', 'Peu commune', 'Commune', 'Épique', 'Légendaire'] when 'Épique' then array['Épique', 'Rare', 'Peu commune', 'Commune', 'Légendaire'] when 'Légendaire' then array['Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] when 'Hors-série' then array['Hors-série', 'Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] end;
    id_choisie := null;
    foreach r in array ordre loop
      select k.id, k.rarete into id_choisie, rarete_choisie from public.cartes k
      where k.rarete = r and not (k.registre && masques) and k.id <> all (pris)
        and (not depart or not exists (select 1 from public.possessions p where p.utilisateur = p_utilisateur and p.carte = k.id))
      order by random() limit 1;
      if found then exit; end if;
    end loop;
    if id_choisie is null then continue; end if;
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
            * (case finition when 'Normale' then 1 when 'Brillante' then 3 when 'Holographique' then 10 else 1 end);
      update public.possessions
        set finitions = jsonb_set(finitions, array[finition], to_jsonb((possession.finitions ->> finition)::integer + 1)), doublons = doublons + 1
        where utilisateur = p_utilisateur and carte = id_choisie;
      c.encre := c.encre + gain;
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', false, 'nouvelleFinition', false, 'encre', gain);
    end if;
  end loop;

  update public.comptes
    set encre = c.encre, ouverts = ouverts + 1, sans_legendaire = case when legendaire then 0 else sans_legendaire + 1 end, maj_le = now()
    where utilisateur = p_utilisateur;
  return tirees;
end $$;

-- ── Les fonctions appelées par le jeu ────────────────────────────────────────

-- Le compte du joueur, ou rien s'il n'en a pas encore ici. (Au passage, les enchères échues sont clôturées : un vendeur
-- retrouve ainsi son Encre en ouvrant le jeu, sans que personne ait à visiter le marché.)
create or replace function public.mon_compte() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
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
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(moi::text, 1));
  if exists (select 1 from public.comptes where utilisateur = moi) then raise exception 'Ce compte a déjà une collection.'; end if;
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

-- Un paquet acheté 150 Encre, sans attendre.
create or replace function public.acheter_un_paquet(p_masques text[]) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  tirees jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  if c.encre < 150 then raise exception 'Pas assez d''Encre.'; end if;
  c := public.recharger(c);
  update public.comptes set encre = encre - 150, stock = c.stock, reference = c.reference where utilisateur = c.utilisateur;
  tirees := public.tirer_un_paquet(c.utilisateur, p_masques);
  return jsonb_build_object('cartes', tirees, 'etat', public.etat_du_compte(c.utilisateur));
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
  if p_niveau not in ('Facile', 'Normal', 'Difficile') then raise exception 'Niveau inconnu.'; end if;
  if not exists (select 1 from public.comptes where utilisateur = auth.uid()) then raise exception 'Ouvre d''abord ton compte.'; end if;
  if (select count(*) from public.duels where utilisateur = auth.uid() and commence_le > now() - interval '1 hour') >= 40 then
    raise exception 'Trop de duels en peu de temps : fais une pause.';
  end if;
  insert into public.duels (utilisateur, niveau) values (auth.uid(), p_niveau) returning id into ticket;
  return ticket;
end $$;

-- Un duel d'entraînement se termine : l'Encre est versée par le serveur.
create or replace function public.terminer_un_duel(p_ticket bigint, p_resultat text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  duel public.duels%rowtype;
  recompense jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_resultat not in ('victoire', 'defaite', 'nul') then raise exception 'Résultat inconnu.'; end if;
  select * into duel from public.duels where id = p_ticket and utilisateur = auth.uid() and termine_le is null and commence_le > now() - interval '2 hours' for update;
  if not found then raise exception 'Ce duel ne peut plus être enregistré.'; end if;
  if now() - duel.commence_le < interval '45 seconds' then raise exception 'Ce duel est trop court pour être compté.'; end if;
  update public.duels set termine_le = now() where id = duel.id;
  recompense := public.recompenser(auth.uid(), case duel.niveau when 'Facile' then 20 when 'Normal' then 30 when 'Difficile' then 45 else 0 end, p_resultat);
  return coalesce(recompense, '{}'::jsonb) || jsonb_build_object('etat', public.etat_du_compte(auth.uid()));
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
  quand timestamptz not null default now()
);
create index if not exists mises_par_enchere on public.mises (enchere, quand desc);

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
create or replace function public.cloturer_les_encheres() returns void
language plpgsql set search_path = ''
as $$
declare
  e public.encheres%rowtype;
  vendeur_recoit integer;
begin
  for e in select * from public.encheres where etat = 'ouverte' and ferme_le <= now() order by ferme_le limit 50 for update skip locked loop
    if e.meilleure_mise is null then
      perform public.rendre_un_timbre(e.vendeur, e.carte, e.finition, e.obtenue_le, null);
      update public.encheres set etat = 'invendue', cloturee_le = now() where id = e.id;
    else
      -- L'Encre de la mise est déjà bloquée : le vendeur en reçoit 90 %, le reste disparaît.
      vendeur_recoit := e.meilleure_mise - ceil(e.meilleure_mise * 0.1)::integer;
      perform public.rendre_un_timbre(e.meilleur_encherisseur, e.carte, e.finition, now(), public.pseudonyme_de(e.vendeur));
      update public.comptes set encre = encre + vendeur_recoit, maj_le = now() where utilisateur = e.vendeur;
      update public.encheres set etat = 'vendue', cloturee_le = now(), prix_final = e.meilleure_mise, acheteur = e.meilleur_encherisseur where id = e.id;
    end if;
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
  if not c.payant and (select count(*) from public.encheres where vendeur = moi and etat = 'ouverte') >= 10 then
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
  if not c.payant then
    select count(*) into achats from public.encheres where (meilleur_encherisseur = moi and etat = 'ouverte' and id <> e.id)
      or (acheteur = moi and etat = 'vendue' and cloturee_le >= date_trunc('day', now() at time zone 'utc') at time zone 'utc');
    if achats >= 10 then raise exception 'Tu as déjà 10 achats aujourd''hui : reviens demain.'; end if;
  end if;
  minimum := case when e.meilleure_mise is null then e.mise_de_depart else e.meilleure_mise + greatest(1, ceil(e.meilleure_mise * 0.05)::integer) end;
  if montant is null or montant < minimum then raise exception 'La mise doit être d''au moins % Encre.', minimum; end if;
  if e.achat_immediat is not null and montant >= e.achat_immediat then montant := e.achat_immediat; end if;
  if c.encre < montant then raise exception 'Pas assez d''Encre : il te faut % Encre.', montant; end if;

  -- L'Encre change de mains : la mienne est bloquée, celle du précédent lui revient.
  update public.comptes set encre = encre - montant, maj_le = now() where utilisateur = moi;
  if e.meilleur_encherisseur is not null then
    update public.comptes set encre = encre + e.meilleure_mise, maj_le = now() where utilisateur = e.meilleur_encherisseur;
  end if;
  insert into public.mises (enchere, encherisseur, montant) values (e.id, moi, montant);
  update public.encheres set meilleure_mise = montant, meilleur_encherisseur = moi,
    -- Une mise dans les 5 dernières minutes prolonge l'enchère d'autant.
    ferme_le = case when e.achat_immediat is not null and montant >= e.achat_immediat then now()
                    when e.ferme_le - now() < interval '5 minutes' then now() + interval '5 minutes'
                    else e.ferme_le end
    where id = e.id;
  -- Un achat immédiat se règle sur-le-champ.
  if e.achat_immediat is not null and montant >= e.achat_immediat then perform public.cloturer_les_encheres(); end if;
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
  if not exists (select 1 from public.comptes where utilisateur = moi and payant) then
    raise exception 'L''histoire des prix et les statistiques font partie de la version payante.';
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

-- ── Les droits ───────────────────────────────────────────────────────────────
-- Seuls les joueurs connectés (compte anonyme compris) peuvent appeler les fonctions du jeu ; les aides internes, personne.
revoke execute on function public.publier_mon_profil(text, jsonb, jsonb, jsonb), public.adversaires(), public.commencer_une_joute(uuid), public.terminer_une_joute(bigint, text), public.classement(), public.supprimer_mon_profil(), public.pseudo_refuse(text), public.mon_compte(), public.ouvrir_mon_compte(), public.importer_ma_collection(bigint, integer, jsonb, jsonb, jsonb), public.ouvrir_un_paquet(text[]), public.acheter_un_paquet(text[]), public.changer_de_deck(jsonb), public.commencer_un_duel(text), public.terminer_un_duel(bigint, text), public.definir_un_code_de_secours(text), public.recuperer_par_code(text), public.mettre_en_vente(text, text, integer, integer, integer), public.retirer_de_la_vente(bigint), public.encherir(bigint, integer), public.marche(text, integer), public.mes_encheres(), public.cotes(text), public.historique_de_la_cote(text), public.nombre_entier(text), public.en_millisecondes(timestamptz), public.etat_du_compte(uuid), public.recharger(public.comptes), public.deck_propre(uuid, jsonb), public.finitions_propres(jsonb), public.recompenser(uuid, integer, text), public.tirer_un_paquet(uuid, text[]), public.code_propre(text), public.empreinte_du_code(text), public.pseudonyme_de(uuid), public.rendre_un_timbre(uuid, text, text, timestamptz, text), public.enchere_en_json(public.encheres), public.cloturer_les_encheres(), public.calculer_les_cotes(), public.cote_du_jour(text, text) from public, anon;
revoke execute on function public.pseudo_refuse(text), public.nombre_entier(text), public.en_millisecondes(timestamptz), public.etat_du_compte(uuid), public.recharger(public.comptes), public.deck_propre(uuid, jsonb), public.finitions_propres(jsonb), public.recompenser(uuid, integer, text), public.tirer_un_paquet(uuid, text[]), public.code_propre(text), public.empreinte_du_code(text), public.pseudonyme_de(uuid), public.rendre_un_timbre(uuid, text, text, timestamptz, text), public.enchere_en_json(public.encheres), public.cloturer_les_encheres(), public.calculer_les_cotes(), public.cote_du_jour(text, text) from authenticated; -- le contrôle des pseudonymes ne sert qu'à publier_mon_profil
grant execute on function public.publier_mon_profil(text, jsonb, jsonb, jsonb), public.adversaires(), public.commencer_une_joute(uuid), public.terminer_une_joute(bigint, text), public.classement(), public.supprimer_mon_profil(), public.mon_compte(), public.ouvrir_mon_compte(), public.importer_ma_collection(bigint, integer, jsonb, jsonb, jsonb), public.ouvrir_un_paquet(text[]), public.acheter_un_paquet(text[]), public.changer_de_deck(jsonb), public.commencer_un_duel(text), public.terminer_un_duel(bigint, text), public.definir_un_code_de_secours(text), public.recuperer_par_code(text), public.mettre_en_vente(text, text, integer, integer, integer), public.retirer_de_la_vente(bigint), public.encherir(bigint, integer), public.marche(text, integer), public.mes_encheres(), public.cotes(text), public.historique_de_la_cote(text) to authenticated;
