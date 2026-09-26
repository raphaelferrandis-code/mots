-- Ton apparence suit ton compte : avatar, cadre, titre, dos, couleur et paquet. Après 21-adversaire-de-secours.sql.
-- Aucune fonction serveur (Edge) à redéployer : le jeu peut être publié avant ou après ce script.
begin;
alter table public.comptes add column if not exists apparence jsonb;

create or replace function public.etat_du_compte(p_utilisateur uuid) returns jsonb
language sql security definer set search_path = ''
as $$
  select jsonb_build_object(
    'encre', c.encre,
    'achatsPersonnalisation', to_jsonb(c.personnalisations),
    'paquets', jsonb_build_object('stock', c.stock, 'reference', public.en_millisecondes(c.reference), 'ouverts', c.ouverts, 'sansLegendaire', c.sans_legendaire),
    'deck', c.deck,
    'apparence', c.apparence,
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

create or replace function public.changer_d_apparence(p_apparence jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  choix jsonb := '{}'::jsonb;
  cle text;
  gardee jsonb;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if jsonb_typeof(p_apparence) is distinct from 'object' then raise exception 'Apparence invalide.'; end if;
  foreach cle in array array['avatar', 'cadre', 'titre', 'dos', 'couleur', 'paquet'] loop
    continue when not p_apparence ? cle;
    if jsonb_typeof(p_apparence -> cle) is distinct from 'string'
      or (p_apparence ->> cle) !~ (case when cle = 'titre' then '^[a-z0-9-]{0,40}$' else '^[a-z0-9-]{1,40}$' end)
    then raise exception 'Apparence invalide.'; end if;
    choix := choix || jsonb_build_object(cle, p_apparence ->> cle);
  end loop;
  if choix = '{}'::jsonb then raise exception 'Apparence invalide.'; end if;
  update public.comptes set apparence = coalesce(apparence, '{}'::jsonb) || choix, maj_le = now()
    where utilisateur = auth.uid() returning apparence into gardee;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  return gardee;
end $$;

revoke execute on function public.changer_d_apparence(jsonb) from public, anon;
grant execute on function public.changer_d_apparence(jsonb) to authenticated;

commit;
