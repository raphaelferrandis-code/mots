// Le bouton « Continuer avec Google », dessiné par Google lui-même (Google Identity Services) — décision de Raphaël du
// 28/09/2026. La connexion se fait sur philamots.fr, sans détour par l'adresse de Supabase : l'écran de Google nomme donc
// philamots.fr, puis « Philamots » une fois la marque vérifiée par Google. Le script de Google n'est chargé qu'à
// l'affichage du bouton (Mon compte) ; la politique de sécurité du site l'autorise (vite.config.ts).

// Ce dont le jeu se sert dans la bibliothèque de Google (https://developers.google.com/identity/gsi/web/reference/js-reference).
type ReponseGoogle = { credential?: string };
export type IdentiteGoogle = {
  initialize(options: {
    client_id: string; callback: (reponse: ReponseGoogle) => void; nonce: string;
    auto_select?: boolean; ux_mode?: 'popup' | 'redirect'; context?: 'signin' | 'signup' | 'use';
  }): void;
  renderButton(parent: HTMLElement, options: {
    type?: 'standard' | 'icon'; theme?: 'outline' | 'filled_blue' | 'filled_black'; size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'; shape?: 'rectangular' | 'pill'; logo_alignment?: 'left' | 'center';
    width?: number; locale?: string;
  }): void;
};
type FenetreAvecGoogle = Window & { google?: { accounts?: { id?: IdentiteGoogle } } };

export const SCRIPT_DE_GOOGLE = 'https://accounts.google.com/gsi/client';
export const GOOGLE_INDISPONIBLE = 'Le bouton de Google ne s’affiche pas (réseau, bloqueur de publicité, ou navigateur qui refuse les connexions Google). Autorise Google pour ce site, ou connecte-toi par e-mail ci-dessous.';

// Un seul chargement du script par page ; un échec (réseau, bloqueur) permet de réessayer plus tard.
let chargement: Promise<IdentiteGoogle> | null = null;
export function chargerGoogle(): Promise<IdentiteGoogle> {
  chargement ??= new Promise<IdentiteGoogle>((resoudre, rejeter) => {
    const lire = (): IdentiteGoogle | undefined => (window as FenetreAvecGoogle).google?.accounts?.id;
    const deja = lire();
    if (deja) { resoudre(deja); return; }
    const script = document.createElement('script');
    script.src = SCRIPT_DE_GOOGLE;
    script.async = true;
    // Un bloqueur peut aussi laisser la demande sans réponse : au bout de 10 s, on le dit au joueur.
    const minuterie = window.setTimeout(() => rejeter(new Error(GOOGLE_INDISPONIBLE)), 10_000);
    script.onload = () => { window.clearTimeout(minuterie); const id = lire(); if (id) resoudre(id); else rejeter(new Error(GOOGLE_INDISPONIBLE)); };
    script.onerror = () => { window.clearTimeout(minuterie); rejeter(new Error(GOOGLE_INDISPONIBLE)); };
    document.head.append(script);
  }).catch((erreur: unknown) => { chargement = null; throw erreur; });
  return chargement;
}
