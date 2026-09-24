import { creerRuntimeCombat } from '../../../serveur/runtime-combat.ts';
import type { CarteIndex, Definition } from '../../../src/partage/types.ts';
import donnees from '../_shared/catalogue-combat.json' with { type: 'json' };
declare const Deno: { env: { get(nom: string): string | undefined }; serve(handler: (req: Request) => Promise<Response>): void };
const adresse = Deno.env.get('SUPABASE_URL');
const cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!adresse || !cle) throw new Error('Configuration serveur absente.');
Deno.serve(creerRuntimeCombat(adresse,cle,{ cartes: donnees.cartes as CarteIndex[], definitions: new Map(donnees.definitions as [string,Definition[]][]) },fetch,true));
