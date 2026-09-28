// Le navigateur d'une application (Instagram, Facebook, Messenger, TikTok…) : un lien ouvert depuis ces applications
// s'affiche dans leur propre navigateur, dont les données sont séparées de celles de Safari ou de Chrome. Un invité qui
// découvre le jeu là, puis rouvre philamots.fr dans son navigateur habituel, repart de zéro : on le prévient (audit de
// finition du 26/09/2026, E31). Reconnu à la signature du navigateur.

export function applicationHote(agent: string): string | null {
  if (/Instagram/i.test(agent)) return 'Instagram';
  if (/MessengerForiOS|Orca-Android/i.test(agent)) return 'Messenger';
  if (/FBAN|FBAV|FB_IAB|FBIOS/.test(agent)) return 'Facebook';
  if (/musical_ly|BytedanceWebview|TikTok/i.test(agent)) return 'TikTok';
  if (/Snapchat/i.test(agent)) return 'Snapchat';
  if (/LinkedInApp/i.test(agent)) return 'LinkedIn';
  return null;
}

// « d'Instagram », « de Facebook ».
export const deLApplication = (nom: string): string => (/^[aeiouyhéè]/i.test(nom) ? `d’${nom}` : `de ${nom}`);
