// Le bouton « Continuer avec Google » de Mon compte. Rien de Google ne se charge avant que le joueur le demande (la
// page Confidentialité promet : pas de pistage, pas de bandeau) : le premier bouton est le nôtre ; le toucher charge
// le bouton de Google lui-même (services/boutonGoogle.ts), qui ouvre le choix du compte Google. Google rend alors un
// jeton d'identité : « surJeton » le reçoit, avec le nombre au hasard (nonce) dont Google a reçu l'empreinte. Si le
// bouton de Google ne vient pas (bloqueur, réseau), le joueur est envoyé vers la connexion par e-mail.
import { useEffect, useRef, useState } from 'react';
import { SERVEUR } from '../config/serveur.ts';
import { nouveauNonce } from '../services/authentification.ts';
import { GOOGLE_INDISPONIBLE, chargerGoogle } from '../services/boutonGoogle.ts';

// Le « G » de Google en couleurs, que ses règles de marque demandent sur un bouton de connexion (audit de finition du
// 26/09/2026, E29).
export function LogoGoogle() {
  return (
    <svg className="compte__logo-google" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

type Rappel = (jeton: string, nonce: string) => void;

export function BoutonGoogle({ surJeton, occupe }: { surJeton: Rappel; occupe: boolean }) {
  const [demande, setDemande] = useState(false);
  if (!demande) return <button type="button" className="bouton compte__google" disabled={occupe} onClick={() => setDemande(true)}><LogoGoogle /> Continuer avec Google</button>;
  return <LeBoutonDeGoogle surJeton={surJeton} />;
}

function LeBoutonDeGoogle({ surJeton }: { surJeton: Rappel }) {
  const conteneur = useRef<HTMLDivElement>(null);
  // Le bouton de Google garde la fonction qu'on lui donne au départ : elle passe par ce relais, toujours à jour
  // (le mode choisi, « Créer un compte » ou « Se connecter », peut changer après coup).
  const relais = useRef(surJeton);
  useEffect(() => { relais.current = surJeton; });
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'indisponible'>('chargement');

  useEffect(() => {
    let actif = true;
    void (async () => {
      try {
        const [google, nonce] = await Promise.all([chargerGoogle(), nouveauNonce()]);
        const cible = conteneur.current;
        if (!actif || !cible) return;
        google.initialize({
          client_id: SERVEUR.clientGoogle, nonce: nonce.empreinte, auto_select: false, ux_mode: 'popup', context: 'signin',
          callback: (reponse) => { if (reponse.credential) relais.current(reponse.credential, nonce.brut); },
        });
        // La largeur de la carte (le cadre, vide jusque-là, est caché) : Google accepte de 200 à 400 pixels.
        const largeur = cible.parentElement?.clientWidth ?? 0;
        google.renderButton(cible, {
          type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left',
          locale: 'fr', width: Math.round(Math.min(400, Math.max(200, largeur))),
        });
        setEtat('pret');
      } catch { if (actif) setEtat('indisponible'); }
    })();
    return () => { actif = false; };
  }, []);

  return (
    <div className="bouton-google">
      <div ref={conteneur} className="bouton-google__cadre" />
      {etat === 'chargement' && <p className="petit texte-doux" role="status">Chargement du bouton de Google…</p>}
      {etat === 'pret' && <p className="petit texte-doux" role="status">Touche le bouton de Google pour choisir ton compte.</p>}
      {etat === 'indisponible' && <p className="petit" role="alert">{GOOGLE_INDISPONIBLE}</p>}
    </div>
  );
}
