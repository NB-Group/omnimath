import { Lock, ArrowUpRight, FileText } from 'lucide-react'
import type { Challenge } from '../data/challenges'
import { yearsForChallenge } from '../data/challenges'
import { worlds } from '../data/worlds'
import { WorldGlyph } from './WorldCards'
import { cn } from '../lib/utils'
import { site } from '../lib/site'

function formatYears(years: number[]) {
  if (years.length === 0) return '—'
  const sorted = [...years].sort((a, b) => a - b)
  const contiguous = sorted.every((year, index) => index === 0 || year === sorted[index - 1] + 1)
  if (contiguous && sorted.length > 1) return `${sorted[0]}–${sorted[sorted.length - 1]}`
  return sorted.join(', ')
}

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const world = worlds.find((entry) => entry.title === challenge.world) ?? worlds[0]
  const years = yearsForChallenge(challenge.id)
  const number = String(challenge.id).padStart(2, '0')
  const pdfHref = challenge.pdf
    ? challenge.pdf.startsWith('http')
      ? challenge.pdf
      : `${import.meta.env.BASE_URL}${challenge.pdf.replace(/^\//, '')}`
    : null

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
            {site.year} · {world.short}
          </p>
          <p className="mt-3 font-display text-[3.5rem] leading-[0.85] text-navy">{number}</p>
        </div>
        <WorldGlyph
          id={world.id}
          className="h-11 w-11 shrink-0 text-navy/20 transition-colors duration-500 group-hover:text-navy/45"
        />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-leaf" aria-hidden="true" />
        <p className="text-[12px] font-medium text-ink">Years {formatYears(years)}</p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-soft pt-4">
        <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
          {challenge.pdf ? (
            <>
              <FileText size={11} aria-hidden="true" />
              Challenge pack · PDF
            </>
          ) : (
            <>
              <Lock size={10} aria-hidden="true" />
              2027 pack · coming soon
            </>
          )}
        </span>
        {challenge.pdf ? (
          <ArrowUpRight
            size={14}
            className="text-navy transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </>
  )

  const className = cn(
    'group relative flex min-h-[13.5rem] flex-col overflow-hidden rounded-2xl border border-line-soft bg-[#fffdf7] p-5',
    'transition-[transform,border-color,box-shadow] duration-500',
    challenge.pdf
      ? 'hover:-translate-y-1 hover:border-navy/30 hover:shadow-[0_26px_50px_-36px_rgba(6,26,56,0.5)]'
      : 'hover:-translate-y-1 hover:border-line hover:shadow-[0_26px_50px_-40px_rgba(6,26,56,0.35)]',
  )

  const decorated = (
    <>
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-sun/0 blur-2xl transition-colors duration-700 group-hover:bg-sun/20"
        aria-hidden="true"
      />
      {body}
    </>
  )

  if (pdfHref) {
    return (
      <a href={pdfHref} target="_blank" rel="noreferrer" className={className}>
        {decorated}
      </a>
    )
  }

  return <article className={className}>{decorated}</article>
}
