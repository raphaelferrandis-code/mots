// Mettre un timbre en vente aux enchères (BRIEF-marche.md, étape M3) : la finition, la mise de départ, un prix
// d'achat immédiat facultatif, la durée. Les règles sont vérifiées ici pour prévenir le joueur avant l'envoi
// (src/jeu/marche.ts), puis une seconde fois par le serveur, qui a le dernier mot.

import { useState } from 'react';
import type { FormEvent } from 'react';
import { EQUILIBRAGE } from '../config/equilibrage.ts';
import { coteDe } from '../jeu/cote.ts';
import type { CotesDUnTimbre } from '../jeu/cote.ts';
import { plancherPour, verifierLaMiseEnVente } from '../jeu/marche.ts';
import type { Enchere } from '../jeu/marche.ts';
import type { CartePossedee } from '../jeu/sauvegarde.ts';
import { FINITIONS } from '../partage/types.ts';
import type { CarteIndex, Finition } from '../partage/types.ts';
import { mettreEnVente } from '../services/partie.ts';

const REGLES = EQUILIBRAGE.marche;
const entier = (texte: string): number | null => (texte.trim() === '' ? null : Number(texte));

type Etat = { etat: 'repos' } | { etat: 'en cours' } | { etat: 'erreur'; message: string };

export function MiseEnVente({ carte, possedee, dansLeDeck, cotes = null, onVendu }: { carte: CarteIndex; possedee: CartePossedee; dansLeDeck: boolean; cotes?: CotesDUnTimbre | null; onVendu: (enchere: Enchere) => void }) {
  const finitions = FINITIONS.filter((f) => (possedee.finitions[f] ?? 0) > 0);
  const exemplaires = finitions.reduce((n, f) => n + (possedee.finitions[f] ?? 0), 0);
  const plancher = plancherPour(carte.rarete, REGLES);
  const [finition, setFinition] = useState<Finition>(finitions[0] ?? 'Normale');
  const [mise, setMise] = useState(String(plancher));
  const [achat, setAchat] = useState('');
  const [heures, setHeures] = useState(24);
  const [etat, setEtat] = useState<Etat>({ etat: 'repos' });
  const cote = cotes ? coteDe(cotes, finition) : null;

  const envoyer = async (evenement: FormEvent): Promise<void> => {
    evenement.preventDefault();
    const demande = { rarete: carte.rarete, mise: entier(mise) ?? 0, achatImmediat: entier(achat), heures };
    const probleme = verifierLaMiseEnVente(demande, REGLES);
    if (probleme) { setEtat({ etat: 'erreur', message: probleme }); return; }
    if (!window.confirm(`Mettre « ${carte.mot} » en vente pendant ${heures} h, à partir de ${demande.mise} Encre ? Le timbre quitte ton album le temps de la vente.`)) return;
    setEtat({ etat: 'en cours' });
    try {
      onVendu(await mettreEnVente(carte.id, finition, demande.mise, demande.achatImmediat, heures));
    } catch (erreur) {
      setEtat({ etat: 'erreur', message: erreur instanceof Error ? erreur.message : String(erreur) });
    }
  };

  return (
    <form className="vente" onSubmit={(e) => void envoyer(e)}>
      <p className="texte-doux petit">
        Le timbre quitte ton album le temps de la vente{exemplaires === 1 && dansLeDeck ? ', et ton deck' : ''}. À la fin, tu reçois le prix
        moins {Math.round(REGLES.commission * 100)} % de commission. Sans preneur, il revient dans ton album.
      </p>
      {finitions.length > 1 && (
        <label className="vente__champ">
          <span>Finition</span>
          <select value={finition} onChange={(e) => setFinition(FINITIONS.find((f) => f === e.target.value) ?? finition)}>
            {finitions.map((f) => <option key={f} value={f}>{f}{(possedee.finitions[f] ?? 0) > 1 ? ` (×${possedee.finitions[f]})` : ''}</option>)}
          </select>
        </label>
      )}
      <div className="vente__prix">
        <label className="vente__champ">
          <span>Mise de départ (au moins {plancher} Encre)</span>
          <input type="number" inputMode="numeric" min={plancher} step={1} value={mise} onChange={(e) => setMise(e.target.value)} required />
        </label>
        <label className="vente__champ">
          <span>Achat immédiat (facultatif)</span>
          <input type="number" inputMode="numeric" min={plancher} step={1} value={achat} onChange={(e) => setAchat(e.target.value)} placeholder="aucun" />
        </label>
      </div>
      {cote && <p className="texte-doux petit">Cote du jour de ce timbre en finition {finition.toLowerCase()} : {cote.cote} Encre.</p>}
      <fieldset className="vente__duree">
        <legend>Durée de la vente</legend>
        {REGLES.dureesEnHeures.map((h) => (
          <label key={h}><input type="radio" name="duree" value={h} checked={heures === h} onChange={() => setHeures(h)} /> {h} h</label>
        ))}
      </fieldset>
      {etat.etat === 'erreur' && <p className="joute__refus" role="alert">{etat.message}</p>}
      <div className="rangee-de-boutons">
        <button type="submit" className="bouton" disabled={etat.etat === 'en cours'}>{etat.etat === 'en cours' ? 'Mise en vente…' : 'Mettre en vente'}</button>
      </div>
    </form>
  );
}
