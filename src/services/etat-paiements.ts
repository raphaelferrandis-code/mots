import { SERVEUR } from '../config/serveur.ts';

// Une indisponibilité ou un serveur incompatible ferme l'interface.
export async function lireOuverturePaiements(requete: typeof fetch = fetch): Promise<boolean> {
  try {
    const r = await requete(`${SERVEUR.adresse}/functions/v1/paiement-production?action=etat`, {
      cache: 'no-store', signal: AbortSignal.timeout(8_000), headers: { apikey: SERVEUR.clePublique },
    });
    if (!r.ok) return false;
    const etat = await r.json();
    return etat.version === 'philamots-paiements-v1' && etat.mode === 'production' && etat.achatsOuverts === true;
  } catch { return false; }
}
