import { useEffect, useRef, useState } from 'react';
import { ChoixDuPseudonyme } from '../composants/ChoixDuPseudonyme.tsx';
import { Cachet, EnteteCorrespondance, LIEN_EQUIPE_2V2, PortraitAmi, Presence, TimbreEmbleme, signeGrave } from '../composants/correspondance/Correspondance.tsx';
import { usePartie } from '../composants/usePartie.ts';
import { LONGUEUR_DU_PSEUDO } from '../jeu/pseudo.ts';
import { profilVisible } from '../jeu/personnalisation.ts';
import { lien } from '../navigation/routes.ts';
import { amisDisponibles } from '../services/amis.ts';
import { EMBLEMES, serveurEquipes } from '../services/equipes.ts';
import type { Embleme, Equipe as EquipeDonnees, MonEquipe } from '../services/equipes.ts';
import { messageDe } from '../partage/messages.ts';
import './equipe.css';

type Agir = (action: () => Promise<void>, message: string) => Promise<boolean>;
const signe = signeGrave;
const jourCourt = (le: number) => new Date(le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const trait = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const ICONE_DEFI = <svg viewBox="0 0 24 24" aria-hidden="true" {...trait}><path d="m5 5 14 14M19 5 5 19" /></svg>;
const ICONE_COURONNE = <svg viewBox="0 0 24 24" aria-hidden="true" {...trait}><path d="M3 18h18M4 15 3 6l5 4 4-6 4 6 5-4-1 9z" /></svg>;

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
      catch (e) { if (actif && version === generation.current) setErreur(messageDe(e)); }
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
    catch (e) { setErreur(messageDe(e)); return false; }
    finally { verrou.current = false; setOccupe(false); }
  };
  const sauvegarde = partie.etat === 'prete' ? partie.sauvegarde : null;
  const pseudo = donnees?.moi ? donnees.equipe?.membres.find(m => m.id === donnees.moi)?.pseudo ?? (sauvegarde?.joutes.pseudo || sauvegarde?.profil.pseudo || null) : null;
  return <main className="ecran equipe correspondance" aria-busy={occupe}>
    <h1 className="visuellement-cache">Mon équipe</h1>
    <EnteteCorrespondance actif="equipe" pseudo={pseudo} invitations={donnees && !donnees.equipe ? donnees.invitations.length : 0}
      signe={donnees?.equipe ? signe(donnees.equipe.embleme) : undefined} occupe={occupe} actualiser={disponible ? () => setTour(t => t + 1) : undefined} />
    {message && <p className="bloc" role="status">{message}</p>}
    {erreur && <div className="bloc bloc--alerte" role="alert"><p>{erreur}</p><button className="bouton" disabled={occupe} onClick={() => setTour(t => t + 1)}>Réessayer</button></div>}
    {!amisDisponibles ? <p>Connecte-toi au serveur pour former une équipe.</p>
      : partie.etat === 'erreur' ? <p role="alert">{partie.message}</p>
      : !donnees ? !erreur && <p role="status">Chargement de l’équipe…</p>
      : !donnees.moi ? <section className="bloc"><ChoixDuPseudonyme onValide={() => { setMessage('Ton pseudonyme est enregistré.'); setTour(t => t + 1); }} /></section>
      : donnees.equipe ? <GestionEquipe key={donnees.equipe.id} equipe={donnees.equipe} moi={donnees.moi} amis={donnees.amis} agir={agir} occupe={occupe} />
      : <>
        {donnees.invitations.length > 0 && <section className="equipe__section" aria-label="Invitations reçues"><ul className="liste-nue equipe__invitations">
          {donnees.invitations.map(i => <li key={i.id} className="invitation-equipe">
            <TimbreEmbleme embleme={i.embleme} />
            <div className="invitation-equipe__texte"><span className="mention mention--vive">Invitation reçue</span><h2>{i.nom}</h2><p className="texte-doux">{i.capitaine}, capitaine, te propose la place libre.</p></div>
            <Cachet haut="Jusqu’au" bas={jourCourt(i.expire_le)} incline={-9} />
            <span className="visuellement-cache">Valable jusqu’au {new Date(i.expire_le).toLocaleDateString('fr-FR')}</span>
            <div className="invitation-equipe__actions"><button className="bouton bouton--accent" disabled={occupe} onClick={() => void agir(() => serveurEquipes().repondre(i.id, 'accepter'), 'Équipe rejointe.')}>Rejoindre</button><button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => serveurEquipes().repondre(i.id, 'refuser'), 'Invitation refusée.')}>Refuser</button></div>
          </li>)}
        </ul></section>}
        <section className="equipe__section equipe__fonder" aria-labelledby="titre-fonder"><h2 id="titre-fonder">Fonder ton équipe</h2><IdentiteEquipe occupe={occupe} agir={agir} pseudo={pseudo ?? ''} nombreDAmis={donnees.amis.length} /></section>
      </>}
  </main>;
}

function IdentiteEquipe({ equipe, occupe, agir, fermer, pseudo, nombreDAmis }: { equipe?: EquipeDonnees; occupe: boolean; agir: Agir; fermer?: () => void; pseudo?: string; nombreDAmis?: number }) {
  const partie = usePartie();
  const profil = partie.etat === 'prete' ? profilVisible(partie.sauvegarde.profil, partie.compte?.formule ?? null) : null;
  const [nom, setNom] = useState(equipe?.nom ?? '');
  const [embleme, setEmbleme] = useState<Embleme>(equipe?.embleme ?? 'plume');
  const id = useRef(crypto.randomUUID());
  const formulaire = <form className="equipe__formulaire" onSubmit={e => { e.preventDefault(); void agir(() => equipe ? serveurEquipes().modifier(equipe.id, nom, embleme) : serveurEquipes().creer(id.current, nom, embleme), equipe ? 'Équipe mise à jour.' : 'Équipe créée. Invite ton partenaire.').then(ok => { if (ok) fermer?.(); }); }}>
    <fieldset disabled={occupe}>
      <label className="equipe__nom"><span className="mention">Nom d’équipe · {LONGUEUR_DU_PSEUDO.minimum} à {LONGUEUR_DU_PSEUDO.maximum} caractères</span><input id={equipe ? 'nom-equipe' : undefined} value={nom} onChange={e => setNom(e.target.value)} required minLength={LONGUEUR_DU_PSEUDO.minimum} maxLength={LONGUEUR_DU_PSEUDO.maximum} placeholder="Les Encriers" /></label>
      <fieldset className="equipe__emblemes"><legend className="mention">Emblème</legend>{EMBLEMES.map(e => <label key={e.id} className="equipe__choix-embleme"><input type="radio" name="embleme" value={e.id} checked={embleme === e.id} onChange={() => setEmbleme(e.id)} /><span className="equipe__sceau" aria-hidden="true">{signeGrave(e.id)}</span><span>{e.nom}</span></label>)}</fieldset>
      <div className="rangee-de-boutons"><button className="bouton bouton--accent" disabled={nom.trim().length < LONGUEUR_DU_PSEUDO.minimum}>{equipe ? 'Enregistrer' : 'Créer mon équipe'}</button>{fermer && <button type="button" className="bouton bouton--discret" onClick={fermer}>Annuler</button>}</div>
    </fieldset>
  </form>;
  if (equipe) return formulaire;
  // À la création, l'aperçu de l'équipe se met à jour pendant la saisie.
  return <div className="equipe__creation">
    {formulaire}
    <aside className="equipe__apercu" aria-label="Aperçu de l’équipe">
      <span className="mention">Aperçu</span>
      <div className="blason blason--apercu">
        <span className="blason__filigrane" aria-hidden="true">{signe(embleme)}</span>
        <TimbreEmbleme embleme={embleme} nom={nom.trim() || 'Ton équipe'} grand />
        <strong className="blason__nom">{nom.trim() || 'Ton équipe'}</strong>
        <div className="duo duo--centre">
          <div className="duo__membre duo__membre--colonne">{profil && <PortraitAmi apparence={{ avatar: profil.avatar, cadre: profil.cadre, xp: profil.xp }} taille={56} />}<span>{pseudo} · capitaine</span></div>
          <span className="duo__et" aria-hidden="true">&amp;</span>
          <div className="duo__membre duo__membre--colonne"><span className="duo__place" aria-hidden="true" /><span className="texte-doux">Une place libre</span></div>
        </div>
        {nombreDAmis === 0 && <p className="texte-doux petit">Aucun ami libre pour compléter le duo pour l’instant. <a href={lien({ ecran: 'amis' })}>Ajouter un ami</a></p>}
      </div>
    </aside>
  </div>;
}

function GestionEquipe({ equipe, moi, amis, agir, occupe }: { equipe: EquipeDonnees; moi: string; amis: MonEquipe['amis']; agir: Agir; occupe: boolean }) {
  const capitaine = equipe.membres.some(m => m.id === moi && m.capitaine);
  const partenaire = equipe.membres.find(m => m.id !== moi);
  const complet = equipe.membres.length === 2;
  const [ami, setAmi] = useState('');
  const [confirmation, setConfirmation] = useState<'quitter' | 'dissoudre' | null>(null);
  return <>
    <section className="blason" aria-labelledby="titre-equipe">
      <span className="blason__filigrane" aria-hidden="true">{signe(equipe.embleme)}</span>
      <div className="blason__timbre"><TimbreEmbleme embleme={equipe.embleme} nom={equipe.nom} grand /><Cachet haut={complet ? 'Duo' : 'Une place'} bas={complet ? 'complet' : 'libre'} incline={14} /></div>
      <div className="blason__centre">
        <span className="mention">Ton équipe</span>
        <h2 id="titre-equipe" className="blason__nom">{equipe.nom}</h2>
        <div className="duo">
          {equipe.membres.map((m, i) => <div key={m.id} className="duo__groupe">
            {i > 0 && <span className="duo__et" aria-hidden="true">&amp;</span>}
            <div className="duo__membre">
              <PortraitAmi apparence={m} taille={64} />
              <div><strong>{m.pseudo}{m.id === moi && <span className="texte-doux"> · toi</span>}</strong>
                {m.capitaine ? <span className="duo__role duo__role--capitaine">{ICONE_COURONNE}Capitaine</span> : <span className="duo__role">Partenaire{m.id !== moi && m.vu_le ? <> · <Presence vuLe={m.vu_le} /></> : null}</span>}
              </div>
            </div>
          </div>)}
          {!complet && <div className="duo__groupe"><span className="duo__et" aria-hidden="true">&amp;</span><div className="duo__membre"><span className="duo__place" aria-hidden="true" /><span className="texte-doux">Une place libre</span></div></div>}
        </div>
      </div>
      <div className="blason__actions">
        {equipe.cote !== undefined && <div className="blason__cote"><span className="mention">Cote 2v2 d’équipe</span><strong>{(equipe.cote ?? 1000).toLocaleString('fr-FR')}</strong></div>}
        {complet && <a className="bouton bouton--accent" href={LIEN_EQUIPE_2V2}>{ICONE_DEFI}Jouer en 2 contre 2</a>}
        {capitaine && <button className="bouton bouton--discret" disabled={occupe} onClick={() => { const champ = document.getElementById('nom-equipe'); champ?.scrollIntoView({ behavior: 'smooth', block: 'center' }); champ?.focus({ preventScroll: true }); }}>Modifier l’équipe</button>}
      </div>
    </section>

    <div className={`equipe__panneaux${capitaine ? '' : ' equipe__panneaux--seul'}`}>
      {complet ? <section className="panneau-equipe" aria-labelledby="titre-duo">
        <span id="titre-duo" className="mention mention--cuivre">Joute en duo</span>
        <div className="sieges">{equipe.membres.map(m => <div key={m.id} className="siege">
          <PortraitAmi apparence={m} taille={40} sansNiveau />
          <div><strong>{m.pseudo}</strong><span className="texte-doux petit">{m.id === moi ? 'Toi' : m.vu_le ? <Presence vuLe={m.vu_le} /> : 'Partenaire'}</span></div>
        </div>)}</div>
        <a className="bouton bouton--accent" href={LIEN_EQUIPE_2V2}>Je suis prêt avec mon équipe</a>
        <details className="panneau-equipe__regles"><summary>Les règles du 2v2</summary><p>PV communs, mains personnelles visibles entre partenaires. 8 s pour poser une carte, 30 s pour les deux définitions adverses. Les attaques sont simultanées. Les deux membres ouvrent « 2v2 équipe » et se déclarent prêts ; vos résultats ne font évoluer que la cote de l’équipe.</p></details>
      </section>
      : <section className="panneau-equipe" aria-labelledby="titre-partenaire">
        <span className="mention mention--cuivre">Une place libre</span>
        <h2 id="titre-partenaire">Inviter un partenaire</h2>
        {!capitaine ? <p className="texte-doux">Seul le capitaine peut inviter.</p>
          : equipe.invitation ? <div className="invitation-envoyee"><p>Invitation envoyée à <strong>{equipe.invitation.pseudo}</strong>.</p><p className="texte-doux petit">Jusqu’au {new Date(equipe.invitation.expire_le).toLocaleDateString('fr-FR')}</p><button className="bouton bouton--discret" disabled={occupe} onClick={() => void agir(() => serveurEquipes().repondre(equipe.invitation!.id, 'annuler'), 'Invitation annulée.')}>Annuler l’invitation</button></div>
          : amis.length === 0 ? <p>Aucun ami disponible. <a href={lien({ ecran: 'amis' })}>Ajouter un ami</a></p>
          : <form className="equipe__inviter" onSubmit={e => { e.preventDefault(); void agir(() => serveurEquipes().inviter(equipe.id, ami), 'Invitation envoyée.'); }}><label><span className="mention">Ton ami</span><select aria-label="Ton ami" required value={ami} disabled={occupe} onChange={e => setAmi(e.target.value)}><option value="">Choisir un ami</option>{amis.map(a => <option value={a.id} key={a.id}>{a.pseudo}</option>)}</select></label><button className="bouton bouton--accent" disabled={occupe || !amis.some(a => a.id === ami)}>Inviter</button></form>}
      </section>}
      {capitaine && <section className="panneau-equipe panneau-equipe--edition" aria-labelledby="titre-edition">
        <span className="mention mention--cuivre">Réservé au capitaine</span>
        <h2 id="titre-edition">Nom et emblème</h2>
        <IdentiteEquipe equipe={equipe} occupe={occupe} agir={agir} />
      </section>}
    </div>

    <section className="equipe__depart" aria-label="Quitter ou dissoudre">
      <p className="texte-doux">{capitaine && partenaire ? `Si tu pars, ${partenaire.pseudo} devient capitaine. ` : ''}Vos collections et vos soldes restent à chacun.</p>
      <div className="rangee-de-boutons"><button className="bouton bouton--discret" disabled={occupe} onClick={() => setConfirmation('quitter')}>Quitter l’équipe</button>{capitaine && <button className="bouton bouton--discret bouton--danger-doux" disabled={occupe} onClick={() => setConfirmation('dissoudre')}>Dissoudre l’équipe</button>}</div>
      {confirmation && <div className="equipe__confirmation"><p>{confirmation === 'dissoudre' || equipe.membres.length === 1 ? 'L’équipe sera supprimée. Vos collections seront conservées.' : capitaine ? 'Ton partenaire deviendra capitaine.' : 'Tu quitteras cette équipe.'}</p><div className="rangee-de-boutons"><button className="bouton" disabled={occupe} onClick={() => void agir(() => confirmation === 'dissoudre' ? serveurEquipes().dissoudre(equipe.id) : serveurEquipes().quitter(equipe.id), confirmation === 'dissoudre' ? 'Équipe dissoute.' : 'Tu as quitté l’équipe.')}>Confirmer</button><button className="bouton bouton--discret" disabled={occupe} onClick={() => setConfirmation(null)}>Annuler</button></div></div>}
    </section>
  </>;
}
