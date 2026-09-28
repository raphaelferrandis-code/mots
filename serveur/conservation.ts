// La conservation des comptes sans visite (décision de Raphaël du 28/09/2026 ; pages Confidentialité et Conditions
// d'utilisation) : un compte invité est supprimé après SITE.conservation.inviteMois mois sans visite, un compte relié à
// Google ou à une adresse e-mail après SITE.conservation.relieAns ans. Le jeu note le dernier passage à chaque ouverture
// (mon_compte, serveur/collections.ts) ; chaque nuit, pg_cron lance la purge, qui efface comme « Supprimer mon compte » :
// le marché rembourse d'abord les tiers (solder_compte_supprime), puis tout part en cascade avec l'utilisateur.
// Un compte qui a payé (achat unique ou abonnement) n'est jamais supprimé d'office : les conditions de vente le diront.

import { SITE } from '../src/config/site.ts';
import { VERROU_DU_DIRECT, VERROU_DU_MARCHE } from './verrous.ts';

const { inviteMois, relieAns } = SITE.conservation;
export const TACHE_DE_PURGE = 'philamots-comptes-inactifs';
export const HEURE_DE_PURGE = '23 3 * * *'; // chaque nuit à 3 h 23 (heure universelle)
export const COMPTES_PAR_PURGE = 500; // au plus par nuit : la purge tient les verrous du marché et du direct

// Le dernier passage d'un compte. Un compte déjà là compte à partir de l'installation de ce script : personne n'est
// supprimé plus tôt que promis.
export const DERNIER_PASSAGE_SQL = 'alter table public.comptes add column if not exists dernier_passage timestamptz not null default now();';

// Dans mon_compte : au plus une écriture par heure et par joueur.
export const NOTER_LE_PASSAGE_SQL = "update public.comptes set dernier_passage = now() where utilisateur = auth.uid() and dernier_passage < now() - interval '1 hour';";

export function conservation(): string {
  return String.raw`
-- ═════════════════════════════════════════════════════════════════════════════
-- LA CONSERVATION DES COMPTES SANS VISITE (serveur/conservation.ts)
-- Un compte invité sans visite depuis ${inviteMois} mois est supprimé ; un compte relié à Google ou à une adresse e-mail,
-- après ${relieAns} ans. Un compte sans collection (jamais ouvert) compte depuis sa création. Jamais un compte qui a payé.
-- Le dernier passage est la colonne comptes.dernier_passage, que mon_compte tient à jour.
-- ═════════════════════════════════════════════════════════════════════════════

-- Rend le nombre de comptes supprimés. Un compte qu'un contrôle refuse de supprimer est gardé (et signalé dans les
-- journaux de la base) sans arrêter les autres.
create or replace function public.purger_les_comptes_inactifs() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  u uuid;
  supprimes integer := 0;
begin
  -- Les verrous dans l'ordre, comme supprimer_mon_compte (serveur/verrous.ts).
  perform pg_advisory_xact_lock(${VERROU_DU_MARCHE});
  perform pg_advisory_xact_lock(${VERROU_DU_DIRECT});
  for u in
    select a.id from auth.users a left join public.comptes c on c.utilisateur = a.id
    where coalesce(c.dernier_passage, a.last_sign_in_at, a.created_at)
            < now() - case when a.is_anonymous then interval '${inviteMois} months' else interval '${relieAns} years' end
      and not coalesce(c.achat_unique or c.abonnement <> 'aucun', false)
    order by coalesce(c.dernier_passage, a.last_sign_in_at, a.created_at)
    limit ${COMPTES_PAR_PURGE}
  loop
    begin
      delete from auth.users where id = u;
      supprimes := supprimes + 1;
    exception when others then
      raise warning 'Compte % gardé : %', u, sqlerrm;
    end;
  end loop;
  return supprimes;
end $$;
revoke execute on function public.purger_les_comptes_inactifs() from public, anon, authenticated;

-- Chaque nuit, avec pg_cron (présent chez Supabase ; absent de la base des tests, où rien n'est planifié). Recoller ce
-- script ne crée pas de seconde tâche : la tâche porte un nom, et pg_cron la remplace.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron absent : la purge des comptes inactifs n''est pas planifiée.';
    return;
  end if;
  create extension if not exists pg_cron;
  perform cron.schedule('${TACHE_DE_PURGE}', '${HEURE_DE_PURGE}', 'select public.purger_les_comptes_inactifs()');
exception when others then
  raise exception 'La purge des comptes inactifs n''a pas pu être planifiée (%). Dans Supabase : Database, puis Extensions, activer « pg_cron », puis recoller ce script.', sqlerrm;
end $$;
`;
}
