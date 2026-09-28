// Ce que montre l'écran d'une joute en direct, lu dans la vue que le serveur envoie à chaque joueur (VueDirect) :
// les camps, les face-à-face, qui pose, où poser, le bilan d'une manche vu de son camp, et la phrase de la fin.
// Aucune règle ici : le serveur les applique (serveur/moteur-direct.ts) ; l'écran les raconte.
import type { BilanDirect, PoseDirect, QuestionDirect, VueDirect } from './direct.ts';
import type { Resultat } from './progression.ts';

export type FaceAFace = { voie: number; eux: PoseDirect | null; nous: PoseDirect | null };

export const monCamp = (v: VueDirect): number => v.joueurs[v.moi].equipe;
export const campAdverse = (v: VueDirect): number => 1 - monCamp(v);
export const enEquipe = (v: VueDirect): boolean => v.joueurs.length === 4;
// Mon partenaire en 2 contre 2 (son numéro de joueur), ou null en solo.
export const partenaire = (v: VueDirect): number | null => {
  const i = v.joueurs.findIndex((j, k) => k !== v.moi && j.equipe === monCamp(v));
  return i < 0 ? null : i;
};

// Un face-à-face par voie : le timbre adverse et celui de mon camp, s'ils sont posés.
export function facesAFace(v: VueDirect): FaceAFace[] {
  const camp = monCamp(v);
  return Array.from({ length: v.joueurs.length / 2 }, (_, voie) => ({
    voie,
    eux: v.poses.find((p) => p.voie === voie && v.joueurs[p.joueur].equipe !== camp) ?? null,
    nous: v.poses.find((p) => p.voie === voie && v.joueurs[p.joueur].equipe === camp) ?? null,
  }));
}

// Le joueur qui doit poser maintenant, pendant la pose.
export const poseurActuel = (v: VueDirect): number | null => (v.phase === 'pose' ? v.ordre[v.poses.length] ?? null : null);

// Les voies où je peux poser : la même règle que le serveur (voiesDisponibles) — une voie que mon camp n'occupe pas
// encore, et la première pour celui qui ouvre la manche.
export function voiesPourMoi(v: VueDirect): number[] {
  const camp = monCamp(v);
  return Array.from({ length: v.joueurs.length / 2 }, (_, i) => i)
    .filter((i) => !v.poses.some((p) => v.joueurs[p.joueur].equipe === camp && p.voie === i))
    .filter((i) => v.poses.length !== 0 || i === 0);
}

export function resultatPourMoi(v: VueDirect): Resultat | null {
  if (v.vainqueur === null) return null;
  return v.vainqueur === 'nul' ? 'nul' : v.vainqueur === monCamp(v) ? 'victoire' : 'defaite';
}

// Le bilan d'une manche vu de mon camp : nos coups (portés à l'autre camp), les leurs, et nos parades (leurs mots dont
// nous avons trouvé la définition).
export type BilanDuCamp = { nosCoups: BilanDirect[]; leursCoups: BilanDirect[]; infliges: number; subis: number; parades: number; attaques: number };
export function bilanDuCamp(v: VueDirect): BilanDuCamp {
  const camp = monCamp(v);
  const nosCoups = v.bilan.filter((b) => v.joueurs[b.joueur].equipe === camp);
  const leursCoups = v.bilan.filter((b) => v.joueurs[b.joueur].equipe !== camp);
  const total = (liste: BilanDirect[]): number => liste.reduce((s, b) => s + b.degats, 0);
  return { nosCoups, leursCoups, infliges: total(nosCoups), subis: total(leursCoups), parades: leursCoups.filter((b) => b.paree).length, attaques: leursCoups.length };
}

// Le coup porté sur une voie par un camp (pendant le bilan) : celui de mon camp vise le timbre adverse de cette voie.
export const coupSurLaVoie = (v: VueDirect, voie: number, deMonCamp: boolean): BilanDirect | null =>
  v.bilan.find((b) => b.voie === voie && (v.joueurs[b.joueur].equipe === monCamp(v)) === deMonCamp) ?? null;

// La réponse retenue par mon camp pour une question (la décision de l'arbitre, sinon sa proposition, sinon la première),
// comme le serveur la retient.
export function reponseRetenue(v: VueDirect, q: QuestionDirect): number | null {
  const arbitre = v.arbitres[monCamp(v)];
  return q.decision ?? q.reponses[arbitre] ?? Object.values(q.reponses)[0] ?? null;
}

// La phrase de la fin : la raison donnée par le serveur (abandon, deux tours sans jouer), sinon qui tombe, sinon les points.
export function contexteDeFin(v: VueDirect): string {
  if (v.raison) return v.raison;
  const nous = v.pv[monCamp(v)], eux = v.pv[campAdverse(v)];
  const equipe = enEquipe(v);
  if (nous === 0 && eux === 0) return `Les deux camps tombent ensemble à la manche ${v.manche}.`;
  if (eux === 0) return `${v.noms[campAdverse(v)]} ${equipe ? 'tombent' : 'tombe'} à la manche ${v.manche}.`;
  if (nous === 0) return equipe ? `Votre équipe tombe à la manche ${v.manche}. Revanche ?` : `Tu tombes à la manche ${v.manche}. Revanche ?`;
  if (v.vainqueur === 'nul') return `${v.manche} manches, et personne ne cède.`;
  return `Aux points, ${nous} à ${eux}.`;
}

// « de Lysandre », « d’Aurore » : l'élision devant une voyelle.
export const dePseudo = (pseudo: string): string => (/^[aeiouyàâäéèêëîïôöùûü]/i.test(pseudo) ? `d’${pseudo}` : `de ${pseudo}`);

// Les secondes qui restent avant l'échéance de la phase, à l'heure du serveur.
export const secondesRestantes = (v: VueDirect, heureDuServeur: number): number => Math.max(0, Math.ceil((v.echeance - heureDuServeur) / 1000));
