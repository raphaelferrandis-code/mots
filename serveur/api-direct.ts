import { MODES_DIRECTS } from '../src/jeu/direct.ts';
import type { ActionDirect, ModeDirect, PhaseDirect, ReponseDirect } from '../src/jeu/direct.ts';
import type { Registre } from '../src/partage/types.ts';
import { avancerDirect, creerDirect, RefusDirect, vueDirect } from './moteur-direct.ts';
import type { EtatDirect } from './moteur-direct.ts';
import type { OutilsCombat } from './api-combat.ts';
import { ErreurCombat } from './api-combat.ts';

type RequeteDirect = { type: 'lire' | 'annuler' | 'quitter' }
  | { type: 'chercher'; mode: ModeDirect; masques: Registre[] }
  | { type: 'agir'; partie: string; requete: string; manche: number; phase: PhaseDirect; action: ActionDirect };
type Place = { utilisateur: string; place: number; camp: number; equipe: string | null; nomEquipe: string | null;
  depart: { utilisateur: string; pseudo: string; equipe: number; deck: string[]; masques: Registre[] }; cote_avant: number | null; cote_apres: number | null; xp: number; recompense: {encre:number;reduite:boolean} | null };
type Partie = { id: string; mode: ModeDirect; etat: EtatDirect | null; revision: number; commandes: Record<string, unknown>; places: Place[] };
type Contexte = { maintenant: number; partie: Partie | null };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v);
const objet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const champs = (v: Record<string, unknown>, liste: string[]) => { if (Object.keys(v).some(k => !liste.includes(k))) throw new RefusDirect('Commande inconnue.'); };
export function lireRequeteDirect(v: unknown): RequeteDirect {
  if (!objet(v)) throw new RefusDirect('Commande illisible.');
  if (v.type === 'lire' || v.type === 'annuler' || v.type === 'quitter') { champs(v, ['type']); return { type: v.type }; }
  if (v.type === 'chercher') {
    champs(v, ['type', 'mode', 'masques']);
    if (!MODES_DIRECTS.includes(v.mode as ModeDirect) || !Array.isArray(v.masques) || v.masques.length > 4
      || !v.masques.every(m => ['Familier','Injurieux','Littéraire','Vieilli'].includes(m))) throw new RefusDirect('Mode ou filtres invalides.');
    return v as RequeteDirect;
  }
  if (v.type === 'agir' && uuid(v.partie) && uuid(v.requete) && Number.isInteger(v.manche) && Number(v.manche) >= 1
    && ['pose','reponses','arbitrage','bilan','fin'].includes(String(v.phase)) && objet(v.action)) {
    champs(v, ['type','partie','requete','manche','phase','action']);
    const a = v.action;
    if (a.type === 'poser') {
      champs(a, ['type','carte','voie']);
      if (typeof a.carte !== 'string' || a.carte.length > 200 || ![0,1].includes(Number(a.voie)) || typeof a.voie !== 'number') throw new RefusDirect('Placement invalide.');
    } else if (a.type === 'proposer' || a.type === 'trancher') {
      champs(a, ['type','cible','choix']);
      if (![a.cible,a.choix].every(n => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 3)) throw new RefusDirect('Réponse invalide.');
    } else if (a.type === 'abandonner') champs(a, ['type']);
    else throw new RefusDirect('Action inconnue.');
    return v as RequeteDirect;
  }
  throw new RefusDirect('Commande invalide.');
}
const canonique = (v: unknown) => JSON.stringify(v, (_k, x) => objet(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
export async function executerDirect(utilisateur: string, req: RequeteDirect, outils: OutilsCombat): Promise<ReponseDirect> {
  let attente: ReponseDirect['attente'] = null;
  if (req.type !== 'agir') {
    const salon = await outils.rpc<{ attente: ReponseDirect['attente'] }>('direct_salon', {
      p_utilisateur: utilisateur, p_action: req.type, p_mode: req.type === 'chercher' ? req.mode : null, p_masques: req.type === 'chercher' ? req.masques : [],
    });
    attente = salon.attente;
  }
  for (let essai = 0; essai < 8; essai++) {
    const contexte = await outils.rpc<Contexte>('direct_contexte', { p_utilisateur: utilisateur });
    const p = contexte.partie;
    if (!p) {
      if (req.type === 'agir') throw new RefusDirect('Cette partie n’est plus active.');
      return { maintenant: contexte.maintenant, utilisateur, attente, partie: null };
    }
    if (req.type === 'agir' && req.partie !== p.id) throw new RefusDirect('Cette commande appartient à une autre partie.');
    const cle = req.type === 'agir' ? `${utilisateur}:${req.requete}` : null;
    const connu = cle && p.commandes[cle];
    if (connu && canonique(connu) !== canonique(req)) throw new RefusDirect('Identifiant de commande déjà utilisé.');
    if (req.type === 'agir' && !connu && Object.keys(p.commandes).length >= 2000) throw new RefusDirect('Trop de commandes pour cette partie.');
    const noms = [0,1].map(c => p.places.find(s => s.camp === c)?.nomEquipe ?? p.places.filter(s => s.camp === c).map(s => s.depart.pseudo).join(' & '));
    let depart = p.etat;
    if (!depart) {
      try { depart = creerDirect(p.mode, p.places.map(s => s.depart), noms, outils.catalogue, outils.hasard, contexte.maintenant); }
      catch(e) {
        if (e instanceof RefusDirect) await outils.rpc('direct_annuler_preparation',{p_utilisateur:utilisateur,p_id:p.id});
        throw e;
      }
    }
    const joueur = p.places.findIndex(s => s.utilisateur === utilisateur);
    const etat = avancerDirect(depart, outils.catalogue, outils.hasard, contexte.maintenant,
      req.type === 'agir' && !connu ? { joueur, manche: req.manche, phase: req.phase, action: req.action } : undefined);
    const doitEcrire = !p.etat || canonique(etat) !== canonique(p.etat) || (req.type === 'agir' && !connu && etat.phase !== 'fin');
    if (doitEcrire) {
      const ok = await outils.rpc<boolean>('direct_appliquer', { p_utilisateur: utilisateur, p_id: p.id, p_revision: p.revision,
        p_etat: etat, p_requete: cle, p_action: req.type === 'agir' ? req : null });
      if (!ok) continue;
      // Relecture nécessaire : résultat et cote sont enregistrés ensemble en SQL.
      const frais = await outils.rpc<Contexte>('direct_contexte', { p_utilisateur: utilisateur });
      if (!frais.partie?.etat) continue;
      const s = frais.partie.places.find(s => s.utilisateur === utilisateur)!;
      return { maintenant: frais.maintenant, utilisateur, attente: null, partie: { id: p.id, revision: frais.partie.revision,
        vue: vueDirect(frais.partie.etat, utilisateur), cotes: s.cote_avant === null ? null : { avant: s.cote_avant, apres: s.cote_apres! }, gains: {xp:s.xp,encre:s.recompense?.encre??0,reduite:s.recompense?.reduite??false} } };
    }
    const s = p.places[joueur];
    return { maintenant: contexte.maintenant, utilisateur, attente: null, partie: { id: p.id, revision: p.revision, vue: vueDirect(etat, utilisateur),
      cotes: s.cote_avant === null ? null : { avant: s.cote_avant, apres: s.cote_apres! }, gains: {xp:s.xp,encre:s.recompense?.encre??0,reduite:s.recompense?.reduite??false} } };
  }
  throw new ErreurCombat('La partie a avancé. Réessaie ton action.',409);
}

export function gestionnaireDirect(outils: OutilsCombat & { authentifier(jeton: string): Promise<string | null> }) {
  const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization,apikey,content-type', 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Content-Type':'application/json', 'Cache-Control':'no-store' };
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { status:204, headers });
    try {
      if (req.method !== 'POST') throw new ErreurCombat('Méthode non autorisée.',405);
      const jeton = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
      const utilisateur = jeton ? await outils.authentifier(jeton) : null;
      if (!utilisateur) throw new ErreurCombat('Session expirée. Reconnecte ton compte.',401);
      const texte = await req.text();
      if (texte.length > 4000) throw new ErreurCombat('Commande trop volumineuse.',413);
      let brut: unknown; try { brut = JSON.parse(texte); } catch { throw new RefusDirect('Commande illisible.'); }
      return new Response(JSON.stringify(await executerDirect(utilisateur,lireRequeteDirect(brut),outils)),{ headers });
    } catch (e) {
      return new Response(JSON.stringify({ erreur: e instanceof RefusDirect || e instanceof ErreurCombat ? e.message : 'La joute en direct est indisponible. Réessaie.' }),
        { headers, status: e instanceof ErreurCombat ? e.statut : e instanceof RefusDirect ? 400 : 503 });
    }
  };
}
