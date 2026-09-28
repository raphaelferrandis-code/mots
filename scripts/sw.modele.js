// Le « service worker » de Philamots : les fichiers du jeu gardés sur l'appareil (étape 4 des finitions, 28/09/2026 ;
// audit P03). Ce fichier est un modèle : la construction du site (vite.config.ts, greffon « service-worker ») le
// remplit avec la liste des fichiers et l'écrit en dist/sw.js.
//
// · Les fichiers du jeu (assets/ et data/?v=…, à empreinte ; identite/, demarrage.js et le manifeste, dont le contenu
//   compte dans la version) se servent depuis l'appareil : un retour sur le jeu ne redemande plus rien au réseau,
//   quelle que soit sa qualité.
// · La page du jeu se demande d'abord au réseau (la dernière version) ; hors ligne, sa copie s'affiche.
// · Jamais : le serveur du jeu (Supabase), le paiement, les pages par mot (/mot/, /mots/, /partage/).
// · Chaque construction a sa version : la nouvelle copie remplace l'ancienne, effacée à l'activation. Une page encore
//   ouverte sur l'ancienne version se recharge d'elle-même au premier écran qui manque (App.tsx, rechargerUneFois).
//
// Pour le couper un jour, publier à la place un sw.js qui se désinscrit :
//   self.addEventListener('install', () => self.skipWaiting());
//   self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((n) => Promise.all(n.map((c) => caches.delete(c))))
//     .then(() => self.registration.unregister())));
const VERSION = '%VERSION%';
const CACHE = `philamots-${VERSION}`;
const A_GARDER = '%FICHIERS%';
const RACINE = new URL('./', self.location.href);

// Les fichiers sans empreinte dans leur nom (la page, demarrage.js, le manifeste, identite/) se redemandent au serveur :
// le cache ordinaire du navigateur pourrait en tenir une copie d'avant la mise en ligne.
const aEmpreinte = (fichier) => fichier.startsWith('assets/') || fichier.includes('?v=');

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(A_GARDER.map((fichier) => new Request(fichier, { cache: aEmpreinte(fichier) ? 'default' : 'no-cache' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(caches.keys()
    .then((noms) => Promise.all(noms.filter((nom) => nom.startsWith('philamots-') && nom !== CACHE).map((nom) => caches.delete(nom))))
    .then(() => self.clients.claim()));
});

const garder = (demande, reponse) => {
  if (reponse.ok && reponse.type === 'basic') { const copie = reponse.clone(); void caches.open(CACHE).then((cache) => cache.put(demande, copie)); }
  return reponse;
};

self.addEventListener('fetch', (evenement) => {
  const demande = evenement.request;
  if (demande.method !== 'GET') return;
  const adresse = new URL(demande.url);
  if (adresse.origin !== RACINE.origin || !adresse.pathname.startsWith(RACINE.pathname)) return;
  const chemin = adresse.pathname.slice(RACINE.pathname.length);

  // La page du jeu : le réseau d'abord, la copie hors ligne.
  if (demande.mode === 'navigate') {
    if (chemin !== '' && chemin !== 'index.html') return;
    evenement.respondWith(fetch(demande)
      .then((reponse) => garder(RACINE.href, reponse))
      .catch(() => caches.match(RACINE.href).then((copie) => copie ?? Response.error())));
    return;
  }

  // Les fichiers à empreinte : depuis l'appareil, sinon le réseau (et on les garde).
  if (/^(assets|data|identite)\//.test(chemin) || chemin === 'demarrage.js' || chemin === 'manifest.webmanifest') {
    evenement.respondWith(caches.match(demande).then((copie) => copie ?? fetch(demande).then((reponse) => garder(demande, reponse))));
  }
});
