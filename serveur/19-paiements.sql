-- Les paiements : suppression par le joueur, mois et année de naissance, vérifications Stripe. Après 18-classement.sql.
-- Puis redéployer les quatre fonctions de paiement (elles lisent les nouvelles colonnes).
begin;
alter table public.comptes add column if not exists mois_de_naissance smallint;

create or replace function public.etat_du_compte(p_utilisateur uuid) returns jsonb
language sql security definer set search_path = ''
as $$
  select jsonb_build_object(
    'encre', c.encre,
    'achatsPersonnalisation', to_jsonb(c.personnalisations),
    'paquets', jsonb_build_object('stock', c.stock, 'reference', public.en_millisecondes(c.reference), 'ouverts', c.ouverts, 'sansLegendaire', c.sans_legendaire),
    'deck', c.deck,
    'progression', public.progression_du_compte(p_utilisateur),
    'plafondDuJour', jsonb_build_object('jour', coalesce(c.jour::text, ''), 'victoires', c.victoires_du_jour),
    'classementPersonnel', (select jsonb_build_object('pseudo', p.pseudo, 'cote', p.cote, 'jouees', p.jouees, 'gagnees', p.gagnees) from public.profils p where p.utilisateur = c.utilisateur),
    'codeDeSecoursLe', public.en_millisecondes(c.code_defini_le),
    'formule', jsonb_build_object(
      'niveau', public.niveau(c),
      'achatUnique', c.achat_unique,
      'abonnement', c.abonnement,
      'jusquAu', public.en_millisecondes(c.abonnement_jusqu_au),
      'encreAchetee', c.encre_achetee,
      'anneeDeNaissance', c.annee_de_naissance,
      'moisDeNaissance', c.mois_de_naissance,
      'cadeauAchatReclame', c.cadeau_achat_reclame,
      'paquetsHebdomadaires', (public.actualiser_offres(c)).reserve_hebdo,
      'prochainPaquetHebdomadaire', public.en_millisecondes((public.actualiser_offres(c)).prochain_hebdo)
    ),
    'maintenant', public.en_millisecondes(now()),
    'cartes', (select coalesce(jsonb_object_agg(p.carte, jsonb_build_object('obtenueLe', public.en_millisecondes(p.obtenue_le), 'doublons', p.doublons, 'finitions', p.finitions)), '{}'::jsonb)
               from public.possessions p where p.utilisateur = c.utilisateur)
  )
  from public.comptes c where c.utilisateur = p_utilisateur
$$;

create or replace function public.declarer_ma_naissance(p_annee integer, p_mois integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if p_annee is null or p_mois is null or p_mois < 1 or p_mois > 12 or p_annee < extract(year from now())::integer - 120
     or make_date(p_annee, p_mois, 1) > (now() at time zone 'Europe/Paris')::date then
    raise exception 'Cette date de naissance n''est pas possible.';
  end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  if c.mois_de_naissance is not null or (c.annee_de_naissance is not null and c.annee_de_naissance <> p_annee) then
    raise exception 'Ta date de naissance est déjà déclarée. Pour la corriger, écris à contact@philamots.fr.';
  end if;
  update public.comptes set annee_de_naissance = p_annee, mois_de_naissance = p_mois, maj_le = now() where utilisateur = auth.uid();
  return public.etat_du_compte(auth.uid());
end $$;

create or replace function public.declarer_mon_age(p_annee integer) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'Recharge la page : le jeu demande maintenant ton mois et ton année de naissance.';
end $$;

create or replace function public.supprimer_mon_compte() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923);
  perform pg_advisory_xact_lock(20260924); -- l'effacement retire aussi le profil : dans l'ordre (serveur/verrous.ts)
  -- Un effacement voulu par le joueur, et non le remplacement d'une collection : ses achats ne l'empêchent pas, sauf un
  -- abonnement qui se renouvelle encore (serveur/paiements.ts).
  perform set_config('philamots.effacement_voulu', 'oui', true);
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.declarer_ma_naissance(integer, integer) from public, anon;
grant execute on function public.declarer_ma_naissance(integer, integer) to authenticated;

-- ── Les paiements (test) ─────────────────────────────────────────────────────
alter table public.paiements_test add column if not exists abonnement_renouvele boolean not null default false;
alter table public.paiements_test add column if not exists synchronise_le timestamptz;

create or replace function public.proteger_compte_paiement_test() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.paiements_test%rowtype;
begin
  select * into p from public.paiements_test where utilisateur = old.utilisateur;
  if not found or p.client_stripe is null then return old; end if; -- un clic sur « acheter », sans suite : rien à protéger
  if p.abonnement_renouvele then
    raise exception 'Ton abonnement Collectionneur se renouvelle encore : résilie-le d''abord (« Gérer mon abonnement », sur la page des formules), puis supprime ton compte. Si tu viens de le résilier, réessaie dans une minute.';
  end if;
  if coalesce(current_setting('philamots.effacement_voulu', true), '') <> 'oui'
     and (old.achat_unique or (old.abonnement <> 'aucun' and old.abonnement_jusqu_au > now())) then
    raise exception 'Ce compte a des achats : sa collection ne peut pas être remplacée par une autre. Écris à contact@philamots.fr.';
  end if;
  return old;
end $$;

drop function if exists public.appliquer_paiement_test(uuid, uuid, boolean, timestamptz, boolean);
create or replace function public.appliquer_paiement_test(p_id uuid, p_verrou uuid, p_album boolean, p_fin timestamptz, p_ouvert boolean, p_renouvele boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_test;
begin
  select * into r from public.paiements_test where id = p_id and verrou = p_verrou and verrou_jusqu_au > now() for update;
  if not found then raise exception 'Synchronisation expirée.'; end if;
  update public.paiements_test set abonnement_ouvert = p_ouvert, abonnement_renouvele = p_renouvele, synchronise_le = now() where id = p_id;
  -- Compte supprimé : Stripe peut encore annoncer un remboursement ou un litige ; rien à appliquer, sans erreur.
  if r.utilisateur is null then return; end if;
  update public.comptes set achat_unique = p_album where utilisateur = r.utilisateur and achat_unique is distinct from p_album;
  update public.comptes set abonnement = case when p_fin is null then 'aucun' else 'collectionneur' end,
    abonnement_jusqu_au = p_fin
  where utilisateur = r.utilisateur and (abonnement is distinct from case when p_fin is null then 'aucun' else 'collectionneur' end
    or abonnement_jusqu_au is distinct from p_fin);
end $$;
revoke all on function public.appliquer_paiement_test(uuid, uuid, boolean, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.appliquer_paiement_test(uuid, uuid, boolean, timestamptz, boolean, boolean) to service_role;

-- ── Les paiements (production) ─────────────────────────────────────────────────────
alter table public.paiements_production add column if not exists abonnement_renouvele boolean not null default false;
alter table public.paiements_production add column if not exists synchronise_le timestamptz;

create or replace function public.proteger_compte_paiement_production() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.paiements_production%rowtype;
begin
  select * into p from public.paiements_production where utilisateur = old.utilisateur;
  if not found or p.client_stripe is null then return old; end if; -- un clic sur « acheter », sans suite : rien à protéger
  if p.abonnement_renouvele then
    raise exception 'Ton abonnement Collectionneur se renouvelle encore : résilie-le d''abord (« Gérer mon abonnement », sur la page des formules), puis supprime ton compte. Si tu viens de le résilier, réessaie dans une minute.';
  end if;
  if coalesce(current_setting('philamots.effacement_voulu', true), '') <> 'oui'
     and (old.achat_unique or (old.abonnement <> 'aucun' and old.abonnement_jusqu_au > now())) then
    raise exception 'Ce compte a des achats : sa collection ne peut pas être remplacée par une autre. Écris à contact@philamots.fr.';
  end if;
  return old;
end $$;

drop function if exists public.appliquer_paiement_production(uuid, uuid, boolean, timestamptz, boolean);
create or replace function public.appliquer_paiement_production(p_id uuid, p_verrou uuid, p_album boolean, p_fin timestamptz, p_ouvert boolean, p_renouvele boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_production;
begin
  select * into r from public.paiements_production where id = p_id and verrou = p_verrou and verrou_jusqu_au > now() for update;
  if not found then raise exception 'Synchronisation expirée.'; end if;
  update public.paiements_production set abonnement_ouvert = p_ouvert, abonnement_renouvele = p_renouvele, synchronise_le = now() where id = p_id;
  -- Compte supprimé : Stripe peut encore annoncer un remboursement ou un litige ; rien à appliquer, sans erreur.
  if r.utilisateur is null then return; end if;
  update public.comptes set achat_unique = p_album where utilisateur = r.utilisateur and achat_unique is distinct from p_album;
  update public.comptes set abonnement = case when p_fin is null then 'aucun' else 'collectionneur' end,
    abonnement_jusqu_au = p_fin
  where utilisateur = r.utilisateur and (abonnement is distinct from case when p_fin is null then 'aucun' else 'collectionneur' end
    or abonnement_jusqu_au is distinct from p_fin);
end $$;
revoke all on function public.appliquer_paiement_production(uuid, uuid, boolean, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.appliquer_paiement_production(uuid, uuid, boolean, timestamptz, boolean, boolean) to service_role;

commit;
