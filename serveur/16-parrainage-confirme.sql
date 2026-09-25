-- Le parrainage confirmé et les comptes neufs. Après 15-portraits-et-presence.sql.
-- Aucune fonction serveur (Edge) à redéployer : le client peut être publié avant ou après ce script.
begin;

-- ── Les comptes neufs ────────────────────────────────────────────────────────
create or replace function public.exiger_un_compte_etabli(p_utilisateur uuid, p_moi boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare ouvert timestamptz := (select c.cree_le + interval '3 days' from public.comptes c where c.utilisateur = p_utilisateur);
begin
  if ouvert is null or ouvert <= now() then return; end if;
  if p_moi then
    raise exception 'Les échanges et le marché s''ouvrent 3 jours après ton arrivée : le %.', to_char(ouvert at time zone 'Europe/Paris', 'DD/MM à HH24:MI');
  end if;
  raise exception 'Ce joueur vient d''arriver : les échanges avec lui s''ouvrent le %.', to_char(ouvert at time zone 'Europe/Paris', 'DD/MM à HH24:MI');
end $$;
revoke execute on function public.exiger_un_compte_etabli(uuid, boolean) from public, anon, authenticated;

-- ── Le parrainage ────────────────────────────────────────────────────────────
alter table public.comptes add column if not exists code_parrain text;
create unique index if not exists comptes_code_parrain on public.comptes(code_parrain) where code_parrain is not null;

create table if not exists public.parrainages (
  filleul uuid primary key references public.comptes(utilisateur) on update cascade on delete cascade,
  parrain uuid references public.comptes(utilisateur) on update cascade on delete set null,
  cree_le timestamptz not null default now(),
  valide_le timestamptz,            -- premier duel terminé par le filleul
  filleul_verse_le timestamptz,     -- ses paquets sont dans sa réserve
  deuxieme_jour_le timestamptz,     -- un duel terminé un autre jour que le premier
  confirme_le timestamptz,          -- le filleul est confirmé : le sort du parrain est réglé
  parrain_du boolean not null default false, -- le parrain y a droit (dans la limite mensuelle)
  parrain_verse_le timestamptz,     -- ses paquets sont dans sa réserve
  check (parrain is distinct from filleul)
);
-- La confirmation (25/09/2026). Les parrainages validés avant elle restent acquis : ils sont notés confirmés le jour de
-- leur validation, une seule fois, quand les colonnes arrivent.
do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'parrainages' and column_name = 'confirme_le') then
    alter table public.parrainages add column deuxieme_jour_le timestamptz, add column confirme_le timestamptz;
    update public.parrainages set confirme_le = valide_le where valide_le is not null;
  end if;
end $$;
create index if not exists parrainages_par_parrain on public.parrainages(parrain);
alter table public.parrainages enable row level security;
revoke all on public.parrainages from public, anon, authenticated;

-- Verse les paquets dus à un joueur (comme filleul et comme parrain), tant que sa réserve a de la place.
-- Rend le nombre de lots versés.
create or replace function public.verser_les_paquets_de_parrainage(p_utilisateur uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; place integer; verses integer := 0; ligne record;
begin
  select * into c from public.comptes where utilisateur = p_utilisateur for update;
  if not found then return 0; end if;
  -- Les paquets gagnés avec le temps sont comptés d'abord : un cadeau ne doit pas les effacer.
  c := public.recharger(c);
  place := floor((15 - c.stock)::numeric / 3);
  for ligne in
    select * from (
      select r.filleul, true as filleul_lui_meme, r.valide_le from public.parrainages r
        where r.filleul = p_utilisateur and r.valide_le is not null and r.filleul_verse_le is null
      union all
      select r.filleul, false, r.valide_le from public.parrainages r
        where r.parrain = p_utilisateur and r.parrain_du and r.parrain_verse_le is null
    ) dus order by dus.valide_le
  loop
    exit when verses >= place;
    if ligne.filleul_lui_meme then update public.parrainages set filleul_verse_le = now() where filleul = ligne.filleul;
    else update public.parrainages set parrain_verse_le = now() where filleul = ligne.filleul; end if;
    verses := verses + 1;
  end loop;
  if verses > 0 then
    update public.comptes set stock = c.stock + verses * 3, reference = c.reference where utilisateur = p_utilisateur;
  end if;
  return verses;
end $$;

-- Un invité reste « anonyme » pour Supabase tant qu'il n'a pas relié de compte Google ou d'adresse e-mail.
create or replace function public.vrai_compte(p_utilisateur uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select not u.is_anonymous from auth.users u where u.id = p_utilisateur), false)
$$;

-- Le filleul est confirmé : son parrain y gagne des paquets, dans la limite mensuelle. Appelée après chaque duel du
-- filleul, et aux visites du filleul et du parrain (mon_parrainage) : relier un compte ne passe pas par nos fonctions.
-- La ligne déjà verrouillée par une autre transaction est laissée à celle-ci (skip locked) ; le verrou du parrain
-- rend le décompte mensuel exact quand deux filleuls sont confirmés au même instant.
create or replace function public.confirmer_le_parrainage(p_filleul uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.parrainages%rowtype;
begin
  select * into r from public.parrainages
    where filleul = p_filleul and parrain is not null and confirme_le is null and deuxieme_jour_le is not null
    for update skip locked;
  if not found or not public.vrai_compte(p_filleul) then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('parrainage:' || r.parrain::text, 0));
  update public.parrainages set confirme_le = now(),
    parrain_du = (select count(*) from public.parrainages x
      where x.parrain = r.parrain and x.parrain_du and x.confirme_le > now() - interval '30 days') < 10
  where filleul = p_filleul;
end $$;

-- Un duel terminé par un filleul. Le premier lui vaut ses paquets ; celui d'un autre jour (heure de Paris), dans le
-- délai qui suit son arrivée, compte pour sa confirmation. Appelée par les déclencheurs ci-dessous, dans la transaction
-- qui enregistre le résultat, où le compte du filleul est déjà verrouillé.
create or replace function public.valider_le_parrainage(p_filleul uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.parrainages%rowtype;
begin
  select * into r from public.parrainages where filleul = p_filleul for update;
  if not found then return; end if;
  if r.valide_le is null then
    update public.parrainages set valide_le = now() where filleul = p_filleul;
    perform public.verser_les_paquets_de_parrainage(p_filleul);
  elsif r.deuxieme_jour_le is null
    and (now() at time zone 'Europe/Paris')::date > (r.valide_le at time zone 'Europe/Paris')::date
    and now() <= (select c.cree_le from public.comptes c where c.utilisateur = p_filleul) + interval '14 days' then
    update public.parrainages set deuxieme_jour_le = now() where filleul = p_filleul;
  end if;
  perform public.confirmer_le_parrainage(p_filleul);
end $$;

-- Un combat vérifié (entraînement, défi, adversaire de secours) terminé sans abandon.
create or replace function public.parrainage_apres_combat() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.termine and not old.termine and not coalesce((new.etat->>'abandonne')::boolean, false) then
    perform public.valider_le_parrainage(new.utilisateur);
  end if;
  return null;
end $$;
drop trigger if exists parrainage_combat on public.combats;
create trigger parrainage_combat after update of termine on public.combats
  for each row execute function public.parrainage_apres_combat();

-- Une joute en direct terminée normalement (ni abandon ni forfait : la même règle que les récompenses de fin).
create or replace function public.parrainage_apres_direct() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if new.termine and not old.termine and new.etat->>'raison' is null then
    for u in select utilisateur from public.direct_places where partie = new.id loop
      perform public.valider_le_parrainage(u);
    end loop;
  end if;
  return null;
end $$;
do $$ begin
  if to_regclass('public.direct_parties') is not null then
    execute 'drop trigger if exists parrainage_direct on public.direct_parties';
    execute 'create trigger parrainage_direct after update of termine on public.direct_parties for each row execute function public.parrainage_apres_direct()';
  end if;
end $$;

-- Le nouveau venu arrivé par un lien d'invitation. Ne lève pas d'erreur : le jeu l'appelle sans rien demander au
-- joueur, et un refus se lit dans la réponse.
create or replace function public.declarer_mon_parrain(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid := auth.uid(); c public.comptes%rowtype; le_parrain uuid;
  code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then return jsonb_build_object('accepte', false, 'raison', 'Ouvre d''abord ton compte.'); end if;
  if exists(select 1 from public.parrainages where filleul = moi) then
    return jsonb_build_object('accepte', false, 'raison', 'Tu as déjà été invité par un joueur.'); end if;
  if c.combats_joues > 0 or c.cree_le < now() - interval '7 days' then
    return jsonb_build_object('accepte', false, 'raison', 'Les invitations sont réservées aux nouveaux joueurs.'); end if;
  select utilisateur into le_parrain from public.comptes where code_parrain = code;
  if le_parrain is null then return jsonb_build_object('accepte', false, 'raison', 'Ce lien d''invitation n''est pas valable.'); end if;
  if le_parrain = moi then return jsonb_build_object('accepte', false, 'raison', 'C''est ton propre lien d''invitation.'); end if;
  if exists(select 1 from public.parrainages where filleul = le_parrain and parrain = moi) then
    return jsonb_build_object('accepte', false, 'raison', 'Vous ne pouvez pas vous inviter l''un l''autre.'); end if;
  insert into public.parrainages(filleul, parrain) values (moi, le_parrain);
  return jsonb_build_object('accepte', true, 'pseudo', (select pseudo from public.profils where utilisateur = le_parrain));
end $$;

-- Le lien d'invitation du joueur (créé à la première demande), ce que ses invitations ont donné, et les paquets de
-- parrainage qui l'attendaient. « nouveaux » : les filleuls dont les paquets viennent d'être versés, pour le lui dire.
create or replace function public.mon_parrainage() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid := auth.uid(); code text; verses integer; nouveaux jsonb;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  select code_parrain into code from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  -- Un compte relié depuis la dernière visite : le filleul (le joueur lui-même, ou ceux qu'il a invités) est confirmé.
  perform public.confirmer_le_parrainage(moi);
  perform public.confirmer_le_parrainage(r.filleul) from public.parrainages r
    where r.parrain = moi and r.confirme_le is null and r.deuxieme_jour_le is not null;
  while code is null loop
    code := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::integer, 1), '')
      from generate_series(1, 8));
    begin
      update public.comptes set code_parrain = code where utilisateur = moi;
    exception when unique_violation then code := null;
    end;
  end loop;
  verses := public.verser_les_paquets_de_parrainage(moi);
  -- now() est l'heure de la transaction : les versements de cet appel la portent exactement.
  select coalesce(jsonb_agg(p.pseudo), '[]'::jsonb) into nouveaux
    from public.parrainages r left join public.profils p on p.utilisateur = r.filleul
    where r.parrain = moi and r.parrain_verse_le = now();
  return jsonb_build_object(
    'code', code,
    'paquets', 3,
    'confirmation', true, -- ce serveur récompense le parrain à la confirmation du filleul (et non plus au premier duel)
    'invites', (select count(*) from public.parrainages where parrain = moi),
    'valides', (select count(*) from public.parrainages where parrain = moi and valide_le is not null),
    'recompenses', (select count(*) from public.parrainages where parrain = moi and parrain_du and confirme_le > now() - interval '30 days'),
    -- Ont joué leur premier duel, pas encore confirmés, et peuvent encore l'être.
    'aConfirmer', (select count(*) from public.parrainages r join public.comptes c on c.utilisateur = r.filleul
      where r.parrain = moi and r.valide_le is not null and r.confirme_le is null
        and (r.deuxieme_jour_le is not null or now() <= c.cree_le + interval '14 days')),
    'nouveaux', nouveaux,
    'enAttente', (select count(*) from public.parrainages where parrain = moi and parrain_du and parrain_verse_le is null)
      + (select count(*) from public.parrainages where filleul = moi and valide_le is not null and filleul_verse_le is null),
    'parrain', (select jsonb_build_object('pseudo', p.pseudo, 'valide', r.valide_le is not null,
        'verse', r.filleul_verse_le is not null, 'verseMaintenant', coalesce(r.filleul_verse_le = now(), false),
        'confirme', r.confirme_le is not null, 'manqueCompte', not public.vrai_compte(moi), 'manqueJour', r.deuxieme_jour_le is null,
        'echu', r.deuxieme_jour_le is null and now() > c.cree_le + interval '14 days')
      from public.parrainages r join public.comptes c on c.utilisateur = r.filleul
        left join public.profils p on p.utilisateur = r.parrain where r.filleul = moi),
    'etat', case when verses > 0 then public.etat_du_compte(moi) else null end);
end $$;

revoke execute on function public.verser_les_paquets_de_parrainage(uuid), public.valider_le_parrainage(uuid),
  public.confirmer_le_parrainage(uuid), public.vrai_compte(uuid),
  public.parrainage_apres_combat(), public.parrainage_apres_direct() from public, anon, authenticated;
revoke execute on function public.declarer_mon_parrain(text), public.mon_parrainage() from public, anon;
grant execute on function public.declarer_mon_parrain(text), public.mon_parrainage() to authenticated;
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

commit;
