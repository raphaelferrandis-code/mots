import { useRef, useState } from 'react';
import { AVenir, Entete } from '../composants/Entete.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { TEMPS_DE_REPONSE } from '../jeu/sauvegarde.ts';
import type { ReglagesDuJoueur } from '../jeu/sauvegarde.ts';
import { RARETES, RARETES_ORDINAIRES } from '../partage/types.ts';
import { POLICES, appliquerLaPolice, policeChoisie } from '../theme/polices.ts';
import type { Police } from '../theme/polices.ts';
import { changerUnReglage, exporterLaSauvegarde, importerUneSauvegarde, toutEffacer } from '../services/partie.ts';

// Les réglages à cocher (ceux qui valent « oui » ou « non »).
type ReglageACocher = { [C in keyof ReglagesDuJoueur]: ReglagesDuJoueur[C] extends boolean ? C : never }[keyof ReglagesDuJoueur];

const OPTIONS: { cle: ReglageACocher; nom: string; aide: string }[] = [
  { cle: 'masquerFamiliers', nom: 'Masquer les mots familiers', aide: 'Mots familiers, populaires, argotiques ou vulgaires. Ils ne tombent plus dans les paquets et disparaissent de la collection ; tu ne les perds pas.' },
  { cle: 'masquerInjurieux', nom: 'Masquer les mots injurieux', aide: 'Même principe, pour les mots que le dictionnaire signale comme injurieux.' },
  { cle: 'reduireAnimations', nom: 'Réduire les animations', aide: 'Supprime les reflets et les effets de mouvement.' },
];

function telecharger(nom: string, contenu: string): void {
  const adresse = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  const lienTemporaire = document.createElement('a');
  lienTemporaire.href = adresse;
  lienTemporaire.download = nom;
  lienTemporaire.click();
  URL.revokeObjectURL(adresse);
}

export function Reglages() {
  const partie = usePartie();
  const fichier = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [police, setPolice] = useState<Police>(policeChoisie);

  if (partie.etat !== 'prete') return <main className="ecran"><p className="texte-doux">Chargement…</p></main>;
  const { sauvegarde } = partie;

  const exporter = (): void => {
    const sortie = exporterLaSauvegarde();
    if (!sortie) return;
    telecharger(sortie.nom, sortie.contenu);
    setMessage(`Sauvegarde exportée : ${sortie.nom}. Garde ce fichier à l'abri (e-mail à toi-même, nuage…).`);
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

  const effacer = (): void => {
    if (!window.confirm('Effacer toute ta partie (collection, Encre, paquets) sur cet appareil ? Cette action est définitive.')) return;
    void toutEffacer().then(() => setMessage('Partie effacée : tu repars de zéro, avec trois paquets.'));
  };

  const dernierExport = sauvegarde.dernierExport ? new Date(sauvegarde.dernierExport.le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <main className="ecran">
      <Entete surtitre="Réglages" titre="Réglages et crédits" />

      <section className="bloc">
        <h2>Contenu et confort</h2>
        {OPTIONS.map((option) => (
          <label key={option.cle} className="option">
            <input type="checkbox" checked={sauvegarde.reglages[option.cle]} onChange={(e) => changerUnReglage(option.cle, e.target.checked)} />
            <span><strong>{option.nom}</strong><span className="texte-doux petit">{option.aide}</span></span>
          </label>
        ))}
        <label className="option option--liste">
          <span><strong>Temps pour répondre en duel</strong><span className="texte-doux petit">Le temps accordé pour retrouver la définition de son mot ({EQUILIBRAGE.duel.secondesPourRepondre} secondes dans le jeu normal).</span></span>
          <select value={sauvegarde.reglages.tempsDeReponse} onChange={(e) => changerUnReglage('tempsDeReponse', TEMPS_DE_REPONSE.find((t) => t === e.target.value) ?? 'normal')}>
            <option value="normal">Normal ({EQUILIBRAGE.duel.secondesPourRepondre} s)</option>
            <option value="double">Doublé ({EQUILIBRAGE.duel.secondesPourRepondre * 2} s)</option>
            <option value="illimite">Sans limite</option>
          </select>
        </label>
      </section>

      <section className="bloc bloc--a-venir">
        <span className="entete__surtitre">À l'essai</span>
        <h2>Police des timbres</h2>
        <p className="texte-doux petit">Trois polices à comparer sur de vraies cartes. Celle qui sera retenue restera seule dans le jeu.</p>
        {(Object.keys(POLICES) as Police[]).map((cle) => (
          <label key={cle} className="option">
            <input type="radio" name="police" checked={police === cle} onChange={() => { appliquerLaPolice(cle); setPolice(cle); }} />
            <span><strong>{POLICES[cle]}</strong></span>
          </label>
        ))}
      </section>

      <section className="bloc">
        <h2>Ta sauvegarde</h2>
        <p className="petit">
          Ta partie est enregistrée sur cet appareil ({partie.emplacement}{partie.stockageDurable ? ', protégée contre le nettoyage automatique du navigateur' : ''}).
          Sur iPhone, Safari peut effacer les données d'un site resté plusieurs jours sans visite : exporte ta sauvegarde de temps en temps.
        </p>
        <p className="texte-doux petit">{dernierExport ? `Dernier export : le ${dernierExport}.` : 'Tu n\'as encore jamais exporté ta sauvegarde.'}</p>
        <div className="rangee-de-boutons">
          <button type="button" className="bouton" onClick={exporter}>Exporter ma sauvegarde</button>
          <button type="button" className="bouton bouton--discret" onClick={() => fichier.current?.click()}>Importer une sauvegarde</button>
          <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => void importer(e.target.files?.[0])} />
        </div>
        {message && <p role="status" className="petit">{message}</p>}
        <button type="button" className="bouton bouton--danger" onClick={effacer}>Effacer ma partie</button>
      </section>

      <section className="bloc">
        <h2>Ce que contient un paquet</h2>
        <p className="texte-doux petit">
          Chances d'obtenir chaque rareté, carte par carte. Un paquet gratuit arrive toutes les {EQUILIBRAGE.paquets.minutesEntreDeuxPaquets} minutes
          (jusqu'à {EQUILIBRAGE.paquets.stockMaximum} en stock). Une Légendaire est garantie au plus tard au {EQUILIBRAGE.paquets.paquetsAvantLegendaireGarantie}ᵉ paquet sans Légendaire.
        </p>
        <div className="tableau-defilant">
          <table className="tableau">
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
          <strong>Hors-série</strong> (le rang ultime, des mots qui détiennent un record) : la dernière carte d'un paquet en est une environ 1 fois sur {Math.round(1 / EQUILIBRAGE.paquets.chanceHorsSerie).toLocaleString('fr-FR')}.{' '}
          <strong>Finitions</strong>, tirées à part pour chaque carte, quelle que soit sa rareté : brillante 1 fois sur {Math.round(1 / EQUILIBRAGE.finitions.chances.Brillante)}, holographique 1 fois sur {Math.round(1 / EQUILIBRAGE.finitions.chances.Holographique)}.
          Une finition que tu n'avais pas encore se garde ; seul un vrai doublon se change en Encre (×{EQUILIBRAGE.finitions.encre.Brillante} pour une brillante, ×{EQUILIBRAGE.finitions.encre.Holographique} pour une holographique).
        </p>
        <p className="texte-doux petit">
          Doublon changé en Encre : {RARETES.map((r) => `${r} ${EQUILIBRAGE.encreParDoublon[r]}`).join(' · ')}. Un paquet immédiat coûte {EQUILIBRAGE.paquets.prixEnEncre} Encre.
        </p>
      </section>

      <AVenir phase="phase 3">Allonger ou couper le chronomètre du duel · Couper le son.</AVenir>

      <section className="bloc">
        <h2>Crédits et sources</h2>
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
          Ce jeu ne collecte aucune donnée personnelle et n'utilise aucun outil de mesure d'audience.
        </p>
      </section>
    </main>
  );
}
