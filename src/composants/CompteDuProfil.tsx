import { useState } from 'react';
import { usePartie } from './usePartie.ts';
import { nomDeLaFormule } from '../jeu/formule.ts';
import { lien } from '../navigation/routes.ts';
import { definirUnCodeDeSecours, recupererAvecUnCode } from '../services/partie.ts';
import { demanderConfirmation } from './Confirmation.tsx';
import { messageDe } from '../partage/messages.ts';
import '../ecrans/reglages.css';

export function CompteDuProfil() {
  const partie = usePartie();
  // Le code de secours : montré une seule fois quand on le crée ; et le formulaire pour retrouver une collection.
  const [code, setCode] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [recuperation, setRecuperation] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [messageDuCompte, setMessageDuCompte] = useState<string | null>(null);

  if (partie.etat !== 'prete' || partie.serveur.etat === 'appareil') return null;
  const creerUnCode = async (): Promise<void> => {
    if (partie.etat === 'prete' && partie.compte?.codeDeSecoursLe && !(await demanderConfirmation({
      titre: 'Tirer un nouveau code ?', message: 'Un nouveau code annule l’ancien : seul celui qui va s’afficher permettra de retrouver ta collection.', confirmer: 'Tirer un nouveau code',
    }))) return;
    setOccupe(true);
    setMessageDuCompte(null);
    try { setCode(await definirUnCodeDeSecours()); } catch (erreur) { setMessageDuCompte(messageDe(erreur)); } finally { setOccupe(false); }
  };

  const copierLeCode = async (): Promise<void> => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setMessageDuCompte('Code copié.'); } catch { setMessageDuCompte("Le navigateur n'a pas voulu copier : note le code à la main."); }
  };

  const recuperer = async (evenement: React.FormEvent): Promise<void> => {
    evenement.preventDefault();
    if (!(await demanderConfirmation({
      titre: 'Retrouver cette collection ?', message: 'La collection attachée à ce code remplacera celle de cet appareil.', confirmer: 'Remplacer par ma collection', danger: true,
    }))) return;
    setOccupe(true);
    setMessageDuCompte(null);
    try {
      const retrouvee = await recupererAvecUnCode(saisie);
      setRecuperation(false);
      setSaisie('');
      setMessageDuCompte(`Collection retrouvée : ${retrouvee.timbres} timbre${retrouvee.timbres > 1 ? 's' : ''}${retrouvee.profil ? `, et ton profil de joute « ${retrouvee.profil.pseudo} »` : ''}.`);
    } catch (erreur) { setMessageDuCompte(messageDe(erreur)); } finally { setOccupe(false); }
  };

  return (
    <details className="rubrique repliable profil-compte">
      <summary><h2>Mon compte</h2></summary>
      <div className="profil-compte__contenu">
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
    </div>
    </details>
  );
}
