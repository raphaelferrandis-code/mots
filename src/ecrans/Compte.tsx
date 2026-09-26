import { useEffect, useState } from 'react';
import { CodeDeSecours } from '../composants/CodeDeSecours.tsx';
import { Entete } from '../composants/Entete.tsx';
import { SuppressionDuCompte } from '../composants/SuppressionDuCompte.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { nomDeLaFormule } from '../jeu/formule.ts';
import { lien } from '../navigation/routes.ts';
import { messageDe } from '../partage/messages.ts';
import { serveurUtilise } from '../services/compte.ts';
import { demarrerLaPartie, synchroniser } from '../services/partie.ts';
import { authentification, connexionGoogle, deconnecter, erreurDuRetour, installerConnexion, verifierStockageConnexion } from '../services/connexion.ts';
import type { ModeConnexion, Utilisateur, VerificationMail } from '../services/authentification.ts';
import './compte.css';

// Mon compte : tout ce qui protège la collection au même endroit — la connexion (Google ou e-mail), le code de secours,
// et la suppression du compte (audit de finition du 26/09/2026).
export function Compte() {
  const partie = usePartie();
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
        if (actif) { setMode('connexion'); setMessage('Connecte-toi pour retrouver ton compte, ou utilise ton code de secours, plus bas.'); }
      } finally { if (actif) setChargement(false); }
    })();
    return () => { actif = false; };
  }, []);

  async function agir(action: () => Promise<void>) {
    if (occupe) return;
    setOccupe(true); setErreur(null); setMessage('');
    try { await action(); }
    catch (e) { setErreur(messageDe(e)); }
    finally { setOccupe(false); }
  }
  async function preparerCreation() {
    verifierStockageConnexion();
    if (mode === 'creation' && !(await synchroniser())) throw new Error('Ta collection est encore en chargement. Réessaie dans un instant.');
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

  const formule = partie.etat === 'prete' && partie.compte ? partie.compte.formule : null;
  const nomDeFormule = formule ? nomDeLaFormule(formule) : null;

  return <main className="ecran compte">
    <Entete titre="Mon compte" />
    <section className="rubrique compte__carte" aria-busy={occupe || chargement}>
      {!serveurUtilise ? <><h2>Connexion indisponible ici</h2><p>La création de compte nécessite le serveur du jeu. Elle est disponible sur le site en ligne.</p></>
        : chargement ? <p role="status">Chargement de ton compte…</p>
        : utilisateur && !utilisateur.is_anonymous ? <>
          <h2>Ta collection te suit</h2>
          <p>Connecté avec <strong>{utilisateur.email ?? 'Google'}</strong>. Ta collection se retrouve sur tous tes appareils.</p>
          <a className="bouton" href={lien({ ecran: 'collection' })}>Ouvrir mon album</a>
          <button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(deconnecter)}>{occupe ? 'Déconnexion…' : 'Se déconnecter'}</button>
        </> : <>
          <h2>{mode === 'creation' ? 'Tu joues en invité' : 'Retrouve ta collection'}</h2>
          {mode === 'creation' && <p className="petit">Ta collection n’est liée qu’à ce navigateur : si tu en changes, ou si tu effaces ses données, elle est perdue. Crée un compte pour la retrouver sur tous tes appareils.</p>}
          <div className="compte__modes" role="group" aria-label="Créer un compte ou se connecter">
            {(['creation', 'connexion'] as const).map(m => <button key={m} type="button" aria-pressed={mode === m} disabled={occupe} onClick={() => { setMode(m); setAttente(null); setCode(''); setErreur(null); setMessage(''); }}>{m === 'creation' ? 'Créer un compte' : 'Se connecter'}</button>)}
          </div>
          {mode === 'connexion' && <p className="petit">La collection de ce compte sera chargée. Elle ne sera pas fusionnée avec celle de cet appareil. Si tu jouais en invité, protège d’abord tes timbres en créant un compte, ou un code de secours (plus bas).</p>}
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
      {nomDeFormule && formule && (
        <p className="petit">
          <strong>Formule « {nomDeFormule} ».</strong>
          {formule.jusquAu !== null && ` Jusqu’au ${new Date(formule.jusquAu).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`}
          {' '}<a href={lien({ ecran: 'formules' })}>Voir ce que donne chaque formule</a>
        </p>
      )}
    </section>
    <CodeDeSecours />
    {serveurUtilise && <section className="rubrique compte__carte compte__suppression" aria-labelledby="titre-suppression">
      <h2 id="titre-suppression">Supprimer mon compte</h2>
      <p className="petit">Ta collection, ton Encre, ton pseudonyme, tes amis et ton équipe sont effacés du serveur, sur tous tes appareils. C’est définitif.</p>
      <SuppressionDuCompte />
    </section>}
    <p className="petit texte-doux compte__pied"><a href={lien({ ecran: 'confidentialite' })}>Confidentialité</a> · <a href={lien({ ecran: 'accueil' })}>Revenir au jeu</a></p>
  </main>;
}
