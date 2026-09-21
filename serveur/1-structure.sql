-- ═════════════════════════════════════════════════════════════════════════════
-- MOTS — le serveur des joutes classées (1/2 : la structure)
-- Fichier fabriqué par « npm run serveur:script » : ne pas le modifier à la main.
-- À coller dans Supabase : SQL Editor → New query → coller → Run. Peut être relancé sans danger.
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
  refus := public.pseudo_refuse(propre);
  if refus is not null then return jsonb_build_object('accepte', false, 'raison', refus); end if;
  if exists (select 1 from public.profils where pseudo_cle = public.cle_du_pseudo(propre) and utilisateur is distinct from moi) then
    return jsonb_build_object('accepte', false, 'raison', 'Ce pseudonyme est déjà pris.');
  end if;
  if jsonb_typeof(p_deck) <> 'array' or jsonb_array_length(p_deck) > 10 or jsonb_typeof(p_savoirs) <> 'object' or jsonb_typeof(p_parades) <> 'object'
     or pg_column_size(p_deck) > 2000 or pg_column_size(p_savoirs) > 4000 or pg_column_size(p_parades) > 2000 then
    raise exception 'Ce profil ne peut pas être enregistré.';
  end if;

  insert into public.profils (utilisateur, pseudo, pseudo_cle, deck, savoirs, parades)
  values (moi, propre, public.cle_du_pseudo(propre), p_deck, p_savoirs, p_parades)
  on conflict (utilisateur) do update set pseudo = excluded.pseudo, pseudo_cle = excluded.pseudo_cle, deck = excluded.deck, savoirs = excluded.savoirs, parades = excluded.parades, maj_le = now()
  returning cote into ma_cote;
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
  return jsonb_build_object('avant', moi.cote, 'apres', nouvelle);
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

-- Seuls les joueurs connectés (compte anonyme compris) peuvent appeler ces fonctions.
revoke execute on function public.publier_mon_profil(text, jsonb, jsonb, jsonb), public.adversaires(), public.commencer_une_joute(uuid), public.terminer_une_joute(bigint, text), public.classement(), public.supprimer_mon_profil(), public.pseudo_refuse(text) from public, anon;
grant execute on function public.publier_mon_profil(text, jsonb, jsonb, jsonb), public.adversaires(), public.commencer_une_joute(uuid), public.terminer_une_joute(bigint, text), public.classement(), public.supprimer_mon_profil() to authenticated;
