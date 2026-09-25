-- La tenue du serveur et le match à accepter. Après 16-parrainage-confirme.sql.
-- Redéployer d’abord la fonction joutes-direct (elle sait lire l’ancien serveur). Dans l’autre ordre, rien ne casse :
-- l’ancienne fonction lancerait seulement les parties sans attendre que chacun accepte.
begin;

create table if not exists public.direct_parties (
  id uuid primary key default gen_random_uuid(), mode text not null check(mode in ('solo','duo_solo','duo_equipe')),
  etat jsonb, revision integer not null default 0, termine boolean not null default false,
  commandes jsonb not null default '{}', cree_le timestamptz not null default now()
);
create table if not exists public.direct_places (
  partie uuid not null references public.direct_parties(id) on delete cascade,
  profil uuid not null references public.profils(id) on delete cascade, utilisateur uuid not null references auth.users(id) on delete cascade,
  place integer not null, camp integer not null check(camp in (0,1)), equipe uuid,
  sujet uuid not null, depart jsonb not null, archive boolean not null default false,
  cote_avant integer, cote_apres integer, xp integer not null default 0, recompense jsonb,
  primary key(partie,utilisateur), unique(partie,place)
);
create unique index if not exists direct_une_place on public.direct_places(utilisateur) where not archive;
-- Le match à accepter (25/09/2026) : une partie naît « proposée » ; elle ne commence que quand chacun a accepté.
alter table public.direct_parties add column if not exists accepter_avant timestamptz;
alter table public.direct_places add column if not exists accepte_le timestamptz;
alter table public.direct_places add column if not exists en_file_depuis timestamptz; -- son rang dans la file, rendu si le match n'a pas lieu
create table if not exists public.direct_file (
  utilisateur uuid primary key references auth.users(id) on delete cascade, profil uuid not null references public.profils(id) on delete cascade,
  mode text not null check(mode in ('solo','duo_solo','duo_equipe')), equipe uuid references public.equipes(id) on delete cascade,
  depart jsonb not null, cree_le timestamptz not null default now(), present_le timestamptz not null default now()
);
create table if not exists public.direct_cotes (
  mode text not null check(mode in ('solo','duo_solo','duo_equipe')), sujet uuid not null,
  cote integer not null default 1000, jouees integer not null default 0, gagnees integer not null default 0,
  primary key(mode,sujet)
);
-- Les notifications ne contiennent ni réponses, ni mains, ni données de l'autre camp.
create table if not exists public.direct_signaux (
  utilisateur uuid primary key references auth.users(id) on delete cascade, version bigint not null default 1
);
alter table public.direct_parties enable row level security;
alter table public.direct_places enable row level security;
alter table public.direct_file enable row level security;
alter table public.direct_cotes enable row level security;
alter table public.direct_signaux enable row level security;
revoke all on public.direct_parties,public.direct_places,public.direct_file,public.direct_cotes,public.direct_signaux from public,anon,authenticated;
grant select on public.direct_signaux to authenticated;
drop policy if exists direct_signal_personnel on public.direct_signaux;
create policy direct_signal_personnel on public.direct_signaux for select to authenticated using(utilisateur=auth.uid());
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='direct_signaux') then
    alter publication supabase_realtime add table public.direct_signaux;
  end if;
end $$;

create or replace function public.direct_signaler(p_joueurs uuid[]) returns void
language sql security definer set search_path='' as $$
  insert into public.direct_signaux(utilisateur) select unnest(p_joueurs)
  on conflict(utilisateur) do update set version=public.direct_signaux.version+1;
$$;

-- Remet dans la file, à leur rang d'origine, les joueurs d'une proposition qui n'aura pas lieu, puis la supprime :
-- ceux qui avaient accepté quand le délai est écoulé, ou tous sauf celui qui refuse. Ni défaite ni cote pour personne.
create or replace function public.direct_defaire_la_proposition(p_id uuid,p_refus uuid) returns void
language plpgsql security definer set search_path='' as $$
declare joueurs uuid[];
begin
  joueurs:=array(select utilisateur from public.direct_places where partie=p_id);
  insert into public.direct_file(utilisateur,profil,mode,equipe,depart,cree_le,present_le)
    select s.utilisateur,s.profil,d.mode,s.equipe,s.depart-'equipe',coalesce(s.en_file_depuis,now()),now()
    from public.direct_places s join public.direct_parties d on d.id=s.partie
    where s.partie=p_id and case when p_refus is null then s.accepte_le is not null else s.utilisateur<>p_refus end
      and exists(select 1 from public.profils x where x.id=s.profil)
      and (s.equipe is null or exists(select 1 from public.equipes e where e.id=s.equipe))
    on conflict(utilisateur) do nothing;
  delete from public.direct_parties where id=p_id and etat is null;
  perform public.direct_signaler(joueurs);
end $$;

-- Les propositions dont le délai est passé. Appelée sous le verrou du direct.
create or replace function public.direct_expirer_propositions() returns void
language plpgsql security definer set search_path='' as $$
declare d record;
begin
  for d in select id from public.direct_parties where etat is null and accepter_avant<now() for update skip locked loop
    perform public.direct_defaire_la_proposition(d.id,null);
  end loop;
end $$;

create or replace function public.direct_salon(p_utilisateur uuid,p_action text,p_mode text,p_masques jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare moi public.profils%rowtype; compte public.comptes%rowtype; ma_file public.direct_file%rowtype;
  mon_equipe uuid; candidats uuid[]; equipes uuid[]; identifiant uuid; f public.direct_file%rowtype;
  idx integer:=0; camp integer; sujet uuid; n integer; attente jsonb;
begin
  -- Le plus fréquent : un joueur qui regarde l'écran des joutes sans chercher, ou qui joue une partie commencée.
  -- Rien à réserver : pas de verrou, personne n'attend personne.
  if p_action='lire' and not exists(select 1 from public.direct_file where utilisateur=p_utilisateur)
    and not exists(select 1 from public.direct_places s join public.direct_parties p on p.id=s.partie
      where s.utilisateur=p_utilisateur and not s.archive and p.etat is null) then
    if not exists(select 1 from public.profils where utilisateur=p_utilisateur and not maison) then raise exception 'Choisis ton pseudonyme pour rejoindre les joutes.'; end if;
    return jsonb_build_object('attente',null);
  end if;
  -- Le verrou du direct, commun avec les adhésions : aucun changement de duo pendant la réservation.
  perform pg_advisory_xact_lock(20260924);
  select * into moi from public.profils where utilisateur=p_utilisateur and not maison;
  if not found then raise exception 'Choisis ton pseudonyme pour rejoindre les joutes.'; end if;
  delete from public.direct_file where present_le < now()-interval '150 seconds';
  perform public.direct_expirer_propositions();
  select partie into identifiant from public.direct_places where utilisateur=p_utilisateur and not archive;
  if p_action='quitter' and identifiant is not null then
    if not (select termine from public.direct_parties where id=identifiant) then raise exception 'Abandonne la partie avant de quitter.'; end if;
    update public.direct_places set archive=true where partie=identifiant and utilisateur=p_utilisateur;
    identifiant:=null;
  end if;
  if p_action='annuler' then delete from public.direct_file where utilisateur=p_utilisateur; end if;
  if p_action='chercher' and identifiant is null then
    if p_mode not in ('solo','duo_solo','duo_equipe') then raise exception 'Mode inconnu.'; end if;
    if exists(select 1 from public.combats where utilisateur=p_utilisateur and not archive and not termine) then raise exception 'Termine ou abandonne ton entraînement avant de chercher une joute.'; end if;
    if (select count(*) from public.direct_places s join public.direct_parties p on p.id=s.partie where s.utilisateur=p_utilisateur and p.cree_le>now()-interval '1 hour')>=40 then raise exception 'Trop de parties commencées. Réessaie plus tard.'; end if;
    select * into compte from public.comptes where utilisateur=p_utilisateur for update;
    if jsonb_array_length(public.deck_propre(p_utilisateur,compte.deck))<>10 then raise exception 'Ton deck doit contenir dix cartes possédées.'; end if;
    if exists(select 1 from jsonb_array_elements_text(compte.deck) d join public.cartes c on c.id=d.value
      where c.registre && array(select jsonb_array_elements_text(p_masques))) then raise exception 'Ton deck contient des mots masqués par tes filtres. Modifie ton deck.'; end if;
    if p_mode='duo_equipe' then
      select equipe into mon_equipe from public.equipiers where profil=moi.id;
      if mon_equipe is null or (select count(*) from public.equipiers where equipe=mon_equipe)<>2 then raise exception 'Forme une équipe de deux joueurs avant de lancer ce mode.'; end if;
      if exists(select 1 from public.direct_file where equipe=mon_equipe and utilisateur<>p_utilisateur and depart->'masques'<>p_masques)
        then raise exception 'Ton partenaire utilise d’autres filtres de contenu. Choisissez les mêmes filtres avant de vous déclarer prêts.'; end if;
    end if;
    insert into public.direct_file(utilisateur,profil,mode,equipe,depart)
      values(p_utilisateur,moi.id,p_mode,mon_equipe,jsonb_build_object('utilisateur',p_utilisateur,'pseudo',moi.pseudo,'deck',compte.deck,'masques',p_masques))
      on conflict(utilisateur) do update set mode=excluded.mode,equipe=excluded.equipe,depart=excluded.depart,present_le=now();
  end if;
  update public.direct_file set present_le=now() where utilisateur=p_utilisateur;
  -- Une ancienne invitation ne peut pas faire jouer un autre duo sous la même cote.
  delete from public.direct_file q where q.mode='duo_equipe' and not exists(select 1 from public.equipiers m where m.profil=q.profil and m.equipe=q.equipe);
  select * into ma_file from public.direct_file where utilisateur=p_utilisateur;
  if identifiant is null and ma_file.utilisateur is not null then
    if ma_file.mode='duo_equipe' then
      select array_agg(x.equipe) into equipes from (
        select q.equipe,min(q.cree_le) ancien from public.direct_file q
        where q.mode='duo_equipe' and q.depart->'masques'=ma_file.depart->'masques' group by q.equipe having count(*)=2 order by min(q.cree_le) limit 2
      ) x;
      if cardinality(equipes)=2 then
        select array_agg(utilisateur order by array_position(equipes,equipe),random()) into candidats from public.direct_file where mode='duo_equipe' and equipe=any(equipes);
      end if;
    else
      n:=case when ma_file.mode='solo' then 2 else 4 end;
      select array_agg(x.utilisateur order by random()) into candidats from (
        select utilisateur from public.direct_file where mode=ma_file.mode and depart->'masques'=ma_file.depart->'masques' order by cree_le limit n
      ) x;
      if cardinality(candidats)<>n then candidats:=null; end if;
    end if;
    if candidats is not null then
      -- Une possession vendue dans le salon invalide la préparation, jamais la partie lancée.
      if exists(select 1 from public.direct_file q join public.comptes c using(utilisateur)
        where q.utilisateur=any(candidats) and (public.deck_propre(q.utilisateur,q.depart->'deck')<>q.depart->'deck')) then
        delete from public.direct_file where utilisateur=any(candidats);
        perform public.direct_signaler(candidats);
      else
        -- Une proposition : chacun doit l'accepter à temps (direct_accepter) pour que la partie commence.
        insert into public.direct_parties(mode,accepter_avant) values(ma_file.mode,now()+interval '20 seconds') returning id into identifiant;
        foreach sujet in array candidats loop
          select * into f from public.direct_file where utilisateur=sujet;
          camp:=case when idx<cardinality(candidats)/2 then 0 else 1 end;
          insert into public.direct_places(partie,profil,utilisateur,place,camp,equipe,sujet,depart,en_file_depuis)
            values(identifiant,f.profil,f.utilisateur,idx,camp,f.equipe,coalesce(f.equipe,f.profil),f.depart||jsonb_build_object('equipe',camp),f.cree_le);
          insert into public.direct_cotes(mode,sujet,cote) values(ma_file.mode,coalesce(f.equipe,f.profil),
            case when ma_file.mode='solo' then (select cote from public.profils where id=f.profil) else 1000 end) on conflict do nothing;
          idx:=idx+1;
        end loop;
        delete from public.direct_file where utilisateur=any(candidats);
        perform public.direct_signaler(candidats);
        identifiant:=null;
      end if;
    end if;
  end if;
  select jsonb_build_object('mode',q.mode,'equipe',q.equipe,'partenairePret',
    q.equipe is not null and (select count(*) from public.direct_file q2 where q2.equipe=q.equipe)=2)
    into attente from public.direct_file q where q.utilisateur=p_utilisateur;
  return jsonb_build_object('attente',attente);
end $$;

create or replace function public.direct_contexte(p_utilisateur uuid) returns jsonb
language sql security definer set search_path='' as $$
select jsonb_build_object('maintenant',public.en_millisecondes(clock_timestamp()),'partie',(
  select to_jsonb(p)||jsonb_build_object('places',(select jsonb_agg(to_jsonb(s)||jsonb_build_object('nomEquipe',e.nom) order by s.place)
    from public.direct_places s left join public.equipes e on e.id=s.equipe where s.partie=p.id),
    -- Le temps qu'il reste pour accepter, mesuré ici : le compte à rebours ne dépend d'aucune autre horloge.
    'accepter_dans',case when p.accepter_avant is null then null
      else greatest(0,public.en_millisecondes(p.accepter_avant)-public.en_millisecondes(clock_timestamp())) end)
  from public.direct_parties p join public.direct_places m on m.partie=p.id where m.utilisateur=p_utilisateur and not m.archive
))
$$;

-- « J'y vais ! » (p_accepte) ou « Refuser », dans le délai. Quand le dernier accepte, la fonction joutes-direct crée
-- l'état de départ et la partie commence. Refuser ne coûte rien : les autres reprennent leur place dans la file.
create or replace function public.direct_accepter(p_utilisateur uuid,p_id uuid,p_accepte boolean) returns void
language plpgsql security definer set search_path='' as $$
declare d public.direct_parties%rowtype;
begin
  perform pg_advisory_xact_lock(20260924);
  perform public.direct_expirer_propositions();
  select * into d from public.direct_parties x where x.id=p_id
    and exists(select 1 from public.direct_places s where s.partie=x.id and s.utilisateur=p_utilisateur and not s.archive) for update;
  if not found then raise exception 'Cette proposition de match a expiré.'; end if;
  if d.etat is not null or d.accepter_avant is null then return; end if; -- tous ont déjà accepté : la partie commence
  if not p_accepte then perform public.direct_defaire_la_proposition(p_id,p_utilisateur); return; end if;
  update public.direct_places set accepte_le=coalesce(accepte_le,now()) where partie=p_id and utilisateur=p_utilisateur;
  if not exists(select 1 from public.direct_places where partie=p_id and accepte_le is null) then
    update public.direct_parties set accepter_avant=null where id=p_id;
  end if;
  perform public.direct_signaler(array(select utilisateur from public.direct_places where partie=p_id));
end $$;

create or replace function public.direct_annuler_preparation(p_utilisateur uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare joueurs uuid[];
begin
  perform 1 from public.direct_parties where id=p_id and etat is null for update;
  if not found or not exists(select 1 from public.direct_places where partie=p_id and utilisateur=p_utilisateur) then return; end if;
  joueurs:=array(select utilisateur from public.direct_places where partie=p_id);
  delete from public.direct_parties where id=p_id and etat is null;
  perform public.direct_signaler(joueurs);
end $$;

create or replace function public.direct_appliquer(p_utilisateur uuid,p_id uuid,p_revision integer,p_etat jsonb,p_requete text,p_action jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare partie_lue public.direct_parties%rowtype; ligne record; moyennes numeric[]; score numeric; avant integer; apres integer;
  evenement jsonb; uid uuid; gain integer; resultat text; prime jsonb;
begin
  perform c.utilisateur from public.comptes c where c.utilisateur in(select s.utilisateur from public.direct_places s where s.partie=p_id) order by c.utilisateur for update;
  select * into partie_lue from public.direct_parties where id=p_id for update;
  if not found or not exists(select 1 from public.direct_places where partie=p_id and utilisateur=p_utilisateur and not archive) then raise exception 'Partie inaccessible.'; end if;
  if p_requete is not null and partie_lue.commandes ? p_requete then
    if partie_lue.commandes->p_requete<>p_action then raise exception 'Identifiant de commande déjà utilisé.'; end if;
    return true;
  end if;
  if partie_lue.revision<>p_revision then return false; end if;
  if partie_lue.termine then return true; end if;
  for evenement in select value from jsonb_array_elements(p_etat->'reponsesValidees') with ordinality as r(value,n)
    where n>coalesce(jsonb_array_length(partie_lue.etat->'reponsesValidees'),0) loop
    uid:=(evenement->>'utilisateur')::uuid;
    perform public.noter_reponse_verifiee(uid,evenement||jsonb_build_object('parade',true,'apprentissage',
      exists(select 1 from public.possessions where utilisateur=uid and carte=evenement->>'carte')));
    if (evenement->>'reussie')::boolean then
      gain:=public.gagner_xp(uid,5,true);
      update public.direct_places set xp=xp+gain where partie=p_id and utilisateur=uid;
    end if;
  end loop;
  update public.direct_parties set etat=p_etat,revision=revision+1,termine=p_etat->>'phase'='fin',
    commandes=case when p_requete is null then commandes else commandes||jsonb_build_object(p_requete,p_action) end where id=p_id;
  if p_etat->>'phase'='fin' then
    for ligne in select s.utilisateur,s.camp from public.direct_places s where s.partie=p_id loop
      resultat:=case when p_etat->>'vainqueur'='nul' then 'nul' when p_etat->>'vainqueur'=ligne.camp::text then 'victoire' else 'defaite' end;
      prime:='{"encre":0,"reduite":false}'::jsonb;gain:=0;
      if p_etat->>'raison' is null then
        prime:=public.recompenser(ligne.utilisateur,35,resultat);
        gain:=public.gagner_xp(ligne.utilisateur,30+case when resultat='victoire' then 20 else 0 end,true);
      end if;
      update public.direct_places set xp=xp+gain,recompense=prime where partie=p_id and utilisateur=ligne.utilisateur;
      update public.comptes set combats_joues=combats_joues+1,combats_gagnes=combats_gagnes+(resultat='victoire')::integer where utilisateur=ligne.utilisateur;
    end loop;
    -- Ordre stable des verrous, y compris lorsque des résultats arrivent en même temps.
    perform c.sujet from public.direct_cotes c where c.mode=partie_lue.mode and c.sujet in(select sujet from public.direct_places where partie=p_id) order by c.sujet for update;
    select array_agg(m.cote order by m.camp) into moyennes from (
      select s.camp,avg(c.cote) cote from public.direct_places s join public.direct_cotes c on c.mode=partie_lue.mode and c.sujet=s.sujet where s.partie=p_id group by s.camp
    ) m;
    for ligne in select distinct s.sujet,s.camp from public.direct_places s where s.partie=p_id loop
      select cote into avant from public.direct_cotes where mode=partie_lue.mode and sujet=ligne.sujet;
      score:=case when p_etat->>'vainqueur'='nul' then 0.5 when (p_etat->>'vainqueur')::text=ligne.camp::text then 1 else 0 end;
      apres:=greatest(0,avant+round(32*(score-1/(1+power(10,(moyennes[2-ligne.camp]-moyennes[ligne.camp+1])/400))))::integer);
      update public.direct_cotes set cote=apres,jouees=jouees+1,gagnees=gagnees+(score=1)::integer where mode=partie_lue.mode and sujet=ligne.sujet;
      if partie_lue.mode='solo' then
        update public.profils set cote=apres,jouees=jouees+1,gagnees=gagnees+(score=1)::integer,maj_le=now() where id=ligne.sujet;
      end if;
      update public.direct_places set cote_avant=avant,cote_apres=apres where partie=p_id and sujet=ligne.sujet;
    end loop;
  end if;
  perform public.direct_signaler(array(select utilisateur from public.direct_places where partie=p_id));
  return true;
end $$;

create or replace function public.classement_direct(p_mode text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare mon_profil uuid; mon_equipe uuid; resultat jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_mode not in ('solo','duo_solo','duo_equipe') then raise exception 'Mode inconnu.'; end if;
  select id into mon_profil from public.profils where utilisateur=auth.uid();
  select equipe into mon_equipe from public.equipiers where profil=mon_profil;
  with classes as (
    select row_number() over(order by c.cote desc,c.gagnees desc,c.sujet) rang,
      coalesce(e.nom,p.pseudo) nom,c.cote,c.jouees,c.gagnees,
      c.sujet=case when p_mode='duo_equipe' then mon_equipe else mon_profil end moi
    from public.direct_cotes c
    left join public.equipes e on p_mode='duo_equipe' and e.id=c.sujet
    left join public.profils p on p_mode<>'duo_equipe' and p.id=c.sujet and not p.maison
    where c.mode=p_mode and c.jouees>0 and (e.id is not null or p.id is not null)
  ) select jsonb_build_object('total',(select count(*) from classes),'lignes',coalesce((select jsonb_agg(to_jsonb(x) order by rang) from classes x
      where rang<=100 or abs(rang-coalesce((select rang from classes where moi),-1000))<=2),'[]'::jsonb)) into resultat;
  return resultat;
end $$;

-- Une équipe inscrite ou engagée ne change pas de composition pendant la rencontre.
create or replace function public.direct_proteger_membre() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(20260924);
  perform public.direct_expirer_propositions();
  if exists(select 1 from public.direct_places s join public.direct_parties p on p.id=s.partie where s.profil=old.profil and not p.termine)
    then raise exception 'Termine ou abandonne la joute en direct avant de changer d’équipe ou de supprimer ton profil.'; end if;
  delete from public.direct_file where equipe=old.equipe;
  return old;
end $$;
drop trigger if exists direct_membre on public.equipiers;
create trigger direct_membre before delete on public.equipiers for each row execute function public.direct_proteger_membre();

create or replace function public.direct_proteger_profil() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(20260924);
  perform public.direct_expirer_propositions();
  if exists(select 1 from public.direct_places s join public.direct_parties p on p.id=s.partie where s.profil=old.id and not p.termine)
    then raise exception 'Termine ou abandonne la joute en direct avant de supprimer ou transférer ton profil.'; end if;
  delete from public.direct_file where profil=old.id;
  if TG_OP='UPDATE' then return new; end if;
  return old;
end $$;
drop trigger if exists direct_profil on public.profils;
create trigger direct_profil before delete or update of utilisateur on public.profils for each row execute function public.direct_proteger_profil();

-- Les anciens clients ne peuvent plus démarrer une joute classée contre un double.
create or replace function public.direct_refuser_double() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.etat->'adversaire'->>'type'='joute' and not coalesce((new.etat->'adversaire'->>'amical')::boolean,false) then
    raise exception 'Les joutes classées se jouent maintenant en direct. Recharge le jeu.';
  end if;
  if exists(select 1 from public.direct_places s join public.direct_parties p on p.id=s.partie where s.utilisateur=new.utilisateur and not p.termine
      and not (p.etat is null and coalesce(p.accepter_avant<now(),false)))
    or exists(select 1 from public.direct_file where utilisateur=new.utilisateur) then raise exception 'Quitte la recherche ou termine ta joute en direct avant de lancer un entraînement.'; end if;
  return new;
end $$;
drop trigger if exists direct_pas_de_double on public.combats;
create trigger direct_pas_de_double before insert on public.combats for each row execute function public.direct_refuser_double();

revoke all on function public.direct_defaire_la_proposition(uuid,uuid),public.direct_expirer_propositions(),public.direct_accepter(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.direct_accepter(uuid,uuid,boolean) to service_role;
revoke all on function public.direct_signaler(uuid[]),public.direct_salon(uuid,text,text,jsonb),public.direct_contexte(uuid),public.direct_annuler_preparation(uuid,uuid),public.direct_appliquer(uuid,uuid,integer,jsonb,text,jsonb),public.direct_proteger_membre(),public.direct_proteger_profil(),public.direct_refuser_double(),public.classement_direct(text) from public,anon,authenticated;
grant execute on function public.classement_direct(text) to authenticated;
grant execute on function public.direct_salon(uuid,text,text,jsonb),public.direct_contexte(uuid),public.direct_annuler_preparation(uuid,uuid),public.direct_appliquer(uuid,uuid,integer,jsonb,text,jsonb) to service_role;

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
  perform pg_advisory_xact_lock(20260924);
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
  perform pg_advisory_xact_lock(20260924);
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
  perform pg_advisory_xact_lock(20260924);
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
  perform pg_advisory_xact_lock(20260924);
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
  perform pg_advisory_xact_lock(20260924);
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
  perform pg_advisory_xact_lock(20260924);
  delete from public.equipiers where equipe=p_equipe and profil in (select id from public.profils where utilisateur=auth.uid());
end $$;

create or replace function public.dissoudre_equipe(p_equipe uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260924);
  if not exists(select 1 from public.equipiers m join public.profils p on p.id=m.profil
    where p.utilisateur=auth.uid() and m.equipe=p_equipe and m.place=1) then raise exception 'Seul le capitaine peut dissoudre l''équipe.'; end if;
  delete from public.equipes where id=p_equipe;
end $$;

revoke execute on function public.apres_depart_equipier() from public,anon,authenticated;
revoke execute on function public.mon_equipe(),public.creer_equipe(uuid,text,text),public.modifier_equipe(uuid,text,text),
  public.inviter_equipier(uuid,uuid),public.repondre_invitation_equipe(uuid,text),public.quitter_equipe(uuid),public.dissoudre_equipe(uuid) from public,anon;
grant execute on function public.mon_equipe(),public.creer_equipe(uuid,text,text),public.modifier_equipe(uuid,text,text),
  public.inviter_equipier(uuid,uuid),public.repondre_invitation_equipe(uuid,text),public.quitter_equipe(uuid),public.dissoudre_equipe(uuid) to authenticated;
create or replace function public.cloturer_les_encheres() returns void
language plpgsql set search_path = '' as $$
declare e record;
begin
  -- Le plus souvent, aucune enchère n'est échue : on ne prend pas le verrou du marché, et personne n'attend
  -- (mon_compte passe ici à chaque visite). Les fonctions qui transfèrent des timbres le prennent elles-mêmes.
  if exists (select 1 from public.encheres where etat = 'ouverte' and ferme_le <= now()) then
    perform pg_advisory_xact_lock(20260923);
    for e in select id from public.encheres where etat = 'ouverte' and ferme_le <= now() order by ferme_le, id limit 50 for update skip locked loop
      perform public.cloturer_une_enchere(e.id);
    end loop;
  end if;
  -- Au passage, les cotes du jour (une fois par jour).
  perform public.calculer_les_cotes();
end $$;

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
  perform pg_advisory_xact_lock(20260923); -- les transferts de timbres et d'Encre passent l'un après l'autre
  perform public.cloturer_les_encheres();
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  if not exists (select 1 from public.profils where utilisateur = moi) then raise exception 'Choisis d''abord ton pseudonyme (dans les joutes) : c''est lui que verront les acheteurs.'; end if;
  perform public.exiger_un_compte_etabli(moi, true); -- un compte neuf ne vend rien (serveur/parrainage.ts)
  if p_heures is null or p_heures not in (12, 24, 48) then raise exception 'Durée inconnue.'; end if;
  if p_finition is null or p_finition not in ('Normale', 'Brillante', 'Holographique') then raise exception 'Finition inconnue.'; end if;
  -- Les plafonds ne s'appliquent plus à partir de la formule « Collectionneur ».
  if (select count(*) from public.encheres where vendeur = moi and etat = 'ouverte') >= 10 then
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

create or replace function public.retirer_de_la_vente(p_enchere bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  e public.encheres%rowtype;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923); -- les transferts de timbres et d'Encre passent l'un après l'autre
  perform public.cloturer_les_encheres();
  select * into e from public.encheres where id = p_enchere and vendeur = moi for update;
  if not found then raise exception 'Cette vente n''existe pas.'; end if;
  if e.etat <> 'ouverte' then raise exception 'Cette vente est déjà terminée.'; end if;
  if e.meilleure_mise is not null then raise exception 'Quelqu''un a déjà misé : la vente ne peut plus être retirée.'; end if;
  perform public.rendre_un_timbre(moi, e.carte, e.finition, e.obtenue_le, null);
  update public.encheres set etat = 'retiree', cloturee_le = now() where id = e.id;
  return public.etat_du_compte(moi);
end $$;

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
  perform pg_advisory_xact_lock(20260923); -- les transferts de timbres et d'Encre passent l'un après l'autre
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
  -- Les joueurs gratuits : 10 achats par jour au plus (les mises en tête comptent comme des achats en cours).
  if true then
    select count(*) into achats from public.encheres where (meilleur_encherisseur = moi and etat = 'ouverte' and id <> e.id)
      or (acheteur = moi and etat = 'vendue' and cloturee_le >= date_trunc('day', now() at time zone 'utc') at time zone 'utc');
    if achats >= 10 then raise exception 'Tu as déjà 10 achats aujourd''hui : reviens demain.'; end if;
  end if;
  minimum := case when e.meilleure_mise is null then e.mise_de_depart else e.meilleure_mise + greatest(1, ceil(e.meilleure_mise * 0.05)::integer) end;
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
    -- Une mise dans les 5 dernières minutes prolonge l'enchère d'autant.
    ferme_le = case when e.achat_immediat is not null and montant >= e.achat_immediat then now()
                    when e.ferme_le - now() < interval '5 minutes' then now() + interval '5 minutes'
                    else e.ferme_le end
    where id = e.id;
  -- Un achat immédiat se règle sur-le-champ.
  if e.achat_immediat is not null and montant >= e.achat_immediat then perform public.cloturer_une_enchere(e.id); end if;
  select * into e from public.encheres where id = p_enchere;
  return jsonb_build_object('enchere', public.enchere_en_json(e), 'etat', public.etat_du_compte(moi));
end $$;

create or replace function public.supprimer_mon_profil() returns void
language plpgsql security definer set search_path = ''
as $$
declare en_cours boolean;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  -- Le verrou du direct d'abord (le retrait du profil le demande), puis celui du joueur : dans l'ordre (serveur/verrous.ts).
  perform pg_advisory_xact_lock(20260924);
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  perform 1 from public.comptes where utilisateur=auth.uid() for update;
  if to_regclass('public.combats') is not null then
    execute 'select exists(select 1 from public.combats where utilisateur=$1 and not termine)' into en_cours using auth.uid();
    if en_cours then raise exception 'Termine ou abandonne ton combat avant de retirer ton profil.'; end if;
  end if;
  delete from public.profils where utilisateur = auth.uid();
end $$;

create or replace function public.supprimer_mon_compte() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  perform pg_advisory_xact_lock(20260924); -- l'effacement retire aussi le profil : dans l'ordre (serveur/verrous.ts)
  delete from auth.users where id = auth.uid();
end $$;

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
    perform pg_advisory_xact_lock(20260923);
    perform pg_advisory_xact_lock(20260924); -- le profil change de main : dans l'ordre (serveur/verrous.ts)
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

commit;
