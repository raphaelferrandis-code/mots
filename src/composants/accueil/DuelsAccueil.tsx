import { EQUILIBRAGE } from '../../config/equilibrage.ts';
import { ligueDe } from '../../jeu/joute.ts';
import { meilleureFinition } from '../../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import { lien } from '../../navigation/routes.ts';
import type { CarteIndex } from '../../partage/types.ts';
import { Carte } from '../carte/Carte.tsx';

function ApercuDeck({ cartes, sauvegarde }: { cartes: readonly CarteIndex[]; sauvegarde: Sauvegarde }) {
  return (
    <div className="apercu-deck" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => {
        const carte = cartes[i];
        return <div className="apercu-deck__carte" key={carte?.id ?? `vide-${i}`}>
          {carte
            ? <Carte carte={carte} cliquable={false} sansDefinition finition={meilleureFinition(sauvegarde.cartes[carte.id])} maitriseeLe={sauvegarde.cartes[carte.id].maitriseeLe} />
            : <div className="apercu-deck__dos"><span>M</span></div>}
        </div>;
      })}
      <div className="apercu-deck__support" />
    </div>
  );
}

export function DuelsAccueil({ deck, sauvegarde, erreur = false }: { deck: readonly CarteIndex[] | null; sauvegarde: Sauvegarde; erreur?: boolean }) {
  const complet = deck?.length === EQUILIBRAGE.duel.tailleDuDeck;
  const { joues, gagnes } = sauvegarde.duels;
  return (
    <section className="accueil-pole" aria-labelledby="titre-duels">
      <header className="accueil-pole__entete"><h2 id="titre-duels">Les duels</h2><p>{complet ? 'Ton deck entre en jeu' : 'Tes mots ont du répondant'}</p></header>
      <div className="accueil-pole__illustration"><ApercuDeck cartes={deck ?? []} sauvegarde={sauvegarde} /></div>
      <p className="accueil-pole__bilan">{deck === null ? (erreur ? 'Aperçu du deck indisponible' : 'Chargement du deck…') : complet
        ? <><strong>{gagnes}</strong> victoire{gagnes > 1 ? 's' : ''} · {joues} duel{joues > 1 ? 's' : ''}</>
        : <>Deck à composer · {deck.length} / {EQUILIBRAGE.duel.tailleDuDeck} timbres</>}</p>
      <a className="bouton accueil-pole__action" href={lien({ ecran: complet ? 'duel' : 'deck' })}>{complet ? 'Lancer un duel' : deck === null ? 'Voir mon deck' : 'Composer mon deck'}</a>
      <div className="accueil-pole__suite">
        {complet ? <a className="accueil-lien accueil-pole__note" href={lien({ ecran: 'deck' })}>Modifier mon deck</a> : <p className="accueil-pole__note">Choisis {EQUILIBRAGE.duel.tailleDuDeck} timbres de ta collection.</p>}
        {sauvegarde.joutes.cote !== null && <p className="accueil-pole__detail">Joutes : {ligueDe(sauvegarde.joutes.cote, EQUILIBRAGE.joute).nom} · cote {sauvegarde.joutes.cote}</p>}
      </div>
    </section>
  );
}
