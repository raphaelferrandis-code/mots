import { EQUILIBRAGE } from '../src/config/equilibrage.ts';

export const INTERNES_PROGRESSION = [
  'public.progression_du_compte(uuid)', 'public.savoirs_verifies(uuid, jsonb)',
  'public.gagner_xp(uuid, integer, boolean)', 'public.noter_reponse_verifiee(uuid, jsonb)',
  'public.importer_progression_validee(uuid)',
];

// Installé aussi dans le schéma historique, mais activé seulement par la migration des combats.
export function schemaProgression(): string { return String.raw`
alter table public.comptes
  add column if not exists progression_active boolean not null default false,
  add column if not exists progression_id uuid not null default gen_random_uuid(),
  add column if not exists xp bigint not null default 0,
  add column if not exists bonus_xp_reste integer not null default 0,
  add column if not exists combats_joues integer not null default 0,
  add column if not exists combats_gagnes integer not null default 0,
  add column if not exists parades_verifiees jsonb not null default '{}',
  add column if not exists heritage_progression jsonb not null default '{}',
  add column if not exists heritage_importe boolean not null default false;

create table if not exists public.apprentissages (
  utilisateur uuid not null references public.comptes(utilisateur) on update cascade on delete cascade,
  carte text not null references public.cartes(id),
  posees integer not null default 0 check (posees >= 0),
  reussites integer not null default 0 check (reussites between 0 and posees),
  maitrisee_le timestamptz,
  primary key(utilisateur, carte)
);
create table if not exists public.progressions_validees (
  utilisateur uuid primary key references public.comptes(utilisateur) on update cascade on delete cascade,
  sauvegarde jsonb not null
);
alter table public.apprentissages enable row level security;
alter table public.progressions_validees enable row level security;
revoke all on public.apprentissages, public.progressions_validees from public, anon, authenticated;

create or replace function public.savoirs_verifies(p_utilisateur uuid, p_deck jsonb) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(carte, jsonb_build_object('posees', posees, 'reussies', reussites)), '{}')
  from public.apprentissages where utilisateur=p_utilisateur and p_deck ? carte
$$;

create or replace function public.progression_du_compte(p_utilisateur uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select case when c.progression_active then jsonb_build_object(
    'version', 1, 'id', c.progression_id,
    'xp', c.xp + coalesce((c.heritage_progression->>'xp')::bigint, 0), 'bonusXpReste', c.bonus_xp_reste,
    'duels', jsonb_build_object('joues', c.combats_joues, 'gagnes', c.combats_gagnes),
    'parades', c.parades_verifiees, 'heritageImporte', c.heritage_importe,
    'apprentissages', (
      select coalesce(jsonb_object_agg(k.id, jsonb_build_object(
        'posees', coalesce(a.posees,0) + coalesce((h.v->>'posees')::integer,0),
        'reussites', coalesce(a.reussites,0) + coalesce((h.v->>'reussites')::integer,0),
        'maitriseeLe', coalesce((h.v->>'maitriseeLe')::bigint, (extract(epoch from a.maitrisee_le)*1000)::bigint)
      )), '{}')
      from (select carte id from public.apprentissages where utilisateur=c.utilisateur
            union select jsonb_object_keys(coalesce(c.heritage_progression->'apprentissages','{}'))) k
      left join public.apprentissages a on a.utilisateur=c.utilisateur and a.carte=k.id
      left join lateral (select c.heritage_progression->'apprentissages'->k.id v) h on true
    )
  ) else null end from public.comptes c where c.utilisateur=p_utilisateur
$$;

create or replace function public.gagner_xp(p_utilisateur uuid, p_base integer, p_combat boolean) returns integer
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; gain integer := p_base; centiemes integer;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if not found or not c.progression_active then return 0; end if;
  if p_base is null or p_base < 0 then raise exception 'Gain d’expérience invalide.'; end if;
  centiemes := c.bonus_xp_reste;
  if p_combat and public.niveau(c) >= 2 then
    centiemes := centiemes + p_base * ${EQUILIBRAGE.payant.bonusXpPourcent};
    gain := gain + centiemes / 100;
    centiemes := centiemes % 100;
  end if;
  update public.comptes set xp=xp+gain, bonus_xp_reste=centiemes where utilisateur=p_utilisateur;
  return gain;
end $$;

create or replace function public.noter_reponse_verifiee(p_utilisateur uuid, p_reponse jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; cle text := p_reponse->>'carte'; juste boolean := (p_reponse->>'reussie')::boolean;
  rarete text := p_reponse->>'rarete'; avant jsonb; ancienne integer;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if (p_reponse->>'apprentissage')::boolean then
    ancienne := coalesce((c.heritage_progression->'apprentissages'->cle->>'reussites')::integer,0);
    insert into public.apprentissages(utilisateur, carte, posees, reussites, maitrisee_le)
      values(p_utilisateur, cle, 1, juste::integer, case when juste and ancienne+1 >= ${EQUILIBRAGE.duel.reussitesPourLaMaitrise} then now() end)
    on conflict (utilisateur,carte) do update set posees=public.apprentissages.posees+1,
      reussites=public.apprentissages.reussites+juste::integer,
      maitrisee_le=coalesce(public.apprentissages.maitrisee_le, case when juste and public.apprentissages.reussites+ancienne+1 >= ${EQUILIBRAGE.duel.reussitesPourLaMaitrise} then now() end);
  end if;
  if (p_reponse->>'parade')::boolean then
    avant := coalesce(c.parades_verifiees->rarete,'{"posees":0,"reussies":0}');
    update public.comptes set parades_verifiees=jsonb_set(parades_verifiees,array[rarete],jsonb_build_object(
      'posees',(avant->>'posees')::integer+1,'reussies',(avant->>'reussies')::integer+juste::integer)) where utilisateur=p_utilisateur;
  end if;
  update public.profils p set savoirs=public.savoirs_verifies(p_utilisateur,p.deck),
    parades=(select parades_verifiees from public.comptes where utilisateur=p_utilisateur), maj_le=now() where p.utilisateur=p_utilisateur;
end $$;

-- Seul l'administrateur peut approuver des progrès issus de l'ancien client.
-- Ils sont conservés pour le profil personnel ; le double classé n'utilise que les réponses vérifiées.
create or replace function public.importer_progression_validee(p_utilisateur uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare archive jsonb; c public.comptes%rowtype; a record;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if not found or c.heritage_importe then raise exception 'Progression déjà importée ou compte absent.'; end if;
  select sauvegarde into archive from public.progressions_validees where utilisateur=p_utilisateur for update;
  if not found then raise exception 'La progression doit être approuvée.'; end if;
  if coalesce(archive->>'xp','') !~ '^[0-9]{1,9}$' or jsonb_typeof(archive->'apprentissages') is distinct from 'object' then raise exception 'Archive de progression invalide.'; end if;
  for a in select key,value from jsonb_each(archive->'apprentissages') loop
    if not exists(select 1 from public.cartes where id=a.key)
      or coalesce(a.value->>'posees','') !~ '^[0-9]{1,8}$' or coalesce(a.value->>'reussites','') !~ '^[0-9]{1,8}$'
    then raise exception 'Apprentissage invalide.'; end if;
    if (a.value->>'reussites')::integer > (a.value->>'posees')::integer
      or (a.value->>'maitriseeLe' is not null and (a.value->>'maitriseeLe') !~ '^[0-9]{1,15}$') then raise exception 'Apprentissage invalide.'; end if;
  end loop;
  update public.comptes set heritage_progression=jsonb_build_object('xp',(archive->>'xp')::bigint,'apprentissages',archive->'apprentissages'), heritage_importe=true where utilisateur=p_utilisateur;
  delete from public.progressions_validees where utilisateur=p_utilisateur;
end $$;
`; }
