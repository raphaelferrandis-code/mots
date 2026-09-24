import { useRef, useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { nomDeLaFormule } from '../jeu/formule.ts';
import { TEMPS_DE_REPONSE } from '../jeu/sauvegarde.ts';
import type { ReglagesDuJoueur } from '../jeu/sauvegarde.ts';
import { lien } from '../navigation/routes.ts';
import { RARETES, RARETES_ORDINAIRES } from '../partage/types.ts';
import { effacerLaPartieEtLeProfil } from '../services/joutes.ts';
import { telechargerUnFichier } from '../services/partage.ts';
import { changerUnReglage, definirUnCodeDeSecours, exporterLaSauvegarde, importerUneSauvegarde, recupererAvecUnCode } from '../services/partie.ts';

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

export function Reglages() {
  const partie = usePartie();
  const fichier = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Le code de secours : montré une seule fois quand on le crée ; et le formulaire pour retrouver une collection.
  const [code, setCode] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [recuperation, setRecuperation] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [messageDuCompte, setMessageDuCompte] = useState<string | null>(null);

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
  const creerUnCode = async (): Promise<void> => {
    if (partie.etat === 'prete' && partie.compte?.codeDeSecoursLe && !window.confirm("Un nouveau code annule l'ancien. Continuer ?")) return;
    setOccupe(true);
    setMessageDuCompte(null);
    try { setCode(await definirUnCodeDeSecours()); } catch (erreur) { setMessageDuCompte(erreur instanceof Error ? erreur.message : String(erreur)); } finally { setOccupe(false); }
  };

  const copierLeCode = async (): Promise<void> => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setMessageDuCompte('Code copié.'); } catch { setMessageDuCompte("Le navigateur n'a pas voulu copier : note le code à la main."); }
  };

  const recuperer = async (evenement: React.FormEvent): Promise<void> => {
    evenement.preventDefault();
    if (!window.confirm('La collection attachée à ce code remplacera celle de cet appareil. Continuer ?')) return;
    setOccupe(true);
    setMessageDuCompte(null);
    try {
      const retrouvee = await recupererAvecUnCode(saisie);
      setRecuperation(false);
      setSaisie('');
      setMessageDuCompte(`Collection retrouvée : ${retrouvee.timbres} timbre${retrouvee.timbres > 1 ? 's' : ''}${retrouvee.profil ? `, et ton profil de joute « ${retrouvee.profil.pseudo} »` : ''}.`);
    } catch (erreur) { setMessageDuCompte(erreur instanceof Error ? erreur.message : String(erreur)); } finally { setOccupe(false); }
  };

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
              <strong>{option.nom}</strong>
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
          {OPTIONS_CONTENU.map((option) => (
            <label key={option.cle} className="option">
              <input type="checkbox" checked={sauvegarde.reglages[option.cle]} onChange={(e) => changerUnReglage(option.cle, e.target.checked)} />
              <strong>{option.nom}</strong>
            </label>
          ))}
        </section>
      </div>

      <div className="reglages__gestion">
        <section className="rubrique">
          <h2>Ta sauvegarde</h2>
          {sauvegarde.ancienneProgression && <p className="bloc petit">Ton ancienne progression locale ({sauvegarde.ancienneProgression.xp} XP) est conservée dans le fichier exporté, dans « ancienneProgression ». Elle reste disponible pour une reprise après validation.</p>}
          <p className="petit">
            {partie.serveur.etat !== 'appareil'
              ? 'Le fichier exporté ne peut pas être réimporté.'
              : partie.emplacement === 'mémoire seulement'
                ? 'Ta partie sera perdue à la fermeture de la page. Exporte-la pour la conserver.'
                : 'Sauvegarde sur cet appareil uniquement.'}
          </p>
          {dernierExport && <p className="texte-doux petit">Dernier export : {dernierExport}.</p>}
          <div className="rangee-de-boutons">
            <button type="button" className="bouton" onClick={exporter}>Exporter ma sauvegarde</button>
            {partie.serveur.etat === 'appareil' && <button type="button" className="bouton bouton--discret" onClick={() => fichier.current?.click()}>Importer une sauvegarde</button>}
            <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => void importer(e.target.files?.[0])} />
          </div>
          {message && <p role="status" className="petit">{message}</p>}
          <button type="button" className="bouton bouton--danger" onClick={() => void effacer()}>Effacer ma partie</button>
        </section>

        {partie.serveur.etat !== 'appareil' && (
          <section className="rubrique">
            <h2>Ton compte</h2>
            <a className="bouton" href={lien({ ecran: 'compte' })}>Créer un compte ou se connecter</a>
            {partie.compte && nomDeLaFormule(partie.compte.formule) && (
              <p className="petit">
                <strong>Formule « {nomDeLaFormule(partie.compte.formule)} ».</strong>
                {partie.compte.formule.jusquAu !== null && ` Jusqu'au ${new Date(partie.compte.formule.jusquAu).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
                {partie.compte.formule.encreAchetee > 0 && ` Tu as ${partie.compte.formule.encreAchetee} Encre achetée, utilisable au marché seulement.`}
                {' '}<a href={lien({ ecran: 'formules' })}>Voir ce que donne chaque formule</a>
              </p>
            )}
            {code ? (
              <div className="code-de-secours" role="status">
                <p className="petit"><strong>Note ce code quelque part de sûr : il ne sera plus affiché.</strong></p>
                <code className="code-de-secours__code">{code}</code>
                <div className="rangee-de-boutons">
                  <button type="button" className="bouton bouton--discret" onClick={() => void copierLeCode()}>Copier</button>
                  <button type="button" className="bouton bouton--discret" onClick={() => { setCode(null); setMessageDuCompte(null); }}>J'ai noté mon code</button>
                </div>
              </div>
            ) : (
              <>
                {partie.compte?.codeDeSecoursLe && <p className="texte-doux petit">Code créé le {new Date(partie.compte.codeDeSecoursLe).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
                <div className="rangee-de-boutons">
                  <button type="button" className="bouton" disabled={occupe} onClick={() => void creerUnCode()}>{partie.compte?.codeDeSecoursLe ? 'Créer un nouveau code' : 'Créer mon code de secours'}</button>
                  {!recuperation && <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => { setRecuperation(true); setMessageDuCompte(null); }}>Retrouver ma collection avec un code</button>}
                </div>
              </>
            )}
            {recuperation && (
              <form className="joute__saisie" onSubmit={(e) => void recuperer(e)}>
                <label htmlFor="code-de-secours"><strong>Code de secours</strong></label>
                <input id="code-de-secours" type="text" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="PHIL-XXXXX-XXXXX-XXXXX-XXXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
                <div className="rangee-de-boutons">
                  <button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Recherche…' : 'Retrouver ma collection'}</button>
                  <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => { setRecuperation(false); setSaisie(''); }}>Annuler</button>
                </div>
              </form>
            )}
            {messageDuCompte && <p role="status" className="petit">{messageDuCompte}</p>}
          </section>
        )}

        <section className="rubrique">
          <h2>Confidentialité</h2>
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
            Encre par doublon : {RARETES.map((r) => `${r} ${EQUILIBRAGE.encreParDoublon[r]}`).join(' · ')}. L’Encre sert uniquement aux enchères.
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
