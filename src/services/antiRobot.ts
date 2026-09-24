// Le contrôle anti-robot (Cloudflare Turnstile), demandé par Supabase avant d'ouvrir un compte ou d'envoyer un code
// de connexion : il empêche de fabriquer des comptes en série. Le plus souvent, il se fait sans que le joueur voie
// rien ; s'il a un doute, Cloudflare affiche une case à cocher en bas de l'écran.
// Le script de Cloudflare n'est chargé qu'au moment où un contrôle est nécessaire : un joueur qui a déjà son compte
// ne le charge jamais.

type Turnstile = {
  render: (conteneur: HTMLElement, reglages: Record<string, unknown>) => string;
  remove: (widget: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
// Au-delà, on renonce : la demande part sans jeton, et le serveur explique le refus.
const PATIENCE_MS = 120_000;

let chargement: Promise<Turnstile> | null = null;
function chargerTurnstile(): Promise<Turnstile> {
  chargement ??= new Promise<Turnstile>((resoudre, rejeter) => {
    if (window.turnstile) { resoudre(window.turnstile); return; }
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => window.turnstile ? resoudre(window.turnstile) : rejeter(new Error('Turnstile absent'));
    script.onerror = () => rejeter(new Error('Turnstile injoignable'));
    document.head.append(script);
  }).catch((erreur: unknown) => { chargement = null; throw erreur; });
  return chargement;
}

// Rend un jeton à usage unique (valable 5 minutes), ou undefined si le contrôle n'a pas pu se faire
// (script bloqué, réseau coupé, case jamais cochée).
export function creerAntiRobot(cle: string): () => Promise<string | undefined> {
  return async () => {
    let turnstile: Turnstile;
    try { turnstile = await chargerTurnstile(); } catch { return undefined; }
    return new Promise<string | undefined>((resoudre) => {
      const cadre = document.createElement('div');
      cadre.className = 'anti-robot';
      cadre.setAttribute('role', 'status');
      const consigne = document.createElement('p');
      consigne.className = 'anti-robot__consigne';
      consigne.textContent = 'Vérification anti-robot : coche la case pour continuer.';
      consigne.hidden = true;
      const place = document.createElement('div');
      cadre.append(consigne, place);
      document.body.append(cadre);

      let widget: string | undefined;
      let fini = false;
      const terminer = (jeton: string | undefined): void => {
        if (fini) return;
        fini = true;
        clearTimeout(minuterie);
        try { if (widget) turnstile.remove(widget); } catch { /* déjà retiré */ }
        cadre.remove();
        resoudre(jeton);
      };
      const minuterie = setTimeout(() => terminer(undefined), PATIENCE_MS);
      try {
        widget = turnstile.render(place, {
          sitekey: cle,
          language: 'fr',
          // Invisible, sauf si Cloudflare demande au joueur de cocher la case.
          appearance: 'interaction-only',
          callback: (jeton: string) => terminer(jeton),
          'error-callback': () => { terminer(undefined); return true; },
          'expired-callback': () => terminer(undefined),
          'timeout-callback': () => terminer(undefined),
          'before-interactive-callback': () => { consigne.hidden = false; cadre.classList.add('anti-robot--visible'); },
          'after-interactive-callback': () => { consigne.hidden = true; cadre.classList.remove('anti-robot--visible'); },
        });
      } catch { terminer(undefined); }
    });
  };
}
