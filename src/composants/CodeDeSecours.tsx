// Le code de secours (décision n° 36) : de quoi retrouver sa collection sur un autre appareil, même sans compte Google
// ou e-mail. Le jeu le tire, le serveur n'en garde que l'empreinte : il est montré une seule fois, quand on le crée.
// En dessous, le formulaire qui retrouve une collection avec un code.
// Il vit sur la page Mon compte, avec la connexion (il était rangé dans un volet du profil : audit du 26/09/2026).

import { useState } from 'react';
import type { FormEvent } from 'react';
import { usePartie } from './usePartie.ts';
import { definirUnCodeDeSecours, recupererAvecUnCode } from '../services/partie.ts';
import { demanderConfirmation } from './Confirmation.tsx';
import { messageDe } from '../partage/messages.ts';

const enToutesLettres = (quand: number): string => new Date(quand).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function CodeDeSecours() {
  const partie = usePartie();
  const [code, setCode] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [recuperation, setRecuperation] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (partie.etat !== 'prete' || partie.serveur.etat === 'appareil') return null;
  const creeLe = partie.compte?.codeDeSecoursLe ?? null;

  const creerUnCode = async (): Promise<void> => {
    if (creeLe && !(await demanderConfirmation({
      titre: 'Tirer un nouveau code ?', message: 'Un nouveau code annule l’ancien : seul celui qui va s’afficher permettra de retrouver ta collection.', confirmer: 'Tirer un nouveau code',
    }))) return;
    setOccupe(true);
    setMessage(null);
    try { setCode(await definirUnCodeDeSecours()); } catch (erreur) { setMessage(messageDe(erreur)); } finally { setOccupe(false); }
  };

  const copierLeCode = async (): Promise<void> => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setMessage('Code copié.'); } catch { setMessage('Le navigateur n’a pas voulu copier : note le code à la main.'); }
  };

  const recuperer = async (evenement: FormEvent): Promise<void> => {
    evenement.preventDefault();
    if (!(await demanderConfirmation({
      titre: 'Retrouver cette collection ?', message: 'La collection attachée à ce code remplacera celle de cet appareil.', confirmer: 'Remplacer par ma collection', danger: true,
    }))) return;
    setOccupe(true);
    setMessage(null);
    try {
      const retrouvee = await recupererAvecUnCode(saisie);
      setRecuperation(false);
      setSaisie('');
      setMessage(`Collection retrouvée : ${retrouvee.timbres} timbre${retrouvee.timbres > 1 ? 's' : ''}${retrouvee.profil ? `, et ton pseudonyme « ${retrouvee.profil.pseudo} »` : ''}.`);
    } catch (erreur) { setMessage(messageDe(erreur)); } finally { setOccupe(false); }
  };

  return (
    <section className="rubrique compte__carte code-secours" aria-labelledby="titre-code-de-secours">
      <h2 id="titre-code-de-secours">Code de secours</h2>
      <p className="petit">Il permet de retrouver ta collection sur un autre appareil, même sans compte Google ou e-mail. Il ne s’affiche qu’une fois : note-le quelque part de sûr.</p>
      {code ? (
        <div className="code-de-secours" role="status">
          <p className="petit"><strong>Note ce code maintenant : il ne sera plus affiché.</strong></p>
          <code className="code-de-secours__code">{code}</code>
          <div className="rangee-de-boutons">
            <button type="button" className="bouton bouton--discret" onClick={() => void copierLeCode()}>Copier</button>
            <button type="button" className="bouton bouton--discret" onClick={() => { setCode(null); setMessage(null); }}>J’ai noté mon code</button>
          </div>
        </div>
      ) : (
        <>
          {creeLe && <p className="texte-doux petit">Ton code actuel a été créé le {enToutesLettres(creeLe)}.</p>}
          <div className="rangee-de-boutons">
            <button type="button" className="bouton" disabled={occupe} onClick={() => void creerUnCode()}>{creeLe ? 'Tirer un nouveau code' : 'Créer mon code de secours'}</button>
            {!recuperation && <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => { setRecuperation(true); setMessage(null); }}>Retrouver ma collection avec un code</button>}
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
      {message && <p role="status" className="petit">{message}</p>}
    </section>
  );
}
