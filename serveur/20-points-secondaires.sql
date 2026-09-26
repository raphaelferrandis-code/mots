-- Les points secondaires de l’audit. Après 19-paiements.sql. Redéployer aussi les fonctions combats et joutes-direct.
begin;
drop index if exists public.comptes_par_code;
create unique index if not exists comptes_code_unique on public.comptes (code_hache) where code_hache is not null;
create table if not exists public.demandes_traitees (
  utilisateur uuid not null references public.comptes (utilisateur) on delete cascade on update cascade,
  demande uuid not null,
  reponse jsonb not null,
  le timestamptz not null default now(),
  primary key (utilisateur, demande)
);
alter table public.demandes_traitees enable row level security;
revoke all on public.demandes_traitees from public, anon, authenticated;
create or replace function public.demande_deja_traitee(p_utilisateur uuid, p_demande uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select d.reponse from public.demandes_traitees d where d.utilisateur = p_utilisateur and d.demande = p_demande
$$;
create or replace function public.noter_la_demande(p_utilisateur uuid, p_demande uuid, p_reponse jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_demande is null then return; end if;
  insert into public.demandes_traitees (utilisateur, demande, reponse) values (p_utilisateur, p_demande, p_reponse) on conflict do nothing;
  delete from public.demandes_traitees where utilisateur = p_utilisateur and le < now() - interval '2 days';
end $$;
revoke execute on function public.demande_deja_traitee(uuid, uuid), public.noter_la_demande(uuid, uuid, jsonb) from public, anon, authenticated;
alter table public.encheres alter column vendeur drop not null;
alter table public.encheres drop constraint if exists encheres_vendeur_fkey;
alter table public.encheres add constraint encheres_vendeur_fkey foreign key (vendeur) references public.comptes (utilisateur) on delete set null on update cascade;

drop function if exists public.ouvrir_un_paquet(text[]);
drop function if exists public.reclamer_recompense(text, text[]);
drop function if exists public.mettre_en_vente(text, text, integer, integer, integer);

create or replace function public.tirer_les_cartes(p_utilisateur uuid, p_masques text[], p_mode text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  emplacements jsonb := '[{"Commune":70,"Peu commune":25,"Rare":5},{"Commune":70,"Peu commune":25,"Rare":5},{"Commune":70,"Peu commune":25,"Rare":5},{"Peu commune":75,"Rare":20,"Épique":5},{"Rare":74,"Épique":22,"Légendaire":4},{"Rare":74,"Épique":22,"Légendaire":4}]'::jsonb;
  chances jsonb;
  numero integer := 0;
  dernier boolean;
  garantie boolean;
  depart boolean;
  masques text[] := coalesce(p_masques, '{}');
  seuil numeric;
  rarete text;
  r text;
  ordre text[];
  id_choisie text;
  rarete_choisie text;
  pris text[] := '{}';
  finition text;
  tirage double precision;
  possession public.possessions%rowtype;
  gain integer;
  tirees jsonb := '[]'::jsonb;
  legendaire boolean := false;
  exceptionnel text;
begin
  select * into c from public.comptes where utilisateur = p_utilisateur;
  -- Seulement les registres connus : un tableau fabriqué ne sert ni à orienter les tirages ni à alourdir le calcul.
  masques := array(select distinct m from unnest(coalesce(p_masques, '{}')) m where m in ('Familier', 'Injurieux', 'Littéraire', 'Vieilli'));
  -- Le fil d'activité ne note que les trouvailles tirées d'un paquet (serveur/activite.ts), pas les échanges ni le marché.
  perform set_config('philamots.tirage', 'oui', true);
  -- Au plus tard au 20e paquet sans Légendaire, la dernière carte en est une.
  if p_mode = 'achat' then emplacements := '[{"Hors-série":100}]'::jsonb;
  elsif p_mode = 'hebdomadaire' then
    emplacements := jsonb_set(emplacements, array[(jsonb_array_length(emplacements)-1)::text], '{"Épique":89,"Légendaire":10,"Hors-série":1}'::jsonb);
  elsif p_mode <> 'normal' then raise exception 'Tirage inconnu.';
  end if;
  garantie := p_mode = 'normal' and c.sans_legendaire + 1 >= 20;
  -- Les 3 paquets de départ ne contiennent que des cartes nouvelles, pour composer un deck tout de suite.
  depart := p_mode = 'normal' and c.ouverts < 3;
  -- Paquet d'exception (src/jeu/paquets.ts) : un seul jet, d'abord le paquet Hors-série (1 paquet ordinaire sur
  -- 30000), sinon le paquet de Légendaires holographiques (1 sur 10000), s'il y a assez de cartes pour le remplir.
  if p_mode = 'normal' and not depart then
    tirage := random();
    if tirage < 0.000033333333333333335 then
      if (select count(*) from public.cartes k where k.rarete = 'Hors-série' and not (k.registre && masques)) >= jsonb_array_length(emplacements) then exceptionnel := 'Hors-série'; end if;
    elsif tirage < 0.00013333333333333334 then
      if (select count(*) from public.cartes k where k.rarete = 'Légendaire' and not (k.registre && masques)) >= jsonb_array_length(emplacements) then exceptionnel := 'Légendaire'; end if;
    end if;
    if exceptionnel is not null then
      emplacements := (select jsonb_agg(jsonb_build_object(exceptionnel, 100)) from generate_series(1, jsonb_array_length(emplacements)));
    end if;
  end if;

  for chances in select * from jsonb_array_elements(emplacements) loop
    numero := numero + 1;
    dernier := numero = jsonb_array_length(emplacements);

    -- La rareté de l'emplacement, selon ses chances.
    seuil := random() * (select sum(e.value::numeric) from jsonb_each_text(chances) e);
    rarete := null;
    foreach r in array array['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire', 'Hors-série'] loop
      seuil := seuil - coalesce((chances ->> r)::numeric, 0);
      if seuil < 0 then rarete := r; exit; end if;
    end loop;
    if rarete is null then rarete := 'Commune'; end if;
    if dernier and p_mode = 'normal' and exceptionnel is null then
      -- La garantie de Légendaire passe avant tout ; sinon, une toute petite chance de carte Hors-série.
      if garantie then rarete := 'Légendaire';
      elsif exists (select 1 from public.cartes k where k.rarete = 'Hors-série' and not (k.registre && masques)) and random() < 0.001 then rarete := 'Hors-série';
      end if;
    end if;

    -- La carte : de cette rareté, sinon de la plus proche ; jamais deux fois la même dans un paquet.
    ordre := case rarete when 'Commune' then array['Commune', 'Peu commune', 'Rare', 'Épique', 'Légendaire'] when 'Peu commune' then array['Peu commune', 'Commune', 'Rare', 'Épique', 'Légendaire'] when 'Rare' then array['Rare', 'Peu commune', 'Commune', 'Épique', 'Légendaire'] when 'Épique' then array['Épique', 'Rare', 'Peu commune', 'Commune', 'Légendaire'] when 'Légendaire' then array['Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] when 'Hors-série' then array['Hors-série', 'Légendaire', 'Épique', 'Rare', 'Peu commune', 'Commune'] end;
    if p_mode = 'achat' or (p_mode = 'hebdomadaire' and dernier) or exceptionnel is not null then
      -- Ne jamais dégrader la garantie en cas de catalogue ou filtre incompatible.
      ordre := array[rarete];
    end if;
    id_choisie := null;
    foreach r in array ordre loop
      select k.id, k.rarete into id_choisie, rarete_choisie from public.cartes k
      where k.rarete = r and not (k.registre && masques) and k.id <> all (pris)
        and (not depart or not exists (select 1 from public.possessions p where p.utilisateur = p_utilisateur and p.carte = k.id))
      order by random() limit 1;
      if found then exit; end if;
    end loop;
    if id_choisie is null then raise exception 'Aucune carte disponible pour ce tirage.'; end if;
    pris := pris || id_choisie;

    -- La finition, tirée à part (une Hors-série a sa propre impression : pas de finition).
    if rarete_choisie = 'Hors-série' then finition := 'Normale';
    elsif exceptionnel = 'Légendaire' then finition := 'Holographique';
    else
      tirage := random();
      finition := case when tirage < 0.0125 then 'Holographique' when tirage < 0.09583333333333333 then 'Brillante' else 'Normale' end;
    end if;
    if rarete_choisie = 'Légendaire' then legendaire := true; end if;

    -- Rangement : carte nouvelle, finition nouvelle, ou vrai doublon changé en Encre.
    select * into possession from public.possessions p where p.utilisateur = p_utilisateur and p.carte = id_choisie for update;
    if not found then
      insert into public.possessions (utilisateur, carte, finitions) values (p_utilisateur, id_choisie, jsonb_build_object(finition, 1));
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', true, 'nouvelleFinition', true, 'encre', 0);
    elsif coalesce((possession.finitions ->> finition)::integer, 0) = 0 then
      update public.possessions set finitions = finitions || jsonb_build_object(finition, 1) where utilisateur = p_utilisateur and carte = id_choisie;
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', false, 'nouvelleFinition', true, 'encre', 0);
    else
      gain := (case rarete_choisie when 'Commune' then 1 when 'Peu commune' then 3 when 'Rare' then 10 when 'Épique' then 30 when 'Légendaire' then 100 when 'Hors-série' then 500 else 0 end)
            * (case finition when 'Normale' then 1 when 'Brillante' then 3 when 'Holographique' then 10 else 1 end)
            * (case when public.niveau(c) >= 2 then 1 else 1 end);
      update public.possessions
        set doublons = doublons + 1
        where utilisateur = p_utilisateur and carte = id_choisie;
      c.encre := c.encre + gain;
      tirees := tirees || jsonb_build_object('id', id_choisie, 'finition', finition, 'nouvelle', false, 'nouvelleFinition', false, 'encre', gain);
    end if;
  end loop;

  update public.comptes
    set encre = c.encre, ouverts = ouverts + case when p_mode = 'normal' then 1 else 0 end, sans_legendaire = case when p_mode <> 'normal' then sans_legendaire when legendaire then 0 else sans_legendaire + 1 end, maj_le = now()
    where utilisateur = p_utilisateur;
  perform public.gagner_xp(p_utilisateur, case when p_mode='achat' then 0 else 20 end
    + 15 * (select count(*)::integer from jsonb_array_elements(tirees) t where (t->>'nouvelle')::boolean), false);
  return tirees;
end $$;

create or replace function public.ouvrir_un_paquet(p_masques text[], p_demande uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  tirees jsonb;
  deja jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  deja := public.demande_deja_traitee(auth.uid(), p_demande);
  if deja is not null then return deja || jsonb_build_object('etat', public.etat_du_compte(auth.uid())); end if;
  c := public.recharger(c);
  if c.stock < 1 then raise exception 'Aucun paquet en réserve pour l''instant.'; end if;
  update public.comptes set stock = c.stock - 1, reference = c.reference where utilisateur = c.utilisateur;
  tirees := public.tirer_un_paquet(c.utilisateur, p_masques);
  perform public.noter_la_demande(c.utilisateur, p_demande, jsonb_build_object('cartes', tirees));
  return jsonb_build_object('cartes', tirees, 'etat', public.etat_du_compte(c.utilisateur));
end $$;

create or replace function public.reclamer_recompense(p_type text, p_masques text[], p_demande uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.comptes; tirees jsonb; deja jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Compte introuvable.'; end if;
  deja := public.demande_deja_traitee(auth.uid(), p_demande);
  if deja is not null then return deja || jsonb_build_object('etat', public.etat_du_compte(auth.uid())); end if;
  if p_type = 'achat' then
    if not c.achat_unique or c.cadeau_achat_reclame then raise exception 'Aucune Hors-série à recevoir.'; end if;
    update public.comptes set cadeau_achat_reclame = true where utilisateur = c.utilisateur;
  elsif p_type = 'hebdomadaire' then
    c := public.actualiser_offres(c);
    if c.reserve_hebdo < 1 then raise exception 'Aucun paquet hebdomadaire disponible.'; end if;
    update public.comptes set reserve_hebdo = c.reserve_hebdo - 1, prochain_hebdo = c.prochain_hebdo where utilisateur = c.utilisateur;
  else raise exception 'Récompense inconnue.';
  end if;
  tirees := public.tirer_les_cartes(c.utilisateur, p_masques, p_type);
  perform public.noter_la_demande(c.utilisateur, p_demande, jsonb_build_object('cartes', tirees));
  return jsonb_build_object('cartes', tirees, 'etat', public.etat_du_compte(c.utilisateur));
end $$;

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
  perform pg_advisory_xact_lock(20260923); -- les transferts de timbres et d'Encre passent l'un après l'autre
  perform public.cloturer_les_encheres();
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  -- La même vente redemandée (réponse perdue en route) : l'enchère déjà créée, pas une seconde.
  deja := public.demande_deja_traitee(moi, p_demande);
  if deja is not null then return deja || jsonb_build_object('etat', public.etat_du_compte(moi)); end if;
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
  perform public.noter_la_demande(moi, p_demande, jsonb_build_object('enchere', public.enchere_en_json(e)));
  return jsonb_build_object('enchere', public.enchere_en_json(e), 'etat', public.etat_du_compte(moi));
end $$;

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
    'maintenant', public.en_millisecondes(now())
  );
end $$;

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
              from public.cotes c where c.carte = p_carte and c.jour > current_date - 90),
    'ventes', (select coalesce(jsonb_agg(jsonb_build_object('quand', public.en_millisecondes(e.cloturee_le), 'finition', e.finition, 'prix', e.prix_final) order by e.cloturee_le desc), '[]'::jsonb)
               from (select * from public.encheres v where v.carte = p_carte and v.etat = 'vendue' order by v.cloturee_le desc limit 30) e),
    'stats', (select coalesce(jsonb_agg(s.stat order by s.finition), '[]'::jsonb)
              from (select e.finition, jsonb_build_object('finition', e.finition, 'mini', min(e.prix_final), 'maxi', max(e.prix_final), 'nombre', count(*)) as stat
                    from public.encheres e where e.carte = p_carte and e.etat = 'vendue' and e.cloturee_le > now() - make_interval(days => 90)
                    group by e.finition) s),
    'maintenant', public.en_millisecondes(now())
  );
end $$;

create or replace function public.definir_un_code_de_secours(p_code text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  propre text := public.code_propre(p_code);
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  -- Seulement les signes que le jeu tire (sans I, L, O, 0 ni 1) : src/jeu/codeDeSecours.ts.
  if propre !~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{20}$' then raise exception 'Ce code ne peut pas servir de code de secours.'; end if;
  begin
    update public.comptes set code_hache = public.empreinte_du_code(propre), code_defini_le = now(), maj_le = now() where utilisateur = auth.uid();
  exception when unique_violation then
    raise exception 'Ce code est déjà pris : tires-en un autre.';
  end;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  return public.etat_du_compte(auth.uid());
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
  -- Les essais de plus d'un jour ne servent plus à rien (la limite compte ceux de l'heure) : on les oublie.
  delete from public.tentatives_de_recuperation where quand < now() - interval '1 day';
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

create or replace function public.direct_oublier_l_equipe() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  delete from public.direct_cotes where mode='duo_equipe' and sujet=old.id;
  return old;
end $$;
drop trigger if exists direct_oublier_l_equipe on public.equipes;
create trigger direct_oublier_l_equipe after delete on public.equipes for each row execute function public.direct_oublier_l_equipe();
revoke all on function public.direct_oublier_l_equipe() from public,anon,authenticated;

revoke execute on function public.ouvrir_un_paquet(text[], uuid), public.reclamer_recompense(text, text[], uuid), public.mettre_en_vente(text, text, integer, integer, integer, uuid) from public, anon;
grant execute on function public.ouvrir_un_paquet(text[], uuid), public.reclamer_recompense(text, text[], uuid), public.mettre_en_vente(text, text, integer, integer, integer, uuid) to authenticated;

commit;
