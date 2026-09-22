// La cote d'un timbre, sur sa fiche (décision n° 38) : la cote du jour pour tout le monde ; pour la version payante,
// l'histoire de la cote (une courbe jour par jour, par finition), les dernières ventes et les statistiques.

import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { decrireLesCotes, tracerLaCourbe } from '../jeu/cote.ts';
import type { CotesDUnTimbre, HistoireDeLaCote } from '../jeu/cote.ts';
import { FINITIONS } from '../partage/types.ts';
import type { Finition } from '../partage/types.ts';
import { lireLHistoireDeLaCote } from '../services/partie.ts';
import { useChargement } from './useChargement.ts';
import type { Chargement } from './useChargement.ts';

const FENETRE = EQUILIBRAGE.marche.cote.fenetreEnJours;
const HISTOIRE = EQUILIBRAGE.marche.cote.historiqueEnJours;
const jourEnClair = (jour: string): string => new Date(`${jour}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const dateEnClair = (ms: number): string => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function CoteDuTimbre({ carte, cotes, payant }: { carte: string; cotes: Chargement<CotesDUnTimbre | null>; payant: boolean }) {
  // La cote est un renseignement de plus : si le serveur ne répond pas, on le dit sans alarmer — la fiche se lit quand même.
  if (cotes.etat === 'erreur') return <p className="texte-doux petit">La cote n’a pas pu être lue : le serveur du jeu ne répond pas.</p>;
  if (cotes.etat === 'en cours' || !cotes.donnees) return <p className="texte-doux petit">Cote du jour…</p>;
  const description = decrireLesCotes(cotes.donnees);
  const ventes = cotes.donnees.cotes.reduce((n, c) => n + c.ventes, 0);
  return (
    <>
      <p>
        {description
          ? <>Cote du jour : <strong>{description}</strong> <span className="texte-doux petit">({ventes} vente{ventes > 1 ? 's' : ''} ces {FENETRE} derniers jours)</span></>
          : <span className="texte-doux">Pas encore de cote : aucune vente de ce timbre ces {FENETRE} derniers jours.</span>}
      </p>
      {payant ? <HistoireDeLaCoteDuTimbre carte={carte} /> : <p className="texte-doux petit">L'histoire des prix et les statistiques feront partie de la version payante.</p>}
    </>
  );
}

function HistoireDeLaCoteDuTimbre({ carte }: { carte: string }) {
  const histoire = useChargement(() => lireLHistoireDeLaCote(carte), `histoire:${carte}`);
  if (histoire.etat === 'erreur') return <p className="texte-doux petit">{histoire.message}</p>;
  if (histoire.etat === 'en cours') return <p className="texte-doux petit">Histoire de la cote…</p>;
  const h = histoire.donnees;
  if (h.ventes.length === 0) return <p className="texte-doux petit">Aucune vente enregistrée pour ce timbre.</p>;
  return (
    <div className="cote">
      {FINITIONS.map((finition) => <Courbe key={finition} histoire={h} finition={finition} />)}
      {h.stats.length > 0 && (
        <div className="tableau-defilant">
          <table className="tableau">
            <caption className="visuellement-cache">Statistiques des ventes des {HISTOIRE} derniers jours</caption>
            <thead><tr><th scope="col">Finition</th><th scope="col">Ventes ({HISTOIRE} j)</th><th scope="col">Au plus bas</th><th scope="col">Au plus haut</th></tr></thead>
            <tbody>{h.stats.map((s) => <tr key={s.finition}><td>{s.finition}</td><td>{s.nombre}</td><td>{s.mini} Encre</td><td>{s.maxi} Encre</td></tr>)}</tbody>
          </table>
        </div>
      )}
      <details className="repliable">
        <summary className="petit">Les {h.ventes.length} dernière{h.ventes.length > 1 ? 's' : ''} vente{h.ventes.length > 1 ? 's' : ''}</summary>
        <ul className="liste-nue cote__ventes">
          {h.ventes.map((v) => <li key={`${v.quand}-${v.finition}-${v.prix}`} className="petit">{dateEnClair(v.quand)} · {v.finition.toLowerCase()} · <strong>{v.prix}</strong> Encre</li>)}
        </ul>
      </details>
    </div>
  );
}

// La courbe d'une finition : un trait, un point par jour relevé.
function Courbe({ histoire, finition }: { histoire: HistoireDeLaCote; finition: Finition }) {
  const courbe = tracerLaCourbe(histoire.serie, finition, 300, 80);
  if (!courbe) return null;
  const chemin = courbe.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const premier = courbe.points[0];
  const dernier = courbe.points[courbe.points.length - 1];
  if (!premier || !dernier) return null;
  const lecture = courbe.points.map((p) => `${jourEnClair(p.jour)} : ${p.cote} Encre`).join(', ');
  return (
    <figure className="cote__courbe">
      <figcaption className="petit">
        <strong>{finition}</strong> · {premier.jour === dernier.jour ? `le ${jourEnClair(premier.jour)}` : `du ${jourEnClair(premier.jour)} au ${jourEnClair(dernier.jour)}`}
        {courbe.mini === courbe.maxi ? ` : ${courbe.mini} Encre` : ` : de ${courbe.mini} à ${courbe.maxi} Encre`}
      </figcaption>
      <svg viewBox="-6 -6 312 92" role="img" aria-label={`Cote ${finition.toLowerCase()} : ${lecture}`}>
        <path d={chemin} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {courbe.points.map((p) => <circle key={p.jour} cx={p.x} cy={p.y} r="3.5" fill="currentColor" />)}
      </svg>
    </figure>
  );
}
