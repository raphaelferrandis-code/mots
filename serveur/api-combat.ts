import type { ActionCombat, ChoixCombat, RequeteCombat, ReponseServeurCombat, VueCombat } from '../src/jeu/combat.ts';
import type { ProfilDeJoute } from '../src/jeu/joute.ts';
import type { Apprentissage } from '../src/jeu/sauvegarde.ts';
import type { EtatDuCompte } from '../src/jeu/synchronisation.ts';
import type { Hasard } from '../src/jeu/hasard.ts';
import { taillesDesFactions } from '../src/jeu/duel.ts';
import { avancerCombat, creerCombat, vueCombat, RefusCombat } from './moteur-combat.ts';
import type { CatalogueCombat, EtatCombatPrive } from './moteur-combat.ts';

export class ErreurCombat extends Error {
  readonly statut: number;
  constructor(message: string, statut = 400) { super(message); this.statut = statut; }
}
const objet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v);
function champs(v: Record<string, unknown>, autorises: string[]): void {
  if (Object.keys(v).some(c => !autorises.includes(c))) throw new ErreurCombat('Commande inconnue.');
}
export function lireRequeteCombat(v: unknown): RequeteCombat {
  if (!objet(v)) throw new ErreurCombat('Commande illisible.');
  if (v.type === 'lire') { champs(v, ['type']); return { type: 'lire' }; }
  if (!uuid(v.requete)) throw new ErreurCombat('Identifiant de commande invalide.');
  if (v.type === 'commencer' && objet(v.choix)) {
    champs(v, ['type','requete','choix']);
    const c = v.choix;
    champs(c, ['mode','niveau','adversaire','masques','temps']);
    if (!Array.isArray(c.masques) || c.masques.length > 4 || !c.masques.every(r => ['Familier','Injurieux','Littéraire','Vieilli'].includes(String(r)))
      || !['normal','double','illimite'].includes(String(c.temps))) throw new ErreurCombat('Réglages de combat invalides.');
    if (c.mode === 'entrainement' && ['Facile','Normal','Difficile'].includes(String(c.niveau)) && c.adversaire === undefined)
      return { type: 'commencer', requete: v.requete, choix: { mode: c.mode, niveau: c.niveau, masques: c.masques, temps: c.temps } as ChoixCombat };
    if ((c.mode === 'joute' || c.mode === 'amical') && uuid(c.adversaire) && c.niveau === undefined)
      return { type: 'commencer', requete: v.requete, choix: { mode: c.mode, adversaire: c.adversaire, masques: c.masques, temps: c.temps } as ChoixCombat };
  }
  if (v.type === 'agir' && uuid(v.combat) && Number.isInteger(v.revision) && Number(v.revision) >= 0 && objet(v.action)) {
    champs(v, ['type','requete','combat','revision','action']);
    const a = v.action;
    if (a.type === 'choisir') {
      champs(a, ['type','carte']);
      if (typeof a.carte !== 'string' || a.carte.length > 200) throw new ErreurCombat('Carte invalide.');
    } else if (a.type === 'repondre') {
      champs(a, ['type','choisie']);
      if (a.choisie !== null && (!Number.isInteger(a.choisie) || Number(a.choisie) < 0 || Number(a.choisie) > 3)) throw new ErreurCombat('Réponse invalide.');
    } else if (['continuer','abandonner','quitter'].includes(String(a.type))) champs(a, ['type']);
    else throw new ErreurCombat('Action invalide.');
    return { type: 'agir', requete: v.requete, combat: v.combat, revision: Number(v.revision), action: a as ActionCombat };
  }
  throw new ErreurCombat('Commande invalide.');
}

export type LigneCombat = {
  id: string; revision: number; etat: EtatCombatPrive; vue: VueCombat;
  commandes: Record<string, unknown>; termine: boolean; archive: boolean; xp: number;
  recompense: NonNullable<ReponseServeurCombat['combat']>['recompense'];
};
export type ContexteCombat = { ligne: LigneCombat | null; profil: ProfilDeJoute | null;
  compte: EtatDuCompte & { progression?: { apprentissages: Record<string, Apprentissage> } | null } };
export type RpcCombat = <T>(nom: string, parametres: Record<string, unknown>) => Promise<T>;
export type OutilsCombat = { rpc: RpcCombat; catalogue: CatalogueCombat; hasard: Hasard; maintenant(): number; identifiant(): string };
const canonique = (v: unknown): string => JSON.stringify(v, (_cle, valeur) => objet(valeur) ? Object.fromEntries(Object.keys(valeur).sort().map(k => [k, valeur[k]])) : valeur);
function publique(c: ContexteCombat, catalogue: CatalogueCombat): ReponseServeurCombat {
  const b = c.ligne;
  return { etat: c.compte, combat: b && !b.archive ? { id: b.id, revision: b.revision, vue: vueCombat(b.etat, taillesDesFactions(catalogue.cartes)), xp: b.xp, recompense: b.recompense } : null };
}

export async function executerCombat(utilisateur: string, requete: RequeteCombat, outils: OutilsCombat): Promise<ReponseServeurCombat> {
  const contexte = await outils.rpc<ContexteCombat>('combat_contexte', {
    p_utilisateur: utilisateur, p_id: requete.type === 'agir' ? requete.combat : null,
    p_adversaire: requete.type === 'commencer' && requete.choix.mode !== 'entrainement' ? requete.choix.adversaire : null,
  });
  const b = contexte.ligne;
  const action = requete.type === 'agir' ? requete.action : requete.type === 'commencer' ? { type: requete.type, choix: requete.choix } : null;
  if (requete.type !== 'lire' && b?.commandes[requete.requete]) {
    if (canonique(b.commandes[requete.requete]) !== canonique(action)) throw new ErreurCombat('Identifiant de commande déjà utilisé.');
    return publique(contexte, outils.catalogue);
  }
  const maintenant = outils.maintenant();
  const expirer = b && !b.termine && maintenant >= b.etat.expireLe;
  if (expirer || requete.type === 'agir') {
    if (!b) throw new ErreurCombat('Aucun combat à reprendre.', 404);
    if (!expirer && requete.type === 'agir' && b.revision !== requete.revision) throw new ErreurCombat('La partie a avancé sur un autre écran. Reprends-la.', 409);
    const commande: ActionCombat = expirer ? { type: 'abandonner' } : (requete as Extract<RequeteCombat,{type:'agir'}>).action;
    const transition = avancerCombat(b.etat, commande, outils.catalogue, outils.hasard, maintenant);
    return outils.rpc('combat_appliquer', {
      p_utilisateur: utilisateur, p_id: b.id, p_revision: b.revision,
      p_requete: expirer ? outils.identifiant() : (requete as Extract<RequeteCombat,{type:'agir'}>).requete,
      p_action: commande, p_etat: transition.etat, p_vue: vueCombat(transition.etat, taillesDesFactions(outils.catalogue.cartes)), p_reponse: transition.reponse ?? null,
    });
  }
  if (requete.type === 'lire' || (b && !b.termine && !b.archive)) return publique(contexte, outils.catalogue);
  if (!contexte.compte.progression) throw new ErreurCombat('La migration des combats doit être installée avant de jouer.', 503);
  const etat = creerCombat(requete.choix, { deck: contexte.compte.deck, possedees: Object.keys(contexte.compte.cartes), apprentissages: contexte.compte.progression.apprentissages }, contexte.profil, outils.catalogue, outils.hasard, maintenant);
  return outils.rpc('combat_creer', { p_utilisateur: utilisateur, p_requete: requete.requete, p_action: action, p_etat: etat, p_vue: vueCombat(etat, taillesDesFactions(outils.catalogue.cartes)) });
}

export function gestionnaireCombat(outils: OutilsCombat & { authentifier(jeton: string): Promise<string | null> }) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' };
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    try {
      if (req.method !== 'POST') throw new ErreurCombat('Méthode non autorisée.',405);
      const jeton = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if (!jeton) throw new ErreurCombat('Connexion requise.',401);
      const utilisateur = await outils.authentifier(jeton);
      if (!utilisateur) throw new ErreurCombat('Session expirée. Reconnecte ton compte.',401);
      const texte = await req.text();
      if (texte.length > 10_000) throw new ErreurCombat('Commande trop volumineuse.',413);
      let brut: unknown;
      try { brut = JSON.parse(texte); } catch { throw new ErreurCombat('Commande illisible.'); }
      const reponse = await executerCombat(utilisateur,lireRequeteCombat(brut),outils);
      return new Response(JSON.stringify(reponse), { headers });
    } catch (e) {
      const statut = e instanceof ErreurCombat ? e.statut : e instanceof RefusCombat ? 400 : 503;
      // Les erreurs métier du moteur sont contrôlées ci-dessous par l'adaptateur ; les autres restent privées.
      return new Response(JSON.stringify({ erreur: e instanceof ErreurCombat || e instanceof RefusCombat ? e.message : 'Le combat n’a pas pu être enregistré. Reprends la partie ou réessaie.' }), { status: statut, headers });
    }
  };
}
