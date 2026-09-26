// Prend en photo les images de la devinette (partage/question/<adresse>/ et partage/reponse/<adresse>/) avec le
// Chrome installé sur la machine (celui du poste de Raphaël, ou celui des serveurs de GitHub) : rien à télécharger.

import { chromium } from 'playwright-core';

export type Photo = { adresse: string; genre: 'question' | 'reponse'; chemin: string };

export async function photographier(site: string, voulues: { adresse: string; genre: 'question' | 'reponse' }[], cheminDe: (adresse: string, genre: string) => string): Promise<Photo[]> {
  const navigateur = await chromium.launch({ channel: 'chrome' });
  const faites: Photo[] = [];
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    for (const { adresse, genre } of voulues) {
      const reponse = await page.goto(`${site.replace(/\/?$/, '/')}partage/${genre}/${adresse}/`, { waitUntil: 'networkidle' });
      if (!reponse?.ok()) throw new Error(`Pas d'image pour ${adresse} (${genre}) : ${reponse?.status() ?? 'sans réponse'}`);
      await page.evaluate(() => document.fonts.ready);
      const chemin = cheminDe(adresse, genre);
      await page.locator('.carte-partage').screenshot({ path: chemin, type: 'jpeg', quality: 90 });
      faites.push({ adresse, genre, chemin });
    }
  } finally {
    await navigateur.close();
  }
  return faites;
}
