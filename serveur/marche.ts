// Le marché : les enchères entre joueurs (docs/BRIEF-marche.md, décisions n° 37 à 42). Le serveur tient tout : le timbre
// mis en vente quitte l'album du vendeur et attend dans l'enchère ; chaque mise bloque l'Encre de l'enchérisseur et rend
// celle du précédent ; à l'heure dite, la première fonction du marché appelée clôt l'enchère (le serveur n'a pas besoin
// de tâche planifiée) : le timbre va à l'acheteur, l'Encre au vendeur moins la commission, qui disparaît.
// La cote (décision n° 38) : chaque jour, au premier passage, le serveur relève pour chaque timbre et chaque finition la
// médiane des prix de ses ventes récentes ; tout le monde voit la cote du jour, la version payante voit son histoire.
// Les chiffres viennent de src/config/equilibrage.ts (marche). Ce fichier est utilisé par fabriquer-le-script.ts.

import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { VERROU_DU_MARCHE } from './verrous.ts';
import { FINITIONS, RARETES } from '../src/partage/types.ts';
import type { Rarete } from '../src/partage/types.ts';

const M = EQUILIBRAGE.marche;
const C = M.cote;
const S = M.simules;
const texte = (valeur: string): string => `'${valeur.replaceAll("'", "''")}'`;
const liste = (valeurs: readonly string[]): string => valeurs.map(texte).join(', ');
const cas = (valeurs: readonly string[], valeur: (v: string) => string | number): string => valeurs.map((v) => `when ${texte(v)} then ${valeur(v)}`).join(' ');
const plancherSQL = (colonne: string): string => `case ${colonne} ${cas(RARETES, (r) => M.planchers[r as Rarete])} else 1 end`;
// Un tirage pondéré (des chances en %) : « tirage » est un nombre de 0 à 100.
function tirageSQL(chances: Record<string, number | undefined>): string {
  let cumul = 0;
  const branches = Object.entries(chances).filter(([, p]) => (p ?? 0) > 0).map(([valeur, p]) => { cumul += p ?? 0; return `when tirage < ${cumul} then ${texte(valeur)}`; });
  return `case ${branches.join(' ')} else ${texte(Object.keys(chances).at(-1) ?? '')} end`;
}

// Les joueurs simulés au marché (décision de Raphaël du 28/09/2026) : une vente simulée n'a pas de vendeur (compte),
// mais un joueur maison ; un rachat n'a pas d'acheteur, mais un joueur maison. Effacer un joueur maison ne supprime
// rien : sa vente reste, au nom d'« Un collectionneur ».
export const MARCHE_ANIME_SQL = `alter table public.encheres add column if not exists simulee boolean not null default false;
alter table public.encheres add column if not exists vendeur_maison uuid references public.profils (id) on delete set null;
alter table public.encheres add column if not exists acheteur_maison uuid references public.profils (id) on delete set null;
create index if not exists encheres_simulees_ouvertes on public.encheres (ferme_le) where etat = 'ouverte' and simulee;`;

// Une vente conclue survit à l'effacement du compte de son vendeur, sans lui (« Un collectionneur ») : la cote des
// acheteurs ne change pas après coup. Les ventes ouvertes sont soldées avant (solder_compte_supprime).
export const VENDEUR_FACULTATIF_SQL = `alter table public.encheres alter column vendeur drop not null;
alter table public.encheres drop constraint if exists encheres_vendeur_fkey;
alter table public.encheres add constraint encheres_vendeur_fkey foreign key (vendeur) references public.comptes (utilisateur) on delete set null on update cascade;`;

export function marche(): string {
  return String.raw`
-- ═════════════════════════════════════════════════════════════════════════════
-- LE MARCHÉ : LES ENCHÈRES ENTRE JOUEURS (docs/BRIEF-marche.md, décisions n° 37 à 42)
-- ═════════════════════════════════════════════════════════════════════════════

-- ── Les tables ───────────────────────────────────────────────────────────────
-- La version payante (décision n° 34) : pas de limite au marché. Personne ne l'a encore ; la colonne est prête.
alter table public.comptes add column if not exists payant boolean not null default false;
-- Le cachet de provenance : le pseudonyme du vendeur, sur un timbre acheté au marché.
alter table public.possessions add column if not exists provenance text;

create table if not exists public.encheres (
  id bigint generated always as identity primary key,
  vendeur uuid references public.comptes (utilisateur) on delete set null on update cascade, -- vide : vendeur effacé
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
${VENDEUR_FACULTATIF_SQL}
${MARCHE_ANIME_SQL}
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
  cote integer not null, -- la médiane des prix des ventes des ${C.fenetreEnJours} derniers jours
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
-- Le pseudonyme d'un joueur maison (le vendeur d'une vente simulée, l'acheteur d'un rachat).
create or replace function public.pseudonyme_maison(p_profil uuid) returns text language sql stable set search_path = ''
as $$
  select coalesce((select p.pseudo from public.profils p where p.id = p_profil), 'Un collectionneur')
$$;

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
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE});
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
    elsif not e.simulee then -- (une vente simulée n'a pas de vendeur à qui rendre le timbre)
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
  -- (Les ventes des joueurs simulés et leurs rachats ne comptent pas : la cote dit ce que paient les vrais joueurs.)
  where e.etat = 'vendue' and not e.simulee and e.acheteur_maison is null and e.cloturee_le > now() - make_interval(days => ${C.fenetreEnJours})
  group by e.carte, e.finition
  on conflict do nothing;
  insert into public.cotes_calculees (jour) values (current_date) on conflict do nothing;
  delete from public.cotes where jour < current_date - ${C.conservationEnJours};
  delete from public.cotes_calculees where jour < current_date - ${C.conservationEnJours};
end $$;

-- La cote du jour d'un timbre dans une finition ; null tant qu'il n'a pas de vente depuis ${C.fenetreEnJours} jours.
create or replace function public.cote_du_jour(p_carte text, p_finition text) returns integer language sql stable set search_path = ''
as $$ select c.cote from public.cotes c where c.carte = p_carte and c.finition = p_finition and c.jour = (select max(jour) from public.cotes_calculees) $$;

-- Une enchère vue par le jeu.
create or replace function public.enchere_en_json(e public.encheres) returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'carte', e.carte, 'finition', e.finition,
    'vendeur', case when e.simulee then public.pseudonyme_maison(e.vendeur_maison) else public.pseudonyme_de(e.vendeur) end,
    'vendeurSimule', e.simulee, 'mienne', e.vendeur = auth.uid(),
    'miseDeDepart', e.mise_de_depart, 'achatImmediat', e.achat_immediat, 'meilleureMise', e.meilleure_mise,
    'enTete', e.meilleur_encherisseur is not null and e.meilleur_encherisseur = auth.uid(),
    'fermeLe', public.en_millisecondes(e.ferme_le), 'etat', e.etat, 'prixFinal', e.prix_final,
    'acheteur', case when e.acheteur_maison is not null then public.pseudonyme_maison(e.acheteur_maison)
                     when e.acheteur is null then null else public.pseudonyme_de(e.acheteur) end,
    'acheteurSimule', e.acheteur_maison is not null,
    'remportee', e.acheteur is not null and e.acheteur = auth.uid(),
    'cote', public.cote_du_jour(e.carte, e.finition),
    'cloturee_le', public.en_millisecondes(e.cloturee_le)
  )
$$;

-- Clôt les enchères échues (${M.cloturesParAppel} au plus par appel) : le timbre à l'acheteur, l'Encre au vendeur moins la commission,
-- ou le timbre rendu au vendeur s'il n'y a pas eu de mise. Appelée par toutes les fonctions du marché et par mon_compte.
create or replace function public.cloturer_une_enchere(p_id bigint) returns void
language plpgsql set search_path = ''
as $$
declare
  e public.encheres%rowtype;
  vendeur_recoit integer;
  racheteur uuid;
begin
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE});
  select * into e from public.encheres where id = p_id and etat = 'ouverte' and ferme_le <= now() for update;
  if not found then return; end if;
    if e.meilleure_mise is null or e.meilleur_encherisseur is null then
      -- Sans mise : une vente simulée s'efface ; une vraie peut être rachetée par un joueur simulé (racheteur_pour),
      -- sinon le timbre revient à son vendeur.
      if e.simulee then
        update public.encheres set etat = 'invendue', cloturee_le = now() where id = e.id;
        return;
      end if;
      racheteur := public.racheteur_pour(e);
      if racheteur is not null then
        -- Le timbre racheté quitte le jeu ; le vendeur reçoit la mise de départ moins la commission.
        vendeur_recoit := e.mise_de_depart - ceil(e.mise_de_depart * ${M.commission})::integer;
        update public.comptes set encre = encre + vendeur_recoit, maj_le = now() where utilisateur = e.vendeur;
        update public.encheres set etat = 'vendue', cloturee_le = now(), prix_final = e.mise_de_depart, acheteur_maison = racheteur where id = e.id;
      else
        perform public.rendre_un_timbre(e.vendeur, e.carte, e.finition, e.obtenue_le, null);
        update public.encheres set etat = 'invendue', cloturee_le = now() where id = e.id;
      end if;
    else
      -- L'Encre de la mise est déjà bloquée : le vendeur en reçoit ${Math.round((1 - M.commission) * 100)} %, le reste disparaît.
      -- (Une vente simulée n'a pas de vendeur : toute l'Encre disparaît, le timbre est neuf.)
      vendeur_recoit := e.meilleure_mise - ceil(e.meilleure_mise * ${M.commission})::integer;
      perform public.rendre_un_timbre(e.meilleur_encherisseur, e.carte, e.finition, now(),
        case when e.simulee then public.pseudonyme_maison(e.vendeur_maison) else public.pseudonyme_de(e.vendeur) end);
      if not e.simulee then update public.comptes set encre = encre + vendeur_recoit, maj_le = now() where utilisateur = e.vendeur; end if;
      update public.encheres set etat = 'vendue', cloturee_le = now(), prix_final = e.meilleure_mise, acheteur = e.meilleur_encherisseur where id = e.id;
    end if;
end $$;

-- Le joueur simulé qui rachète une vraie vente restée sans mise (décision de Raphaël du 28/09/2026), ou null : seulement
-- tant que le marché a moins de ${S.retraitDes} vraies ventes ouvertes, à ${S.rachatJusqua} fois le plancher de la rareté au plus, et
-- ${S.rachatsParJour === 1 ? 'une fois' : `${S.rachatsParJour} fois`} par vendeur et par jour (jour de Paris).
create or replace function public.racheteur_pour(e public.encheres) returns uuid
language sql volatile set search_path = ''
as $$
  select p.id from public.profils p
  where ${S.actif} and p.maison and e.vendeur is not null and not e.simulee
    and e.mise_de_depart <= ${S.rachatJusqua} * (select ${plancherSQL('k.rarete')} from public.cartes k where k.id = e.carte)
    and (select count(*) from public.encheres o where o.etat = 'ouverte' and not o.simulee) < ${S.retraitDes}
    and (select count(*) from public.encheres r where r.vendeur = e.vendeur and r.acheteur_maison is not null
         and r.cloturee_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') < ${S.rachatsParJour}
  order by random() limit 1
$$;

-- Les joueurs simulés tiennent ${S.ventesEnCours} ventes ouvertes (timbres neufs, ${Object.entries(S.raretes).map(([r, p]) => `${r} ${p} %`).join(', ')} ;
-- mise de départ ${S.miseDeDepart} fois le plancher, achat immédiat ${S.achatImmediat} fois) tant que les vrais joueurs en ont moins de
-- ${S.retraitDes}. Appelée au passage (cloturer_les_encheres) : pas de tâche planifiée, et le plus souvent rien à faire.
create or replace function public.animer_le_marche() returns void
language plpgsql set search_path = ''
as $$
declare
  manque integer;
  tirage double precision;
  rarete_voulue text;
  carte_voulue text;
  finition_voulue text;
  plancher integer;
begin
  if not ${S.actif} then return; end if;
  if (select count(*) from public.encheres where etat = 'ouverte' and simulee) >= ${S.ventesEnCours}
    or (select count(*) from public.encheres where etat = 'ouverte' and not simulee) >= ${S.retraitDes}
    or not exists (select 1 from public.profils where maison) then return; end if;
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE}); -- deux joueurs à la même seconde : une seule fournée
  manque := ${S.ventesEnCours} - (select count(*) from public.encheres where etat = 'ouverte' and simulee);
  for i in 1 .. greatest(manque, 0) loop
    tirage := random() * 100;
    rarete_voulue := ${tirageSQL(S.raretes)};
    select k.id into carte_voulue from public.cartes k where k.rarete = rarete_voulue order by random() limit 1;
    continue when carte_voulue is null;
    tirage := random() * 100;
    finition_voulue := ${tirageSQL(S.finitions)};
    plancher := ${plancherSQL('rarete_voulue')};
    insert into public.encheres (vendeur, simulee, vendeur_maison, carte, finition, obtenue_le, mise_de_depart, achat_immediat, ferme_le)
    select null, true, p.id, carte_voulue, finition_voulue, now(), ceil(plancher * ${S.miseDeDepart})::integer, ceil(plancher * ${S.achatImmediat})::integer,
      -- (Des durées de vente ordinaires, plus quelques minutes : les fins se répartissent.)
      now() + make_interval(hours => (array[${M.dureesEnHeures.join(', ')}])[1 + floor(random() * ${M.dureesEnHeures.length})::integer], mins => floor(random() * 240)::integer)
    from public.profils p where p.maison order by random() limit 1;
  end loop;
end $$;

create or replace function public.cloturer_les_encheres() returns void
language plpgsql set search_path = '' as $$
declare e record;
begin
  -- Le plus souvent, aucune enchère n'est échue : on ne prend pas le verrou du marché, et personne n'attend
  -- (mon_compte passe ici à chaque visite). Les fonctions qui transfèrent des timbres le prennent elles-mêmes.
  if exists (select 1 from public.encheres where etat = 'ouverte' and ferme_le <= now()) then
    perform pg_advisory_xact_lock(${VERROU_DU_MARCHE});
    for e in select id from public.encheres where etat = 'ouverte' and ferme_le <= now() order by ferme_le, id limit ${M.cloturesParAppel} for update skip locked loop
      perform public.cloturer_une_enchere(e.id);
    end loop;
  end if;
  -- Au passage, les joueurs simulés remplacent leurs ventes terminées, et les cotes du jour (une fois par jour).
  perform public.animer_le_marche();
  perform public.calculer_les_cotes();
end $$;

-- ── Les fonctions appelées par le jeu ────────────────────────────────────────

-- Mettre un timbre en vente : il quitte l'album (et le deck) tout de suite.
drop function if exists public.mettre_en_vente(text, text, integer, integer, integer);
create or replace function public.mettre_en_vente(p_carte text, p_finition text, p_mise integer, p_achat_immediat integer, p_heures integer, p_demande uuid default null) returns jsonb
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
  deja jsonb;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE}); -- les transferts de timbres et d'Encre passent l'un après l'autre
  perform public.cloturer_les_encheres();
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  -- La même vente redemandée (réponse perdue en route) : l'enchère déjà créée, pas une seconde.
  deja := public.demande_deja_traitee(moi, p_demande);
  if deja is not null then return deja || jsonb_build_object('etat', public.etat_du_compte(moi)); end if;
  if not exists (select 1 from public.profils where utilisateur = moi) then raise exception 'Choisis d''abord ton pseudonyme (dans les joutes) : c''est lui que verront les acheteurs.'; end if;
  perform public.exiger_un_compte_etabli(moi, true); -- un compte neuf ne vend rien (serveur/parrainage.ts)
  if p_heures is null or p_heures not in (${M.dureesEnHeures.join(', ')}) then raise exception 'Durée inconnue.'; end if;
  if p_finition is null or p_finition not in (${liste(FINITIONS)}) then raise exception 'Finition inconnue.'; end if;
  -- Les plafonds ne s'appliquent plus à partir de la formule « Collectionneur ».
  if (select count(*) from public.encheres where vendeur = moi and etat = 'ouverte') >= ${M.ventesEnCoursAuPlus} then
    raise exception 'Tu as déjà ${M.ventesEnCoursAuPlus} ventes en cours : attends qu''elles se terminent.';
  end if;
  select k.rarete into rarete from public.cartes k where k.id = p_carte;
  if not found then raise exception 'Cette carte est inconnue.'; end if;
  plancher := case rarete ${cas(RARETES, (r) => M.planchers[r as Rarete])} else 1 end;
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
  perform public.noter_la_demande(moi, p_demande, jsonb_build_object('enchere', public.enchere_en_json(e)));
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
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE}); -- les transferts de timbres et d'Encre passent l'un après l'autre
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
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE}); -- les transferts de timbres et d'Encre passent l'un après l'autre
  perform public.cloturer_les_encheres();
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  if not exists (select 1 from public.profils where utilisateur = moi) then raise exception 'Choisis d''abord ton pseudonyme (dans les joutes) : c''est lui que verra le vendeur.'; end if;
  perform public.exiger_un_compte_etabli(moi, true); -- un compte neuf n'achète rien (serveur/parrainage.ts)
  select * into e from public.encheres where id = p_enchere for update;
  if not found or e.etat <> 'ouverte' or e.ferme_le <= now() then raise exception 'Cette enchère est terminée.'; end if;
  if e.vendeur = moi then raise exception 'C''est ta propre vente.'; end if;
  -- Celui qui est déjà en tête n'a pas à surenchérir sur lui-même — sauf pour acheter tout de suite.
  if e.meilleur_encherisseur = moi and (e.achat_immediat is null or coalesce(p_montant, 0) < e.achat_immediat) then raise exception 'Tu es déjà en tête.'; end if;
  -- Les joueurs gratuits : ${M.achatsParJourAuPlus} achats par jour au plus (les mises en tête comptent comme des achats en cours).
  if true then
    select count(*) into achats from public.encheres where (meilleur_encherisseur = moi and etat = 'ouverte' and id <> e.id)
      or (acheteur = moi and etat = 'vendue' and cloturee_le >= date_trunc('day', now() at time zone 'utc') at time zone 'utc');
    if achats >= ${M.achatsParJourAuPlus} then raise exception 'Tu as déjà ${M.achatsParJourAuPlus} achats aujourd''hui : reviens demain.'; end if;
  end if;
  minimum := case when e.meilleure_mise is null then e.mise_de_depart else e.meilleure_mise + greatest(1, ceil(e.meilleure_mise * ${M.surencherMinimale})::integer) end;
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
    -- Une mise dans les ${M.prolongationEnMinutes} dernières minutes prolonge l'enchère d'autant.
    ferme_le = case when e.achat_immediat is not null and montant >= e.achat_immediat then now()
                    when e.ferme_le - now() < interval '${M.prolongationEnMinutes} minutes' then now() + interval '${M.prolongationEnMinutes} minutes'
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
      select * from public.encheres e where e.etat = 'ouverte' and (cherche = '' or e.carte like cherche || '%') order by e.ferme_le limit ${M.encheresParPage} offset page * ${M.encheresParPage}
    ) e),
    'total', (select count(*) from public.encheres e where e.etat = 'ouverte' and (cherche = '' or e.carte like cherche || '%')),
    'animation', ${S.actif}, -- des joueurs simulés animent le marché : le jeu le dit (« Comment ça marche ? »)
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
              from public.encheres e where e.id in (select m.enchere from public.mises m where m.encherisseur = moi) and e.vendeur is distinct from moi and (e.etat = 'ouverte' or e.cloturee_le > now() - interval '7 days')),
    -- Un compte neuf regarde sans miser ni vendre : le jour où le marché s'ouvre pour lui (null une fois ouvert).
    'ouvertLe', (select public.en_millisecondes(c.cree_le + interval '${EQUILIBRAGE.comptesNeufs.joursAvantLesEchanges} days') from public.comptes c
                 where c.utilisateur = moi and c.cree_le + interval '${EQUILIBRAGE.comptesNeufs.joursAvantLesEchanges} days' > now()),
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
  if coalesce((select public.niveau(c) from public.comptes c where c.utilisateur = moi), 0) < 3 then
    raise exception 'L''histoire des prix et les statistiques font partie de la formule Expert.';
  end if;
  perform public.cloturer_les_encheres();
  return jsonb_build_object(
    'serie', (select coalesce(jsonb_agg(jsonb_build_object('jour', c.jour, 'finition', c.finition, 'cote', c.cote, 'ventes', c.ventes) order by c.jour, c.finition), '[]'::jsonb)
              from public.cotes c where c.carte = p_carte and c.jour > current_date - ${C.historiqueEnJours}),
    'ventes', (select coalesce(jsonb_agg(jsonb_build_object('quand', public.en_millisecondes(e.cloturee_le), 'finition', e.finition, 'prix', e.prix_final) order by e.cloturee_le desc), '[]'::jsonb)
               from (select * from public.encheres v where v.carte = p_carte and v.etat = 'vendue' and not v.simulee and v.acheteur_maison is null order by v.cloturee_le desc limit ${C.ventesMontrees}) e),
    'stats', (select coalesce(jsonb_agg(s.stat order by s.finition), '[]'::jsonb)
              from (select e.finition, jsonb_build_object('finition', e.finition, 'mini', min(e.prix_final), 'maxi', max(e.prix_final), 'nombre', count(*)) as stat
                    from public.encheres e where e.carte = p_carte and e.etat = 'vendue' and not e.simulee and e.acheteur_maison is null and e.cloturee_le > now() - make_interval(days => ${C.historiqueEnJours})
                    group by e.finition) s),
    'maintenant', public.en_millisecondes(now())
  );
end $$;
`;
}

export const FONCTIONS_DU_MARCHE = ['public.mettre_en_vente(text, text, integer, integer, integer, uuid)', 'public.retirer_de_la_vente(bigint)', 'public.encherir(bigint, integer)', 'public.marche(text, integer)', 'public.mes_encheres()', 'public.cotes(text)', 'public.historique_de_la_cote(text)'];
export const FONCTIONS_INTERNES_DU_MARCHE = ['public.cloturer_une_enchere(bigint)', 'public.solder_compte_supprime()', 'public.pseudonyme_de(uuid)', 'public.rendre_un_timbre(uuid, text, text, timestamptz, text)', 'public.enchere_en_json(public.encheres)', 'public.cloturer_les_encheres()', 'public.calculer_les_cotes()', 'public.cote_du_jour(text, text)',
  'public.pseudonyme_maison(uuid)', 'public.racheteur_pour(public.encheres)', 'public.animer_le_marche()'];
