import { Link } from 'react-router-dom'
import { ArrowUpRight, Award, CalendarClock, Mail } from 'lucide-react'
import { PageIntro, Reveal, SectionHeading } from '../components/ui'
import { BadgeSeal } from '../components/BadgeSeal'
import { usePageMeta } from '../lib/usePageMeta'

export function Results() {
  usePageMeta("Results & Awards", "Omnimath results and awards will be published here after the season closes.")
  return (
    <>
      <PageIntro
        eyebrow="Results & awards"
        title={
          <>
            The season is still
            <br />
            being <em>written.</em>
          </>
        }
        lead="Results will be published here after the 2027 competition closes. School coordinators will be notified directly, and badges will be distributed through school programmes."
      />

      <section className="py-20 md:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="What happens next"
              title={
                <>
                  Marked, moderated,
                  <br />
                  <em>recognised.</em>
                </>
              }
              lead="Every submission is marked out of 60 against the published criteria: research, reasoning, application, evidence and the nuance of the conclusion."
            />
            <div className="mt-9 space-y-5">
              {[
                {
                  icon: CalendarClock,
                  title: 'After the final deadline',
                  body: 'Work is marked by the Omnimath team, with coordinators confirming which students completed the Challenge.',
                },
                {
                  icon: Award,
                  title: 'Badges and recognition',
                  body: 'Students who meet the required standard receive an Omnimath badge. Higher-scoring entries earn additional recognition.',
                },
                {
                  icon: Mail,
                  title: 'Published here',
                  body: 'Results and award lists will appear on this page once the season is complete.',
                },
              ].map((item, index) => {
                const Icon = item.icon
                return (
                  <Reveal key={item.title} delay={index * 0.06}>
                    <div className="flex gap-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper-deep text-navy">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-[14.5px] font-semibold text-ink">{item.title}</h3>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{item.body}</p>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>

          <Reveal delay={0.1} className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-line-soft bg-[#fffdf7] p-8 text-center">
              <div className="relative mx-auto w-52">
                <div className="absolute inset-0 rounded-full bg-sun/15 blur-2xl" aria-hidden="true" />
                <BadgeSeal className="relative w-full" />
              </div>
              <p className="mt-7 font-display text-[1.7rem] leading-tight text-ink">
                The first season is
                <br />
                2027.
              </p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Results · published post-season
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line-soft bg-cloud/60 py-16 md:py-20">
        <div className="container-x flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-[1.8rem] text-ink">Questions about marking?</p>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              We are happy to explain how the criteria are applied.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/competition/submissions" className="btn btn-ghost">
              Marking criteria
            </Link>
            <Link to="/contact" className="btn btn-primary">
              Contact us
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
