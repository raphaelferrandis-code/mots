import { useEffect, useState } from 'react';
import { Entete } from '../composants/Entete.tsx';
import { lien } from '../navigation/routes.ts';
import { serveurUtilise } from '../services/compte.ts';
import { demarrerLaPartie, synchroniser } from '../services/partie.ts';
import { authentification, connexionGoogle, erreurDuRetour, installerConnexion, verifierStockageConnexion } from '../services/connexion.ts';
import type { ModeConnexion, Utilisateur, VerificationMail } from '../services/authentification.ts';
import './compte.css';

export function Compte() {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(serveurUtilise);
  const [mode, setMode] = useState<ModeConnexion>('creation');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [attente, setAttente] = useState<VerificationMail | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(erreurDuRetour);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!serveurUtilise) return;
    let actif = true;
    void (async () => {
      try {
        await demarrerLaPartie();
        await synchroniser();
        const u = await authentification.utilisateur();
        if (actif) setUtilisateur(u);
      } catch {
        if (actif) { setMode('connexion'); setMessage('Connecte-toi pour retrouver ton compte, ou utilise ton code de secours dans le Profil.'); }
      } finally { if (actif) setChargement(false); }
    })();
    return () => { actif = false; };
  }, []);

  async function agir(action: () => Promise<void>) {
    if (occupe) return;
    setOccupe(true); setErreur(null); setMessage('');
    try { await action(); }
    catch (e) { setErreur(e instanceof Error ? e.message : 'Connexion impossible. Réessaie.'); }
    finally { setOccupe(false); }
  }
  async function preparerCreation() {
    verifierStockageConnexion();
    if (mode === 'creation' && !(await synchroniser())) throw new Error('Attends que ta collection soit synchronisée avant de créer ton compte. Réessaie dans un instant.');
  }
  async function envoyer() {
    await preparerCreation();
    setAttente(await authentification.envoyerCode(email, mode));
    setCode(''); setMessage('Si cette adresse peut recevoir un code, un e-mail vient de lui être envoyé. Pense à vérifier les indésirables.');
  }
  async function verifier() {
    if (!attente) return;
    verifierStockageConnexion();
    const session = await authentification.verifierCode(attente, code);
    installerConnexion(session, attente.type === 'email_change');
    window.location.reload();
  }

  return <main className="ecran compte">
    <Entete titre="Mon compte" />
    <section className="rubrique compte__carte" aria-busy={occupe || chargement}>
      <div className="compte__sceau" aria-hidden="true">P</div>
      {!serveurUtilise ? <><h2>Connexion indisponible ici</h2><p>La création de compte nécessite le serveur du jeu. Elle est disponible sur le site en ligne.</p></>
        : chargement ? <p role="status">Chargement de ton compte…</p>
        : utilisateur && !utilisateur.is_anonymous ? <>
          <h2>Ta collection te suit</h2>
          <p>Connecté avec <strong>{utilisateur.email ?? 'Google'}</strong>.</p>
          <a className="bouton" href={lien({ ecran: 'collection' })}>Voir ma collection</a>
          <button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(async () => {
            verifierStockageConnexion(); await authentification.deconnecter();
            installerConnexion(null, false); window.location.reload();
          })}>{occupe ? 'Déconnexion…' : 'Se déconnecter'}</button>
        </> : <>
          <h2>{mode === 'creation' ? 'Garde tes timbres près de toi' : 'Retrouve ta collection'}</h2>
          <div className="compte__modes" role="group" aria-label="Créer un compte ou se connecter">
            {(['creation', 'connexion'] as const).map(m => <button key={m} type="button" aria-pressed={mode === m} disabled={occupe} onClick={() => { setMode(m); setAttente(null); setCode(''); setErreur(null); setMessage(''); }}>{m === 'creation' ? 'Créer un compte' : 'Se connecter'}</button>)}
          </div>
          {mode === 'connexion' && <p className="petit">La collection de ce compte sera chargée. Elle ne sera pas fusionnée avec celle de cet appareil. Si tu jouais en invité, protège d’abord tes timbres en créant un compte ou un <a href={lien({ ecran: 'profil' })}>code de secours</a>.</p>}
          {!attente ? <>
            <button type="button" className="bouton compte__google" disabled={occupe} onClick={() => void agir(async () => { await preparerCreation(); await connexionGoogle(mode); })}><span aria-hidden="true">G</span> Continuer avec Google</button>
            <div className="compte__separation">ou par e-mail</div>
            <form className="compte__formulaire" onSubmit={e => { e.preventDefault(); void agir(envoyer); }}>
              <label htmlFor="connexion-email">Adresse e-mail</label>
              <input id="connexion-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} disabled={occupe} onChange={e => setEmail(e.target.value)} placeholder="toi@exemple.fr" />
              <button className="bouton" type="submit" disabled={occupe}>{occupe ? 'Connexion en cours…' : 'Recevoir mon code'}</button>
            </form>
          </> : <form className="compte__formulaire" onSubmit={e => { e.preventDefault(); void agir(verifier); }}>
            <p>Code envoyé à <strong>{attente.email}</strong>.</p>
            <label htmlFor="connexion-code">Code de vérification</label>
            <input id="connexion-code" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus pattern="[0-9 ]{6,12}" required maxLength={12} value={code} disabled={occupe} onChange={e => setCode(e.target.value)} />
            <button type="submit" className="bouton" disabled={occupe}>{occupe ? 'Vérification…' : mode === 'creation' ? 'Valider mon compte' : 'Me connecter'}</button>
            <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(envoyer)}>Renvoyer un code</button>
            <button type="button" className="bouton bouton--discret" disabled={occupe} onClick={() => { setAttente(null); setCode(''); setMessage(''); setErreur(null); }}>Changer d’adresse</button>
          </form>}
        </>}
      {erreur && <p className="compte__erreur" role="alert">{erreur}</p>}
      {message && <p className="petit" role="status">{message}</p>}
      <p className="petit texte-doux"><a href={lien({ ecran: 'confidentialite' })}>Confidentialité</a> · <a href={lien({ ecran: 'profil' })}>Profil et code de secours</a></p>
    </section>
    <a className="compte__retour" href={lien({ ecran: 'accueil' })}>Revenir au jeu</a>
  </main>;
}
