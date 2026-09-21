// Où la sauvegarde est rangée sur l'appareil.
// En priorité dans IndexedDB (la « base de données » du navigateur) ; si elle est indisponible
// (navigation privée, vieux navigateur), dans le stockage simple du navigateur ; en dernier recours
// en mémoire seulement, et le jeu prévient alors que rien ne sera conservé.

const BASE = 'mots';
const MAGASIN = 'sauvegarde';
const CLE = 'principale';
const CLE_DE_SECOURS = 'mots.sauvegarde';

export type Emplacement = 'base de données' | 'stockage simple' | 'mémoire seulement';

let memoire: unknown;

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

export async function lireLaSauvegarde(): Promise<{ contenu: unknown; emplacement: Emplacement }> {
  try {
    const contenu = await dansLaBase('readonly', (magasin) => magasin.get(CLE));
    if (contenu !== undefined) return { contenu, emplacement: 'base de données' };
    // Rien dans la base : une sauvegarde de secours existe peut-être (écrite un jour où la base était indisponible).
    const secours = localStorage.getItem(CLE_DE_SECOURS);
    return { contenu: secours ? JSON.parse(secours) : undefined, emplacement: 'base de données' };
  } catch {
    try {
      const secours = localStorage.getItem(CLE_DE_SECOURS);
      return { contenu: secours ? JSON.parse(secours) : undefined, emplacement: 'stockage simple' };
    } catch {
      return { contenu: memoire, emplacement: 'mémoire seulement' };
    }
  }
}

export async function ecrireLaSauvegarde(contenu: unknown): Promise<Emplacement> {
  memoire = contenu;
  try {
    await dansLaBase('readwrite', (magasin) => magasin.put(contenu, CLE));
    return 'base de données';
  } catch {
    try {
      localStorage.setItem(CLE_DE_SECOURS, JSON.stringify(contenu));
      return 'stockage simple';
    } catch {
      return 'mémoire seulement';
    }
  }
}

export async function effacerLaSauvegarde(): Promise<void> {
  memoire = undefined;
  try { await dansLaBase('readwrite', (magasin) => magasin.delete(CLE)); } catch { /* base indisponible : rien à effacer */ }
  try { localStorage.removeItem(CLE_DE_SECOURS); } catch { /* idem */ }
}

// Demande au navigateur de ne pas effacer les données du jeu quand il manque de place.
// Sur iPhone, Safari peut malgré tout effacer les données d'un site resté longtemps sans visite : d'où l'export.
export async function demanderUnStockageDurable(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
