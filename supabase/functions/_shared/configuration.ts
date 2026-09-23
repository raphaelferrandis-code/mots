import type { Configuration } from './paiements.ts';
// Déclaration minimale pour le contrôle TypeScript local ; l'objet est fourni par Deno.
declare const Deno: { env: { get(nom: string): string | undefined } };
export function configuration(): Configuration {
  const lire = (nom: string) => { const valeur = Deno.env.get(nom); if (!valeur) throw new Error(`Configuration manquante : ${nom}`); return valeur; };
  return {
    supabase: lire('SUPABASE_URL'), service: lire('SUPABASE_SERVICE_ROLE_KEY'),
    stripe: lire('STRIPE_SECRET_KEY'), signature: lire('STRIPE_WEBHOOK_SECRET'),
    site: lire('SITE_URL'), testeurs: lire('STRIPE_TEST_USER_IDS').split(',').map(s => s.trim()).filter(Boolean),
  };
}
