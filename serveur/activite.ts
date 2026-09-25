// Le fil d'activité de l'accueil (décision de Raphaël du 25/09/2026 : l'activité de tous les joueurs).
//
// Aucune fonction existante n'est modifiée : trois déclencheurs notent les événements dans une table à part.
//   • trouvaille : un joueur obtient une Légendaire, une Hors-série, ou une finition holographique ;
//   • victoire   : un joueur remporte une joute classée (sa cote monte) ;
//   • arrivee    : un joueur choisit son pseudonyme.
// Seuls les joueurs qui ont un pseudonyme public apparaissent (décision du 24/09 : le pseudonyme est public dès qu'il
// est choisi) ; jamais les joueurs maison. Un déclencheur qui échoue n'empêche jamais un tirage ou une joute.
// La lecture (fil_d_activite) est ouverte à tous, sans compte : elle ne rend que des pseudonymes et des mots.

export const TAILLE_DU_FIL = 24;
export const JOURS_DE_CONSERVATION = 7;

export function activite(): string { return String.raw`
-- ── Le fil d'activité ────────────────────────────────────────────────────────
create table if not exists public.activite (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  genre text not null check (genre in ('trouvaille', 'victoire', 'arrivee')),
  pseudo text not null,
  mot text,                 -- le timbre trouvé
  rarete text,
  finition text,
  cote integer              -- la cote après une victoire
);
create index if not exists activite_recente on public.activite (cree_le desc);
alter table public.activite enable row level security;
revoke all on public.activite from public, anon, authenticated;

-- Note un événement, et oublie ceux de plus de ${JOURS_DE_CONSERVATION} jours.
create or replace function public.noter_activite(p_genre text, p_pseudo text, p_mot text, p_rarete text, p_finition text, p_cote integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_pseudo is null or p_pseudo = '' then return; end if;
  insert into public.activite (genre, pseudo, mot, rarete, finition, cote) values (p_genre, p_pseudo, p_mot, p_rarete, p_finition, p_cote);
  delete from public.activite where cree_le < now() - interval '${JOURS_DE_CONSERVATION} days';
end $$;

-- Une trouvaille remarquable : une carte Légendaire ou Hors-série qui entre dans l'album, ou une finition
-- holographique qui s'y ajoute. Le mot vient de l'identifiant de la carte (« callipyge-adj » → « callipyge »).
create or replace function public.activite_trouvaille() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pseudo text; rarete text; finition text;
begin
  -- Seulement un timbre tiré d'un paquet (décision du 25/09/2026) : ni échange, ni marché, ni importation.
  if coalesce(current_setting('philamots.tirage', true), '') <> 'oui' then return new; end if;
  begin
    select p.pseudo into pseudo from public.profils p where p.utilisateur = new.utilisateur and not p.maison;
    if pseudo is null then return new; end if;
    select k.rarete into rarete from public.cartes k where k.id = new.carte;
    if coalesce((new.finitions ->> 'Holographique')::integer, 0) > 0
       and (tg_op = 'INSERT' or coalesce((old.finitions ->> 'Holographique')::integer, 0) = 0) then finition := 'Holographique';
    end if;
    if finition is not null or (tg_op = 'INSERT' and rarete in ('Légendaire', 'Hors-série')) then
      perform public.noter_activite('trouvaille', pseudo, regexp_replace(new.carte, '-(nom|verbe|adj|adv)$', ''), rarete, coalesce(finition, 'Normale'), null);
    end if;
  exception when others then null; -- le fil ne doit jamais bloquer un tirage
  end;
  return new;
end $$;
drop trigger if exists activite_trouvaille on public.possessions;
create trigger activite_trouvaille after insert or update of finitions on public.possessions
  for each row execute function public.activite_trouvaille();

-- Une victoire en joute classée, et l'arrivée d'un nouveau joueur (son pseudonyme publié). Un joueur qui change de
-- pseudonyme le change aussi dans le fil ; un joueur qui retire son profil en disparaît (droit à l'effacement).
create or replace function public.activite_profil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.activite where pseudo = old.pseudo;
    return old;
  end if;
  begin
    if new.maison or new.utilisateur is null then return new; end if;
    if tg_op = 'INSERT' then
      perform public.noter_activite('arrivee', new.pseudo, null, null, null, null);
    else
      if new.pseudo is distinct from old.pseudo then update public.activite set pseudo = new.pseudo where pseudo = old.pseudo; end if;
      if new.gagnees > old.gagnees then perform public.noter_activite('victoire', new.pseudo, null, null, null, new.cote); end if;
    end if;
  exception when others then null; -- le fil ne doit jamais bloquer une joute
  end;
  return new;
end $$;
drop trigger if exists activite_profil on public.profils;
create trigger activite_profil after insert or delete or update of gagnees, pseudo on public.profils
  for each row execute function public.activite_profil();

-- Les derniers événements, du plus récent au plus ancien. Ouvert à tous, même sans compte.
create or replace function public.fil_d_activite() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('genre', a.genre, 'pseudo', a.pseudo, 'mot', a.mot, 'rarete', a.rarete,
    'finition', a.finition, 'cote', a.cote, 'le', (extract(epoch from a.cree_le) * 1000)::bigint) order by a.cree_le desc), '[]'::jsonb)
  from (select * from public.activite order by cree_le desc limit ${TAILLE_DU_FIL}) a
$$;
revoke execute on function public.noter_activite(text, text, text, text, text, integer), public.activite_trouvaille(), public.activite_profil() from public, anon, authenticated;
revoke execute on function public.fil_d_activite() from public;
grant execute on function public.fil_d_activite() to anon, authenticated;
`;
}
