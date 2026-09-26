import { useRef, useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { SuppressionDuCompte } from '../composants/SuppressionDuCompte.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import type { ReglagesDuJoueur } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import { RARETES, RARETES_ORDINAIRES } from '../partage/types.ts';
import { compteConnecte } from '../services/connexion.ts';
import { telechargerUnFichier } from '../services/partage.ts';
import { changerUnReglage, exporterLaSauvegarde, importerUneSauvegarde } from '../services/partie.ts';
import { demanderConfirmation } from '../composants/Confirmation.tsx';
import { messageDe } from '../partage/messages.ts';

import './reglages.css';

// Les réglages à cocher (ceux qui valent « oui » ou « non »).
type ReglageACocher = { [C in keyof ReglagesDuJoueur]: ReglagesDuJoueur[C] extends boolean ? C : never }[keyof ReglagesDuJoueur];

const OPTIONS_CONTENU: { cle: ReglageACocher; nom: string }[] = [
  { cle: 'masquerFamiliers', nom: 'Masquer les mots familiers' },
  { cle: 'masquerInjurieux', nom: 'Masquer les mots injurieux' },
];
const OPTIONS_CONFORT: typeof OPTIONS_CONTENU = [
  { cle: 'sonsPaquets', nom: 'Sons du jeu' }, // la clé garde son premier nom : les sauvegardes existantes restent valables
  { cle: 'reduireAnimations', nom: 'Réduire les animations' },
];

const enToutesLettres = (quand: number): string => new Date(quand).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function Reglages() {
  const partie = usePartie();
  const fichier = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [connecte] = useState(compteConnecte);
  if (partie.etat !== 'prete') return <main className="ecran"><h1 className="visuellement-cache">Réglages</h1><p className="texte-doux">Chargement…</p></main>;
  const { sauvegarde } = partie;
  // En ligne, le serveur garde la collection : le fichier n'est qu'une copie à consulter. Sans serveur, c'est la sauvegarde.
  const surLeServeur = partie.serveur.etat !== 'appareil';

  const exporter = (): void => {
    const sortie = exporterLaSauvegarde();
    if (!sortie) return;
    telechargerUnFichier(sortie.nom, new Blob([sortie.contenu], { type: 'application/json' }));
    setMessage(surLeServeur ? `Copie téléchargée : ${sortie.nom}.` : `Sauvegarde exportée : ${sortie.nom}.`);
  };

  const importer = async (choisi: File | undefined): Promise<void> => {
    if (!choisi) return;
    try {
      const texte = await choisi.text();
      if (!(await demanderConfirmation({
        titre: 'Importer cette sauvegarde ?', message: 'Ce fichier remplacera ta partie actuelle sur cet appareil.', confirmer: 'Importer', danger: true,
      }))) return;
      importerUneSauvegarde(texte);
      setMessage('Sauvegarde importée : ta collection est restaurée.');
    } catch (erreur) {
      setMessage(messageDe(erreur));
    } finally {
      if (fichier.current) fichier.current.value = '';
    }
  };

  const dernierExport = sauvegarde.dernierExport ? enToutesLettres(sauvegarde.dernierExport.le) : null;
  const codeLe = partie.compte?.codeDeSecoursLe ?? null;

  return (
    <main className="ecran panneaux reglages">
      <Entete titre="Réglages" />

      <div className="reglages__preferences">
        <section className="rubrique">
          <h2>Son et confort</h2>
          {OPTIONS_CONFORT.map((option) => (
            <label key={option.cle} className="option">
              <input type="checkbox" checked={sauvegarde.reglages[option.cle]} onChange={(e) => changerUnReglage(option.cle, e.target.checked)} />
              <strong>{option.nom}</strong>
            </label>
          ))}

        </section>

        <section className="rubrique">
          <h2>Les mots de ta collection</h2>
          <p className="texte-doux petit">Tous les mots de la langue sont dans le jeu. Masqués, les mots familiers ou injurieux ne sortent plus des paquets et disparaissent de ton album et de tes duels.</p>
          {OPTIONS_CONTENU.map((option) => (
            <label key={option.cle} className="option">
              <input type="checkbox" checked={sauvegarde.reglages[option.cle]} onChange={(e) => changerUnReglage(option.cle, e.target.checked)} />
              <strong>{option.nom}</strong>
            </label>
          ))}
        </section>
      </div>

      <div className="reglages__gestion">
        {surLeServeur ? <>
          <section className="rubrique">
            <h2>Protéger ta collection</h2>
            {connecte
              ? <p className="petit">Ta collection est reliée à ton compte : tu la retrouves sur tous tes appareils.</p>
              : <p className="petit">Tu joues en invité : ta collection n’est liée qu’à ce navigateur. Crée un compte (Google ou e-mail) ou un code de secours pour la retrouver partout.</p>}
            {codeLe !== null && <p className="texte-doux petit">Ton code de secours a été créé le {enToutesLettres(codeLe)}.</p>}
            <div className="rangee-de-boutons"><a className="bouton" href={lien({ ecran: 'compte' })}>{connecte ? 'Mon compte' : 'Protéger ma collection'}</a></div>
          </section>

          <section className="rubrique">
            <h2>Tes données</h2>
            <p className="petit">Tu peux télécharger une copie de ta collection et de ta progression, pour la consulter ou la garder. Elle ne se réimporte pas : c’est le serveur du jeu qui garde ta collection.</p>
            {sauvegarde.ancienneProgression && <p className="texte-doux petit">Ton ancienne progression sur cet appareil ({sauvegarde.ancienneProgression.xp.toLocaleString('fr-FR')} XP) figure aussi dans cette copie.</p>}
            <div className="rangee-de-boutons">
              <button type="button" className="bouton bouton--discret" onClick={exporter}>Télécharger une copie</button>
            </div>
            {message && <p role="status" className="petit">{message}</p>}
            <SuppressionDuCompte />
          </section>
        </> : (
          <section className="rubrique">
            <h2>Ta sauvegarde</h2>
            <p className="petit">
              {partie.emplacement === 'mémoire seulement'
                ? 'Ta partie sera perdue à la fermeture de la page. Exporte-la pour la conserver.'
                : 'Ta partie est enregistrée sur cet appareil uniquement.'}
            </p>
            {dernierExport && <p className="texte-doux petit">Dernier export : {dernierExport}.</p>}
            <div className="rangee-de-boutons">
              <button type="button" className="bouton" onClick={exporter}>Exporter ma sauvegarde</button>
              <button type="button" className="bouton bouton--discret" onClick={() => fichier.current?.click()}>Importer une sauvegarde</button>
              <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => void importer(e.target.files?.[0])} />
            </div>
            {message && <p role="status" className="petit">{message}</p>}
            <SuppressionDuCompte />
          </section>
        )}

        <a className="reglages__confidentialite" href={lien({ ecran: 'confidentialite' })}>Confidentialité <span aria-hidden="true">→</span></a>

        <details className="rubrique repliable">
          <summary><h2>Paquets et probabilités</h2></summary>
          <p className="texte-doux petit">
            Un paquet gratuit toutes les {EQUILIBRAGE.paquets.minutesEntreDeuxPaquets} minutes, jusqu’à {EQUILIBRAGE.paquets.stockMaximum} en réserve.
            Une Légendaire garantie au plus tard au {EQUILIBRAGE.paquets.paquetsAvantLegendaireGarantie}ᵉ paquet sans Légendaire.
          </p>
          <div className="tableau-defilant">
            <table className="tableau">
              <caption>Chances par rareté et position dans le paquet</caption>
              <thead>
                <tr><th scope="col">Place</th>{RARETES_ORDINAIRES.map((r) => <th key={r} scope="col">{r}</th>)}</tr>
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
            <strong>Paquets d’exception :</strong> {EQUILIBRAGE.paquets.emplacements.length} Légendaires holographiques environ 1 paquet sur {Math.round(1 / EQUILIBRAGE.paquets.paquetsDException['Légendaire']).toLocaleString('fr-FR')} ;
            {' '}{EQUILIBRAGE.paquets.emplacements.length} Hors-série environ 1 sur {Math.round(1 / EQUILIBRAGE.paquets.paquetsDException['Hors-série']).toLocaleString('fr-FR')}. Jamais parmi les paquets de départ.
          </p>
          <p className="texte-doux petit">
            <strong>Finitions :</strong> brillante 1 sur {Math.round(1 / EQUILIBRAGE.finitions.chances.Brillante)}, holographique 1 sur {Math.round(1 / EQUILIBRAGE.finitions.chances.Holographique)}, tirées indépendamment de la rareté.
            Chaque nouvelle finition est conservée. Les doublons deviennent de l’Encre (×{EQUILIBRAGE.finitions.encre.Brillante} si brillants, ×{EQUILIBRAGE.finitions.encre.Holographique} si holographiques).
          </p>
          <p className="texte-doux petit">
            Encre par doublon : {RARETES.map((r) => `${r} ${EQUILIBRAGE.encreParDoublon[r]}`).join(' · ')}. L’Encre sert à la boutique et aux enchères du marché.
          </p>
        </details>

        <details className="rubrique repliable">
          <summary><h2>Crédits et sources</h2></summary>
          <p>
            Les définitions et les étymologies sont adaptées (raccourcies, nettoyées) du{' '}
            <a href="https://fr.wiktionary.org" target="_blank" rel="noreferrer">Wiktionnaire</a>, le dictionnaire libre,
            sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
            Chaque fiche de timbre renvoie vers la page du mot, où figure la liste de ses auteurs.
            Données extraites grâce au projet wiktextract (kaikki.org).
          </p>
          <p>
            La fréquence des mots et la part des gens qui les connaissent viennent de{' '}
            <a href="http://www.lexique.org" target="_blank" rel="noreferrer">Lexique 4</a>, sous licence CC BY-SA 4.0 :
            New, B., Pallier, C., Schalchli, G., Bourgin, J., &amp; Gimenes, M. (2026). Lexique 4: A major upgrade of the
            “Lexique” French lexical database. <em>Behavior Research Methods</em>, 58(5), 140.
          </p>
          <p className="texte-doux petit">
            Les données des timbres du jeu, tirées de ces deux sources, sont elles aussi sous licence CC BY-SA 4.0.
            Ce jeu n’utilise ni publicité ni outil de mesure d’audience ; ce qu’il garde est décrit à la page{' '}
            <a href={lien({ ecran: 'confidentialite' })}>Confidentialité</a>.
          </p>
        </details>
      </div>
    </main>
  );
}
