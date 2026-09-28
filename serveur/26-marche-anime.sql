-- Le marché animé : 12 ventes des joueurs simulés, le rachat d'une vente sans mise (1 par jour), leur retrait dès 30 vraies ventes. Après 25-boutique.sql.
-- Aucune fonction serveur (Edge) à redéployer : le jeu peut être publié avant ou après ce script.
-- Pour couper l’animation un jour : EQUILIBRAGE.marche.simules.actif = false, « npm run serveur:script », recoller ce script.
begin;
alter table public.encheres add column if not exists simulee boolean not null default false;
alter table public.encheres add column if not exists vendeur_maison uuid references public.profils (id) on delete set null;
alter table public.encheres add column if not exists acheteur_maison uuid references public.profils (id) on delete set null;
create index if not exists encheres_simulees_ouvertes on public.encheres (ferme_le) where etat = 'ouverte' and simulee;

create or replace function public.pseudonyme_maison(p_profil uuid) returns text language sql stable set search_path = ''
as $$
  select coalesce((select p.pseudo from public.profils p where p.id = p_profil), 'Un collectionneur')
$$;

create or replace function public.enchere_en_json(e public.encheres) returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id, 'carte', e.carte, 'finition', e.finition,
    'vendeur', case when e.simulee then public.pseudonyme_maison(e.vendeur_maison) else public.pseudonyme_de(e.vendeur) end,
    'vendeurSimule', e.simulee, 'mienne', e.vendeur = auth.uid(),
    'miseDeDepart', e.mise_de_depart, 'achatImmediat', e.achat_immediat, 'meilleureMise', e.meilleure_mise,
    'enTete', e.meilleur_encherisseur is not null and e.meilleur_encherisseur = auth.uid(),
    'fermeLe', public.en_millisecondes(e.ferme_le), 'etat', e.etat, 'prixFinal', e.prix_final,
    'acheteur', case when e.acheteur_maison is not null then public.pseudonyme_maison(e.acheteur_maison)
                     when e.acheteur is null then null else public.pseudonyme_de(e.acheteur) end,
    'acheteurSimule', e.acheteur_maison is not null,
    'remportee', e.acheteur is not null and e.acheteur = auth.uid(),
    'cote', public.cote_du_jour(e.carte, e.finition),
    'cloturee_le', public.en_millisecondes(e.cloturee_le)
  )
$$;

create or replace function public.racheteur_pour(e public.encheres) returns uuid
language sql volatile set search_path = ''
as $$
  select p.id from public.profils p
  where true and p.maison and e.vendeur is not null and not e.simulee
    and e.mise_de_depart <= 2 * (select case k.rarete when 'Commune' then 5 when 'Peu commune' then 10 when 'Rare' then 30 when 'Épique' then 100 when 'Légendaire' then 300 when 'Hors-série' then 1000 else 1 end from public.cartes k where k.id = e.carte)
    and (select count(*) from public.encheres o where o.etat = 'ouverte' and not o.simulee) < 30
    and (select count(*) from public.encheres r where r.vendeur = e.vendeur and r.acheteur_maison is not null
         and r.cloturee_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris') < 1
  order by random() limit 1
$$;

create or replace function public.cloturer_une_enchere(p_id bigint) returns void
language plpgsql set search_path = ''
as $$
declare
  e public.encheres%rowtype;
  vendeur_recoit integer;
  racheteur uuid;
begin
  perform pg_advisory_xact_lock(20260923);
  select * into e from public.encheres where id = p_id and etat = 'ouverte' and ferme_le <= now() for update;
  if not found then return; end if;
    if e.meilleure_mise is null or e.meilleur_encherisseur is null then
      -- Sans mise : une vente simulée s'efface ; une vraie peut être rachetée par un joueur simulé (racheteur_pour),
      -- sinon le timbre revient à son vendeur.
      if e.simulee then
        update public.encheres set etat = 'invendue', cloturee_le = now() where id = e.id;
        return;
      end if;
      racheteur := public.racheteur_pour(e);
      if racheteur is not null then
        -- Le timbre racheté quitte le jeu ; le vendeur reçoit la mise de départ moins la commission.
        vendeur_recoit := e.mise_de_depart - ceil(e.mise_de_depart * 0.1)::integer;
        update public.comptes set encre = encre + vendeur_recoit, maj_le = now() where utilisateur = e.vendeur;
        update public.encheres set etat = 'vendue', cloturee_le = now(), prix_final = e.mise_de_depart, acheteur_maison = racheteur where id = e.id;
      else
        perform public.rendre_un_timbre(e.vendeur, e.carte, e.finition, e.obtenue_le, null);
        update public.encheres set etat = 'invendue', cloturee_le = now() where id = e.id;
      end if;
    else
      -- L'Encre de la mise est déjà bloquée : le vendeur en reçoit 90 %, le reste disparaît.
      -- (Une vente simulée n'a pas de vendeur : toute l'Encre disparaît, le timbre est neuf.)
      vendeur_recoit := e.meilleure_mise - ceil(e.meilleure_mise * 0.1)::integer;
      perform public.rendre_un_timbre(e.meilleur_encherisseur, e.carte, e.finition, now(),
        case when e.simulee then public.pseudonyme_maison(e.vendeur_maison) else public.pseudonyme_de(e.vendeur) end);
      if not e.simulee then update public.comptes set encre = encre + vendeur_recoit, maj_le = now() where utilisateur = e.vendeur; end if;
      update public.encheres set etat = 'vendue', cloturee_le = now(), prix_final = e.meilleure_mise, acheteur = e.meilleur_encherisseur where id = e.id;
    end if;
end $$;

create or replace function public.animer_le_marche() returns void
language plpgsql set search_path = ''
as $$
declare
  manque integer;
  tirage double precision;
  rarete_voulue text;
  carte_voulue text;
  finition_voulue text;
  plancher integer;
begin
  if not true then return; end if;
  if (select count(*) from public.encheres where etat = 'ouverte' and simulee) >= 12
    or (select count(*) from public.encheres where etat = 'ouverte' and not simulee) >= 30
    or not exists (select 1 from public.profils where maison) then return; end if;
  perform pg_advisory_xact_lock(20260923); -- deux joueurs à la même seconde : une seule fournée
  manque := 12 - (select count(*) from public.encheres where etat = 'ouverte' and simulee);
  for i in 1 .. greatest(manque, 0) loop
    tirage := random() * 100;
    rarete_voulue := case when tirage < 45 then 'Commune' when tirage < 75 then 'Peu commune' when tirage < 92 then 'Rare' when tirage < 100 then 'Épique' else 'Épique' end;
    select k.id into carte_voulue from public.cartes k where k.rarete = rarete_voulue order by random() limit 1;
    continue when carte_voulue is null;
    tirage := random() * 100;
    finition_voulue := case when tirage < 90 then 'Normale' when tirage < 99 then 'Brillante' when tirage < 100 then 'Holographique' else 'Holographique' end;
    plancher := case rarete_voulue when 'Commune' then 5 when 'Peu commune' then 10 when 'Rare' then 30 when 'Épique' then 100 when 'Légendaire' then 300 when 'Hors-série' then 1000 else 1 end;
    insert into public.encheres (vendeur, simulee, vendeur_maison, carte, finition, obtenue_le, mise_de_depart, achat_immediat, ferme_le)
    select null, true, p.id, carte_voulue, finition_voulue, now(), ceil(plancher * 1.5)::integer, ceil(plancher * 3)::integer,
      -- (Des durées de vente ordinaires, plus quelques minutes : les fins se répartissent.)
      now() + make_interval(hours => (array[12, 24, 48])[1 + floor(random() * 3)::integer], mins => floor(random() * 240)::integer)
    from public.profils p where p.maison order by random() limit 1;
  end loop;
end $$;

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
  -- Au passage, les joueurs simulés remplacent leurs ventes terminées, et les cotes du jour (une fois par jour).
  perform public.animer_le_marche();
  perform public.calculer_les_cotes();
end $$;

create or replace function public.calculer_les_cotes() returns void
language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.cotes_calculees where jour = current_date) then return; end if;
  perform pg_advisory_xact_lock(20260922); -- deux joueurs à la même seconde : un seul relève
  if exists (select 1 from public.cotes_calculees where jour = current_date) then return; end if;
  insert into public.cotes (carte, finition, jour, cote, ventes)
  select e.carte, e.finition, current_date,
         round(percentile_cont(0.5) within group (order by e.prix_final))::integer, count(*)::integer
  from public.encheres e
  -- (Les ventes des joueurs simulés et leurs rachats ne comptent pas : la cote dit ce que paient les vrais joueurs.)
  where e.etat = 'vendue' and not e.simulee and e.acheteur_maison is null and e.cloturee_le > now() - make_interval(days => 30)
  group by e.carte, e.finition
  on conflict do nothing;
  insert into public.cotes_calculees (jour) values (current_date) on conflict do nothing;
  delete from public.cotes where jour < current_date - 400;
  delete from public.cotes_calculees where jour < current_date - 400;
end $$;

create or replace function public.solder_compte_supprime() returns trigger
language plpgsql security definer set search_path = '' as $$
declare e public.encheres%rowtype; achetee integer;
begin
  perform pg_advisory_xact_lock(20260923);
  for e in select * from public.encheres
    where etat = 'ouverte' and (vendeur = old.utilisateur or meilleur_encherisseur = old.utilisateur)
    order by id for update loop
    if e.vendeur = old.utilisateur then
      if e.meilleur_encherisseur is not null and e.meilleur_encherisseur <> old.utilisateur then
        select part_achetee into achetee from public.mises
          where enchere = e.id and encherisseur = e.meilleur_encherisseur order by id desc limit 1;
        update public.comptes set encre_achetee = encre_achetee + coalesce(achetee, 0),
          encre = encre + e.meilleure_mise - coalesce(achetee, 0) where utilisateur = e.meilleur_encherisseur;
      end if;
    elsif not e.simulee then -- (une vente simulée n'a pas de vendeur à qui rendre le timbre)
      perform public.rendre_un_timbre(e.vendeur, e.carte, e.finition, e.obtenue_le, null);
    end if;
    update public.encheres set etat = 'invendue', cloturee_le = now(),
      meilleure_mise = null, meilleur_encherisseur = null where id = e.id;
  end loop;
  return old;
end $$;

create or replace function public.marche(p_recherche text, p_page integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  cherche text := lower(coalesce(p_recherche, ''));
  page integer := greatest(0, coalesce(p_page, 0));
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform public.cloturer_les_encheres();
  return jsonb_build_object(
    'encheres', (select coalesce(jsonb_agg(public.enchere_en_json(e) order by e.ferme_le), '[]'::jsonb) from (
      select * from public.encheres e where e.etat = 'ouverte' and (cherche = '' or e.carte like cherche || '%') order by e.ferme_le limit 30 offset page * 30
    ) e),
    'total', (select count(*) from public.encheres e where e.etat = 'ouverte' and (cherche = '' or e.carte like cherche || '%')),
    'animation', true, -- des joueurs simulés animent le marché : le jeu le dit (« Comment ça marche ? »)
    'maintenant', public.en_millisecondes(now())
  );
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
    -- Un compte neuf regarde sans miser ni vendre : le jour où le marché s'ouvre pour lui (null une fois ouvert).
    'ouvertLe', (select public.en_millisecondes(c.cree_le + interval '3 days') from public.comptes c
                 where c.utilisateur = moi and c.cree_le + interval '3 days' > now()),
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
               from (select * from public.encheres v where v.carte = p_carte and v.etat = 'vendue' and not v.simulee and v.acheteur_maison is null order by v.cloturee_le desc limit 30) e),
    'stats', (select coalesce(jsonb_agg(s.stat order by s.finition), '[]'::jsonb)
              from (select e.finition, jsonb_build_object('finition', e.finition, 'mini', min(e.prix_final), 'maxi', max(e.prix_final), 'nombre', count(*)) as stat
                    from public.encheres e where e.carte = p_carte and e.etat = 'vendue' and not e.simulee and e.acheteur_maison is null and e.cloturee_le > now() - make_interval(days => 90)
                    group by e.finition) s),
    'maintenant', public.en_millisecondes(now())
  );
end $$;

revoke execute on function public.pseudonyme_maison(uuid), public.racheteur_pour(public.encheres), public.animer_le_marche() from public, anon, authenticated;

commit;
