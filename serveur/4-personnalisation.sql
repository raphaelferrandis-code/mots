-- Migration des cosmétiques : générée par npm run serveur:script.
-- Relançable ; conserve les collections, les soldes et les achats existants.
begin;
alter table public.comptes add column if not exists personnalisations text[] not null default '{}';
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
      'anneeDeNaissance', c.annee_de_naissance
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
declare c public.comptes%rowtype; prix integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  prix := case p_id when 'boussole' then 120 when 'lune' then 280 when 'renard' then 160 when 'papillon' then 240 when 'dragon' then 480 when 'postal' then 160 when 'laurier' then 400 when 'ronces' then 120 when 'vitrail' then 200 when 'maree' then 320 when 'eclipse' then 480 when 'entrelacs' then 120 when 'constellation' then 320 when 'herbier-dos' then 160 when 'vitrail-dos' then 240 when 'maree-dos' then 400 when 'jade' then 80 when 'amethyste' then 240 when 'glacier' then 120 when 'rose' then 160 when 'or' then 320 when 'perle' then 200 when 'corail' then 280 else null end;
  if prix is null then raise exception 'Personnalisation inconnue.'; end if;
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Compte introuvable.'; end if;
  if p_id = any(c.personnalisations) then return public.etat_du_compte(auth.uid()); end if;
  if c.encre < prix then raise exception 'Pas assez d’Encre.'; end if;
  update public.comptes set encre = encre - prix, personnalisations = array_append(personnalisations, p_id), maj_le = now() where utilisateur = auth.uid();
  return public.etat_du_compte(auth.uid());
end $$;
revoke execute on function public.acheter_personnalisation(text) from public, anon;
grant execute on function public.acheter_personnalisation(text) to authenticated;
commit;
