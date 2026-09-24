import { ErreurCombat, gestionnaireCombat } from './api-combat.ts';
import type { CatalogueCombat } from './moteur-combat.ts';
import { hasardDuSysteme } from '../src/jeu/hasard.ts';
import { gestionnaireDirect } from './api-direct.ts';

export function creerRuntimeCombat(adresse: string, cleService: string, catalogue: CatalogueCombat, requete: typeof fetch = fetch, direct = false) {
  const base = adresse.replace(/\/+$/, '');
  return (direct ? gestionnaireDirect : gestionnaireCombat)({
    catalogue, hasard: hasardDuSysteme, maintenant: Date.now, identifiant: () => crypto.randomUUID(),
    async authentifier(jeton) {
      const r = await requete(`${base}/auth/v1/user`, { headers: { apikey: cleService, Authorization: `Bearer ${jeton}` }, signal: AbortSignal.timeout(15_000) });
      if (r.status === 401 || r.status === 403) return null;
      if (!r.ok) throw new ErreurCombat('Le service de connexion ne répond pas.',503);
      const u = await r.json() as { id?: string };
      return typeof u.id === 'string' ? u.id : null;
    },
    async rpc<T>(nom: string, parametres: Record<string, unknown>): Promise<T> {
      const r = await requete(`${base}/rest/v1/rpc/${nom}`, { method: 'POST', headers: { apikey: cleService, Authorization: `Bearer ${cleService}`, 'Content-Type': 'application/json' }, body: JSON.stringify(parametres), signal: AbortSignal.timeout(15_000) });
      const resultat = await r.json();
      if (!r.ok) {
        if (resultat?.code === 'P0001') throw new ErreurCombat(String(resultat.message), /avancé|déjà utilisé|définitif/.test(resultat.message) ? 409 : 400);
        throw new ErreurCombat('Le serveur des combats n’est pas disponible.',503);
      }
      return resultat as T;
    },
  });
}
