// Le jeu ne démarre pas (fichier introuvable juste après une mise à jour, réseau coupé au mauvais moment) : au bout de
// 12 secondes, l'écran d'attente d'index.html le dit et propose de recharger, au lieu d'attendre pour toujours (audit
// de finition du 26/09/2026). Dès qu'il démarre, le jeu remplace cet écran : il n'y a alors plus rien à faire.
// Un fichier à part, et non un script dans la page : la politique de sécurité du site n'accepte que ses propres fichiers.
setTimeout(function () {
  var attente = document.querySelector('.attente-initiale');
  if (!attente) return;
  var texte = attente.querySelector('p');
  if (texte) texte.textContent = 'Le chargement prend plus de temps que prévu. Vérifie ta connexion, puis recharge la page.';
  var bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'attente-initiale__recharger';
  bouton.textContent = 'Recharger la page';
  bouton.addEventListener('click', function () { window.location.reload(); });
  attente.appendChild(bouton);
}, 12000);
