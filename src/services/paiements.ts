import { clientDuServeur, serveurUtilise } from './compte.ts';
import type { CleDeFormule } from '../jeu/formule.ts';
import { choisirModePaiements } from './mode-paiements.ts';

// Fermé par défaut, même après une publication normale du jeu.
const mode = choisirModePaiements(import.meta.env?.VITE_PAIEMENTS_TEST, import.meta.env?.VITE_PAIEMENTS_PRODUCTION);
export const paiementsDeTest = mode === 'test';
export const paiementsDisponibles = mode !== null;

export async function paiement(action: 'achat' | 'portail' | 'synchroniser', offre?: CleDeFormule): Promise<void> {
  if (!mode || !serveurUtilise) throw new Error('Les paiements ne sont pas ouverts.');
  const reponse = await clientDuServeur().appelerPaiement<{ url?: string }>({ action, ...(offre ? { offre } : {}) }, mode);
  if (action === 'synchroniser') return;
  if (!reponse.url) throw new Error('Le lien de paiement est indisponible.');
  const url = new URL(reponse.url);
  if (url.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)) throw new Error('Lien Stripe invalide.');
  window.location.assign(url.href);
}
