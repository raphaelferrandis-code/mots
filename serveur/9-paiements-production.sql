-- Installation après 8-paiements-test.sql. Aucun paiement activé par cette migration.
begin;
create table if not exists public.paiements_production (
  id uuid primary key default gen_random_uuid(),
  utilisateur uuid unique references public.comptes(utilisateur) on update cascade on delete set null,
  client_stripe text unique,
  cree_le timestamptz not null default now(),
  verrou uuid,
  verrou_jusqu_au timestamptz,
  sessions jsonb not null default '{}'::jsonb,
  abonnement_ouvert boolean not null default false
);
alter table public.paiements_production enable row level security;
revoke all on public.paiements_production from public, anon, authenticated;

-- Un transfert par code conserve la ligne de facturation grâce à ON UPDATE CASCADE.
-- Empêche d'effacer une collection liée à Stripe (y compris par une récupération
-- qui écraserait le compte de destination). La suppression sera traitée avec Stripe.
create or replace function public.proteger_compte_paiement_production() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.paiements_production where utilisateur = old.utilisateur) then
    raise exception 'Ce compte est lié à un paiement. Contacte contact@philamots.fr avant de le supprimer ou de remplacer sa collection.';
  end if;
  return old;
end $$;
drop trigger if exists proteger_compte_paiement_production on public.comptes;
create trigger proteger_compte_paiement_production before delete on public.comptes
for each row execute function public.proteger_compte_paiement_production();

create or replace function public.preparer_paiement_production(p_utilisateur uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_production;
begin
  insert into public.paiements_production(utilisateur) values(p_utilisateur) on conflict(utilisateur) do nothing;
  select * into r from public.paiements_production where utilisateur = p_utilisateur;
  return to_jsonb(r);
end $$;

create or replace function public.verrouiller_paiement_production(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_production;
begin
  update public.paiements_production set verrou = gen_random_uuid(), verrou_jusqu_au = now() + interval '90 seconds'
  where id = p_id and (verrou_jusqu_au is null or verrou_jusqu_au < now()) returning * into r;
  if not found then raise exception 'Paiement en cours de synchronisation. Réessaie dans un instant.'; end if;
  return to_jsonb(r);
end $$;

create or replace function public.enregistrer_paiement_production(p_id uuid, p_verrou uuid, p_client text, p_sessions jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.paiements_production set client_stripe = p_client, sessions = p_sessions
  where id = p_id and verrou = p_verrou and verrou_jusqu_au > now();
  if not found then raise exception 'Synchronisation expirée.'; end if;
end $$;

-- Un seul instantané Stripe à la fois. Un ancien travail ne peut écraser le nouveau.
-- Ne pas réécrire les droits identiques : cela préservera aussi le rythme des paquets.
create or replace function public.appliquer_paiement_production(p_id uuid, p_verrou uuid, p_album boolean, p_fin timestamptz, p_ouvert boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_production;
begin
  select * into r from public.paiements_production where id = p_id and verrou = p_verrou and verrou_jusqu_au > now() for update;
  if not found then raise exception 'Synchronisation expirée.'; end if;
  if r.utilisateur is null then raise exception 'Compte supprimé.'; end if;
  update public.comptes set achat_unique = p_album where utilisateur = r.utilisateur and achat_unique is distinct from p_album;
  update public.comptes set abonnement = case when p_fin is null then 'aucun' else 'collectionneur' end,
    abonnement_jusqu_au = p_fin
  where utilisateur = r.utilisateur and (abonnement is distinct from case when p_fin is null then 'aucun' else 'collectionneur' end
    or abonnement_jusqu_au is distinct from p_fin);
  update public.paiements_production set abonnement_ouvert = p_ouvert where id = p_id;
end $$;

create or replace function public.liberer_paiement_production(p_id uuid, p_verrou uuid) returns void
language sql security definer set search_path = '' as $$
  update public.paiements_production set verrou = null, verrou_jusqu_au = null where id = p_id and verrou = p_verrou;
$$;

revoke all on function public.proteger_compte_paiement_production() from public, anon, authenticated;
revoke all on function public.preparer_paiement_production(uuid) from public, anon, authenticated;
revoke all on function public.verrouiller_paiement_production(uuid) from public, anon, authenticated;
revoke all on function public.enregistrer_paiement_production(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.appliquer_paiement_production(uuid, uuid, boolean, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.liberer_paiement_production(uuid, uuid) from public, anon, authenticated;
grant select on public.paiements_production, public.comptes to service_role;
grant execute on function public.preparer_paiement_production(uuid), public.verrouiller_paiement_production(uuid),
  public.enregistrer_paiement_production(uuid, uuid, text, jsonb), public.appliquer_paiement_production(uuid, uuid, boolean, timestamptz, boolean),
  public.liberer_paiement_production(uuid, uuid) to service_role;
-- Un compte de test reste un compte de test : ne jamais mélanger ses droits
-- avec des achats réels. Le verrou de compte sérialise les inscriptions concurrentes.
create or replace function public.separer_environnements_paiement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.utilisateur is null then return new; end if;
  perform 1 from public.comptes where utilisateur = new.utilisateur for update;
  if (tg_table_name = 'paiements_production' and exists (
    select 1 from public.paiements_test where utilisateur = new.utilisateur
  )) or (tg_table_name = 'paiements_test' and exists (
    select 1 from public.paiements_production where utilisateur = new.utilisateur
  )) then
    raise exception 'Ce compte est déjà lié à un autre environnement de paiement. Utilise un compte distinct.';
  end if;
  return new;
end $$;
revoke all on function public.separer_environnements_paiement() from public, anon, authenticated;
drop trigger if exists separer_environnements_paiement on public.paiements_test;
create trigger separer_environnements_paiement before insert or update of utilisateur on public.paiements_test
for each row execute function public.separer_environnements_paiement();
drop trigger if exists separer_environnements_paiement on public.paiements_production;
create trigger separer_environnements_paiement before insert or update of utilisateur on public.paiements_production
for each row execute function public.separer_environnements_paiement();
commit;
