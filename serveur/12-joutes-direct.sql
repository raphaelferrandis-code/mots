-- Après 11-equipes.sql. Nouvelle fonction joutes-direct requise avant le client.
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
-- Les rencontres du jour (les mêmes camps face à face) : seules les 3 premières font bouger la cote
-- (décision du 25/09/2026). Un registre à part, que le retrait d'un profil n'efface pas ; nettoyé au fil de l'eau.
create table if not exists public.direct_rencontres (
  jour date not null, rencontre text not null, parties integer not null default 0, primary key(jour,rencontre)
);
alter table public.direct_rencontres enable row level security;
revoke all on public.direct_rencontres from public,anon,authenticated;
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
  -- Les filtres de contenu, triés et sans doublon : une combinaison inhabituelle ne crée pas une file à part, où deux
  -- comptes d'un même tricheur ne rencontreraient qu'eux-mêmes.
  p_masques:=coalesce((select jsonb_agg(x.v order by x.v) from (select distinct filtre.value v from jsonb_array_elements_text(coalesce(p_masques,'[]'::jsonb)) filtre
    where filtre.value in ('Familier','Injurieux','Littéraire','Vieilli')) x),'[]'::jsonb);
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
  evenement jsonb; uid uuid; gain integer; resultat text; prime jsonb; cle_rencontre text; deja integer;
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
      -- Le gagnant reçoit sa récompense même quand l'autre camp abandonne ou disparaît (décision du 25/09/2026) ;
      -- le camp qui abandonne ou disparaît, rien.
      if p_etat->>'raison' is null or resultat='victoire' then
        prime:=public.recompenser(ligne.utilisateur,35,resultat);
        gain:=public.gagner_xp(ligne.utilisateur,30+case when resultat='victoire' then 20 else 0 end,true);
      end if;
      update public.direct_places set xp=xp+gain,recompense=prime where partie=p_id and utilisateur=ligne.utilisateur;
      update public.comptes set combats_joues=combats_joues+1,combats_gagnes=combats_gagnes+(resultat='victoire')::integer where utilisateur=ligne.utilisateur;
    end loop;
    -- La même rencontre (les mêmes camps face à face) ne fait bouger la cote que 3 fois par jour
    -- (heure de Paris) ; au-delà, la partie compte pour tout le reste, pas pour la cote ni pour le classement.
    select partie_lue.mode||':'||string_agg(c.sujets,'|' order by c.sujets) into cle_rencontre from (
      select string_agg(s.sujet::text,',' order by s.sujet) sujets from public.direct_places s where s.partie=p_id group by s.camp
    ) c;
    insert into public.direct_rencontres(jour,rencontre,parties) values((now() at time zone 'Europe/Paris')::date,cle_rencontre,1)
      on conflict(jour,rencontre) do update set parties=public.direct_rencontres.parties+1 returning parties into deja;
    delete from public.direct_rencontres where jour<(now() at time zone 'Europe/Paris')::date-2;
    if deja<=3 then
    -- Ordre stable des verrous, y compris lorsque des résultats arrivent en même temps.
    perform c.sujet from public.direct_cotes c where c.mode=partie_lue.mode and c.sujet in(select sujet from public.direct_places where partie=p_id) order by c.sujet for update;
    select array_agg(m.cote order by m.camp) into moyennes from (
      select s.camp,avg(c.cote) cote from public.direct_places s join public.direct_cotes c on c.mode=partie_lue.mode and c.sujet=s.sujet where s.partie=p_id group by s.camp
    ) m;
    for ligne in select distinct s.sujet,s.camp from public.direct_places s where s.partie=p_id loop
      select cote into avant from public.direct_cotes where mode=partie_lue.mode and sujet=ligne.sujet;
      score:=case when p_etat->>'vainqueur'='nul' then 0.5 when (p_etat->>'vainqueur')::text=ligne.camp::text then 1 else 0 end;
      apres:=greatest(100,avant+round(32*(score-1/(1+power(10,(moyennes[2-ligne.camp]-moyennes[ligne.camp+1])/400))))::integer);
      update public.direct_cotes set cote=apres,jouees=jouees+1,gagnees=gagnees+(score=1)::integer where mode=partie_lue.mode and sujet=ligne.sujet;
      if partie_lue.mode='solo' then
        update public.profils set cote=apres,jouees=jouees+1,gagnees=gagnees+(score=1)::integer,maj_le=now() where id=ligne.sujet;
      end if;
      update public.direct_places set cote_avant=avant,cote_apres=apres where partie=p_id and sujet=ligne.sujet;
    end loop;
    end if;
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
    where c.mode=p_mode and c.jouees>=5 and (e.id is not null or p.id is not null)
  ) select jsonb_build_object('total',(select count(*) from classes),'lignes',coalesce((select jsonb_agg(to_jsonb(x) order by rang) from classes x
      where rang<=100 or abs(rang-coalesce((select rang from classes where moi),-1000))<=2),'[]'::jsonb),
    -- On entre au classement après quelques parties classées ; avant, le joueur voit quand même sa cote.
    'minimum',5,
    'moi',(select jsonb_build_object('cote',c.cote,'jouees',c.jouees) from public.direct_cotes c
      where c.mode=p_mode and c.sujet=case when p_mode='duo_equipe' then mon_equipe else mon_profil end)) into resultat;
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

-- Les cotes suivent le compte (elles survivent au retrait du profil : serveur/classement.ts) et s'effacent avec lui.
create or replace function public.direct_oublier_les_cotes() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  delete from public.direct_cotes where sujet in (select id from public.profils where utilisateur=old.utilisateur)
    or sujet=(to_jsonb(old)->'profil_precedent'->>'id')::uuid; -- to_jsonb : sans erreur si la colonne n'est pas encore là
  return old;
end $$;
drop trigger if exists direct_oublier_les_cotes on public.comptes;
create trigger direct_oublier_les_cotes before delete on public.comptes for each row execute function public.direct_oublier_les_cotes();
create or replace function public.direct_oublier_l_equipe() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  delete from public.direct_cotes where mode='duo_equipe' and sujet=old.id;
  return old;
end $$;
drop trigger if exists direct_oublier_l_equipe on public.equipes;
create trigger direct_oublier_l_equipe after delete on public.equipes for each row execute function public.direct_oublier_l_equipe();
revoke all on function public.direct_oublier_l_equipe() from public,anon,authenticated;

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

revoke all on function public.direct_oublier_les_cotes() from public,anon,authenticated;
revoke all on function public.direct_defaire_la_proposition(uuid,uuid),public.direct_expirer_propositions(),public.direct_accepter(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.direct_accepter(uuid,uuid,boolean) to service_role;
revoke all on function public.direct_signaler(uuid[]),public.direct_salon(uuid,text,text,jsonb),public.direct_contexte(uuid),public.direct_annuler_preparation(uuid,uuid),public.direct_appliquer(uuid,uuid,integer,jsonb,text,jsonb),public.direct_proteger_membre(),public.direct_proteger_profil(),public.direct_refuser_double(),public.classement_direct(text) from public,anon,authenticated;
grant execute on function public.classement_direct(text) to authenticated;
grant execute on function public.direct_salon(uuid,text,text,jsonb),public.direct_contexte(uuid),public.direct_annuler_preparation(uuid,uuid),public.direct_appliquer(uuid,uuid,integer,jsonb,text,jsonb) to service_role;

commit;
