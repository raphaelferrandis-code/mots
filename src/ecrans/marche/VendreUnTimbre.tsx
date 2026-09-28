// « Vendre un timbre », depuis le marché (audit de finition du 26/09/2026, chantier 7 : il fallait passer par la fiche
// du timbre, et rien ne le disait) : choisir dans son album, les doubles d'abord, puis fixer la vente (MiseEnVente, le
// même formulaire que sur la fiche). Les acheteurs voient le pseudonyme du vendeur : sans lui, on le choisit d'abord.

import { useCallback, useMemo, useState } from 'react';
import { Carte } from '../../composants/carte/Carte.tsx';
import { ChoixDUnTimbre, nombreDExemplaires } from '../../composants/ChoixDUnTimbre.tsx';
import { ChoixDuPseudonyme } from '../../composants/ChoixDuPseudonyme.tsx';
import { MiseEnVente } from '../../composants/MiseEnVente.tsx';
import { useChargement } from '../../composants/useChargement.ts';
import type { Enchere } from '../../jeu/marche.ts';
import { meilleureFinition } from '../../jeu/sauvegarde.ts';
import type { Sauvegarde } from '../../jeu/sauvegarde.ts';
import type { CarteIndex } from '../../partage/types.ts';
import { pseudoDuJoueur } from '../../services/identite.ts';
import { lireLesCotes } from '../../services/partie.ts';

export function VendreUnTimbre({ sauvegarde, cartes, onVendu, onFermer }: {
  sauvegarde: Sauvegarde; cartes: readonly CarteIndex[]; onVendu: (enchere: Enchere, mot: string) => void; onFermer: () => void;
}) {
  const [choisie, setChoisie] = useState<CarteIndex | null>(null);
  const cotes = useChargement(async () => (choisie ? lireLesCotes(choisie.id) : null), `cotes-vente:${choisie?.id ?? ''}`);
  const possedee = choisie ? sauvegarde.cartes[choisie.id] : undefined;
  const avecPseudonyme = pseudoDuJoueur(sauvegarde) !== '';
  const collection = useMemo(() => new Map(Object.entries(sauvegarde.cartes).map(([id, p]) => [id, p.finitions])), [sauvegarde.cartes]);
  const dates = useMemo(() => new Map(Object.entries(sauvegarde.cartes).map(([id, p]) => [id, p.obtenueLe])), [sauvegarde.cartes]);
  const double = useCallback((c: CarteIndex) => { const n = nombreDExemplaires(collection.get(c.id)); return n > 1 ? `×${n}` : null; }, [collection]);

  return (
    <section className="rubrique vendre" aria-labelledby="titre-vendre">
      <div className="vendre__tete">
        <h2 id="titre-vendre">{choisie ? `Vendre « ${choisie.mot} »` : 'Quel timbre vendre ?'}</h2>
        <button type="button" className="bouton bouton--discret" onClick={onFermer}>Fermer</button>
      </div>
      {!avecPseudonyme ? (
        <ChoixDuPseudonyme titre="Les acheteurs verront ton pseudonyme : choisis-le d’abord" onValide={() => undefined} />
      ) : !choisie || !possedee ? (
        <ChoixDUnTimbre cartes={cartes} collection={collection} dates={dates} action="vendre" recherche="Chercher un mot de ton album…" avant={double}
          legende={(total, doubles) => `${total.toLocaleString('fr-FR')} timbre${total > 1 ? 's' : ''}${doubles > 0 ? `, tes doubles d’abord (${doubles})` : ''}.`} onChoisir={setChoisie} />
      ) : (
        <div className="vendre__formulaire">
          <div className="vendre__timbre"><Carte carte={choisie} finition={meilleureFinition(possedee)} obtenuLe={possedee.obtenueLe} cliquable={false} /></div>
          <div className="vendre__reglages">
            <MiseEnVente carte={choisie} possedee={possedee} dansLeDeck={sauvegarde.deck.includes(choisie.id)}
              cotes={cotes.etat === 'pret' ? cotes.donnees : null} onVendu={(enchere) => onVendu(enchere, choisie.mot)} />
            <button type="button" className="bouton bouton--discret" onClick={() => setChoisie(null)}>Choisir un autre timbre</button>
          </div>
        </div>
      )}
    </section>
  );
}
