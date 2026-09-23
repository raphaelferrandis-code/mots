import { clientDuServeur, serveurUtilise } from './compte.ts';
import type { CleDeFormule } from '../jeu/formule.ts';

// Fermé par défaut, même après une publication normale du jeu.
export const paiementsDeTest = import.meta.env?.VITE_PAIEMENTS_TEST === 'true';

export async function paiement(action: 'achat' | 'portail' | 'synchroniser', offre?: CleDeFormule): Promise<void> {
  if (!paiementsDeTest || !serveurUtilise) throw new Error('Les paiements de test ne sont pas ouverts.');
  const reponse = await clientDuServeur().appelerPaiement<{ url?: string }>({ action, ...(offre ? { offre } : {}) });
  if (action === 'synchroniser') return;
  if (!reponse.url) throw new Error('Le lien de paiement est indisponible.');
  const url = new URL(reponse.url);
  if (url.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)) throw new Error('Lien Stripe invalide.');
  window.location.assign(url.href);
}
