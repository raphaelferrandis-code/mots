// Une mention visible et lisible aussi au clavier et sur écran tactile.
export function BadgeJoueurSimule({ maison }: { maison?: boolean }) {
  return maison === true ? <span className="joueur-simule">Joueur simulé</span> : null;
}
