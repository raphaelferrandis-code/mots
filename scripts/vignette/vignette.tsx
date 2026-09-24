// La vignette qui accompagne un lien vers le jeu (WhatsApp, Facebook, Discord, X…) : 1200 × 630 pixels.
// Composée avec les vrais timbres du jeu, puis photographiée par scripts/fabriquer-la-vignette.mjs.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Carte } from '../../src/composants/carte/Carte.tsx';
import type { CarteIndex, Finition } from '../../src/partage/types.ts';
import { SITE } from '../../src/config/site.ts';
import '../../src/theme/polices.ts';
import '../../src/theme/theme.css';
import '../../src/theme/styles.css';

// Trois timbres, du plus courant au plus précieux : un Épique brillant, un Légendaire holographique, un Hors-série.
const TIMBRES: { id: string; finition: Finition; style: CSSProperties }[] = [
  { id: 'rodomontade-nom', finition: 'Brillante', style: { left: 10, top: 150, rotate: '-10deg', zIndex: 1 } },
  { id: 'amour-nom', finition: 'Normale', style: { left: 296, top: 140, rotate: '9deg', zIndex: 2 } },
  { id: 'sérendipité-nom', finition: 'Holographique', style: { left: 150, top: 62, rotate: '-1deg', zIndex: 3 } },
];

function Vignette() {
  const [cartes, setCartes] = useState<Map<string, CarteIndex> | null>(null);
  useEffect(() => {
    void fetch('/data/edition-1.index.json').then((r) => r.json()).then((d: { cartes: CarteIndex[] }) => {
      setCartes(new Map(d.cartes.map((c) => [c.id, c])));
    });
  }, []);
  // Le photographe attend ce drapeau, posé une fois les timbres et les polices en place.
  useEffect(() => {
    if (cartes) void document.fonts.ready.then(() => document.body.setAttribute('data-pret', ''));
  }, [cartes]);

  return (
    <div style={{
      position: 'relative', width: 1200, height: 630, overflow: 'hidden',
      background: 'radial-gradient(ellipse 70% 90% at 78% 50%, #1a3d64 0%, #102139 55%, #0b1729 100%)',
      color: 'var(--encre)',
    }}>
      {/* Filet cuivré, comme le cadre d'une page d'album */}
      <div style={{ position: 'absolute', inset: 22, border: '1px solid rgb(241 138 75 / 45%)', borderRadius: 18, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 84, top: 0, bottom: 0, width: 520, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <img src="/identite/philamots-clair.svg" alt="" style={{ width: 430, marginLeft: -6 }} />
        <p style={{ fontFamily: 'var(--police-serif)', fontSize: 44, lineHeight: 1.15, margin: '30px 0 0', color: 'var(--encre)' }}>
          Collectionne les mots<br />de la langue française.
        </p>
        <p style={{ fontFamily: 'var(--police-texte)', fontSize: 25, lineHeight: 1.4, margin: '20px 0 0', color: 'var(--encre-douce)' }}>
          3 000 timbres à collectionner, des duels de définitions. Gratuit, sans rien installer.
        </p>
        <p style={{ fontFamily: 'var(--police-mention)', fontWeight: 600, fontSize: 30, letterSpacing: '0.06em', margin: '34px 0 0', color: 'var(--accent)' }}>
          {SITE.adresseCourte.toUpperCase()}
        </p>
      </div>
      <div style={{ position: 'absolute', left: 630, top: 0, width: 540, height: 630 }}>
        {cartes && TIMBRES.map(({ id, finition, style }) => {
          const carte = cartes.get(id);
          return carte ? (
            <div key={id} style={{ position: 'absolute', width: 232, filter: 'drop-shadow(0 18px 26px rgb(0 0 0 / 45%))', ...style }}>
              <Carte carte={carte} finition={finition} cliquable={false} />
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}

document.body.style.margin = '0';
createRoot(document.getElementById('racine')!).render(<Vignette />);
