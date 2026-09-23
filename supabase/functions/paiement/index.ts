import { configuration } from '../_shared/configuration.ts';
import { creerPaiements } from '../_shared/paiements.ts';
declare const Deno: { serve(handler: (req: Request) => Promise<Response>): void };
Deno.serve(req => creerPaiements(configuration()).paiement(req));
