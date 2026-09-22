import { useRef, useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { TEMPS_DE_REPONSE } from '../jeu/sauvegarde.ts';
import type { ReglagesDuJoueur } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import { RARETES, RARETES_ORDINAIRES } from '../partage/types.ts';
import { effacerLaPartieEtLeProfil } from '../services/joutes.ts';
import { telechargerUnFichier } from '../services/partage.ts';
import { changerUnReglage, exporterLaSauvegarde, importerUneSauvegarde } from '../services/partie.ts';

// Les réglages à cocher (ceux qui valent « oui » ou « non »).
type ReglageACocher = { [C in keyof ReglagesDuJoueur]: ReglagesDuJoueur[C] extends boolean ? C : never }[keyof ReglagesDuJoueur];

const OPTIONS_CONTENU: { cle: ReglageACocher; nom: string; aide: string }[] = [
  { cle: 'masquerFamiliers', nom: 'Masquer les mots familiers', aide: 'Inclut les mots populaires, argotiques et vulgaires.' },
  { cle: 'masquerInjurieux', nom: 'Masquer les mots injurieux', aide: 'Selon les indications du dictionnaire.' },
];
const OPTIONS_CONFORT: typeof OPTIONS_CONTENU = [
  { cle: 'sonsPaquets', nom: 'Sons du jeu', aide: 'Paquets, timbres et duels.' }, // la clé garde son premier nom : les sauvegardes existantes restent valables
  { cle: 'reduireAnimations', nom: 'Réduire les animations', aide: 'Supprime les reflets et les effets de mouvement.' },
];

export function Reglages() {
  const partie = usePartie();
  const fichier = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (partie.etat !== 'prete') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;
  const { sauvegarde } = partie;

  const exporter = (): void => {
    const sortie = exporterLaSauvegarde();
    if (!sortie) return;
    telechargerUnFichier(sortie.nom, new Blob([sortie.contenu], { type: 'application/json' }));
    setMessage(`Sauvegarde exportée : ${sortie.nom}.`);
  };

  const importer = async (choisi: File | undefined): Promise<void> => {
    if (!choisi) return;
    try {
      const texte = await choisi.text();
      if (!window.confirm('Importer ce fichier remplacera ta partie actuelle sur cet appareil. Continuer ?')) return;
      importerUneSauvegarde(texte);
      setMessage('Sauvegarde importée : ta collection est restaurée.');
    } catch (erreur) {
      setMessage(erreur instanceof Error ? erreur.message : String(erreur));
    } finally {
      if (fichier.current) fichier.current.value = '';
    }
  };

  // Le profil de joute gardé par le serveur part avec la partie. Si le serveur ne répond pas, rien n'est effacé :
  // le joueur garderait sinon un profil au classement sans plus pouvoir le retirer.
  const effacer = async (): Promise<void> => {
    if (!window.confirm('Effacer toute ta partie (collection, Encre, paquets) sur cet appareil, et ton profil de joutes classées ? Cette action est définitive.')) return;
    try {
      await effacerLaPartieEtLeProfil();
      setMessage('Partie effacée : tu repars de zéro, avec trois paquets.');
    } catch (erreur) {
      setMessage(`${erreur instanceof Error ? erreur.message : String(erreur)} Rien n'a été effacé : réessaie dans un moment.`);
    }
  };

  const dernierExport = sauvegarde.dernierExport ? new Date(sauvegarde.dernierExport.le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <main className="ecran panneaux reglages">
      <Entete titre="Réglages" />

      <div className="reglages__preferences">
        <section className="rubrique">
          <h2>Son et confort</h2>
          {OPTIONS_CONFORT.map((option) => (
            <label key={option.cle} className="option">
              <input type="checkbox" checked={sauvegarde.reglages[option.cle]} onChange={(e) => changerUnReglage(option.cle, e.target.checked)} />
              <span><strong>{option.nom}</strong><span className="texte-doux petit">{option.aide}</span></span>
            </label>
          ))}
          <label className="option option--liste">
            <span><strong>Temps par définition en duel</strong></span>
            <select value={sauvegarde.reglages.tempsDeReponse} onChange={(e) => changerUnReglage('tempsDeReponse', TEMPS_DE_REPONSE.find((t) => t === e.target.value) ?? 'normal')}>
              <option value="normal">Normal ({EQUILIBRAGE.duel.secondesPourRepondre} s)</option>
              <option value="double">Doublé ({EQUILIBRAGE.duel.secondesPourRepondre * 2} s)</option>
              <option value="illimite">Sans limite</option>
            </select>
          </label>
        </section>

        <section className="rubrique">
          <h2>Les mots de ta collection</h2>
          <p className="texte-doux petit">Les mots masqués sont exclus des paquets et cachés dans l'album, sans être perdus.</p>
          {OPTIONS_CONTENU.map((option) => (
            <label key={option.cle} className="option">
              <input type="checkbox" checked={sauvegarde.reglages[option.cle]} onChange={(e) => changerUnReglage(option.cle, e.target.checked)} />
              <span><strong>{option.nom}</strong><span className="texte-doux petit">{option.aide}</span></span>
            </label>
          ))}
        </section>
      </div>

      <div className="reglages__gestion">
        <section className="rubrique">
          <h2>Ta sauvegarde</h2>
          <p className="petit">
            {partie.emplacement === 'mémoire seulement'
              ? 'Ta partie sera perdue à la fermeture de la page. Exporte-la pour la conserver.'
              : <>Ta partie est enregistrée uniquement sur cet appareil. Exporte une copie : le navigateur peut effacer ses données.{partie.stockageDurable && ' Le stockage actuel est protégé contre le nettoyage automatique.'}</>}
          </p>
          <p className="texte-doux petit">{dernierExport ? `Dernier export : ${dernierExport}.` : 'Aucun export pour le moment.'}</p>
          <div className="rangee-de-boutons">
            <button type="button" className="bouton" onClick={exporter}>Exporter ma sauvegarde</button>
            <button type="button" className="bouton bouton--discret" onClick={() => fichier.current?.click()}>Importer une sauvegarde</button>
            <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => void importer(e.target.files?.[0])} />
          </div>
          {message && <p role="status" className="petit">{message}</p>}
          <button type="button" className="bouton bouton--danger" onClick={() => void effacer()}>Effacer ma partie</button>
        </section>

        <section className="rubrique">
          <h2>Confidentialité</h2>
          <p className="petit">Ta partie reste sur cet appareil. Seules les joutes classées envoient des données à un serveur.</p>
          <a className="bouton bouton--discret" href={lien({ ecran: 'confidentialite' })}>Ce que le jeu garde, et comment l'effacer</a>
        </section>

        <details className="rubrique repliable">
          <summary><h2>Paquets et probabilités</h2></summary>
          <p className="texte-doux petit">
            Un paquet gratuit toutes les {EQUILIBRAGE.paquets.minutesEntreDeuxPaquets} minutes, jusqu'à {EQUILIBRAGE.paquets.stockMaximum} en réserve.
            Une Légendaire garantie au plus tard au {EQUILIBRAGE.paquets.paquetsAvantLegendaireGarantie}ᵉ paquet sans Légendaire.
          </p>
          <div className="tableau-defilant">
            <table className="tableau">
              <caption>Chances par rareté et position dans le paquet</caption>
              <thead>
                <tr><th scope="col">Carte</th>{RARETES_ORDINAIRES.map((r) => <th key={r} scope="col">{r}</th>)}</tr>
              </thead>
              <tbody>
                {EQUILIBRAGE.paquets.emplacements.map((chances, i) => (
                  <tr key={i}><th scope="row">{i + 1}</th>{RARETES_ORDINAIRES.map((r) => <td key={r}>{chances[r] ? `${chances[r]} %` : '—'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="texte-doux petit">
            <strong>Hors-série :</strong> environ 1 paquet sur {Math.round(1 / EQUILIBRAGE.paquets.chanceHorsSerie).toLocaleString('fr-FR')}, en dernière position.
          </p>
          <p className="texte-doux petit">
            <strong>Finitions :</strong> brillante 1 sur {Math.round(1 / EQUILIBRAGE.finitions.chances.Brillante)}, holographique 1 sur {Math.round(1 / EQUILIBRAGE.finitions.chances.Holographique)}, tirées indépendamment de la rareté.
            Chaque nouvelle finition est conservée. Les doublons deviennent de l'Encre (×{EQUILIBRAGE.finitions.encre.Brillante} si brillants, ×{EQUILIBRAGE.finitions.encre.Holographique} si holographiques).
          </p>
          <p className="texte-doux petit">
            Encre par doublon : {RARETES.map((r) => `${r} ${EQUILIBRAGE.encreParDoublon[r]}`).join(' · ')}. Un paquet coûte {EQUILIBRAGE.paquets.prixEnEncre} Encre.
          </p>
        </details>

        <details className="rubrique repliable">
          <summary><h2>Crédits et sources</h2></summary>
          <p>
            Les définitions et les étymologies sont adaptées (raccourcies, nettoyées) du{' '}
            <a href="https://fr.wiktionary.org" target="_blank" rel="noreferrer">Wiktionnaire</a>, le dictionnaire libre,
            sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
            Chaque fiche de carte renvoie vers la page du mot, où figure la liste de ses auteurs.
            Données extraites grâce au projet wiktextract (kaikki.org).
          </p>
          <p>
            La fréquence des mots et la part des gens qui les connaissent viennent de{' '}
            <a href="http://www.lexique.org" target="_blank" rel="noreferrer">Lexique 4</a>, sous licence CC BY-SA 4.0 :
            New, B., Pallier, C., Schalchli, G., Bourgin, J., &amp; Gimenes, M. (2026). Lexique 4: A major upgrade of the
            “Lexique” French lexical database. <em>Behavior Research Methods</em>, 58(5), 140.
          </p>
          <p className="texte-doux petit">
            Les fichiers de cartes du jeu, tirés de ces deux sources, sont eux aussi sous licence CC BY-SA 4.0.
            Ce jeu n'utilise ni publicité ni outil de mesure d'audience ; ce qu'il garde est décrit à la page{' '}
            <a href={lien({ ecran: 'confidentialite' })}>Confidentialité</a>.
          </p>
        </details>
      </div>
    </main>
  );
}
