// Le lien d'invitation par lequel un nouveau venu arrive (https://philamots.fr/?parrain=CODE). Le code est gardé sur
// l'appareil dès l'ouverture de la page, puis déclaré au serveur une fois le compte ouvert (services/partie.ts).
// Il survit ainsi à une connexion Google, qui efface l'adresse, et à une panne passagère.

import { PARAMETRE_D_INVITATION, codeDeLAdresse } from '../jeu/parrainage.ts';

const CLE = 'mots.invitation';

// Au chargement de la page (main.tsx) : garde le code, et le retire de l'adresse affichée.
export function retenirLInvitation(): void {
  const adresse = new URL(window.location.href);
  if (!adresse.searchParams.has(PARAMETRE_D_INVITATION)) return;
  const code = codeDeLAdresse(adresse.toString());
  adresse.searchParams.delete(PARAMETRE_D_INVITATION);
  history.replaceState(history.state, '', adresse.toString());
  if (code) try { localStorage.setItem(CLE, code); } catch { /* stockage refusé : l'invitation est perdue, pas le jeu */ }
}

export function invitationEnAttente(): string | null {
  try { return localStorage.getItem(CLE); } catch { return null; }
}

export function oublierLInvitation(): void {
  try { localStorage.removeItem(CLE); } catch { /* rien à oublier */ }
}

// Les filleuls dont les paquets viennent d'être versés au parrain. Le serveur ne l'annonce qu'une fois : l'appareil
// garde la nouvelle jusqu'à ce que le joueur la ferme, même si la page est quittée avant de l'afficher.
const CLE_NOUVELLES = 'mots.parrainage-nouvelles';
export function retenirLesFilleulsRecompenses(nouveaux: (string | null)[]): (string | null)[] {
  let gardes: (string | null)[] = [];
  try { gardes = JSON.parse(localStorage.getItem(CLE_NOUVELLES) ?? '[]'); } catch { /* rien de gardé */ }
  if (!Array.isArray(gardes)) gardes = [];
  const tous = [...gardes, ...nouveaux].filter((n): n is string | null => n === null || typeof n === 'string');
  try { if (tous.length > 0) localStorage.setItem(CLE_NOUVELLES, JSON.stringify(tous)); } catch { /* affichée une fois */ }
  return tous;
}
export function oublierLesFilleulsRecompenses(): void {
  try { localStorage.removeItem(CLE_NOUVELLES); } catch { /* rien à oublier */ }
}
