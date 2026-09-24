// Une compilation ambiguë ferme les paiements au lieu de choisir un environnement.
export function choisirModePaiements(test?: string, production?: string): 'test' | 'production' | null {
  if ((test === 'true') === (production === 'true')) return null;
  return production === 'true' ? 'production' : 'test';
}
