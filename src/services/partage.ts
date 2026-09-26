// Partager ou enregistrer un fichier fabriqué par le jeu (l'image d'un timbre, la sauvegarde).
// Sur un téléphone, la feuille de partage du système ; ailleurs, un simple téléchargement.

import { fabriquerLImage } from '../composants/carte/imageDuTimbre.ts';
import type { Habillage } from '../composants/carte/imageDuTimbre.ts';
import { nomDuFichierImage, texteDePartage } from '../composants/carte/miseEnLignes.ts';
import { SITE } from '../config/site.ts';
import type { CarteIndex } from '../partage/types.ts';

export function telechargerUnFichier(nom: string, contenu: Blob): void {
  const adresse = URL.createObjectURL(contenu);
  const lienTemporaire = document.createElement('a');
  lienTemporaire.href = adresse;
  lienTemporaire.download = nom;
  lienTemporaire.click();
  // L'adresse reste valable le temps que le navigateur commence le téléchargement.
  setTimeout(() => URL.revokeObjectURL(adresse), 10_000);
}

export type IssueDuPartage = 'partage' | 'telecharge' | 'annule';

// Fabrique l'image du timbre, puis l'offre à la feuille de partage du système si elle accepte les fichiers ;
// sinon (ordinateur, navigateur sans partage) l'image est téléchargée.
// Le lien partagé mène à la page du mot (philamots.fr/mot/…/) : celui qui le reçoit lit la définition avant de jouer.
export async function partagerLeTimbre(carte: CarteIndex, page: string | undefined, habillage: Habillage): Promise<IssueDuPartage> {
  const image = await fabriquerLImage(carte, habillage);
  const nom = nomDuFichierImage(carte.id);
  const fichier = new File([image], nom, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: `${carte.mot} — ${SITE.nom}`, text: texteDePartage(carte.mot, carte.rarete, carte.faction, page ?? SITE.adresse) });
      return 'partage';
    } catch (erreur) {
      // Le joueur a refermé la feuille de partage : rien à faire. Toute autre erreur : on se rabat sur le téléchargement.
      if (erreur instanceof DOMException && erreur.name === 'AbortError') return 'annule';
    }
  }
  telechargerUnFichier(nom, image);
  return 'telecharge';
}
