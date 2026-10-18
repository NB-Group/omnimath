import { useState } from 'react'
import { site, years, yearChallengeRanges, type YearLevel } from '../lib/site'
import { cn } from '../lib/utils'

export type YearFilter = 'all' | YearLevel

export function YearMatrix({
  value,
  onChange,
}: {
  value: YearFilter
  onChange: (value: YearFilter) => void
}) {
  const [hover, setHover] = useState<YearLevel | null>(null)
  const active: YearLevel | null = hover ?? (value === 'all' ? null : value)
  const note = active
    ? `Challenges ${yearChallengeRanges[active].from}–${yearChallengeRanges[active].to}${
        yearChallengeRanges[active].note ? ` · ${yearChallengeRanges[active].note}` : ''
      }`
    : 'Every participant completes six challenges. Hover or select a year to see its range.'

  return (
    <div className="rounded-2xl border border-line-soft bg-[#fffdf7] p-5 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">
          Challenge map · {site.year}
        </p>
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-navy/70">
          {active ? `Year ${active}` : '15 challenges'}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-[3.6rem_1fr] items-center gap-3 md:grid-cols-[5rem_1fr]">
        <span aria-hidden="true" />
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
          {Array.from({ length: 15 }, (_, index) => (
            <span key={index} className="text-center font-mono text-[8px] text-ink-faint">
              {String(index + 1).padStart(2, '0')}
            </span>
          ))}
        </div>

        {years.map((year) => {
          const range = yearChallengeRanges[year]
          const isActive = active === year
          const isSelected = value === year
          return (
            <button
              key={year}
              type="button"
              onPointerEnter={() => setHover(year)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(year)}
              onBlur={() => setHover(null)}
              onClick={() => onChange(isSelected ? 'all' : year)}
              aria-pressed={isSelected}
              aria-label={`Year ${year}: challenges ${range.from} to ${range.to}`}
              className="group col-span-2 grid grid-cols-[3.6rem_1fr] items-center gap-3 rounded-lg py-1 text-left md:grid-cols-[5rem_1fr]"
            >
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.1em] transition-colors',
                  isActive ? 'text-ink' : 'text-ink-faint',
                )}
              >
                Year {year}
              </span>
              <span className="grid gap-1" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                {Array.from({ length: 15 }, (_, index) => {
                  const number = index + 1
                  const inRange = number >= range.from && number <= range.to
                  return (
                    <span
                      key={number}
                      className={cn(
                        'h-4 rounded-[3px] transition-all duration-300 md:h-5',
                        inRange
                          ? isActive
                            ? 'bg-navy'
                            : 'bg-navy/55 group-hover:bg-navy/80'
                          : 'bg-line-soft/70',
                        inRange && isSelected && 'bg-sun',
                      )}
                    />
                  )
                })}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-5 min-h-[1.25rem] border-t border-line-soft pt-3 text-[12.5px] text-ink-soft">
        {note}
      </p>
    </div>
  )
}
