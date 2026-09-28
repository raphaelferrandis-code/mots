-- Les comptes sans visite : un invité supprimé après 12 mois, un compte relié après 3 ans (chaque nuit, avec pg_cron). Après 26-marche-anime.sql.
-- Aucune fonction serveur (Edge) à redéployer : le jeu peut être publié avant ou après ce script.
-- Si Supabase répond que pg_cron manque : Database, puis Extensions, activer « pg_cron », puis recoller ce script.
begin;
alter table public.comptes add column if not exists dernier_passage timestamptz not null default now();

create or replace function public.mon_compte() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  update public.comptes set dernier_passage = now() where utilisateur = auth.uid() and dernier_passage < now() - interval '1 hour';
  perform public.cloturer_les_encheres();
  perform public.verser_la_rente(auth.uid());
  return public.etat_du_compte(auth.uid());
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- LA CONSERVATION DES COMPTES SANS VISITE (serveur/conservation.ts)
-- Un compte invité sans visite depuis 12 mois est supprimé ; un compte relié à Google ou à une adresse e-mail,
-- après 3 ans. Un compte sans collection (jamais ouvert) compte depuis sa création. Jamais un compte qui a payé.
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
  perform pg_advisory_xact_lock(20260923);
  perform pg_advisory_xact_lock(20260924);
  for u in
    select a.id from auth.users a left join public.comptes c on c.utilisateur = a.id
    where coalesce(c.dernier_passage, a.last_sign_in_at, a.created_at)
            < now() - case when a.is_anonymous then interval '12 months' else interval '3 years' end
      and not coalesce(c.achat_unique or c.abonnement <> 'aucun', false)
    order by coalesce(c.dernier_passage, a.last_sign_in_at, a.created_at)
    limit 500
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
  perform cron.schedule('philamots-comptes-inactifs', '23 3 * * *', 'select public.purger_les_comptes_inactifs()');
exception when others then
  raise exception 'La purge des comptes inactifs n''a pas pu être planifiée (%). Dans Supabase : Database, puis Extensions, activer « pg_cron », puis recoller ce script.', sqlerrm;
end $$;

commit;
