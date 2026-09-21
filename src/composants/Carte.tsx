import { defenseEnJeu } from '../config/equilibrage.ts';
import { lien } from '../navigation/routes.ts';
import type { CarteIndex, Rarete } from '../partage/types.ts';

// La rareté ne doit jamais reposer sur la couleur seule : chaque rareté a aussi son symbole et son nom.
const SYMBOLE: Record<Rarete, string> = {
  'Commune': '●',
  'Peu commune': '◆',
  'Rare': '★',
  'Épique': '✦',
  'Légendaire': '♛',
};

type Props = {
  carte: CarteIndex;
  cliquable?: boolean; // ouvre la fiche de la carte
};

export function Carte({ carte, cliquable = true }: Props) {
  const contenu = (
    <>
      <div className="carte__haut">
        <span className="carte__rarete">{SYMBOLE[carte.rarete]} {carte.rarete}</span>
      </div>

      <div className="carte__centre">
        <span className="carte__mot" lang="fr">{carte.mot}</span>
        <span className="carte__faction">{carte.type.toLowerCase()} · {carte.faction}</span>
        {carte.registre.length > 0 && (
          <span className="carte__badges">
            {carte.registre.map((r) => <span key={r} className="badge">{r}</span>)}
          </span>
        )}
        <span className="carte__definition" lang="fr">{carte.definition}</span>
      </div>

      <div className="carte__bas">
        <span className="carte__stat">
          <span className="carte__stat-valeur">{carte.attaque}</span>
          <span className="carte__stat-nom">Attaque</span>
        </span>
        <span className="carte__stat">
          <span className="carte__stat-valeur">{defenseEnJeu(carte.defense, carte.rarete)}</span>
          <span className="carte__stat-nom">Défense</span>
        </span>
      </div>
    </>
  );

  const description = `${carte.mot}, ${carte.type}, ${carte.rarete}, ${carte.faction}`;
  return cliquable
    ? <a className="carte" data-rarete={carte.rarete} href={lien({ ecran: 'carte', id: carte.id })} aria-label={`${description} — voir la fiche`}>{contenu}</a>
    : <div className="carte" data-rarete={carte.rarete} role="img" aria-label={description}>{contenu}</div>;
}
