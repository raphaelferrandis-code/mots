import { useEffect, useRef, useState } from 'react';
import { usePartie } from '../composants/usePartie.ts';
import { LONGUEUR_DU_PSEUDO } from '../jeu/pseudo.ts';
import { lien } from '../navigation/routes.ts';
import { amisDisponibles } from '../services/amis.ts';
import { EMBLEMES, serveurEquipes } from '../services/equipes.ts';
import type { Embleme, Equipe as EquipeDonnees, MonEquipe } from '../services/equipes.ts';
import './equipe.css';

type Agir = (action: () => Promise<void>, message: string) => Promise<boolean>;
const signe = (id: Embleme) => EMBLEMES.find(e => e.id === id)?.signe;

export function Equipe() {
  const partie = usePartie();
  const disponible = amisDisponibles && partie.etat === 'prete';
  const [donnees, setDonnees] = useState<MonEquipe | null>(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [tour, setTour] = useState(0);
  const verrou = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    if (!disponible) return;
    let actif = true;
    const charger = async () => {
      if (verrou.current) return;
      const version = ++generation.current;
      try { const etat = await serveurEquipes().lire(); if (actif && version === generation.current) { setDonnees(etat); setErreur(''); } }
      catch (e) { if (actif && version === generation.current) setErreur(e instanceof Error ? e.message : String(e)); }
    };
    const actualiser = () => { if (document.visibilityState === 'visible') void charger(); };
    void charger();
    window.addEventListener('focus', actualiser);
    const timer = window.setInterval(actualiser, 30_000);
    return () => { actif = false; window.removeEventListener('focus', actualiser); window.clearInterval(timer); };
  }, [disponible, tour]);
  const agir: Agir = async (action, succes) => {
    if (verrou.current) return false;
    verrou.current = true; generation.current++; setOccupe(true); setErreur(''); setMessage('');
    try { await action(); setMessage(succes); setDonnees(await serveurEquipes().lire()); return true; }
    catch (e) { setErreur(e instanceof Error ? e.message : String(e)); return false; }
    finally { verrou.current = false; setOccupe(false); }
  };
  return <main className="ecran equipe" aria-busy={occupe}>
    <header className="equipe__entete"><h1>Mon équipe</h1>{disponible && <button className="bouton outil" disabled={occupe} onClick={() => setTour(t => t + 1)}>Actualiser</button>}</header>
    {message && <p className="bloc" role="status">{message}</p>}
    {erreur && <div className="bloc bloc--alerte" role="alert"><p>{erreur}</p><button className="bouton" disabled={occupe} onClick={() => setTour(t => t + 1)}>Réessayer</button></div>}
    {!amisDisponibles ? <p>Connecte-toi au serveur pour former une équipe.</p>
      : partie.etat === 'erreur' ? <p role="alert">{partie.message}</p>
      : !donnees ? !erreur && <p role="status">Chargement de l’équipe…</p>
      : !donnees.moi ? <div className="bloc"><p>Choisis un pseudo avant de rejoindre une équipe.</p><a className="bouton" href={lien({ ecran: 'amis' })}>Choisir mon pseudo</a></div>
      : donnees.equipe ? <GestionEquipe key={donnees.equipe.id} equipe={donnees.equipe} moi={donnees.moi} amis={donnees.amis} agir={agir} occupe={occupe} />
      : <>
        {donnees.invitations.length > 0 && <section className="rubrique"><h2>Invitations</h2><ul className="liste-nue equipe__invitations">
          {donnees.invitations.map(i => <li key={i.id} className="bloc"><div className="equipe__identite"><span className="equipe__embleme" aria-hidden="true">{signe(i.embleme)}</span><div><h3>{i.nom}</h3><p>Avec {i.capitaine}</p></div></div>
            <p className="texte-doux petit">Jusqu’au {new Date(i.expire_le).toLocaleDateString('fr-FR')}</p>
            <div className="rangee-de-boutons"><button className="bouton" disabled={occupe} onClick={() => void agir(() => serveurEquipes().repondre(i.id, 'accepter'), 'Équipe rejointe.')}>Rejoindre</button><button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => serveurEquipes().repondre(i.id, 'refuser'), 'Invitation refusée.')}>Refuser</button></div>
          </li>)}
        </ul></section>}
        <section className="rubrique"><h2>Créer une équipe</h2><p className="texte-doux">Un nom, deux joueurs. Invite un ami pour former votre duo.</p><IdentiteEquipe occupe={occupe} agir={agir} /></section>
      </>}
    <div className="rangee-de-boutons"><a className="bouton" href={lien({ecran:'joutes'})}>Jouer en 2v2 équipe</a><a href={lien({ ecran: 'amis' })}>Voir mes amis</a></div>
  </main>;
}

function IdentiteEquipe({ equipe, occupe, agir, fermer }: { equipe?: EquipeDonnees; occupe: boolean; agir: Agir; fermer?: () => void }) {
  const [nom, setNom] = useState(equipe?.nom ?? '');
  const [embleme, setEmbleme] = useState<Embleme>(equipe?.embleme ?? 'plume');
  const id = useRef(crypto.randomUUID());
  return <form className="equipe__formulaire" onSubmit={e => { e.preventDefault(); void agir(() => equipe ? serveurEquipes().modifier(equipe.id, nom, embleme) : serveurEquipes().creer(id.current, nom, embleme), equipe ? 'Équipe mise à jour.' : 'Équipe créée. Invite ton partenaire.').then(ok => { if (ok) fermer?.(); }); }}>
    <fieldset disabled={occupe}><label>Nom d’équipe<input value={nom} onChange={e => setNom(e.target.value)} required minLength={LONGUEUR_DU_PSEUDO.minimum} maxLength={LONGUEUR_DU_PSEUDO.maximum} placeholder="Les Encriers" /></label>
      <fieldset className="equipe__emblemes"><legend>Emblème</legend>{EMBLEMES.map(e => <label key={e.id} className="equipe__choix-embleme"><input type="radio" name="embleme" value={e.id} checked={embleme === e.id} onChange={() => setEmbleme(e.id)} /><span aria-hidden="true">{e.signe}</span><span>{e.nom}</span></label>)}</fieldset>
      <div className="rangee-de-boutons"><button className="bouton" disabled={nom.trim().length < LONGUEUR_DU_PSEUDO.minimum}>{equipe ? 'Enregistrer' : 'Créer mon équipe'}</button>{fermer && <button type="button" className="bouton bouton--discret" onClick={fermer}>Annuler</button>}</div>
    </fieldset>
  </form>;
}

function GestionEquipe({ equipe, moi, amis, agir, occupe }: { equipe: EquipeDonnees; moi: string; amis: MonEquipe['amis']; agir: Agir; occupe: boolean }) {
  const capitaine = equipe.membres.some(m => m.id === moi && m.capitaine);
  const [modifier, setModifier] = useState(false);
  const [ami, setAmi] = useState('');
  const [confirmation, setConfirmation] = useState<'quitter' | 'dissoudre' | null>(null);
  return <>
    <section className="equipe__carte bloc"><div className="equipe__identite"><span className="equipe__embleme" aria-hidden="true">{signe(equipe.embleme)}</span><div><h2>{equipe.nom}</h2><p className="texte-doux">{equipe.membres.length} / 2 joueurs</p></div></div>
      <ul className="liste-nue equipe__membres">{equipe.membres.map(m => <li key={m.id}><strong>{m.pseudo}{m.id === moi && ' · toi'}</strong><span className="texte-doux">{m.capitaine ? 'Capitaine' : 'Partenaire'}</span></li>)}{equipe.membres.length === 1 && <li className="texte-doux">Une place libre</li>}</ul>
      {capitaine && <button className="bouton bouton--discret" disabled={occupe} onClick={() => setModifier(!modifier)}>Modifier l’équipe</button>}
    </section>
    {modifier && capitaine && <section className="rubrique"><h2>Nom et emblème</h2><IdentiteEquipe equipe={equipe} occupe={occupe} agir={agir} fermer={() => setModifier(false)} /></section>}
    {capitaine && equipe.membres.length < 2 && <section className="rubrique"><h2>Inviter un partenaire</h2>
      {equipe.invitation ? <div className="bloc"><p>Invitation envoyée à <strong>{equipe.invitation.pseudo}</strong>.</p><p className="texte-doux petit">Jusqu’au {new Date(equipe.invitation.expire_le).toLocaleDateString('fr-FR')}</p><button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => serveurEquipes().repondre(equipe.invitation!.id, 'annuler'), 'Invitation annulée.')}>Annuler l’invitation</button></div>
        : amis.length === 0 ? <p>Aucun ami disponible. <a href={lien({ ecran: 'amis' })}>Ajouter un ami</a></p>
        : <form className="equipe__inviter" onSubmit={e => { e.preventDefault(); void agir(() => serveurEquipes().inviter(equipe.id, ami), 'Invitation envoyée.'); }}><label>Ton ami<select aria-label="Ton ami" required value={ami} disabled={occupe} onChange={e => setAmi(e.target.value)}><option value="">Choisir un ami</option>{amis.map(a => <option value={a.id} key={a.id}>{a.pseudo}</option>)}</select></label><button className="bouton" disabled={occupe || !amis.some(a => a.id === ami)}>Inviter</button></form>}
    </section>}
    <section className="rubrique"><div className="rangee-de-boutons"><button className="bouton bouton--discret" disabled={occupe} onClick={() => setConfirmation('quitter')}>Quitter l’équipe</button>{capitaine && <button className="bouton bouton--discret" disabled={occupe} onClick={() => setConfirmation('dissoudre')}>Dissoudre l’équipe</button>}</div>
      {confirmation && <div className="bloc equipe__confirmation"><p>{confirmation === 'dissoudre' || equipe.membres.length === 1 ? 'L’équipe sera supprimée. Vos collections seront conservées.' : capitaine ? 'Ton partenaire deviendra capitaine.' : 'Tu quitteras cette équipe.'}</p><div className="rangee-de-boutons"><button className="bouton" disabled={occupe} onClick={() => void agir(() => confirmation === 'dissoudre' ? serveurEquipes().dissoudre(equipe.id) : serveurEquipes().quitter(equipe.id), confirmation === 'dissoudre' ? 'Équipe dissoute.' : 'Tu as quitté l’équipe.')}>Confirmer</button><button className="bouton bouton--discret" disabled={occupe} onClick={() => setConfirmation(null)}>Annuler</button></div></div>}
    </section>
  </>;
}
