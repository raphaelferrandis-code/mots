-- La boutique de l’Encre : des cosmétiques qui s’achètent, et un Hors-série au choix pour 100 000 Encre. Après 24-paquets-d-exception.sql.
-- Aucune fonction serveur (Edge) à redéployer : le jeu peut être publié avant ou après ce script.
begin;

-- ── La boutique de l'Encre ───────────────────────────────────────────────────
create table if not exists public.achats_boutique (
  id bigint generated always as identity primary key,
  utilisateur uuid not null references public.comptes (utilisateur) on delete cascade,
  article text not null, -- l'identifiant d'une pièce, ou « hors-serie:<carte> »
  prix integer not null check (prix > 0),
  le timestamptz not null default now()
);
create index if not exists achats_boutique_par_joueur on public.achats_boutique (utilisateur, le);
alter table public.achats_boutique enable row level security;
revoke all on public.achats_boutique from public, anon, authenticated;

-- Une pièce de la boutique. Déjà achetée (second clic, réponse perdue en route) : rien n'est débité deux fois.
create or replace function public.acheter_a_la_boutique(p_article text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  prix integer := case p_article when 'pieuvre' then 8000 when 'corbeau' then 8000 when 'presse' then 8000 when 'paon' then 8000 when 'eclaboussures' then 12000 when 'casse' then 12000 when 'guilloche' then 12000 when 'marbrure' then 12000 when 'pieuvre-dos' then 5000 when 'guilloche-dos' then 5000 when 'prusse' then 2000 when 'absinthe' then 2000 when 'pourpre' then 2000 when 'encre-de-chine' then 5000 when 'vermeil' then 5000 end;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  if prix is null then raise exception 'Cette pièce ne se vend pas à la boutique.'; end if;
  perform pg_advisory_xact_lock(20260923); -- l'Encre bouge : après les enchères en cours (serveur/verrous.ts)
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  if p_article = any(c.personnalisations) then return public.etat_du_compte(c.utilisateur); end if;
  if c.encre < prix then raise exception 'Il te manque % Encre.', prix - c.encre; end if;
  update public.comptes set encre = encre - prix, personnalisations = array_append(personnalisations, p_article), maj_le = now()
    where utilisateur = c.utilisateur;
  insert into public.achats_boutique (utilisateur, article, prix) values (c.utilisateur, p_article, prix);
  return public.etat_du_compte(c.utilisateur);
end $$;

-- Un Hors-série au choix, parmi ceux qui manquent à l'album (une Hors-série n'a qu'une impression : « Normale »).
-- Une commande relancée après une coupure reprend son identifiant de demande : elle n'est servie qu'une fois.
create or replace function public.commander_un_hors_serie(p_carte text, p_demande uuid default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c public.comptes%rowtype;
  deja jsonb;
  possedee boolean;
  prix constant integer := 100000;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  perform pg_advisory_xact_lock(20260923); -- un timbre et de l'Encre bougent : comme au marché
  select * into c from public.comptes where utilisateur = auth.uid() for update;
  if not found then raise exception 'Ouvre d''abord ton compte.'; end if;
  deja := public.demande_deja_traitee(c.utilisateur, p_demande);
  if deja is not null then return deja || jsonb_build_object('etat', public.etat_du_compte(c.utilisateur)); end if;
  if not exists (select 1 from public.cartes k where k.id = p_carte and k.rarete = 'Hors-série') then
    raise exception 'Ce timbre n''est pas un Hors-série.';
  end if;
  select exists (select 1 from public.possessions p, jsonb_each_text(p.finitions) f
                 where p.utilisateur = c.utilisateur and p.carte = p_carte and f.value::integer > 0) into possedee;
  if possedee then raise exception 'Ce Hors-série est déjà dans ton album.'; end if;
  if c.encre < prix then raise exception 'Il te manque % Encre pour ce Hors-série.', prix - c.encre; end if;
  update public.comptes set encre = encre - prix, maj_le = now() where utilisateur = c.utilisateur;
  insert into public.possessions (utilisateur, carte, finitions) values (c.utilisateur, p_carte, '{"Normale": 1}'::jsonb)
    on conflict (utilisateur, carte) do update set finitions = public.possessions.finitions || '{"Normale": 1}'::jsonb, obtenue_le = now();
  insert into public.achats_boutique (utilisateur, article, prix) values (c.utilisateur, 'hors-serie:' || p_carte, prix);
  perform public.noter_la_demande(c.utilisateur, p_demande, jsonb_build_object('carte', p_carte));
  return jsonb_build_object('carte', p_carte, 'etat', public.etat_du_compte(c.utilisateur));
end $$;

revoke execute on function public.acheter_a_la_boutique(text), public.commander_un_hors_serie(text, uuid) from public, anon;
grant execute on function public.acheter_a_la_boutique(text), public.commander_un_hors_serie(text, uuid) to authenticated;

commit;
