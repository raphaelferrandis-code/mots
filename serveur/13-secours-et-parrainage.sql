-- L’adversaire de secours des joutes en direct et le parrainage. Après 12-joutes-direct.sql.
-- Aucune fonction serveur (Edge) à redéployer : le client peut être publié avant ou après ce script.
begin;
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
    -- Un défi sans classement vise un ami, ou un joueur maison : l'adversaire de secours des joutes (serveur/secours.ts).
    if coalesce((p_etat->'adversaire'->>'amical')::boolean,false) and not public.sont_amis(
      (select id from public.profils where utilisateur=p_utilisateur),(p_etat->'adversaire'->'profil'->>'id')::uuid)
      and not exists(select 1 from public.profils where id=(p_etat->'adversaire'->'profil'->>'id')::uuid and maison)
      then raise exception 'Ajoute d''abord ce joueur à tes amis.'; end if;
  end if;
  perform public.autoriser_joute(p_utilisateur); -- quota commun, conservé après retrait du profil
  update public.combats set archive=true where utilisateur=p_utilisateur and not archive and termine;
  insert into public.combats(id,utilisateur,etat,vue,commandes) values(p_requete,p_utilisateur,p_etat,p_vue,jsonb_build_object(p_requete::text,p_action));
  -- Le détail des parties n'est utile qu'aux reprises et aux litiges récents. Les totaux restent dans le compte.
  delete from public.combats where utilisateur=p_utilisateur and archive and maj_le < now()-interval '30 days';
  return public.combat_reponse(p_utilisateur,p_requete);
end $$;

-- ── L'adversaire de secours ──────────────────────────────────────────────────
-- Quelques joueurs maison proches de la cote du joueur, dont le deck est complet et ne contient aucun mot masqué par
-- ses filtres. Le jeu essaie le premier, puis les suivants si le serveur des combats en refuse un.
create or replace function public.adversaires_de_secours(p_masques text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi public.profils%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into moi from public.profils where utilisateur = auth.uid() and not maison;
  if not found then raise exception 'Choisis ton pseudonyme pour rejoindre les joutes.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'pseudo', x.pseudo, 'cote', x.cote) order by x.rang) from (
    select p.id, p.pseudo, p.cote, abs(p.cote - moi.cote) + random() * 150 as rang
    from public.profils p
    where p.maison and jsonb_typeof(p.deck) = 'array' and jsonb_array_length(p.deck) = 10
      and (select count(*) from jsonb_array_elements_text(p.deck) d join public.cartes c on c.id = d.value
        where not (c.registre && coalesce(p_masques, '{}'::text[]))) = 10
    order by rang limit 5) x), '[]'::jsonb);
end $$;
revoke execute on function public.adversaires_de_secours(text[]) from public, anon;
grant execute on function public.adversaires_de_secours(text[]) to authenticated;

-- ── Le parrainage ────────────────────────────────────────────────────────────
alter table public.comptes add column if not exists code_parrain text;
create unique index if not exists comptes_code_parrain on public.comptes(code_parrain) where code_parrain is not null;

create table if not exists public.parrainages (
  filleul uuid primary key references public.comptes(utilisateur) on update cascade on delete cascade,
  parrain uuid references public.comptes(utilisateur) on update cascade on delete set null,
  cree_le timestamptz not null default now(),
  valide_le timestamptz,            -- premier duel terminé par le filleul
  filleul_verse_le timestamptz,     -- ses paquets sont dans sa réserve
  parrain_du boolean not null default false, -- le parrain y a droit (dans la limite mensuelle)
  parrain_verse_le timestamptz,     -- ses paquets sont dans sa réserve
  check (parrain is distinct from filleul)
);
create index if not exists parrainages_par_parrain on public.parrainages(parrain);
alter table public.parrainages enable row level security;
revoke all on public.parrainages from public, anon, authenticated;

-- Verse les paquets dus à un joueur (comme filleul et comme parrain), tant que sa réserve a de la place.
-- Rend le nombre de lots versés.
create or replace function public.verser_les_paquets_de_parrainage(p_utilisateur uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare c public.comptes%rowtype; place integer; verses integer := 0; ligne record;
begin
  select * into c from public.comptes where utilisateur = p_utilisateur for update;
  if not found then return 0; end if;
  -- Les paquets gagnés avec le temps sont comptés d'abord : un cadeau ne doit pas les effacer.
  c := public.recharger(c);
  place := floor((15 - c.stock)::numeric / 3);
  for ligne in
    select * from (
      select r.filleul, true as filleul_lui_meme, r.valide_le from public.parrainages r
        where r.filleul = p_utilisateur and r.valide_le is not null and r.filleul_verse_le is null
      union all
      select r.filleul, false, r.valide_le from public.parrainages r
        where r.parrain = p_utilisateur and r.parrain_du and r.parrain_verse_le is null
    ) dus order by dus.valide_le
  loop
    exit when verses >= place;
    if ligne.filleul_lui_meme then update public.parrainages set filleul_verse_le = now() where filleul = ligne.filleul;
    else update public.parrainages set parrain_verse_le = now() where filleul = ligne.filleul; end if;
    verses := verses + 1;
  end loop;
  if verses > 0 then
    update public.comptes set stock = c.stock + verses * 3, reference = c.reference where utilisateur = p_utilisateur;
  end if;
  return verses;
end $$;

-- Le premier duel terminé d'un filleul. Appelée par les déclencheurs ci-dessous, dans la transaction qui enregistre le
-- résultat, où le compte du filleul est déjà verrouillé.
create or replace function public.valider_le_parrainage(p_filleul uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.parrainages%rowtype;
begin
  select * into r from public.parrainages where filleul = p_filleul and valide_le is null for update;
  if not found then return; end if;
  update public.parrainages set valide_le = now(),
    parrain_du = r.parrain is not null and (select count(*) from public.parrainages x
      where x.parrain = r.parrain and x.parrain_du and x.valide_le > now() - interval '30 days') < 10
  where filleul = p_filleul;
  perform public.verser_les_paquets_de_parrainage(p_filleul);
end $$;

-- Un combat vérifié (entraînement, défi, adversaire de secours) terminé sans abandon.
create or replace function public.parrainage_apres_combat() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.termine and not old.termine and not coalesce((new.etat->>'abandonne')::boolean, false) then
    perform public.valider_le_parrainage(new.utilisateur);
  end if;
  return null;
end $$;
drop trigger if exists parrainage_combat on public.combats;
create trigger parrainage_combat after update of termine on public.combats
  for each row execute function public.parrainage_apres_combat();

-- Une joute en direct terminée normalement (ni abandon ni forfait : la même règle que les récompenses de fin).
create or replace function public.parrainage_apres_direct() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if new.termine and not old.termine and new.etat->>'raison' is null then
    for u in select utilisateur from public.direct_places where partie = new.id loop
      perform public.valider_le_parrainage(u);
    end loop;
  end if;
  return null;
end $$;
do $$ begin
  if to_regclass('public.direct_parties') is not null then
    execute 'drop trigger if exists parrainage_direct on public.direct_parties';
    execute 'create trigger parrainage_direct after update of termine on public.direct_parties for each row execute function public.parrainage_apres_direct()';
  end if;
end $$;

-- Le nouveau venu arrivé par un lien d'invitation. Ne lève pas d'erreur : le jeu l'appelle sans rien demander au
-- joueur, et un refus se lit dans la réponse.
create or replace function public.declarer_mon_parrain(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid := auth.uid(); c public.comptes%rowtype; le_parrain uuid;
  code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  select * into c from public.comptes where utilisateur = moi for update;
  if not found then return jsonb_build_object('accepte', false, 'raison', 'Ouvre d''abord ton compte.'); end if;
  if exists(select 1 from public.parrainages where filleul = moi) then
    return jsonb_build_object('accepte', false, 'raison', 'Tu as déjà été invité par un joueur.'); end if;
  if c.combats_joues > 0 or c.cree_le < now() - interval '7 days' then
    return jsonb_build_object('accepte', false, 'raison', 'Les invitations sont réservées aux nouveaux joueurs.'); end if;
  select utilisateur into le_parrain from public.comptes where code_parrain = code;
  if le_parrain is null then return jsonb_build_object('accepte', false, 'raison', 'Ce lien d''invitation n''est pas valable.'); end if;
  if le_parrain = moi then return jsonb_build_object('accepte', false, 'raison', 'C''est ton propre lien d''invitation.'); end if;
  if exists(select 1 from public.parrainages where filleul = le_parrain and parrain = moi) then
    return jsonb_build_object('accepte', false, 'raison', 'Vous ne pouvez pas vous inviter l''un l''autre.'); end if;
  insert into public.parrainages(filleul, parrain) values (moi, le_parrain);
  return jsonb_build_object('accepte', true, 'pseudo', (select pseudo from public.profils where utilisateur = le_parrain));
end $$;

-- Le lien d'invitation du joueur (créé à la première demande), ce que ses invitations ont donné, et les paquets de
-- parrainage qui l'attendaient. « nouveaux » : les filleuls dont les paquets viennent d'être versés, pour le lui dire.
create or replace function public.mon_parrainage() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi uuid := auth.uid(); code text; verses integer; nouveaux jsonb;
begin
  if moi is null then raise exception 'Connexion requise.'; end if;
  select code_parrain into code from public.comptes where utilisateur = moi for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  while code is null loop
    code := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::integer, 1), '')
      from generate_series(1, 8));
    begin
      update public.comptes set code_parrain = code where utilisateur = moi;
    exception when unique_violation then code := null;
    end;
  end loop;
  verses := public.verser_les_paquets_de_parrainage(moi);
  -- now() est l'heure de la transaction : les versements de cet appel la portent exactement.
  select coalesce(jsonb_agg(p.pseudo), '[]'::jsonb) into nouveaux
    from public.parrainages r left join public.profils p on p.utilisateur = r.filleul
    where r.parrain = moi and r.parrain_verse_le = now();
  return jsonb_build_object(
    'code', code,
    'paquets', 3,
    'invites', (select count(*) from public.parrainages where parrain = moi),
    'valides', (select count(*) from public.parrainages where parrain = moi and valide_le is not null),
    'nouveaux', nouveaux,
    'enAttente', (select count(*) from public.parrainages where parrain = moi and parrain_du and parrain_verse_le is null)
      + (select count(*) from public.parrainages where filleul = moi and valide_le is not null and filleul_verse_le is null),
    'parrain', (select jsonb_build_object('pseudo', p.pseudo, 'valide', r.valide_le is not null,
        'verse', r.filleul_verse_le is not null, 'verseMaintenant', coalesce(r.filleul_verse_le = now(), false))
      from public.parrainages r left join public.profils p on p.utilisateur = r.parrain where r.filleul = moi),
    'etat', case when verses > 0 then public.etat_du_compte(moi) else null end);
end $$;

revoke execute on function public.verser_les_paquets_de_parrainage(uuid), public.valider_le_parrainage(uuid),
  public.parrainage_apres_combat(), public.parrainage_apres_direct() from public, anon, authenticated;
revoke execute on function public.declarer_mon_parrain(text), public.mon_parrainage() from public, anon;
grant execute on function public.declarer_mon_parrain(text), public.mon_parrainage() to authenticated;
commit;
