-- Le défi contre un joueur simulé : seulement l’un de ceux que le jeu propose. Après 20-points-secondaires.sql.
-- Aucune fonction serveur (Edge) à redéployer : le jeu ne change pas.
begin;

-- ── L'adversaire de secours ──────────────────────────────────────────────────
-- Les joueurs maison qui peuvent servir d'adversaire avec ces filtres : un deck complet, sans aucun mot masqué.
create or replace function public.joueurs_simules_admissibles(p_masques text[]) returns table(id uuid, pseudo text, cote integer)
language sql stable security definer set search_path = '' as $$
  select p.id, p.pseudo, p.cote from public.profils p
  where p.maison and jsonb_typeof(p.deck) = 'array' and jsonb_array_length(p.deck) = 10
    and (select count(*) from jsonb_array_elements_text(p.deck) d join public.cartes c on c.id = d.value
      where not (c.registre && coalesce(p_masques, '{}'::text[]))) = 10
$$;

-- Quelques joueurs maison proches de la cote du joueur (5, l'écart de cote plus un aléa). Le jeu essaie
-- le premier, puis les suivants si le serveur des combats en refuse un.
create or replace function public.adversaires_de_secours(p_masques text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi public.profils%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into moi from public.profils where utilisateur = auth.uid() and not maison;
  if not found then raise exception 'Choisis ton pseudonyme pour rejoindre les joutes.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'pseudo', x.pseudo, 'cote', x.cote) order by x.rang) from (
    select a.id, a.pseudo, a.cote, abs(a.cote - moi.cote) + random() * 150 as rang
    from public.joueurs_simules_admissibles(p_masques) a
    order by rang limit 5) x), '[]'::jsonb);
end $$;

-- Ce joueur maison fait-il partie de ceux que le jeu peut proposer à une cote donnée ? Un joueur proposé a un rang
-- (écart + aléa) parmi les 5 plus petits ; or les 5 plus proches ont tous un rang d'au plus « le
-- 5e écart + l'aléa ». Tout joueur proposé a donc un écart d'au plus cette limite, et le plus faible, loin de
-- la cote du joueur, ne l'est jamais. Avec moins de 5 joueurs admissibles, tous sont proposés.
create or replace function public.secours_admissible(p_cote integer, p_adversaire uuid, p_masques text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  with admissibles as (select a.id, abs(a.cote - p_cote) as ecart from public.joueurs_simules_admissibles(p_masques) a)
  select exists (select 1 from admissibles c where c.id = p_adversaire
    and c.ecart <= coalesce((select e.ecart from admissibles e order by e.ecart offset 4 limit 1), c.ecart) + 150)
$$;
revoke execute on function public.joueurs_simules_admissibles(text[]), public.secours_admissible(integer, uuid, text[]) from public, anon, authenticated;
revoke execute on function public.adversaires_de_secours(text[]) from public, anon;
grant execute on function public.adversaires_de_secours(text[]) to authenticated;

create or replace function public.combat_creer(p_utilisateur uuid, p_requete uuid, p_action jsonb, p_etat jsonb, p_vue jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; ancien public.combats%rowtype;
begin
  select * into c from public.comptes where utilisateur=p_utilisateur for update;
  if not found or not c.progression_active then raise exception 'Le serveur des combats n''est pas disponible.'; end if;
  select * into ancien from public.combats where id=p_requete;
  if found then
    if ancien.utilisateur <> p_utilisateur or (ancien.commandes->p_requete::text) is distinct from p_action then raise exception 'Identifiant de commande déjà utilisé.'; end if;
    return public.combat_reponse(p_utilisateur,ancien.id);
  end if;
  select * into ancien from public.combats where utilisateur=p_utilisateur and not archive for update;
  if found and not ancien.termine then return public.combat_reponse(p_utilisateur,ancien.id); end if;
  if p_etat->'deckDepart' is distinct from c.deck or jsonb_array_length(c.deck) <> 10 or public.deck_propre(p_utilisateur,c.deck) <> c.deck
    then raise exception 'Ton deck a changé pendant la préparation. Réessaie.'; end if;
  if p_etat->'adversaire'->>'type' = 'joute' then
    if not exists(select 1 from public.profils where utilisateur=p_utilisateur) then raise exception 'Publie d''abord ton profil.'; end if;
    if not exists(select 1 from public.profils where id=(p_etat->'adversaire'->'profil'->>'id')::uuid and utilisateur is distinct from p_utilisateur)
      then raise exception 'Cet adversaire n''est plus disponible.'; end if;
    -- Un défi sans classement vise un ami, ou un joueur maison : l'adversaire de secours des joutes (serveur/secours.ts),
    -- l'un de ceux que le jeu peut proposer à ce joueur — jamais le plus faible, choisi exprès.
    if coalesce((p_etat->'adversaire'->>'amical')::boolean,false) then
      if exists(select 1 from public.profils where id=(p_etat->'adversaire'->'profil'->>'id')::uuid and maison) then
        if not public.secours_admissible((select cote from public.profils where utilisateur=p_utilisateur),
          (p_etat->'adversaire'->'profil'->>'id')::uuid, array(select jsonb_array_elements_text(coalesce(p_etat->'masques','[]'::jsonb))))
          then raise exception 'Ce joueur simulé ne fait pas partie de ceux proposés à ton niveau. Relance la recherche.'; end if;
      elsif not public.sont_amis((select id from public.profils where utilisateur=p_utilisateur),(p_etat->'adversaire'->'profil'->>'id')::uuid)
        then raise exception 'Ajoute d''abord ce joueur à tes amis.'; end if;
    end if;
  end if;
  perform public.autoriser_joute(p_utilisateur); -- quota commun, conservé après retrait du profil
  update public.combats set archive=true where utilisateur=p_utilisateur and not archive and termine;
  insert into public.combats(id,utilisateur,etat,vue,commandes) values(p_requete,p_utilisateur,p_etat,p_vue,jsonb_build_object(p_requete::text,p_action));
  -- Le détail des parties n'est utile qu'aux reprises et aux litiges récents. Les totaux restent dans le compte.
  delete from public.combats where utilisateur=p_utilisateur and archive and maj_le < now()-interval '30 days';
  return public.combat_reponse(p_utilisateur,p_requete);
end $$;

commit;
