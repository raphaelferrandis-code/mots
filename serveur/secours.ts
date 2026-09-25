// L'adversaire de secours des joutes en direct (décision de Raphaël du 24/09/2026) : quand personne n'est libre,
// le jeu propose un duel contre un joueur simulé (« joueur maison »), sans effet sur le classement.
// Le duel lui-même passe par le serveur des combats, comme un défi amical : combat_creer (serveur/combats.ts)
// accepte un défi sans amitié quand l'adversaire est un joueur maison.

export function secours(): string { return String.raw`
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
`; }
