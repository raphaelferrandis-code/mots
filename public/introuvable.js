// La page introuvable (404.html, fabriquée par scripts/fabriquer-les-pages.ts ; audit de finition du 26/09/2026, E13) :
// une adresse de mot mal tapée (« /mot/Amour/ », « /mot/sérendipité/ ») mène à la bonne page, avec la règle des
// adresses du jeu (src/partage/pagesDesMots.ts, adresseDuMot : la tenir identique) ; un mot à plusieurs natures
// (« /mot/beau/ ») propose chacune de ses pages. Testé par src/pages/introuvable.test.ts.

export function adresseDuMot(mot) {
  return mot.toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Pour un chemin inconnu : { vers } s'il faut aller ailleurs, { adresse } pour une adresse de mot déjà juste (qui peut
// désigner plusieurs pages), null sinon.
export function correction(chemin) {
  const trouve = /^\/mot\/([^/]*)\/?$/.exec(chemin);
  if (!trouve) return null;
  let mot;
  try { mot = decodeURIComponent(trouve[1]); } catch { return null; }
  const adresse = adresseDuMot(mot);
  if (!adresse) return { vers: '/mots/' };
  const juste = `/mot/${adresse}/`;
  return juste === chemin ? { adresse } : { vers: juste };
}

if (typeof document !== 'undefined') {
  const c = correction(window.location.pathname);
  if (c && c.vers) window.location.replace(c.vers);
  else if (c && c.adresse) {
    let homographes = {};
    try { homographes = JSON.parse(document.getElementById('introuvable-homographes')?.textContent || '{}'); } catch { /* rien à proposer */ }
    const sens = homographes[c.adresse];
    const bloc = document.getElementById('introuvable-sens');
    if (sens && sens.length && bloc) {
      const liste = bloc.querySelector('ul');
      for (const s of sens) {
        const lien = document.createElement('a');
        lien.href = `/mot/${s.adresse}/`;
        lien.textContent = `${s.mot} (${s.nature})`;
        const ligne = document.createElement('li');
        ligne.append(lien);
        liste?.append(ligne);
      }
      bloc.hidden = false;
      // Le mot existe bien : l'explication « pas encore un timbre » n'a plus lieu d'être.
      const explication = document.getElementById('introuvable-explication');
      if (explication) explication.hidden = true;
    }
  }
}
