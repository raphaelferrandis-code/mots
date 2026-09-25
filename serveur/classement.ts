// Le classement survit au retrait du profil (décision de Raphaël du 25/09/2026) : quand un joueur supprime son profil
// de joute, son compte retient l'identité et la cote du profil ; s'il en recrée un (publier_mon_profil), il les
// retrouve, et avec elles ses cotes des joutes en direct, rangées sous cette identité. On n'efface donc pas ses défaites
// en recommençant. Tout s'efface avec le compte (direct_oublier_les_cotes, serveur/direct.ts).
// Fait partie de la structure, après les collections (la table des comptes).

export function classement(): string { return String.raw`
-- ── Le classement suit le compte ─────────────────────────────────────────────
alter table public.comptes add column if not exists profil_precedent jsonb; -- { id, cote, jouees, gagnees } du dernier profil retiré

create or replace function public.retenir_le_profil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.comptes set profil_precedent = jsonb_build_object('id', old.id, 'cote', old.cote, 'jouees', old.jouees, 'gagnees', old.gagnees)
    where utilisateur = old.utilisateur;
  return null;
end $$;
drop trigger if exists retenir_le_profil on public.profils;
create trigger retenir_le_profil after delete on public.profils
  for each row when (old.utilisateur is not null) execute function public.retenir_le_profil();
revoke execute on function public.retenir_le_profil() from public, anon, authenticated;
`; }
