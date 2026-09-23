import { AlbumDesSucces } from '../composants/AlbumDesSucces.tsx';
import { FAMILLES_SUCCES, SUCCES, succesDuTitre } from '../jeu/catalogueSucces.ts';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { Identite, Portrait, Embleme } from '../composants/Identite.tsx';
import { Motif } from '../composants/cosmetiques/Gravures.tsx';
import { DosDeCarte } from '../composants/carte/Carte.tsx';
import { PaquetScelle } from '../composants/paquet/PaquetScelle.tsx';
import { useMaintenant, usePartie } from '../composants/usePartie.ts';
import { ORNEMENTS, PAQUETS, XP, estDisponible, ornement, profilVisible, progressionDuNiveau } from '../jeu/personnalisation.ts';
import type { Categorie } from '../jeu/personnalisation.ts';
import { cosmetiquesPremium } from '../jeu/formule.ts';

import { nommerMonProfil, personnaliser } from '../services/partie.ts';

type Section = Categorie | 'paquet';
const CATEGORIES: { id: Section; nom: string; motif: string }[] = [
  { id: 'cadre', nom: 'Cadres', motif: 'boussole' }, { id: 'avatar', nom: 'Avatars', motif: 'renard' },
  { id: 'dos', nom: 'Dos', motif: 'oracle' }, { id: 'paquet', nom: 'Paquets', motif: 'cristal' },
  { id: 'titre', nom: 'Titres', motif: 'plume' }, { id: 'couleur', nom: 'Couleurs', motif: 'papillon' },
];
function Verrou() { return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><rect x="4" y="7" width="8" height="7" rx="1" /><path d="M5 7V5a3 3 0 0 1 6 0v2" /></svg>; }

export function Profil() {
  const partie = usePartie();
  const maintenant = useMaintenant(60_000);
  const [vue, changerVue] = useState<'personnalisation' | 'succes'>('personnalisation');
  const [cibleSucces, ciblerSucces] = useState<string | null>(null);
  const [categorie, choisirCategorie] = useState<Section>('cadre');
  const [choix, choisir] = useState('astral');
  const [filtre, filtrer] = useState('tout');
  const [pseudo, saisirPseudo] = useState('');
  const [edition, editer] = useState(false);
  const dialogue = useRef<HTMLDialogElement>(null);
  const essayage = useRef<HTMLElement>(null);
  const [message, dire] = useState('');
  const [erreur, signaler] = useState('');
  useEffect(() => { if (edition) dialogue.current?.showModal(); else dialogue.current?.close(); }, [edition]);
  if (partie.etat !== 'prete') return <main className="ecran"><h1>Mon profil</h1><p role="status">{partie.etat === 'erreur' ? partie.message : 'Chargement…'}</p></main>;
  const sauvegarde = partie.sauvegarde;
  const profil = profilVisible(sauvegarde.profil, partie.compte?.formule ?? null, maintenant);
  const premium = !!partie.compte && cosmetiquesPremium(partie.compte.formule, maintenant);
  const niveau = progressionDuNiveau(profil.xp);
  const selection = ornement(choix);
  const succesSelectionne = succesDuTitre(choix);
  const paquet = PAQUETS.find((p) => p.id === choix);
  const nom = selection?.nom ?? paquet?.nom ?? '';
  const teinte = selection?.teinte ?? paquet?.metal ?? '#a3cee2';
  const disponible = categorie === 'paquet' || !!selection && estDisponible(profil, selection, premium);
  const equipe = profil[categorie] === choix;
  const apercu = { ...profil, [categorie]: choix };
  const catalogue = categorie === 'paquet' ? PAQUETS : ORNEMENTS.filter((o) => o.categorie === categorie);
  const visibles = catalogue.filter((o) => filtre === 'tout' || (filtre === 'premium' ? 'premium' in o && o.premium : !('premium' in o) || estDisponible(profil, o, premium)));
  function changerSection(id: Section) { choisirCategorie(id); choisir(profil[id] || ORNEMENTS.find(o => o.categorie === id)?.id || ''); filtrer('tout'); signaler(''); dire(''); }
  function selectionner(id: string) {
    choisir(id); signaler(''); dire('');
    if (window.innerWidth < 768 && essayage.current && essayage.current.getBoundingClientRect().top < 0) {
      const reduire = sauvegarde.reglages.reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      essayage.current.scrollIntoView({ block: 'start', behavior: reduire ? 'instant' : 'smooth' });
    }
  }
  function equiper() { personnaliser(categorie, choix); dire(`${nom} équipé.`); signaler(''); }
  function incliner(e: PointerEvent<HTMLDivElement>) {
    if (sauvegarde.reglages.reduireAnimations || window.matchMedia('(prefers-reduced-motion: reduce)').matches || e.pointerType !== 'mouse') return;
    const b = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--inclinaison-x', `${(e.clientY-b.top-b.height/2)/b.height*-7}deg`);
    e.currentTarget.style.setProperty('--inclinaison-y', `${(e.clientX-b.left-b.width/2)/b.width*9}deg`);
  }
  return <main className="ecran vestiaire" style={{ '--selection': teinte } as CSSProperties}>
    <header className="vestiaire__entete">
      <h1 className="visuellement-cache">Mon profil</h1><div className="vestiaire__vues" role="group" aria-label="Section du profil"><button aria-pressed={vue === 'personnalisation'} onClick={() => changerVue('personnalisation')}>Personnalisation</button><button aria-pressed={vue === 'succes'} onClick={() => { ciblerSucces(null); changerVue('succes'); }}>Succès <small>{profil.succes.length}/{SUCCES.length}</small></button></div>
      <div className="vestiaire__compte"><div><strong>{profil.pseudo || sauvegarde.joutes.pseudo || 'Collectionneur'}</strong><button className="vestiaire__renommer" aria-label="Modifier le pseudo" onClick={() => { saisirPseudo(profil.pseudo || sauvegarde.joutes.pseudo); signaler(''); editer(true); }}>✎</button></div><div className="vestiaire__niveau"><span>Niv. {niveau.niveau}</span><progress aria-label={`Niveau ${niveau.niveau} : ${niveau.acquis} sur ${niveau.requis} XP`} value={niveau.acquis} max={niveau.requis} /><small>{niveau.acquis}/{niveau.requis} XP</small></div></div>
    </header>
    {vue === 'succes' ? <AlbumDesSucces profil={profil} cible={cibleSucces} /> : <div className="vestiaire__atelier">
      <aside ref={essayage} className="vestiaire__essayage" aria-label="Aperçu de la personnalisation">
        <div className="vestiaire__scene" onPointerMove={incliner} onPointerLeave={(e) => { e.currentTarget.style.setProperty('--inclinaison-x','0deg'); e.currentTarget.style.setProperty('--inclinaison-y','0deg'); }}>
          <span className="vestiaire__etat">{equipe ? 'VOTRE SIGNATURE' : 'ESSAYAGE'}</span>
          <svg className="vestiaire__astrolabe" viewBox="0 0 400 460" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="200" cy="205" r="168" /><circle cx="200" cy="205" r="153" strokeDasharray="1 9" /><path d="M200 18v374M12 205h376M68 73l264 264M68 337 332 73" /><path d="m200 30 8 18-8 18-8-18Zm0 313 8 18-8 18-8-18Z" /><ellipse cx="200" cy="408" rx="108" ry="11" /><ellipse cx="200" cy="408" rx="135" ry="19" /></svg>
          <div className={`vestiaire__objet vestiaire__objet--${categorie}`} key={choix}>
            {categorie === 'paquet' ? <PaquetScelle modele={choix} /> : categorie === 'dos' ? <DosDeCarte modele={choix} etiquette={nom} /> : <Identite profil={apercu} pseudo={sauvegarde.joutes.pseudo} apercu />}
          </div>
          <span className="vestiaire__signature">PHILAMOTS <span>✦</span> COLLECTION PRIVÉE</span>
        </div>
        <div className="vestiaire__fiche">
          <span className="vestiaire__famille">{selection?.famille ?? 'Correspondances'}{selection?.anime && <span> · Animé</span>}</span>
          <h2 aria-live="polite">{nom}</h2>
          <div className="vestiaire__obtention">{succesSelectionne ? <span>{disponible ? `Succès accompli · ${succesSelectionne.nom}` : succesSelectionne.description}</span> : selection?.premium ? <span className="sceau-premium">✦ Premium · Achat unique</span> : disponible ? <span>{categorie === 'paquet' ? 'Collection ouverte' : 'Dans votre collection'}</span> : <span>À gagner au niveau {selection?.niveau}</span>}</div>
          {equipe ? <button className="bouton vestiaire__action" disabled>✓ Équipé</button>
            : disponible ? <button className="bouton vestiaire__action" onClick={equiper}>Équiper</button>
            : succesSelectionne ? <button className="bouton vestiaire__action" onClick={() => { ciblerSucces(succesSelectionne.id); changerVue('succes'); }}>Voir le succès <span>↗</span></button>
            : selection?.premium ? null
            : <button className="bouton vestiaire__action" disabled>À gagner au niveau {selection?.niveau}</button>}
          {categorie === 'titre' && profil.titre && <button className="bouton vestiaire__annuler" onClick={() => { personnaliser('titre', ''); dire('Titre retiré.'); }}>Retirer le titre</button>}
          <p className="vestiaire__message" role="status">{message}</p>{erreur && <p className="vestiaire__erreur" role="alert">{erreur}</p>}
        </div>
      </aside>
      <section className="vestiaire__collection" aria-label="Collection de cosmétiques">
        <div className="vestiaire__categories" role="group" aria-label="Catégorie">{CATEGORIES.map((c) => <button type="button" key={c.id} aria-pressed={categorie === c.id} onClick={() => changerSection(c.id)}><Embleme motif={c.motif} /><span>{c.nom}</span></button>)}</div>
        <div className="vestiaire__outils"><h2>{CATEGORIES.find((c) => c.id === categorie)?.nom} <small>{catalogue.length.toString().padStart(2,'0')}</small></h2><div role="group" aria-label="Filtrer la collection">{[['tout','Tout'],['acquis','Possédés'], ...(catalogue.some(o => 'premium' in o && o.premium) ? [['premium','Premium']] : [])].map(([id,label])=><button key={id} aria-pressed={filtre === id} onClick={() => filtrer(id)}>{label}</button>)}</div></div>
        <div className={`vestiaire__grille vestiaire__grille--${categorie}`}>
          {visibles.map((o) => {
            const item = 'categorie' in o ? o : null;
            const libre = !item || estDisponible(profil,item,premium);
            const actif = choix === o.id;
            return <button type="button" className="cosmetique" key={o.id} data-selectionne={actif} data-equipe={profil[categorie] === o.id} data-premium={item?.premium ?? false} aria-pressed={actif} aria-label={`${o.nom}${item?.premium ? ', premium' : ''}${profil[categorie] === o.id ? ', équipé' : !libre ? ', verrouillé' : ''} — essayer`} style={{ '--objet': item?.teinte ?? ('metal' in o ? o.metal : teinte) } as CSSProperties} onClick={() => selectionner(o.id)}>
              <span className="cosmetique__badge" aria-hidden="true">{item?.premium ? '✦' : ''}</span>
              <span className="cosmetique__visuel">
                {categorie === 'cadre' ? <Portrait avatar={profil.avatar} cadre={o.id} anime={actif} />
                  : categorie === 'avatar' ? <Embleme motif={o.id} />
                  : categorie === 'paquet' ? <PaquetScelle modele={o.id} />
                  : categorie === 'dos' ? <DosDeCarte modele={o.id} etiquette={o.nom} anime={actif} />
                  : categorie === 'couleur' ? <span className="cosmetique__encrier"><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true"><path d="m30 27-8 19v35q28 13 56 0V46l-8-19ZM30 16h40v11H30Z" strokeWidth="2" /><path d="M24 51q28 10 52 0v29q-26 10-52 0Z" fill="currentColor" fillOpacity=".5" /><path d="M31 45v28" strokeWidth="4" opacity=".6" /><path d="m50 37 8 12-8 12-8-12Z" fill="currentColor" /></svg></span>
                  : <span className="cosmetique__titre" data-titre={o.id}><svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true"><Motif nom={FAMILLES_SUCCES[succesDuTitre(o.id)?.famille ?? 'collection'].motif} /></svg></span>}
              </span>
              <span className="cosmetique__cartouche"><span className="cosmetique__nom">{o.nom}</span>
              <span className="cosmetique__acces">{profil[categorie] === o.id ? '✓ Équipé' : libre ? 'Disponible' : item?.succes ? <><Verrou /> Succès</> : item?.premium ? <><Verrou /> Premium</> : <><Verrou /> Niv. {item?.niveau}</>}</span></span>
            </button>;
          })}
        </div>
        {visibles.length === 0 && <p className="vestiaire__vide">Aucun élément dans cette sélection.</p>}
        <footer className="vestiaire__pied"><span>✧ {ORNEMENTS.filter(o=>estDisponible(profil,o,premium)).length + PAQUETS.length} / {ORNEMENTS.length + PAQUETS.length} dans votre collection</span><details><summary>Gains d’XP</summary><p>Paquet {XP.paquet} · Nouveau mot {XP.decouverte} · Définition {XP.reponse} · Duel {XP.duel} · Victoire +{XP.victoire}</p></details></footer>
      </section>
    </div>}
    <dialog aria-labelledby="titre-signature" className="vestiaire__dialogue" ref={dialogue} onCancel={() => editer(false)}><form onSubmit={(e) => { e.preventDefault(); try { nommerMonProfil(pseudo); editer(false); dire('Pseudo enregistré.'); signaler(''); } catch(e) { signaler((e as Error).message); } }}><h2 id="titre-signature">Votre signature</h2><label htmlFor="pseudo-personnel">Pseudo du profil</label><input id="pseudo-personnel" value={pseudo} onChange={e=>saisirPseudo(e.target.value)} maxLength={24} autoFocus />{erreur && <p role="alert">{erreur}</p>}<button className="bouton vestiaire__action">Enregistrer</button><button className="bouton vestiaire__annuler" type="button" onClick={() => { editer(false); signaler(''); }}>Annuler</button></form></dialog>
  </main>;
}

