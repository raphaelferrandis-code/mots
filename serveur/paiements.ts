// Les règles des paiements décidées le 25/09/2026, pour les deux environnements (test et production). Leurs tables ont
// été installées par 8-paiements-test.sql et 9-paiements-production.sql (écrits à la main, historiques) ; les fonctions
// Stripe sont dans supabase/functions/_shared/paiements.ts.
// - Un clic sur « acheter » sans paiement ne retient plus rien : seul un vrai client Stripe compte.
// - Un joueur qui a payé supprime lui-même son compte (supprimer_mon_compte), sauf si son abonnement se renouvelle
//   encore : il le résilie d'abord (« Gérer mon abonnement »). Une collection avec des achats ne se fait pas remplacer
//   par une autre lors d'une récupération par code (ses achats seraient perdus).
// - Un compte supprimé n'empêche plus Stripe de conclure un événement (remboursement, litige) : rien à appliquer, et
//   l'événement n'est pas renvoyé en boucle.
// - La dernière vérification auprès de Stripe est datée (synchronise_le) : le jeu ne la refait pas aussitôt.

const ENVIRONNEMENTS = ['test', 'production'] as const;

export function paiementsSuppressionEtVerification(): string {
  return ENVIRONNEMENTS.map((s) => String.raw`
-- ── Les paiements (${s}) ─────────────────────────────────────────────────────
alter table public.paiements_${s} add column if not exists abonnement_renouvele boolean not null default false;
alter table public.paiements_${s} add column if not exists synchronise_le timestamptz;

create or replace function public.proteger_compte_paiement_${s}() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.paiements_${s}%rowtype;
begin
  select * into p from public.paiements_${s} where utilisateur = old.utilisateur;
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

drop function if exists public.appliquer_paiement_${s}(uuid, uuid, boolean, timestamptz, boolean);
create or replace function public.appliquer_paiement_${s}(p_id uuid, p_verrou uuid, p_album boolean, p_fin timestamptz, p_ouvert boolean, p_renouvele boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.paiements_${s};
begin
  select * into r from public.paiements_${s} where id = p_id and verrou = p_verrou and verrou_jusqu_au > now() for update;
  if not found then raise exception 'Synchronisation expirée.'; end if;
  update public.paiements_${s} set abonnement_ouvert = p_ouvert, abonnement_renouvele = p_renouvele, synchronise_le = now() where id = p_id;
  -- Compte supprimé : Stripe peut encore annoncer un remboursement ou un litige ; rien à appliquer, sans erreur.
  if r.utilisateur is null then return; end if;
  update public.comptes set achat_unique = p_album where utilisateur = r.utilisateur and achat_unique is distinct from p_album;
  update public.comptes set abonnement = case when p_fin is null then 'aucun' else 'collectionneur' end,
    abonnement_jusqu_au = p_fin
  where utilisateur = r.utilisateur and (abonnement is distinct from case when p_fin is null then 'aucun' else 'collectionneur' end
    or abonnement_jusqu_au is distinct from p_fin);
end $$;
revoke all on function public.appliquer_paiement_${s}(uuid, uuid, boolean, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.appliquer_paiement_${s}(uuid, uuid, boolean, timestamptz, boolean, boolean) to service_role;
`).join('');
}
