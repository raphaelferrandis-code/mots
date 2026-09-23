import './sceauDuel.css';

// La matrice du bouton et son empreinte partagent exactement la même gravure.
export function SceauDuel({ empreinte = false }: { empreinte?: boolean }) {
  return <span className={`sceau-duel ${empreinte ? 'sceau-duel--empreinte' : 'sceau-duel--matrice'}`} aria-hidden="true">
    <svg viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <g className="sceau-duel__gravure">
        <path d="M39 5C20 4 5 21 5 39S20 74 40 75 75 60 75 40 59 5 43 5" strokeWidth="1.5" />
        <path d="M14 26a29 29 0 0 1 50-4M68 33a29 29 0 0 1-48 28M13 53a29 29 0 0 1-2-18" strokeWidth=".7" />
        <g className="sceau-duel__plumes" strokeWidth="1.3">
          {[-36, 36].map(angle => <g key={angle} transform={`rotate(${angle} 40 44)`}>
            <path d="M40 13c10 12 11 23 0 31-10-8-9-21 0-31Z" fill="currentColor" fillOpacity=".07" />
            <path d="M40 19v45m0-36 6-6m-6 14 7-7m-7 13 5-5m-5-6-5-6m5 15-6-6" />
          </g>)}
        </g>
        <path d="M32 63h16M36 67h8" strokeWidth=".9" />
        <circle cx="12" cy="42" r="1" fill="currentColor" stroke="none" />
        <circle cx="68" cy="42" r="1" fill="currentColor" stroke="none" />
      </g>
      {empreinte && <g className="sceau-duel__oblitération" strokeWidth="1.1"><path d="M59 52c6-3 10-3 16-1M56 57c8-4 13-3 19-1" /><path d="M8 17h2m54 48h2M17 66h1" /></g>}
    </svg>
  </span>;
}
