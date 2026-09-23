import type { CSSProperties } from 'react';
import { ornement, profilVisible, progressionDuNiveau } from '../jeu/personnalisation.ts';
import type { ProfilPersonnel } from '../jeu/personnalisation.ts';
import { useMaintenant, usePartie } from './usePartie.ts';
import { CadreGrave, Embleme } from './cosmetiques/Gravures.tsx';
import './profil.css';
export { Embleme } from './cosmetiques/Gravures.tsx';

export function Portrait({ avatar, cadre, anime = true }: { avatar: string; cadre: string; anime?: boolean }) {
  const bord = ornement(cadre);
  return <span className="portrait" style={{ '--cadre': bord?.teinte, '--portrait': ornement(avatar)?.teinte } as CSSProperties}>
    <span className="portrait__fond" />
    <span className="portrait__embleme"><Embleme motif={avatar} /></span>
    <CadreGrave modele={cadre} anime={anime && bord?.anime} />
  </span>;
}
export function Identite({ profil, pseudo, apercu = false }: { profil: ProfilPersonnel; pseudo?: string; apercu?: boolean }) {
  const partie = usePartie();
  const maintenant = useMaintenant(60_000);
  const visible = apercu ? profil : profilVisible(profil, partie.etat === 'prete' ? partie.compte?.formule ?? null : null, maintenant);
  const niveau = progressionDuNiveau(visible.xp);
  return <div className="identite" style={{ '--profil-couleur': ornement(visible.couleur)?.valeur } as CSSProperties}>
    <Portrait avatar={visible.avatar} cadre={visible.cadre} />
    <span className="identite__texte"><strong>{visible.pseudo || pseudo || 'Collectionneur'}</strong>{visible.titre && <span data-titre={visible.titre} className={`titre-grave ${ornement(visible.titre)?.premium ? 'titre-grave--premium' : ''}`}>{ornement(visible.titre)?.nom}</span>}<small>Niveau {niveau.niveau}</small></span>
  </div>;
}
