import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
// Relations entre profils : elles suivent une récupération de compte et disparaissent avec le profil.
export function amis(): string { return String.raw`
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
      'defiable',jsonb_array_length(public.deck_propre(p.utilisateur,p.deck))=${EQUILIBRAGE.duel.tailleDuDeck},
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
  perform public.exiger_un_compte_etabli(auth.uid(),true); -- un compte neuf ne fait rien passer (serveur/parrainage.ts)
  perform public.exiger_un_compte_etabli(autre,false);
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
    perform public.exiger_un_compte_etabli(b,true); -- même règle qu'à la proposition
    perform public.exiger_un_compte_etabli(a,false);
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
`; }
