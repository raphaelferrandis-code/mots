-- Installation après 6-offres.sql (compatible avec 7-integrite.sql).
-- Mode test uniquement, aucun droit attribué ici.
begin;
create table if not exists public.paiements_test (
  id uuid primary key default gen_random_uuid(),
  utilisateur uuid unique references public.comptes(utilisateur) on update cascade on delete set null,
  client_stripe text unique,
  cree_le timestamptz not null default now(),
  verrou uuid,
  verrou_jusqu_au timestamptz,
  sessions jsonb not null default '{}'::jsonb,
  abonnement_ouvert boolean not null default false
);
alter table public.paiements_test enable row level security;
revoke all on public.paiements_test from public, anon, authenticated;

-- Un transfert par code conserve la ligne de facturation grâce à ON UPDATE CASCADE.
-- Empêche d'effacer une collection liée à Stripe (y compris par une récupération
-- qui écraserait le compte de destination). La suppression sera traitée avec Stripe.
create or replace function public.proteger_compte_paiement_test() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.paiements_test where utilisateur = old.utilisateur) then
    raise exception 'Ce compte est lié à un test de paiement. Contacte contact@philamots.fr avant de le supprimer ou de remplacer sa collection.';
  end if;
  return old;
end $$;
drop trigger if exists proteger_compte_paiement_test on public.comptes;
create trigger proteger_compte_paiement_test before delete on public.comptes
for each row execute function public.proteger_compte_paiement_test();

create or replace function public.preparer_paiement_test(p_utilisateur uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_test;
begin
  insert into public.paiements_test(utilisateur) values(p_utilisateur) on conflict(utilisateur) do nothing;
  select * into r from public.paiements_test where utilisateur = p_utilisateur;
  return to_jsonb(r);
end $$;

create or replace function public.verrouiller_paiement_test(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_test;
begin
  update public.paiements_test set verrou = gen_random_uuid(), verrou_jusqu_au = now() + interval '90 seconds'
  where id = p_id and (verrou_jusqu_au is null or verrou_jusqu_au < now()) returning * into r;
  if not found then raise exception 'Paiement en cours de synchronisation. Réessaie dans un instant.'; end if;
  return to_jsonb(r);
end $$;

create or replace function public.enregistrer_paiement_test(p_id uuid, p_verrou uuid, p_client text, p_sessions jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.paiements_test set client_stripe = p_client, sessions = p_sessions
  where id = p_id and verrou = p_verrou and verrou_jusqu_au > now();
  if not found then raise exception 'Synchronisation expirée.'; end if;
end $$;

-- Un seul instantané Stripe à la fois. Un ancien travail ne peut écraser le nouveau.
-- Ne pas réécrire les droits identiques : cela préservera aussi le rythme des paquets.
create or replace function public.appliquer_paiement_test(p_id uuid, p_verrou uuid, p_album boolean, p_fin timestamptz, p_ouvert boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_test;
begin
  select * into r from public.paiements_test where id = p_id and verrou = p_verrou and verrou_jusqu_au > now() for update;
  if not found then raise exception 'Synchronisation expirée.'; end if;
  if r.utilisateur is null then raise exception 'Compte supprimé.'; end if;
  update public.comptes set achat_unique = p_album where utilisateur = r.utilisateur and achat_unique is distinct from p_album;
  update public.comptes set abonnement = case when p_fin is null then 'aucun' else 'collectionneur' end,
    abonnement_jusqu_au = p_fin
  where utilisateur = r.utilisateur and (abonnement is distinct from case when p_fin is null then 'aucun' else 'collectionneur' end
    or abonnement_jusqu_au is distinct from p_fin);
  update public.paiements_test set abonnement_ouvert = p_ouvert where id = p_id;
end $$;

create or replace function public.liberer_paiement_test(p_id uuid, p_verrou uuid) returns void
language sql security definer set search_path = '' as $$
  update public.paiements_test set verrou = null, verrou_jusqu_au = null where id = p_id and verrou = p_verrou;
$$;

revoke all on function public.proteger_compte_paiement_test() from public, anon, authenticated;
revoke all on function public.preparer_paiement_test(uuid) from public, anon, authenticated;
revoke all on function public.verrouiller_paiement_test(uuid) from public, anon, authenticated;
revoke all on function public.enregistrer_paiement_test(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.appliquer_paiement_test(uuid, uuid, boolean, timestamptz, boolean) from public, anon, authenticated;
revoke all on function public.liberer_paiement_test(uuid, uuid) from public, anon, authenticated;
grant select on public.paiements_test, public.comptes to service_role;
grant execute on function public.preparer_paiement_test(uuid), public.verrouiller_paiement_test(uuid),
  public.enregistrer_paiement_test(uuid, uuid, text, jsonb), public.appliquer_paiement_test(uuid, uuid, boolean, timestamptz, boolean),
  public.liberer_paiement_test(uuid, uuid) to service_role;
commit;
