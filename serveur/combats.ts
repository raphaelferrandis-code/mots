import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
import { XP } from '../src/jeu/personnalisation.ts';
const J = EQUILIBRAGE.joute;
const D = EQUILIBRAGE.duel;

export function combats(): string { return String.raw`
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
  if p_etat->'deckDepart' is distinct from c.deck or jsonb_array_length(c.deck) <> ${D.tailleDuDeck} or public.deck_propre(p_utilisateur,c.deck) <> c.deck
    then raise exception 'Ton deck a changé pendant la préparation. Réessaie.'; end if;
  if p_etat->'adversaire'->>'type' = 'joute' then
    if not exists(select 1 from public.profils where utilisateur=p_utilisateur) then raise exception 'Publie d''abord ton profil.'; end if;
    if not exists(select 1 from public.profils where id=(p_etat->'adversaire'->'profil'->>'id')::uuid and utilisateur is distinct from p_utilisateur)
      then raise exception 'Cet adversaire n''est plus disponible.'; end if;
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
    if b.termine or b.etat->'etape'->>'nom' not in ('attaque','parade')
      or p_reponse->>'carte' is distinct from b.etat->'etape'->'epreuve'->>'idCarte' then raise exception 'Réponse hors séquence.'; end if;
    perform public.noter_reponse_verifiee(p_utilisateur,p_reponse);
    if (p_reponse->>'reussie')::boolean then gain_xp := public.gagner_xp(p_utilisateur,${XP.reponse},true); end if;
  end if;
  if not b.termine and (p_etat->>'termine')::boolean then
    resultat := p_etat->>'resultat';
    if resultat is null or resultat not in ('victoire','defaite','nul') then raise exception 'Résultat serveur invalide.'; end if;
    if (p_etat->>'abandonne')::boolean then gain_enregistre := jsonb_build_object('encre',0,'reduite',false,'cote',null);
    else
      base := case when b.etat->'adversaire'->>'type'='joute' then ${J.encreParVictoire}
        else case b.etat->'adversaire'->>'niveau' when 'Facile' then ${D.encreParVictoire.Facile} when 'Normal' then ${D.encreParVictoire.Normal} when 'Difficile' then ${D.encreParVictoire.Difficile} end end;
      gain_enregistre := public.recompenser(p_utilisateur,base,resultat) || jsonb_build_object('cote',null);
      gain_xp := gain_xp + public.gagner_xp(p_utilisateur,${XP.duel} + case when resultat='victoire' then ${XP.victoire} else 0 end,true);
    end if;
    update public.comptes set combats_joues=combats_joues+1, combats_gagnes=combats_gagnes+(resultat='victoire')::integer where utilisateur=p_utilisateur;
    if b.etat->'adversaire'->>'type'='joute' then
      select * into moi from public.profils where utilisateur=p_utilisateur for update;
      if not found then raise exception 'Le profil du joueur a disparu.'; end if;
      cote_adverse := (b.etat->'adversaire'->'profil'->>'cote')::integer;
      obtenu := case resultat when 'victoire' then 1 when 'nul' then 0.5 else 0 end;
      nouvelle := greatest(${J.coteMinimale},round(moi.cote+${J.facteurK}*(obtenu-1/(1+power(10::numeric,(cote_adverse-moi.cote)::numeric/${J.echelle})))));
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
`; }
