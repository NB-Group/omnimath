import { Link, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, X } from 'lucide-react'
import { PageIntro, Reveal, SectionHeading, Eyebrow } from '../components/ui'
import { YearMatrix, type YearFilter } from '../components/YearMatrix'
import { ChallengeCard } from '../components/ChallengeCard'
import { WorldGlyph } from '../components/WorldCards'
import { challenges, yearsForChallenge } from '../data/challenges'
import { worlds } from '../data/worlds'
import { site, years, type YearLevel } from '../lib/site'
import { cn } from '../lib/utils'
import { usePageMeta } from '../lib/usePageMeta'

export function Challenges() {
  usePageMeta("Challenges", "Fifteen real-world challenges for Years 5–8, released each year by Omnimath.")
  const [params, setParams] = useSearchParams()

  const worldParam = params.get('world')
  const world = worlds.find((entry) => entry.id === worldParam) ?? null

  const rawYear = Number(params.get('year'))
  const year: YearFilter = (years as readonly number[]).includes(rawYear)
    ? (rawYear as YearLevel)
    : 'all'

  const setYear = (value: YearFilter) => {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('year')
    else next.set('year', String(value))
    setParams(next, { replace: true })
  }

  const clearWorld = () => {
    const next = new URLSearchParams(params)
    next.delete('world')
    setParams(next, { replace: true })
  }

  const filtered = challenges.filter((challenge) => {
    if (world && challenge.world !== world.title) return false
    if (year !== 'all' && !yearsForChallenge(challenge.id).includes(year)) return false
    return true
  })

  return (
    <>
      <PageIntro
        eyebrow="The competition"
        title={
          <>
            Fifteen challenges.
            <br />
            <em>Six worlds.</em>
          </>
        }
        lead="Each year we release fifteen challenges across a range of real-world topics. Students are assigned challenges based on their year level, with some overlap between years."
        accent="leaf"
      />

      <section className="py-16 md:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <Eyebrow>Year levels</Eyebrow>
            <h2 className="display mt-5 text-[clamp(2rem,4vw,3.2rem)]">
              Your year, your <em>range.</em>
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Challenges vary in initial difficulty, but every problem is designed to support
              deeper investigation. Year 5 students choose six of seven; every other year has a
              six-challenge range.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {(['all', ...years] as YearFilter[]).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setYear(value)}
                  aria-pressed={year === value}
                  className={cn(
                    'rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors',
                    year === value
                      ? 'border-navy bg-navy text-paper'
                      : 'border-line bg-[#fffdf7] text-ink-soft hover:border-navy/40 hover:text-ink',
                  )}
                >
                  {value === 'all' ? 'All years' : `Year ${value}`}
                </button>
              ))}
            </div>
            <p className="mt-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
              {year === 'all'
                ? 'Showing every challenge'
                : `Showing challenges for Year ${year} · ${year === 5 ? 'choose six of seven' : 'six challenges'}`}
            </p>
          </div>

          <Reveal delay={0.1}>
            <YearMatrix value={year} onChange={setYear} />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line-soft bg-cloud/50 py-16 md:py-24">
        <div className="container-x">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow={`${site.year} challenges`}
              title={
                <>
                  Choose your <em>questions.</em>
                </>
              }
            />
            <Reveal delay={0.1}>
              <p className="max-w-sm text-[13.5px] leading-relaxed text-ink-soft">
                Complete six challenges during the six-week competition period. You may work
                through them in any order and are encouraged to investigate beyond the immediate
                question.
              </p>
            </Reveal>
          </div>

          {world ? (
            <Reveal>
              <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-navy/15 bg-[#fffdf7] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy text-paper">
                    <WorldGlyph id={world.id} className="h-7 w-7" />
                  </span>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                      Filtered by world
                    </p>
                    <p className="mt-1 font-display text-[1.45rem] leading-none text-ink">{world.title}</p>
                    <p className="mt-1.5 text-[12.5px] text-ink-soft">{world.question}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearWorld}
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-line px-3.5 py-2 text-[12px] font-medium text-ink-soft transition-colors hover:border-navy/40 hover:text-ink sm:self-center"
                >
                  <X size={13} aria-hidden="true" />
                  Clear filter
                </button>
              </div>
            </Reveal>
          ) : null}

          <div className="mt-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
                {filtered.length} {filtered.length === 1 ? 'challenge' : 'challenges'}
              </p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
                Packs publish in {site.year}
              </p>
            </div>

            {filtered.length ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((challenge, index) => (
                  <Reveal key={challenge.id} delay={Math.min(index, 6) * 0.035}>
                    <ChallengeCard challenge={challenge} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-ink-faint">
                No challenges match those filters yet.
              </p>
            )}
          </div>

          <Reveal>
            <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl border border-line-soft bg-[#fffdf7] p-6 sm:flex-row sm:items-center">
              <div>
                <p className="font-display text-[1.5rem] text-ink">The aim is not simply an answer.</p>
                <p className="mt-1 max-w-xl text-[13.5px] text-ink-soft">
                  We consider how thoroughly you explored the problem and the quality of the
                  evidence used to support your work.
                </p>
              </div>
              <Link to="/competition/submissions" className="btn btn-primary shrink-0">
                How submissions work
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-x flex flex-col items-start justify-between gap-6 rounded-3xl bg-navy px-7 py-10 text-paper md:flex-row md:items-center md:px-10">
          <div>
            <Eyebrow className="!text-sun">Ready when you are</Eyebrow>
            <h2 className="display mt-3 text-[clamp(1.9rem,3.6vw,2.8rem)]">
              Register through your school.
            </h2>
          </div>
          <Link to="/schools#register" className="btn btn-sun shrink-0">
            Register a coordinator
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
