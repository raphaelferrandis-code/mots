// Ce que les amis voient les uns des autres (refonte des amis et de l'équipe, 25/09/2026) :
//   • le portrait (avatar et cadre), choisi dans le navigateur et publié ici avec un signe de présence ;
//   • le niveau, tiré de la progression vérifiée (sans elle, il n'est pas montré) ;
//   • la vitrine : le nombre de mots possédés et les quatre plus beaux timbres (rareté, puis finition).
// Seul le format du portrait est vérifié : il n'engage rien, et un portrait inconnu s'affiche avec l'avatar par défaut.
// La présence et la vitrine ne sont rendues qu'aux amis (mes_amis, mon_equipe) ; le niveau et le portrait aussi aux demandes.

export const TIMBRES_EN_VITRINE = 4;

export function portraits(): string { return String.raw`
-- ── Portraits, niveaux et vitrines des amis ─────────────────────────────────
alter table public.profils add column if not exists avatar text not null default 'plume',
  add column if not exists cadre text not null default 'simple',
  add column if not exists vu_le timestamptz;

create or replace function public.xp_du_profil(p_utilisateur uuid) returns bigint
language sql stable set search_path = '' as $$
  select case when c.progression_active then c.xp + coalesce((c.heritage_progression->>'xp')::bigint, 0) end
  from public.comptes c where c.utilisateur = p_utilisateur
$$;

create or replace function public.vitrine_du_profil(p_utilisateur uuid) returns jsonb
language sql stable set search_path = '' as $$
  with mes as (
    select p.carte, coalesce(c.rarete, 'Commune') as rarete,
      case when coalesce((p.finitions->>'Holographique')::integer, 0) > 0 then 'Holographique'
        when coalesce((p.finitions->>'Brillante')::integer, 0) > 0 then 'Brillante' else 'Normale' end as finition
    from public.possessions p left join public.cartes c on c.id = p.carte
    where p.utilisateur = p_utilisateur and exists(select 1 from jsonb_each_text(p.finitions) f where f.value::integer > 0)
  )
  select jsonb_build_object('timbres', (select count(*) from mes),
    'vitrine', coalesce((select jsonb_agg(jsonb_build_object('carte', v.carte, 'finition', v.finition)) from (
      select carte, finition from mes
      order by array_position(array['Commune','Peu commune','Rare','Épique','Légendaire','Hors-série'], rarete) desc nulls last,
        array_position(array['Normale','Brillante','Holographique'], finition) desc, carte
      limit ${TIMBRES_EN_VITRINE}) v), '[]'::jsonb))
$$;

create or replace function public.signaler_presence(p_avatar text, p_cadre text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if coalesce(p_avatar, '') !~ '^[a-z0-9-]{1,40}$' or coalesce(p_cadre, '') !~ '^[a-z0-9-]{0,40}$' then raise exception 'Portrait invalide.'; end if;
  update public.profils set avatar = p_avatar, cadre = p_cadre, vu_le = now() where utilisateur = auth.uid() and not maison;
end $$;

revoke execute on function public.xp_du_profil(uuid), public.vitrine_du_profil(uuid) from public, anon, authenticated;
revoke execute on function public.signaler_presence(text, text) from public, anon;
grant execute on function public.signaler_presence(text, text) to authenticated;
`; }
