-- Migration des cosmétiques : générée par npm run serveur:script.
-- Relançable ; conserve les collections, les soldes et les achats existants.
begin;
alter table public.comptes add column if not exists personnalisations text[] not null default '{}';

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
    nombre := floor(extract(epoch from (limite - c.prochain_hebdo)) / (7 * 86400))::integer + 1;
    c.reserve_hebdo := c.reserve_hebdo + nombre;
    c.prochain_hebdo := c.prochain_hebdo + nombre * interval '7 days';
  end if;
  return c;
end $$;

create or replace function public.etat_du_compte(p_utilisateur uuid) returns jsonb
language sql security definer set search_path = ''
as $$
  select jsonb_build_object(
    'encre', c.encre,
    'achatsPersonnalisation', to_jsonb(c.personnalisations),
    'paquets', jsonb_build_object('stock', c.stock, 'reference', public.en_millisecondes(c.reference), 'ouverts', c.ouverts, 'sansLegendaire', c.sans_legendaire),
    'deck', c.deck,
    'codeDeSecoursLe', public.en_millisecondes(c.code_defini_le),
    'formule', jsonb_build_object(
      'niveau', public.niveau(c),
      'achatUnique', c.achat_unique,
      'abonnement', c.abonnement,
      'jusquAu', public.en_millisecondes(c.abonnement_jusqu_au),
      'encreAchetee', c.encre_achetee,
      'anneeDeNaissance', c.annee_de_naissance,
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
create or replace function public.acheter_personnalisation(p_id text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  raise exception 'L’Encre est réservée aux enchères.';
end $$;
revoke execute on function public.actualiser_offres(public.comptes) from public, anon, authenticated;
revoke execute on function public.acheter_personnalisation(text) from public, anon;
grant execute on function public.acheter_personnalisation(text) to authenticated;
commit;
