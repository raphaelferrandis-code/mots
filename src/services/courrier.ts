// Le courrier côté service (jeu/courrier.ts compose les lettres) : les lectures du serveur (amis et échanges, enchères,
// équipe), relues au retour du joueur et toutes les quelques minutes ; le duel laissé en cours, retenu par l'appareil ;
// et le relevé de la dernière lecture, gardé sur cet appareil pour chaque profil.
//
// Les pages lisent déjà ces mêmes données : elles les confient au courrier en marquant leur genre comme lu (Amis :
// amis et échanges ; Équipe ; Marché : enchères et ventes). L'accueil, qui montre tout, marque tout.

import { completerLeReleve, composerLeCourrier, nouvellesParEndroit, releveApresLecture } from '../jeu/courrier.ts';
import type { Genre, Lettre, Releve, SourcesDuCourrier } from '../jeu/courrier.ts';
import { amisDisponibles, serveurDesAmis } from './amis.ts';
import type { CarnetAmis } from './amis.ts';
import { serveurEquipes } from './equipes.ts';
import type { MonEquipe } from './equipes.ts';
import { serveurDuMarche } from './marche.ts';
import type { MesEncheres } from './marche.ts';

export type Courrier = { lettres: Lettre[]; nouvelles: { joueur: number; marche: number; duel: number } };
export const TOUS_LES_GENRES: readonly Genre[] = ['ami', 'echange', 'equipe', 'enchere', 'vente', 'duel'];

const CLE_DU_DUEL = 'mots.duel-en-cours';
// Le profil lu la dernière fois : dès le démarrage, avant toute lecture du serveur, le bon relevé (sinon un duel en cours,
// déjà vu, repasserait « nouveau » le temps de la première lecture).
const CLE_DU_PROFIL = 'mots.courrier-profil';
const cleDuReleve = (profil: string | null): string => `mots.courrier:${profil ?? 'appareil'}`;
const INTERVALLE_MINIMAL = 60_000; // une actualisation ne relit pas le serveur plus d'une fois par minute

type Lues = { amis: CarnetAmis | null; equipe: MonEquipe | null; encheres: MesEncheres | null };
let lues: Lues = { amis: null, equipe: null, encheres: null };
let profil: string | null = null;
let releve: Releve | null = null;
let courrier: Courrier = { lettres: [], nouvelles: { joueur: 0, marche: 0, duel: 0 } };
let derniereLecture = 0;
let lecture: Promise<void> | null = null;
const abonnes = new Set<() => void>();

const lireLocal = <T>(cle: string): T | null => { try { return JSON.parse(localStorage.getItem(cle) ?? 'null') as T | null; } catch { return null; } };
const ecrireLocal = (cle: string, valeur: unknown): void => { try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch { /* le courrier se relira */ } };
profil = lireLocal<string>(CLE_DU_PROFIL);

// Le duel laissé en cours (son identifiant et sa fin), tant qu'il n'est pas échu.
function duelEnCours(): { id: string } | null {
  const lu = lireLocal<{ id?: unknown; expireLe?: unknown }>(CLE_DU_DUEL);
  return lu && typeof lu.id === 'string' && typeof lu.expireLe === 'number' && lu.expireLe > Date.now() ? { id: lu.id } : null;
}

const sources = (): SourcesDuCourrier => ({ amis: lues.amis, equipe: lues.equipe, encheres: lues.encheres, duel: duelEnCours() });

function recomposer(): void {
  const s = sources();
  // (Chaque lecture qui arrive pour la première fois part de son état présent : jeu/courrier.ts, completerLeReleve.)
  const complete = completerLeReleve(s, releve ?? lireLocal<Releve>(cleDuReleve(profil)) ?? {});
  if (complete !== releve) { releve = complete; ecrireLocal(cleDuReleve(profil), releve); }
  const lettres = composerLeCourrier(s, releve);
  courrier = { lettres, nouvelles: nouvellesParEndroit(lettres) };
  for (const abonne of abonnes) abonne();
}

export const lireLeCourrier = (): Courrier => courrier;
export function ecouterLeCourrier(abonne: () => void): () => void {
  abonnes.add(abonne);
  return () => { abonnes.delete(abonne); };
}

// Relit le serveur (sauf s'il vient de l'être). Un joueur sans pseudonyme n'a ni amis, ni équipe, ni enchères : rien à
// demander. Une lecture qui échoue garde ce qu'on savait de son genre.
export function actualiserLeCourrier(avecPseudonyme: boolean, force = false): Promise<void> {
  if (!avecPseudonyme || !amisDisponibles || !serveurDuMarche.actif) { recomposer(); return Promise.resolve(); }
  if (lecture) return lecture;
  if (!force && Date.now() - derniereLecture < INTERVALLE_MINIMAL) return Promise.resolve();
  lecture = (async () => {
    const [amis, encheres, equipe] = await Promise.allSettled([serveurDesAmis().lire(), serveurDuMarche.mesEncheres(), serveurEquipes().lire()]);
    derniereLecture = Date.now();
    const nouveauProfil = amis.status === 'fulfilled' ? amis.value.moi?.id ?? null : profil;
    if (nouveauProfil !== profil) { profil = nouveauProfil; ecrireLocal(CLE_DU_PROFIL, profil); releve = null; lues = { amis: null, equipe: null, encheres: null }; }
    lues = {
      amis: amis.status === 'fulfilled' ? amis.value : lues.amis,
      encheres: encheres.status === 'fulfilled' ? encheres.value : lues.encheres,
      equipe: equipe.status === 'fulfilled' ? equipe.value : lues.equipe,
    };
    recomposer();
  })().finally(() => { lecture = null; });
  return lecture;
}

// Le joueur a lu ces genres (sur l'accueil, ou sur leur page, qui confie ses données fraîches au passage).
export function marquerLeCourrierLu(genres: readonly Genre[], fraiches: Partial<Lues> = {}): void {
  lues = { ...lues, ...Object.fromEntries(Object.entries(fraiches).filter(([, v]) => v !== undefined && v !== null)) };
  if (releve === null) recomposer();
  releve = releveApresLecture(sources(), releve ?? {}, genres);
  ecrireLocal(cleDuReleve(profil), releve);
  recomposer();
}

// Le duel en cours, vu par l'écran du duel : retenu tant qu'il n'est pas terminé, oublié ensuite.
export function retenirLeDuel(duel: { id: string; expireLe: number } | null): void {
  const avant = duelEnCours()?.id ?? null;
  try { if (duel) localStorage.setItem(CLE_DU_DUEL, JSON.stringify(duel)); else localStorage.removeItem(CLE_DU_DUEL); } catch { /* sans mémoire, pas de rappel */ }
  if ((duel?.id ?? null) !== avant) recomposer();
}
