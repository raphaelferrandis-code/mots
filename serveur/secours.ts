// L'adversaire de secours des joutes en direct (décision de Raphaël du 24/09/2026) : quand personne n'est libre,
// le jeu propose un duel contre un joueur simulé (« joueur maison »), sans effet sur le classement.
// Le duel lui-même passe par le serveur des combats, comme un défi amical : combat_creer (serveur/combats.ts)
// accepte un défi sans amitié quand l'adversaire est un joueur maison — seulement l'un de ceux que le jeu peut
// proposer à ce joueur (décision de Raphaël du 26/09/2026 : personne ne choisit exprès le plus faible).

// Combien de joueurs maison le jeu propose, et l'aléa ajouté à l'écart de cote pour les varier d'une fois à l'autre.
export const ADVERSAIRES_PROPOSES = 5;
export const ALEA_DE_COTE = 150;

export function secours(): string { return String.raw`
-- ── L'adversaire de secours ──────────────────────────────────────────────────
-- Les joueurs maison qui peuvent servir d'adversaire avec ces filtres : un deck complet, sans aucun mot masqué.
create or replace function public.joueurs_simules_admissibles(p_masques text[]) returns table(id uuid, pseudo text, cote integer)
language sql stable security definer set search_path = '' as $$
  select p.id, p.pseudo, p.cote from public.profils p
  where p.maison and jsonb_typeof(p.deck) = 'array' and jsonb_array_length(p.deck) = 10
    and (select count(*) from jsonb_array_elements_text(p.deck) d join public.cartes c on c.id = d.value
      where not (c.registre && coalesce(p_masques, '{}'::text[]))) = 10
$$;

-- Quelques joueurs maison proches de la cote du joueur (${ADVERSAIRES_PROPOSES}, l'écart de cote plus un aléa). Le jeu essaie
-- le premier, puis les suivants si le serveur des combats en refuse un.
create or replace function public.adversaires_de_secours(p_masques text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare moi public.profils%rowtype;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into moi from public.profils where utilisateur = auth.uid() and not maison;
  if not found then raise exception 'Choisis ton pseudonyme pour rejoindre les joutes.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'pseudo', x.pseudo, 'cote', x.cote) order by x.rang) from (
    select a.id, a.pseudo, a.cote, abs(a.cote - moi.cote) + random() * ${ALEA_DE_COTE} as rang
    from public.joueurs_simules_admissibles(p_masques) a
    order by rang limit ${ADVERSAIRES_PROPOSES}) x), '[]'::jsonb);
end $$;

-- Ce joueur maison fait-il partie de ceux que le jeu peut proposer à une cote donnée ? Un joueur proposé a un rang
-- (écart + aléa) parmi les ${ADVERSAIRES_PROPOSES} plus petits ; or les ${ADVERSAIRES_PROPOSES} plus proches ont tous un rang d'au plus « le
-- ${ADVERSAIRES_PROPOSES}e écart + l'aléa ». Tout joueur proposé a donc un écart d'au plus cette limite, et le plus faible, loin de
-- la cote du joueur, ne l'est jamais. Avec moins de ${ADVERSAIRES_PROPOSES} joueurs admissibles, tous sont proposés.
create or replace function public.secours_admissible(p_cote integer, p_adversaire uuid, p_masques text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  with admissibles as (select a.id, abs(a.cote - p_cote) as ecart from public.joueurs_simules_admissibles(p_masques) a)
  select exists (select 1 from admissibles c where c.id = p_adversaire
    and c.ecart <= coalesce((select e.ecart from admissibles e order by e.ecart offset ${ADVERSAIRES_PROPOSES - 1} limit 1), c.ecart) + ${ALEA_DE_COTE})
$$;
revoke execute on function public.joueurs_simules_admissibles(text[]), public.secours_admissible(integer, uuid, text[]) from public, anon, authenticated;
revoke execute on function public.adversaires_de_secours(text[]) from public, anon;
grant execute on function public.adversaires_de_secours(text[]) to authenticated;
`; }
