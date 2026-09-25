// Une place par profil, deux places par équipe. Les profils suivent la récupération du compte.
export function equipes(): string { return String.raw`
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
`; }
