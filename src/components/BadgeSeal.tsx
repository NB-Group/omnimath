import { useId } from 'react'

/** A circular competition seal, drawn entirely in SVG. */
export function BadgeSeal({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const base = import.meta.env.BASE_URL
  const ring = `badge-ring-${id}`
  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label="Omnimath badge">
      <defs>
        <path id={ring} d="M120,120 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0" />
        <radialGradient id={`badge-bg-${id}`} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#0c4fa4" />
          <stop offset="100%" stopColor="#002a5e" />
        </radialGradient>
        <clipPath id={`badge-clip-${id}`}>
          <circle cx="120" cy="120" r="62" />
        </clipPath>
      </defs>

      <circle cx="120" cy="120" r="112" fill={`url(#badge-bg-${id})`} />
      <circle cx="120" cy="120" r="112" fill="none" stroke="#feda12" strokeOpacity="0.9" strokeWidth="3" />
      <circle cx="120" cy="120" r="100" fill="none" stroke="#feda12" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="1 5" />

      <g className="origin-center animate-[spin_40s_linear_infinite]">
        <text fill="#feda12" fontSize="11" fontFamily="'JetBrains Mono Variable', monospace" letterSpacing="3.4">
          <textPath href={`#${ring}`} startOffset="0%">
            OMNIMATH · AOTEAROA NEW ZEALAND · EST. 2027 · OMNIMATH ·
          </textPath>
        </text>
      </g>

      <circle cx="120" cy="120" r="72" fill="#faf7f0" />
      <circle cx="120" cy="120" r="72" fill="none" stroke="#0a1f3c" strokeOpacity="0.08" />
      <g clipPath={`url(#badge-clip-${id})`}>
        {/* Centred on the disc: the mark's globe sits at its middle. */}
        <image href={`${base}omnimath-logo.png`} x="56" y="78" width="128" height="84" preserveAspectRatio="xMidYMid meet" />
      </g>
      <path d="M92 170h56" stroke="#74c74c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
