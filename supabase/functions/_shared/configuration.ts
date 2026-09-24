import type { Configuration } from './paiements.ts';
import type { ModePaiement } from './stripe.ts';
// Déclaration minimale pour le contrôle TypeScript local ; l'objet est fourni par Deno.
declare const Deno: { env: { get(nom: string): string | undefined } };
export function configuration(mode: ModePaiement = 'test'): Configuration {
  const lire = (nom: string) => { const valeur = Deno.env.get(nom); if (!valeur) throw new Error(`Configuration manquante : ${nom}`); return valeur; };
  const reel = mode === 'production';
  return {
    supabase: lire('SUPABASE_URL'), service: lire('SUPABASE_SERVICE_ROLE_KEY'),
    stripe: lire(reel ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_SECRET_KEY'),
    signature: lire(reel ? 'STRIPE_LIVE_WEBHOOK_SECRET' : 'STRIPE_WEBHOOK_SECRET'),
    site: lire(reel ? 'SITE_URL_PRODUCTION' : 'SITE_URL'),
    testeurs: reel ? [] : lire('STRIPE_TEST_USER_IDS').split(',').map(s => s.trim()).filter(Boolean),
    mode, achatsOuverts: reel && Deno.env.get('PAIEMENTS_PRODUCTION_OUVERTS') === 'true',
  };
}
