import { EQUILIBRAGE } from '../src/config/equilibrage.ts';
const P = EQUILIBRAGE.payant;

export function preparerOffres(): string { return `
alter table public.comptes
  add column if not exists cadeau_achat_reclame boolean not null default false,
  add column if not exists reserve_hebdo integer not null default 0,
  add column if not exists prochain_hebdo timestamptz;

-- Calcule aussi les droits gagnés hors connexion, sans créditer après l'expiration.
create or replace function public.actualiser_offres(c public.comptes) returns public.comptes
language plpgsql set search_path = '' as $$
declare limite timestamptz; nombre integer;
begin
  if c.abonnement = 'aucun' or c.abonnement_jusqu_au is null or c.prochain_hebdo is null then return c; end if;
  limite := least(now(), c.abonnement_jusqu_au - interval '1 microsecond');
  if c.prochain_hebdo <= limite then
    nombre := floor(extract(epoch from (limite - c.prochain_hebdo)) / (${P.joursEntrePaquetsHebdomadaires} * 86400))::integer + 1;
    c.reserve_hebdo := c.reserve_hebdo + nombre;
    c.prochain_hebdo := c.prochain_hebdo + nombre * interval '${P.joursEntrePaquetsHebdomadaires} days';
  end if;
  return c;
end $$;
`; }

export function fonctionsOffres(): string { return `
-- Les droits ne sont activés que par une écriture administrative, jamais par le client.
-- Régler l'ancien rythme avant de modifier les dates évite une recharge rétroactive au tarif abonné.
create or replace function public.changement_offre() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ancien public.comptes;
begin
  if tg_op = 'UPDATE' then
    ancien := public.actualiser_offres(old);
    new.reserve_hebdo := ancien.reserve_hebdo;
    new.prochain_hebdo := ancien.prochain_hebdo;
    ancien := public.recharger(ancien);
    if new.stock = old.stock then new.stock := ancien.stock; end if;
    new.reference := now();
  end if;
  if new.abonnement <> 'aucun' and new.abonnement_jusqu_au > now() then
    if tg_op = 'INSERT' then new.prochain_hebdo := now();
    elsif old.abonnement = 'aucun' or old.abonnement_jusqu_au is null or old.abonnement_jusqu_au <= now() or new.prochain_hebdo is null then
      new.prochain_hebdo := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists changement_offre on public.comptes;
create trigger changement_offre before insert or update of abonnement, abonnement_jusqu_au on public.comptes
for each row execute function public.changement_offre();
-- Les comptes de test existants démarrent leurs droits hebdomadaires à la migration, sans rétroactivité.
update public.comptes set prochain_hebdo = now()
where abonnement <> 'aucun' and abonnement_jusqu_au > now() and prochain_hebdo is null;

create or replace function public.reclamer_recompense(p_type text, p_masques text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.comptes; tirees jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Compte introuvable.'; end if;
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
  return jsonb_build_object('cartes', tirees, 'etat', public.etat_du_compte(c.utilisateur));
end $$;
`; }
