import { useId } from 'react';

// Dessins originaux en SVG : un seul tracé net à toutes les tailles, sans textures téléchargées.
export function Motif({ nom }: { nom: string }) {
  switch (nom) {
    case 'boussole': return <><circle cx="50" cy="50" r="33" /><circle cx="50" cy="50" r="28" opacity=".5" /><path d="m50 11 9 30 30 9-30 9-9 30-9-30-30-9 30-9Z" /><path d="m50 23 5 22-5 5-5-5Z" fill="currentColor" /><path d="m27 27 46 46m0-46L27 73M50 3v9m0 76v9M3 50h9m76 0h9" opacity=".55" /></>;
    case 'lune': case 'etoiles': return <><path d="M63 14a37 37 0 1 0 24 60A38 38 0 0 1 63 14Z" fill="currentColor" fillOpacity=".14" /><path d="M56 20a31 31 0 0 0 24 60M26 69l5 7m-9-22 1 6" opacity=".5" /><path d="m73 21 3 10 10 3-10 3-3 10-3-10-10-3 10-3ZM49 8v5m41 44h6M45 42v6m-3-3h6" /><circle cx="77" cy="62" r="2" /></>;
    case 'renard': return <><path d="m21 48-3-33 29 18h6l29-18-3 33-10 24-19 15-19-15Z" fill="currentColor" fillOpacity=".12" /><path d="m18 15 17 34-14-1 29 39 29-39-14 1 17-34M35 49l15 13 15-13M33 42l-7-13m41 13 7-13" /><path d="m31 54 10 5m18 0 10-5m-23 21h8l-4 5Z" strokeWidth="3" /><path d="M50 33v16" opacity=".6" /></>;
    case 'papillon': return <><path d="M49 50C25 9 5 18 13 44c4 14 16 15 31 15C10 53 20 95 44 77l6-16 6 16c24 18 34-24 0-18 15 0 27-1 31-15C95 18 75 9 51 50" fill="currentColor" fillOpacity=".12" /><path d="M50 43v35m0-35-8-11m8 11 8-11M21 33l23 20-20-5M79 33 56 53l20-5M29 72l15-9m27 9-15-9" /><circle cx="50" cy="49" r="3" fill="currentColor" /></>;
    case 'dragon': return <><path d="M25 80C3 50 41 57 32 31l-9-11 21 5L60 9l-2 18 19 12-16 6 10 12-21-5C29 63 83 63 73 84c-7 15-33 4-25-7" fill="currentColor" fillOpacity=".13" /><path d="m44 25 14 2M32 31l13 6-6 9m19-12 5 3m-7 16-3 10m10-4-2 7m11 0-4 8M25 80l5-12m18 9-8-8M29 17l-8-5m11 20-14-5" /><path d="m70 44 17 3-12 5" /><circle cx="55" cy="35" r="2" fill="currentColor" /></>;
    case 'phenix': return <><path d="M50 78C27 83 18 64 11 26l29 26-12-35 22 23 22-23-12 35 29-26C82 64 73 83 50 78Z" fill="currentColor" fillOpacity=".18" /><path d="m50 40 5-13 7 8-7 4v17L50 78l-5-22M18 42l22 20m-14-8 15 16m41-28L60 62m14-8L59 70M50 78 37 94l13-8 13 8Z" /><path d="M49 18 52 7m-13 15-5-10m29 10 5-10" opacity=".6" /></>;
    case 'oracle': return <><path d="M8 50Q50 5 92 50Q50 95 8 50Z" fill="currentColor" fillOpacity=".12" /><circle cx="50" cy="50" r="20" /><path d="m50 34 9 16-9 16-9-16Z" fill="currentColor" fillOpacity=".5" /><path d="M50 3v14m0 66v14M20 15l7 10m53-10-7 10M20 85l7-10m53 10-7-10M35 9l4 10m26-10-4 10" /><circle cx="50" cy="50" r="29" strokeDasharray="1 5" /></>;
    case 'feuilles': return <><path d="M50 90V10" />{[22,39,56,73].map((y) => <g key={y} transform={`translate(50 ${y})`}><path d="M0 10Q-35 9-32-13Q-7-15 0 10ZM0 10Q35 9 32-13Q7-15 0 10Z" fill="currentColor" fillOpacity=".1" /><path d="m0 10-22-14m22 14 22-14" opacity=".5" /></g>)}</>;
    case 'cristal': return <><path d="m50 5 26 28-9 48-17 14-17-14-9-48Z" fill="currentColor" fillOpacity=".13" /><path d="m50 5-10 30 10 60 10-60ZM24 33l16 2 20 0 16-2M33 81l17-14 17 14M40 35l10 32 10-32" /><path d="m13 42-8 10 10 24 10-13Zm74 0 8 10-10 24-10-13Z" fill="currentColor" fillOpacity=".2" /></>;
    case 'vagues': return <>{[0,16,32].map((y) => <path key={y} transform={`translate(0 ${y})`} d="M5 34C22 5 39 54 55 30S82 15 95 31M5 39C22 10 39 59 55 35S82 20 95 36" />)}<circle cx="66" cy="12" r="5" /></>;
    default: return <><path d="M22 84 74 19M30 67C10 42 48 17 82 13 80 48 55 82 30 67Z" fill="currentColor" fillOpacity=".13" /><path d="M39 57 33 37m17 7-1-18m3 16 21-4M39 57l24-4M28 72l-6 12M19 90h56" /><path d="M39 64c17 0 30-11 35-24" opacity=".45" /></>;
  }
}

export function Embleme({ motif }: { motif: string }) {
  const id = useId();
  return <svg className="embleme-grave" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    <defs><radialGradient id={id}><stop stopColor="currentColor" stopOpacity=".16" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>
    <circle cx="50" cy="50" r="49" fill={`url(#${id})`} stroke="none" /><Motif nom={motif} />
  </svg>;
}

export function CadreGrave({ modele, anime = false }: { modele: string; anime?: boolean }) {
  const id = useId();
  const botanique = ['laurier', 'ronces', 'floraison'].includes(modele);
  return <svg className={`cadre-grave cadre-grave--${modele}`} data-anime={anime} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
    <defs><linearGradient id={id} x2=".8" y2="1"><stop stopColor="currentColor" /><stop offset=".48" stopColor="#f3f3e8" /><stop offset=".62" stopColor="currentColor" stopOpacity=".35" /><stop offset="1" stopColor="currentColor" /></linearGradient></defs>
    <circle cx="100" cy="100" r="68" strokeOpacity=".35" /><circle cx="100" cy="100" r="72" stroke={`url(#${id})`} strokeWidth="2" />
    {modele === 'simple' && <><circle cx="100" cy="100" r="77" strokeOpacity=".4" />{[0,90,180,270].map((r)=><path key={r} transform={`rotate(${r} 100 100)`} d="m96 22 4-5 4 5-4 5Z" fill="currentColor" />)}</>}
    {modele === 'postal' && <><circle cx="100" cy="100" r="83" strokeDasharray="3 4" strokeWidth="4" /><circle cx="100" cy="100" r="89" strokeOpacity=".5" /><path d="M25 146q12-8 24 0m-21 6q12-8 24 0m-17 6q12-8 24 0" /><path d="m92 19 8-7 8 7-8 6Z" fill="currentColor" /></>}
    {botanique && <g className="cadre__flore">{[-1,1].map((c)=><g key={c} transform={`translate(${c < 0 ? 200 : 0} 0) scale(${c} 1)`}>
      <path d="M93 180C23 167 2 83 48 34" strokeWidth="2.5" />
      {[0,1,2,3,4,5,6].map((i)=><g key={i} transform={`rotate(${i*17-50} 100 100)`}>
        {modele === 'ronces' ? <path d="M27 96 9 80l14 29-10 9 20-4" strokeWidth="2" /> : <><path d="M23 106Q-1 90 9 73Q29 81 23 106ZM25 105Q42 82 35 72Q20 83 25 105Z" fill={`url(#${id})`} fillOpacity=".55" /><path d="M23 105 10 78" strokeWidth=".6" /></>}
      </g>)}
    </g>)}{modele === 'floraison' && [0,60,120,180,240,300].map((r)=><g className="cadre__fleur" key={r} transform={`rotate(${r} 100 100) translate(100 18)`}>{[0,72,144,216,288].map((a)=><ellipse key={a} rx="4" ry="9" cy="-5" transform={`rotate(${a})`} fill="currentColor" fillOpacity=".7" />)}<circle r="3" fill="#fff4dd" /></g>)}</g>}
    {['vitrail', 'cristal'].includes(modele) && <g className="cadre__facettes">{Array.from({length: modele === 'cristal' ? 8 : 12},(_,i)=><g key={i} transform={`rotate(${i*(modele === 'cristal' ? 45 : 30)} 100 100)`}><path d="m100 5 11 19-5 16h-12l-5-16Z" fill={`url(#${id})`} fillOpacity=".45" /><path d="m100 5-3 19 3 16 3-16ZM89 24h22" strokeOpacity=".6" />{modele === 'cristal' && <path d="m79 23 7-12 3 20-7 12Z" fill="currentColor" fillOpacity=".2" />}</g>)}<path d="M47 41 100 19l53 22 28 59-28 59-53 22-53-22-28-59Z" strokeOpacity=".5" /></g>}
    {modele === 'maree' && <>{[0,90,180,270].map((r)=><g key={r} transform={`rotate(${r} 100 100)`}><path d="M30 89C-3 37 66 5 72 35c4 17-21 19-17 6M33 81C15 45 48 24 60 32" strokeWidth="2" /><path d="m33 82-8 15 1-18" fill="currentColor" /></g>)}</>}
    {modele === 'eclipse' && <><path d="M100 14a86 86 0 0 0 0 172A71 86 0 0 1 100 14Z" fill={`url(#${id})`} fillOpacity=".45" /><circle cx="100" cy="100" r="87" strokeDasharray="1 7" />{[25,75,130].map((y,i)=><path key={y} transform={`translate(${172+i*3} ${y})`} d="m0-7 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="currentColor" />)}</>}
    {modele === 'astral' && <><g className="cadre__orbite"><ellipse cx="100" cy="100" rx="94" ry="77" transform="rotate(-35 100 100)" /><ellipse cx="100" cy="100" rx="94" ry="77" transform="rotate(35 100 100)" strokeOpacity=".45" /><path d="m100 0 5 11-5 11-5-11Z" fill="#f4e6ff" /><circle cx="100" cy="183" r="4" fill="currentColor" /></g><g className="cadre__etoiles">{[0,60,120,180,240,300].map((r)=><path key={r} transform={`rotate(${r} 100 100)`} d="m100 14 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill={`url(#${id})`} />)}</g></>}
    {modele === 'brasier' && <g className="cadre__ailes">{[-1,1].map((c)=><g key={c} transform={`translate(${c < 0 ? 200 : 0} 0) scale(${c} 1)`}><path d="M79 178C13 163 6 81 10 33l25 40-9-51 28 49C17 123 48 146 79 178Z" fill={`url(#${id})`} fillOpacity=".5" /><path d="M18 60q2 58 35 92M25 92l17 39M34 144l-22-16m38 35-24-10" /></g>)}<path d="m100 9 12 15-12 13-12-13Z" fill="currentColor" /></g>}
    {modele === 'aurore' && <g className="cadre__voiles">{[0,60,120].map((r,i)=><ellipse key={r} cx="100" cy="100" rx="85" ry="76" transform={`rotate(${r} 100 100)`} stroke={['#a5f5d1','#8ccae9','#cdb6ef'][i]} strokeWidth="4" strokeDasharray="130 40 50 300" />)}<circle cx="100" cy="100" r="92" strokeDasharray="1 12" /></g>}
    {anime && <g className="cadre__poussieres">{[15,65,130,210,285].map((r,i)=><circle key={r} cx="100" cy={8+i%3*5} r={i%2+1.5} transform={`rotate(${r} 100 100)`} fill="#efffff" stroke="none" />)}</g>}
    {modele !== 'simple' && <path d="m89 179 11-6 11 6-11 14Z" fill={`url(#${id})`} strokeWidth="1.5" />}
  </svg>;
}
