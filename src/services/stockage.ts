// Où la sauvegarde est rangée sur l'appareil.
// En priorité dans IndexedDB (la « base de données » du navigateur) ; si elle est indisponible
// (navigation privée, vieux navigateur), dans le stockage simple du navigateur ; en dernier recours
// en mémoire seulement, et le jeu prévient alors que rien ne sera conservé.

const BASE = 'mots';
const MAGASIN = 'sauvegarde';
const CLE = 'principale';
const CLE_DE_SECOURS = 'mots.sauvegarde';

export type Emplacement = 'base de données' | 'stockage simple' | 'mémoire seulement';

function ouvrirLaBase(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const demande = indexedDB.open(BASE, 1);
    demande.onupgradeneeded = () => demande.result.createObjectStore(MAGASIN);
    demande.onsuccess = () => resoudre(demande.result);
    demande.onerror = () => rejeter(demande.error);
    demande.onblocked = () => rejeter(new Error('Base de données occupée par un autre onglet'));
  });
}

function dansLaBase<T>(mode: IDBTransactionMode, action: (magasin: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return ouvrirLaBase().then((base) => new Promise<T>((resoudre, rejeter) => {
    const transaction = base.transaction(MAGASIN, mode);
    const demande = action(transaction.objectStore(MAGASIN));
    transaction.oncomplete = () => { base.close(); resoudre(demande.result); };
    transaction.onerror = () => { base.close(); rejeter(transaction.error); };
    transaction.onabort = () => { base.close(); rejeter(transaction.error); };
  }));
}

type Copie = { format: 'mots.stockage.v1'; ecriteLe: number; contenu?: unknown };
const decoder = (brut: unknown): Copie => {
  if (typeof brut === 'object' && brut !== null && 'format' in brut && brut.format === 'mots.stockage.v1'
    && 'ecriteLe' in brut && typeof brut.ecriteLe === 'number' && Number.isFinite(brut.ecriteLe)) return brut as Copie;
  return { format: 'mots.stockage.v1', ecriteLe: 0, contenu: brut };
};

export function creerLeStockage(io: { lireBase(): Promise<unknown>; ecrireBase(copie: Copie): Promise<unknown>; lireSecours(): unknown; ecrireSecours(copie: Copie): void; maintenant(): number }) {
  let memoire: Copie = { format: 'mots.stockage.v1', ecriteLe: -1 };
  async function lireLaSauvegarde(): Promise<{ contenu: unknown; emplacement: Emplacement }> {
    const copies: { copie: Copie; emplacement: Emplacement }[] = [];
    try { copies.push({ copie: decoder(await io.lireBase()), emplacement: 'base de données' }); } catch { /* lire l'autre copie */ }
    try { copies.push({ copie: decoder(io.lireSecours()), emplacement: 'stockage simple' }); } catch { /* secours indisponible ou illisible */ }
    copies.push({ copie: memoire, emplacement: 'mémoire seulement' });
    const choisie = copies.sort((a, b) => b.copie.ecriteLe - a.copie.ecriteLe || Number(b.copie.contenu !== undefined) - Number(a.copie.contenu !== undefined))[0];
    memoire = choisie.copie;
    return { contenu: memoire.contenu, emplacement: choisie.emplacement };
  }
  async function ecrireLaSauvegarde(contenu: unknown): Promise<Emplacement> {
    memoire = { format: 'mots.stockage.v1', ecriteLe: Math.max(io.maintenant(), memoire.ecriteLe + 1), contenu };
    // Les deux copies portent la même révision. Une ancienne base redevenue lisible
    // ne doit jamais gagner contre le secours écrit pendant sa panne.
    const copie = memoire;
    let emplacement: Emplacement = 'mémoire seulement';
    try { io.ecrireSecours(copie); emplacement = 'stockage simple'; } catch { /* la base peut encore fonctionner */ }
    try { await io.ecrireBase(copie); emplacement = 'base de données'; } catch { /* le secours garde cette révision */ }
    return emplacement;
  }
  // Une copie vide datée empêche une ancienne copie inaccessible de ressusciter la partie.
  const effacerLaSauvegarde = async (): Promise<void> => { await ecrireLaSauvegarde(undefined); };
  return { lireLaSauvegarde, ecrireLaSauvegarde, effacerLaSauvegarde };
}

export const { lireLaSauvegarde, ecrireLaSauvegarde, effacerLaSauvegarde } = creerLeStockage({
  lireBase: () => dansLaBase('readonly', magasin => magasin.get(CLE)),
  ecrireBase: copie => dansLaBase('readwrite', magasin => magasin.put(copie, CLE)),
  lireSecours: () => { const brut = localStorage.getItem(CLE_DE_SECOURS); return brut ? JSON.parse(brut) : undefined; },
  ecrireSecours: copie => localStorage.setItem(CLE_DE_SECOURS, JSON.stringify(copie)),
  maintenant: Date.now,
});

// Demande au navigateur de ne pas effacer les données du jeu quand il manque de place.
// Sur iPhone, Safari peut malgré tout effacer les données d'un site resté longtemps sans visite : d'où l'export.
export async function demanderUnStockageDurable(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
