-- Portraits, niveaux, présence et vitrines des amis ; cote 2v2 de l’équipe. Après 14-fil-d-activite.sql.
-- Publier le client après ce script : il appelle signaler_presence et lit les nouveaux champs.
begin;

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
      limit 4) v), '[]'::jsonb))
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

create or replace function public.mes_amis() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi public.profils%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into moi from public.profils where utilisateur=auth.uid();
  return jsonb_build_object('moi',case when moi.id is null then null else jsonb_build_object('id',moi.id,'pseudo',moi.pseudo) end,
    'relations',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'pseudo',p.pseudo,
      'etat',case when a.acceptee then 'ami' when a.demandeur=moi.id then 'envoyee' else 'recue' end,
      'defiable',jsonb_array_length(public.deck_propre(p.utilisateur,p.deck))=10,
      'xp',public.xp_du_profil(p.utilisateur),'avatar',p.avatar,'cadre',p.cadre,
      'vu_le',case when a.acceptee then (extract(epoch from p.vu_le)*1000)::bigint end)
      || case when a.acceptee then public.vitrine_du_profil(p.utilisateur) else '{}'::jsonb end order by p.pseudo),'[]')
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

create or replace function public.mon_equipe() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid; mon_equipe uuid; cote integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select id into moi from public.profils where utilisateur=auth.uid();
  select equipe into mon_equipe from public.equipiers where profil=moi;
  -- La cote 2v2 vient des joutes en direct (12-joutes-direct.sql), absentes d'une installation sans elles.
  if mon_equipe is not null and to_regclass('public.direct_cotes') is not null then
    execute 'select cote from public.direct_cotes where mode=''duo_equipe'' and sujet=$1' into cote using mon_equipe;
  end if;
  return jsonb_build_object('moi',moi,
    'equipe',(select jsonb_build_object('id',e.id,'nom',e.nom,'embleme',e.embleme,'cote',cote,
      'membres',(select jsonb_agg(jsonb_build_object('id',p.id,'pseudo',p.pseudo,'capitaine',m.place=1,
          'xp',public.xp_du_profil(p.utilisateur),'avatar',p.avatar,'cadre',p.cadre,'vu_le',(extract(epoch from p.vu_le)*1000)::bigint) order by m.place)
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

commit;
