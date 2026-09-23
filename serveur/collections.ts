import { ORNEMENTS } from '../src/jeu/personnalisation.ts';
// La partie du script du serveur qui tient les collections (décision du 22/09/2026, BRIEF-marche.md §5a) :
// le compte du joueur (Encre, réserve de paquets, deck), ses timbres, le tirage des paquets par le serveur,
// les récompenses des duels et l'importation, une seule fois, de la collection qui vivait sur l'appareil.
// Les règles sont celles de src/jeu/paquets.ts, recharge.ts, partie.ts et progression.ts, et les chiffres
// viennent de src/config/equilibrage.ts : il n'y a qu'un seul endroit où les changer.
// Ce fichier est utilisé par fabriquer-le-script.ts ; le SQL produit est testé avec un Postgres en mémoire.

import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { FINITIONS, RARETES } from '../src/partage/types.ts';
import type { IndexEdition, Rarete } from '../src/partage/types.ts';

const P = EQUILIBRAGE.paquets;
const F = EQUILIBRAGE.finitions;
const D = EQUILIBRAGE.duel;
const PAYANT = EQUILIBRAGE.payant;
const NIVEAUX = ['Facile', 'Normal', 'Difficile'] as const;

// Ce qui est plausible pour une collection importée depuis l'appareil : au-delà, elle est ramenée à ces bornes.
export const IMPORTATION = {
  paquetsParJour: 200, // 144 paquets gratuits par jour au plus, plus des achats
  encreDeBase: 2000,
  encreParPaquet: 30,
};

// Garde-fous des duels d'entraînement (les mêmes que pour les joutes).
export const DUELS_PAR_HEURE = 40;
export const SECONDES_MINIMUM_PAR_DUEL = 45;
export const HEURES_DE_VALIDITE_DU_TICKET = 2;

const texte = (valeur: string): string => `'${valeur.replaceAll("'", "''")}'`;
const liste = (valeurs: readonly string[]): string => valeurs.map(texte).join(', ');

// Une carte de la rareté voulue, sinon la plus proche : d'abord les raretés en dessous, puis au-dessus —
// et jamais une Hors-série à la place d'une carte ordinaire (même ordre que tirerCarte dans src/jeu/paquets.ts).
function ordreDeRepli(rarete: Rarete): Rarete[] {
  const rang = RARETES.indexOf(rarete);
  return [rarete, ...RARETES.slice(0, rang).reverse(), ...RARETES.slice(rang + 1)].filter((r) => r !== 'Hors-série' || rarete === 'Hors-série');
}

const cas = (valeurs: readonly string[], valeur: (v: string) => string | number): string => valeurs.map((v) => `when ${texte(v)} then ${valeur(v)}`).join(' ');

export function collections(): string {
  const chanceHolo = F.chances.Holographique ?? 0;
  const chanceBrillante = F.chances.Brillante ?? 0;

  return String.raw`
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
  stock integer not null default ${P.paquetsDeDepart},
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
  -- qu'au marché, jamais à acheter un paquet : c'est ce qui empêche l'argent d'acheter un tirage au sort.
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
  update public.comptes set encre_achetee = encre_achetee + ${PAYANT.renteQuotidienne}, rente_le = aujourd_hui, maj_le = now()
    where utilisateur = p_utilisateur;
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
    'codeDeSecoursLe', public.en_millisecondes(c.code_defini_le),
    'formule', jsonb_build_object(
      'niveau', public.niveau(c),
      'achatUnique', c.achat_unique,
      'abonnement', c.abonnement,
      'jusquAu', public.en_millisecondes(c.abonnement_jusqu_au),
      'encreAchetee', c.encre_achetee,
      'anneeDeNaissance', c.annee_de_naissance
    ),
    'maintenant', public.en_millisecondes(now()),
    'cartes', (select coalesce(jsonb_object_agg(p.carte, jsonb_build_object('obtenueLe', public.en_millisecondes(p.obtenue_le), 'doublons', p.doublons, 'finitions', p.finitions)), '{}'::jsonb)
               from public.possessions p where p.utilisateur = c.utilisateur)
  )
  from public.comptes c where c.utilisateur = p_utilisateur
$$;

-- La recharge des paquets (src/jeu/recharge.ts) : un paquet toutes les ${P.minutesEntreDeuxPaquets} minutes, ${P.stockMaximum} en réserve au plus.
create or replace function public.recharger(c public.comptes) returns public.comptes
language plpgsql stable set search_path = ''
as $$
declare
  gagnes integer;
  -- La version payante (décision n° 34) : un paquet plus souvent, et une réserve plus grande.
  paye integer := public.niveau(c);
  minutes integer := case when paye >= 1 then ${PAYANT.minutesEntreDeuxPaquets} else ${P.minutesEntreDeuxPaquets} end;
  maximum integer := case when paye >= 1 then ${PAYANT.stockMaximum} else ${P.stockMaximum} end;
begin
  c.stock := least(c.stock, maximum);
  -- Réserve pleine : le compte à rebours est à l'arrêt. Il repart quand un paquet est ouvert.
  if c.stock >= maximum or now() < c.reference then c.reference := now(); return c; end if;
  gagnes := floor(extract(epoch from (now() - c.reference)) / (minutes * 60));
  c.stock := least(maximum, c.stock + gagnes);
  -- Le temps déjà écoulé vers le paquet suivant est conservé, sauf si la réserve vient de se remplir.
  c.reference := case when c.stock >= maximum then now() else c.reference + gagnes * interval '1 minute' * minutes end;
  return c;
end $$;

-- Un deck propre : des cartes possédées, chacune une fois, dans l'ordre donné, ${D.tailleDuDeck} au plus.
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
    limit ${D.tailleDuDeck}
  ) i
$$;

-- Des finitions propres : seulement les finitions du jeu, avec des nombres entiers positifs ; à défaut, une Normale.
create or replace function public.finitions_propres(j jsonb) returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(e.key, least(public.nombre_entier(e.value), 10000)) filter (where e.key in (${liste(FINITIONS)}) and public.nombre_entier(e.value) > 0),
    '{"Normale": 1}'::jsonb)
  from jsonb_each_text(case when jsonb_typeof(j) = 'object' then j else '{}'::jsonb end) e
$$;

-- La récompense d'un duel ou d'une joute (src/jeu/progression.ts) : les ${D.victoiresPleinesParJour} premières victoires du jour
-- rapportent toute leur Encre, les suivantes ${Math.round(D.partDeLEncreEnsuite * 100)} % ; une défaite ${D.encreParDefaite}. Rien si le joueur n'a pas de compte ici.
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
  reduite := gagne and victoires >= ${D.victoiresPleinesParJour};
  gain := case when not gagne then ${D.encreParDefaite} when reduite then greatest(1, round(p_pleine * ${D.partDeLEncreEnsuite})::integer) else p_pleine end;
  -- « Collectionneur » et au-dessus : l'Encre gagnée en jouant est doublée.
  if public.niveau(c) >= 2 then gain := gain * ${PAYANT.multiplicateurDEncre}; end if;
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
  emplacements jsonb := ${texte(JSON.stringify(P.emplacements))}::jsonb;
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
  -- Au plus tard au ${P.paquetsAvantLegendaireGarantie}e paquet sans Légendaire, la dernière carte en est une.
  garantie := c.sans_legendaire + 1 >= ${P.paquetsAvantLegendaireGarantie};
  -- Les ${P.paquetsDeDepart} paquets de départ ne contiennent que des cartes nouvelles, pour composer un deck tout de suite.
  depart := c.ouverts < ${P.paquetsDeDepart};

  for chances in select * from jsonb_array_elements(emplacements) loop
    numero := numero + 1;
    dernier := numero = jsonb_array_length(emplacements);

    -- La rareté de l'emplacement, selon ses chances.
    seuil := random() * (select sum(e.value::numeric) from jsonb_each_text(chances) e);
    rarete := null;
    foreach r in array array[${liste(RARETES)}] loop
      seuil := seuil - coalesce((chances ->> r)::numeric, 0);
      if seuil < 0 then rarete := r; exit; end if;
    end loop;
    if rarete is null then rarete := 'Commune'; end if;
    if dernier then
      -- La garantie de Légendaire passe avant tout ; sinon, une toute petite chance de carte Hors-série.
      if garantie then rarete := 'Légendaire';
      elsif exists (select 1 from public.cartes k where k.rarete = 'Hors-série' and not (k.registre && masques)) and random() < ${P.chanceHorsSerie} then rarete := 'Hors-série';
      end if;
    end if;

    -- La carte : de cette rareté, sinon de la plus proche ; jamais deux fois la même dans un paquet.
    ordre := case rarete ${cas(RARETES, (r) => `array[${liste(ordreDeRepli(r as Rarete))}]`)} end;
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
      finition := case when tirage < ${chanceHolo} then 'Holographique' when tirage < ${chanceHolo + chanceBrillante} then 'Brillante' else 'Normale' end;
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
      gain := (case rarete_choisie ${cas(RARETES, (r) => EQUILIBRAGE.encreParDoublon[r as Rarete])} else 0 end)
            * (case finition ${cas(FINITIONS, (f) => F.encre[f as keyof typeof F.encre])} else 1 end)
            * (case when public.niveau(c) >= 2 then ${PAYANT.multiplicateurDEncre} else 1 end);
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
  perform public.verser_la_rente(auth.uid());
  return public.etat_du_compte(auth.uid());
end $$;

-- Un compte neuf : les ${P.paquetsDeDepart} paquets de départ, rien d'autre.
create or replace function public.ouvrir_mon_compte() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  insert into public.comptes (utilisateur, stock) values (auth.uid(), ${P.paquetsDeDepart}) on conflict (utilisateur) do nothing;
  return public.etat_du_compte(auth.uid());
end $$;

-- L'importation, une seule fois, de la collection qui vivait sur l'appareil. Ce qui dépasse le plausible est ramené
-- aux bornes : au plus ${IMPORTATION.paquetsParJour} paquets par jour depuis la création de la partie, ${P.emplacements.length} cartes par paquet (les plus
-- anciennes d'abord), et ${IMPORTATION.encreDeBase} + ${IMPORTATION.encreParPaquet} Encre par paquet.
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
  ouverts := least(greatest(coalesce(public.nombre_entier(p_paquets ->> 'ouverts'), 0), 0), ${P.paquetsDeDepart} + jours * ${IMPORTATION.paquetsParJour});

  insert into public.comptes (utilisateur, encre, stock, reference, ouverts, sans_legendaire, importee_le) values (
    moi,
    least(greatest(coalesce(p_encre, 0), 0), ${IMPORTATION.encreDeBase} + ouverts * ${IMPORTATION.encreParPaquet}),
    least(greatest(coalesce(public.nombre_entier(p_paquets ->> 'stock'), 0), 0), ${P.stockMaximum}),
    least(to_timestamp(coalesce(public.nombre_entier(p_paquets ->> 'reference'), 0) / 1000.0), now()),
    ouverts,
    least(greatest(coalesce(public.nombre_entier(p_paquets ->> 'sansLegendaire'), 0), 0), ${P.paquetsAvantLegendaireGarantie}),
    now());

  for carte in
    select e.key as id, e.value as v from jsonb_each(p_cartes) e
    join public.cartes k on k.id = e.key
    where jsonb_typeof(e.value) = 'object'
    order by coalesce(public.nombre_entier(e.value ->> 'obtenueLe'), 0), e.key
    limit ouverts * ${P.emplacements.length}
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

-- Le deck : seulement des cartes possédées, ${D.tailleDuDeck} au plus. Rend le deck tel qu'il est enregistré.
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

-- Un duel d'entraînement commence : un ticket, comme pour les joutes (au plus ${DUELS_PAR_HEURE} par heure).
create or replace function public.commencer_un_duel(p_niveau text) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  ticket bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_niveau not in (${liste(NIVEAUX)}) then raise exception 'Niveau inconnu.'; end if;
  if not exists (select 1 from public.comptes where utilisateur = auth.uid()) then raise exception 'Ouvre d''abord ton compte.'; end if;
  if (select count(*) from public.duels where utilisateur = auth.uid() and commence_le > now() - interval '1 hour') >= ${DUELS_PAR_HEURE} then
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
  select * into duel from public.duels where id = p_ticket and utilisateur = auth.uid() and termine_le is null and commence_le > now() - interval '${HEURES_DE_VALIDITE_DU_TICKET} hours' for update;
  if not found then raise exception 'Ce duel ne peut plus être enregistré.'; end if;
  if now() - duel.commence_le < interval '${SECONDES_MINIMUM_PAR_DUEL} seconds' then raise exception 'Ce duel est trop court pour être compté.'; end if;
  update public.duels set termine_le = now() where id = duel.id;
  recompense := public.recompenser(auth.uid(), case duel.niveau ${cas(NIVEAUX, (n) => D.encreParVictoire[n as keyof typeof D.encreParVictoire])} else 0 end, p_resultat);
  return coalesce(recompense, '{}'::jsonb) || jsonb_build_object('etat', public.etat_du_compte(auth.uid()));
end $$;

create or replace function public.acheter_personnalisation(p_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare c public.comptes%rowtype; prix integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  prix := case p_id ${ORNEMENTS.filter((o) => o.categorie !== 'titre' && !o.premium && o.prix > 0).map((o) => `when '${o.id}' then ${o.prix}`).join(' ')} else null end;
  if prix is null then raise exception 'Personnalisation inconnue.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Compte introuvable.'; end if;
  if p_id = any(c.personnalisations) then return public.etat_du_compte(auth.uid()); end if;
  if c.encre < prix then raise exception 'Pas assez d’Encre.'; end if;
  update public.comptes set encre = encre - prix, personnalisations = array_append(personnalisations, p_id), maj_le = now() where utilisateur = auth.uid();
  return public.etat_du_compte(auth.uid());
end $$;
`;
}

// Migration ciblée pour les serveurs déjà installés. Le catalogue de prix reste commun au client.
export function migrationPersonnalisation(): string {
  const sql = collections();
  const etat = sql.match(/create or replace function public\.etat_du_compte\(p_utilisateur uuid\)[\s\S]*?\$\$;/)?.[0];
  const achat = sql.match(/create or replace function public\.acheter_personnalisation\(p_id text\)[\s\S]*?end \$\$;/)?.[0];
  if (!etat || !achat) throw new Error('Fonctions de personnalisation introuvables.');
  return `-- Migration des cosmétiques : générée par npm run serveur:script.
-- Relançable ; conserve les collections, les soldes et les achats existants.
begin;
alter table public.comptes add column if not exists personnalisations text[] not null default '{}';
${etat}
${achat}
revoke execute on function public.acheter_personnalisation(text) from public, anon;
grant execute on function public.acheter_personnalisation(text) to authenticated;
commit;
`;
}

// Les droits : les fonctions que le jeu appelle, et celles qui restent internes.
export const FONCTIONS_DES_COLLECTIONS = [
  'public.acheter_personnalisation(text)', 'public.mon_compte()', 'public.ouvrir_mon_compte()', 'public.importer_ma_collection(bigint, integer, jsonb, jsonb, jsonb)',
  'public.ouvrir_un_paquet(text[])', 'public.changer_de_deck(jsonb)',
  'public.commencer_un_duel(text)', 'public.terminer_un_duel(bigint, text)', 'public.declarer_mon_age(integer)',
];
export const FONCTIONS_INTERNES = [
  'public.nombre_entier(text)', 'public.en_millisecondes(timestamptz)', 'public.etat_du_compte(uuid)', 'public.recharger(public.comptes)',
  'public.deck_propre(uuid, jsonb)', 'public.finitions_propres(jsonb)', 'public.recompenser(uuid, integer, text)', 'public.tirer_un_paquet(uuid, text[])',
  'public.niveau(public.comptes)', 'public.verser_la_rente(uuid)',
];

// Le script des cartes de l'édition : à recoller à chaque changement de l'édition (voir le test des scripts).
export function cartes(edition: IndexEdition): string {
  const lignes = edition.cartes.map((c) => ({ id: c.id, rarete: c.rarete, registre: c.registre }));
  return `-- ═════════════════════════════════════════════════════════════════════════════
-- PHILAMOTS — le serveur (3/3 : les ${lignes.length} cartes de l'édition ${edition.meta.edition}, version ${edition.meta.version})
-- Fichier fabriqué par « npm run serveur:script » : ne pas le modifier à la main.
-- À coller dans Supabase APRÈS 1-structure.sql, et à recoller à chaque nouvelle édition. Peut être relancé sans danger.
-- Avant « Run » : le petit menu à gauche du bouton « Save » doit indiquer « Database », et non « Logs ».
-- ═════════════════════════════════════════════════════════════════════════════

-- Une seule instruction : les cartes de l'édition sont ajoutées ou mises à jour, et une carte sortie de l'édition
-- ne peut plus tomber dans un paquet (les joueurs qui l'ont la gardent).
with edition as (
  select k.id, k.rarete, coalesce(k.registre, '{}') as registre
  from jsonb_to_recordset(${texte(JSON.stringify(lignes))}::jsonb) as k (id text, rarete text, registre text[])
),
ajoutees as (
  insert into public.cartes (id, rarete, registre)
  select id, rarete, registre from edition
  on conflict (id) do update set rarete = excluded.rarete, registre = excluded.registre
  returning id
)
delete from public.cartes where id not in (select id from edition);
`;
}
