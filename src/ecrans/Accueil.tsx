import { useState } from 'react';
import { DevinetteDuJour } from '../composants/accueil/DevinetteDuJour.tsx';
import { DuelsDuBureau } from '../composants/accueil/DuelsDuBureau.tsx';
import { FilDActivite } from '../composants/accueil/FilDActivite.tsx';
import { FondAnime } from '../composants/accueil/FondAnime.tsx';
import { NouvellesDuParrainage } from '../composants/accueil/NouvellesDuParrainage.tsx';
import { Comptoir } from '../composants/ceremonie/Comptoir.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { lien } from '../navigation/routes.ts';
import { compteConnecte } from '../services/connexion.ts';
import '../composants/accueil/accueil.css';
import '../composants/accueil/refonte.css';

// Le rappel « Protège ta collection » : écarté par « Plus tard », il revient après quelques dizaines de paquets.
// (Une commodité propre à cet appareil : si le navigateur l'oublie, le rappel revient simplement plus tôt.)
const CLE_DU_RAPPEL = 'mots.rappel-protection';
const PAQUETS_AVANT_LE_RAPPEL = 20;
function lireLeReport(): number | null {
  try { const lu = Number(localStorage.getItem(CLE_DU_RAPPEL)); return Number.isFinite(lu) && lu > 0 ? lu : null; } catch { return null; }
}

// L'accueil de la refonte (maquette de la cérémonie) : le comptoir des paquets, l'album en aperçu et les duels,
// la devinette du jour, le fil d'activité des collectionneurs, sur le fond vivant.
export function Accueil() {
  const partie = usePartie();
  const [reporteA, setReporteA] = useState(lireLeReport);
  const [connecte] = useState(compteConnecte);

  if (partie.etat === 'erreur') return <main className="ecran"><h1>Accueil</h1><p role="alert">Le jeu n’a pas pu s’ouvrir. Recharge la page.</p></main>;
  if (partie.etat !== 'prete') return <main className="ecran"><h1 className="visuellement-cache">Accueil</h1><p role="status">Chargement…</p></main>;

  const { sauvegarde } = partie;
  const ouverts = sauvegarde.paquets.ouverts;
  // Sans serveur, la partie ne vit que sur cet appareil : le fichier exporté est sa seule copie.
  const depuisLExport = ouverts - (sauvegarde.dernierExport?.paquetsOuverts ?? 0);
  const rappelerLExport = partie.serveur.etat === 'appareil'
    && (depuisLExport >= EQUILIBRAGE.paquetsEntreDeuxRappelsDExport || (sauvegarde.dernierExport === null && ouverts >= PAQUETS_AVANT_LE_RAPPEL));
  // En ligne, le serveur garde la collection, mais celle d'un invité n'est liée qu'à ce navigateur : un compte ou un
  // code de secours la protège (audit de finition du 26/09/2026 : l'ancien rappel d'export disait le contraire).
  const rappelerLaProtection = partie.serveur.etat !== 'appareil' && partie.compte !== null && partie.compte.codeDeSecoursLe === null && !connecte
    && ouverts >= PAQUETS_AVANT_LE_RAPPEL && (reporteA === null || ouverts - reporteA >= EQUILIBRAGE.paquetsEntreDeuxRappelsDExport);
  const plusTard = (): void => {
    try { localStorage.setItem(CLE_DU_RAPPEL, String(ouverts)); } catch { /* le rappel reviendra à la prochaine visite */ }
    setReporteA(ouverts);
  };
  const deck = sauvegarde.deck.filter((id) => id in sauvegarde.cartes).length;
  // Ce qu'est le jeu, dit au nouveau venu jusqu'à son premier duel ; et, dès l'arrivée, que tous les mots y sont
  // (décisions de Raphaël du 26/09/2026 : les mots grossiers restent visibles par défaut, et le jeu le dit).
  const accroche = sauvegarde.duels.joues === 0 && <>
    <p>Chaque timbre est un vrai mot de la langue française. Ouvre tes paquets, complète ton album, et gagne des duels en retrouvant les définitions.</p>
    <p>Tous les mots y sont, même familiers ou grossiers : tu peux les masquer dans les <a href={lien({ ecran: 'reglages' })}>Réglages</a>.</p>
  </>;

  return (
    <main className="ecran ecran--large accueil-refonte">
      <FondAnime />
      <NouvellesDuParrainage />
      <Comptoir aCote={<DuelsDuBureau sauvegarde={sauvegarde} deck={deck} />} accroche={accroche || undefined} />
      <DevinetteDuJour />
      <FilDActivite />
      {rappelerLExport && (
        <aside className="accueil__rappel">
          <div><h2>Garde une copie de ta partie</h2><p>Elle est enregistrée uniquement sur cet appareil.</p></div>
          <a className="accueil-lien" href={lien({ ecran: 'reglages' })}>Exporter ma sauvegarde</a>
        </aside>
      )}
      {rappelerLaProtection && (
        <aside className="accueil__rappel" aria-labelledby="titre-protection">
          <div><h2 id="titre-protection">Protège ta collection</h2><p>Tu joues en invité : ta collection n’est liée qu’à ce navigateur. Crée un compte ou un code de secours pour la retrouver partout.</p></div>
          <div className="accueil__rappel-actions">
            <a className="accueil-lien" href={lien({ ecran: 'compte' })}>Protéger ma collection</a>
            <button type="button" className="accueil-lien accueil__plus-tard" onClick={plusTard}>Plus tard</button>
          </div>
        </aside>
      )}
      {partie.emplacement === 'mémoire seulement' && (
        <aside className="bloc bloc--alerte" role="alert"><p>Ce navigateur refuse d’enregistrer des données. Ta partie sera perdue à la fermeture de la page.</p></aside>
      )}
    </main>
  );
}
