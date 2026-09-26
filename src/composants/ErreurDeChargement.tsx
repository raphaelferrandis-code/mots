// Un chargement qui a échoué (le plus souvent une coupure de réseau) : on le dit, et on propose de réessayer, au lieu
// de laisser « Chargement… » à l'écran pour toujours.
export function ErreurDeChargement({ quoi, feminin = false, reessayer }: { quoi: string; feminin?: boolean; reessayer: () => void }) {
  return (
    <section className="bloc bloc--alerte" role="alert">
      <p>{quoi} n’a pas pu être {feminin ? 'chargée' : 'chargé'}. Vérifie ta connexion, puis réessaie.</p>
      <button type="button" className="bouton" onClick={reessayer}>Réessayer</button>
    </section>
  );
}
