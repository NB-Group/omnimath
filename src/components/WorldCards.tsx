import { Link } from 'react-router-dom'
import { worlds } from '../data/worlds'
import { Reveal, SectionHeading } from './ui'

export function WorldCards() {
  return (
    <section
      className="on-navy relative overflow-hidden py-20 md:py-28"
      id="worlds"
      style={{ clipPath: 'polygon(0 48px, 100% 0, 100% calc(100% - 48px), 0 100%)' }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[54rem] -translate-x-1/2 rounded-full bg-navy/50 blur-[120px]"
        aria-hidden="true"
      />
      <div className="container-x relative">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Explore the world"
            title={
              <>
                Six worlds.
                <br />
                <em className="!text-sun">One way of thinking.</em>
              </>
            }
            lead="Every challenge begins somewhere real. Open a world to see the question underneath it, then dive into the challenges."
            className="max-w-2xl [&_p]:text-paper/55"
          />
          <Reveal delay={0.15}>
            <Link
              to="/competition/challenges"
              className="btn btn-sun shrink-0"
            >
              See all 15 challenges
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {worlds.map((world, index) => (
            <Reveal key={world.id} delay={0.04 * index}>
              <Link
                to={`/competition/challenges?world=${world.id}`}
                onPointerMove={(event) => {
                  if (event.pointerType === 'touch') return
                  const rect = event.currentTarget.getBoundingClientRect()
                  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`)
                  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`)
                }}
                className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-[#08244c] p-5 transition-[border-color,box-shadow] duration-500 hover:border-sun/45 hover:shadow-[0_34px_80px_-42px_rgba(254,218,18,0.42)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun"
              >
                <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                  <img
                    src={`${import.meta.env.BASE_URL}${world.image}`}
                    alt={world.imageAlt}
                    width={1200}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.055]"
                  />
                </div>
                <div
                  className="absolute inset-0 bg-[linear-gradient(to_top,#03142d_0%,rgba(3,20,45,0.86)_26%,rgba(3,20,45,0.24)_58%,rgba(3,20,45,0.04)_100%)]"
                  aria-hidden="true"
                />
                <div
                  className="world-spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(254,218,18,0.2), transparent 52%)',
                    }}
                  />
                </div>
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sun/80 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />

                <span
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-[#03142d]/35 text-paper/80 backdrop-blur-sm transition-all duration-500 group-hover:border-sun group-hover:bg-sun group-hover:text-[#03142d]"
                  aria-hidden="true"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>

                <div className="relative flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/60">
                  <span>0{index + 1}</span>
                  <span className="h-px w-5 bg-paper/25" aria-hidden="true" />
                  <span>{world.short}</span>
                </div>

                <h3 className="relative mt-3 max-w-[90%] font-display text-[1.9rem] leading-[1.02] text-paper">
                  {world.title}
                </h3>

                <p className="relative mt-2 min-h-[2.6em] max-w-[94%] text-[12px] leading-snug text-paper/70 transition-all duration-500 md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100">
                  {world.question}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 flex items-center gap-3 border-t border-paper/10 pt-6">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf" aria-hidden="true" />
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper/60">
              Elections · History · Economics · Games · Science · Everyday systems
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export function WorldGlyph({ id, className }: { id: string; className?: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {id === 'elections' ? (
        <>
          <path d="M20 5v30" strokeDasharray="2 3" {...common} />
          {[8, 16, 24, 32].map((x) =>
            [8, 16, 24, 32].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="currentColor" stroke="none" opacity={x < 20 ? 0.9 : 0.45} />
            )),
          )}
        </>
      ) : id === 'history' ? (
        <>
          <path d="M6 32h28" {...common} />
          <path d="M7 11c8 0 8 18 16 18s8-9 11-9" {...common} />
          <circle cx="34" cy="20" r="1.8" fill="currentColor" stroke="none" />
        </>
      ) : id === 'economics' ? (
        <>
          <path d="M7 7v26h26" {...common} />
          <path d="M9 30 33 11" {...common} />
          <path d="M9 12 33 29" {...common} opacity="0.55" />
          <circle cx="21" cy="21" r="2.2" fill="currentColor" stroke="none" />
        </>
      ) : id === 'games' ? (
        <>
          <path d="M20 8v8M20 16l-8 7M20 16l9 7" {...common} />
          <circle cx="20" cy="7" r="2.2" fill="currentColor" stroke="none" />
          <circle cx="11" cy="25" r="2.2" {...common} />
          <circle cx="29" cy="25" r="2.2" {...common} />
          <path d="M11 27v5M29 27v5" {...common} opacity="0.55" />
        </>
      ) : id === 'science' ? (
        <>
          <path d="M6 25c5-12 9-12 14 0s9 12 14 0" {...common} />
          <path d="M6 15c5-12 9-12 14 0s9 12 14 0" {...common} opacity="0.35" />
        </>
      ) : (
        <>
          <path d="M8 12h10l6 8h8M8 28h8l6-8" {...common} />
          <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="8" cy="28" r="2" fill="currentColor" stroke="none" />
          <circle cx="32" cy="20" r="2" fill="currentColor" stroke="none" />
          <circle cx="22" cy="20" r="1.6" fill="currentColor" stroke="none" opacity="0.6" />
        </>
      )}
    </svg>
  )
}
