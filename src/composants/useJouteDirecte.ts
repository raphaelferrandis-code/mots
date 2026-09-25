import { useCallback, useEffect, useRef, useState } from 'react';
import { RealtimeClient } from '@supabase/realtime-js';
import { SERVEUR } from '../config/serveur.ts';
import { clientDuServeur, serveurUtilise } from '../services/compte.ts';
import { prochaineLecture } from '../jeu/direct.ts';
import type { ActionDirect, ModeDirect, ReponseDirect } from '../jeu/direct.ts';
import type { Registre } from '../partage/types.ts';
import { ErreurDuServeur } from '../services/supabase.ts';
import { synchroniser } from '../services/partie.ts';
import { messageDe } from '../partage/messages.ts';

export function useJouteDirecte(actif: boolean) {
  const [etat, setEtat] = useState<ReponseDirect | null>(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [reessayer, setReessayer] = useState(false);
  const [connecte, setConnecte] = useState(false);
  // Chaque échange terminé avec le serveur (réussi ou non) : de quoi prévoir la lecture suivante.
  const [echanges, setEchanges] = useState(0);
  const courant = useRef<ReponseDirect | null>(null);
  const decalage = useRef(0);
  const monte = useRef(false);
  const verrou = useRef(false);
  const lecture = useRef(false);
  const attente = useRef<object | null>(null);
  const refus = useRef(false);
  const chaine = useRef<Promise<unknown>>(Promise.resolve());
  const envoyer = useCallback((corps: object, mutation = false) => {
    if (mutation && verrou.current) return Promise.resolve();
    if (mutation) { verrou.current = true; setOccupe(true); attente.current = corps; refus.current = false; setErreur(''); }
    const operation = chaine.current.then(async () => {
      if (!monte.current) return;
      try {
        const debut = Date.now();
        const r = await clientDuServeur().appelerDirect<ReponseDirect>(corps);
        if (!monte.current) return;
        decalage.current = r.maintenant - (debut + Date.now()) / 2;
        const finNouvelle = r.partie?.vue.phase === 'fin' && (courant.current?.partie?.id !== r.partie.id || courant.current?.partie?.vue.phase !== 'fin');
        courant.current = r; setEtat(r);
        if (finNouvelle) void synchroniser();
        if (mutation) { attente.current = null; setReessayer(false); }
        if (!attente.current && !refus.current) setErreur('');
      } catch (e) {
        if (!monte.current) return;
        setErreur(messageDe(e));
        if (mutation) {
          const incertain = !(e instanceof ErreurDuServeur && e.refus);
          refus.current = !incertain;
          if (!incertain) attente.current = null;
          setReessayer(incertain);
        }
      } finally {
        if (mutation) { verrou.current = false; if (monte.current) setOccupe(false); }
        if (monte.current) setEchanges(n => n + 1);
      }
    });
    chaine.current = operation.catch(() => undefined);
    return operation;
  }, []);
  const actualiser = useCallback(() => {
    if (lecture.current || verrou.current) return;
    lecture.current = true;
    void envoyer({type:'lire'}).finally(() => { lecture.current = false; });
  }, [envoyer]);
  useEffect(() => {
    if (!actif || !serveurUtilise) return;
    monte.current = true; actualiser();
    // Retour sur l'onglet : on relit tout de suite (une proposition a pu arriver pendant l'absence).
    const retour = () => { if (document.visibilityState === 'visible') actualiser(); };
    window.addEventListener('online',actualiser); window.addEventListener('focus',actualiser); document.addEventListener('visibilitychange',retour);
    return () => { monte.current = false; window.removeEventListener('online',actualiser); window.removeEventListener('focus',actualiser); document.removeEventListener('visibilitychange',retour); };
  }, [actif,actualiser]);
  // La lecture suivante, au bon moment (prochaineLecture) plutôt que toutes les 2,5 s : le temps réel prévient des
  // changements, les échéances font avancer la partie. Replanifiée après chaque échange et quand le temps réel change.
  useEffect(() => {
    if (!actif || !serveurUtilise) return;
    const minuterie = window.setTimeout(actualiser, prochaineLecture(courant.current, connecte, Date.now() + decalage.current));
    return () => window.clearTimeout(minuterie);
  }, [actif,echanges,connecte,actualiser]);
  const utilisateur = etat?.utilisateur;
  useEffect(() => {
    if (!actif || !serveurUtilise || !utilisateur) return;
    let ferme = false;
    const client = new RealtimeClient(`${SERVEUR.adresse}/realtime/v1`, {
      params:{apikey:SERVEUR.clePublique}, accessToken:async () => (await clientDuServeur().lireSession()).acces,
    });
    // La première souscription doit déjà porter le JWT : une connexion anonyme
    // ne peut pas enregistrer le filtre sur la table protégée par RLS.
    void client.setAuth().then(() => {
      if (ferme) return;
      client.channel(`joutes:${utilisateur}`).on('system', {}, message => {
        if (!ferme && message.extension === 'postgres_changes') setConnecte(message.status === 'ok');
      }).on('postgres_changes', {
        event:'*',schema:'public',table:'direct_signaux',filter:`utilisateur=eq.${utilisateur}`,
      },actualiser).subscribe(statut => {
        if (ferme) return;
        if (statut !== 'SUBSCRIBED') setConnecte(false);
        if (statut === 'SUBSCRIBED') actualiser();
      });
    }).catch(() => { if (!ferme) setConnecte(false); });
    const renouveler = window.setInterval(() => { void client.setAuth().catch(() => { if (!ferme) setConnecte(false); }); },60_000);
    return () => { ferme = true; clearInterval(renouveler); void client.removeAllChannels(); client.disconnect(); };
  }, [actif,utilisateur,actualiser]);
  return { etat, erreur, occupe, reessayer, connecte, decalage:decalage.current, actualiser,
    // La dernière réponse du serveur, sans attendre le prochain affichage.
    courant: () => courant.current,
    chercher: (mode:ModeDirect,masques:Registre[]) => envoyer({type:'chercher',mode,masques:[...masques].sort()},true),
    annuler: () => envoyer({type:'annuler'},true), quitter: () => envoyer({type:'quitter'},true),
    retenter: () => attente.current ? envoyer(attente.current,true) : envoyer({type:'lire'}),
    // « J'y vais ! » ou « Refuser » la proposition en cours (le serveur ignore un second clic).
    repondre: (accepte: boolean) => {
      const proposition = courant.current?.proposition;
      return proposition ? envoyer({type:accepte ? 'accepter' : 'refuser',partie:proposition.id},true) : Promise.resolve();
    },
    agir: (action:ActionDirect) => {
      const p = courant.current?.partie;
      if (!p || attente.current) return Promise.resolve();
      return envoyer({type:'agir',partie:p.id,requete:crypto.randomUUID(),manche:p.vue.manche,phase:p.vue.phase,action},true);
    },
  };
}
