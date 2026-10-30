import { Link } from 'react-router-dom'
import { ArrowUpRight, Compass, NotepadText, Sparkles } from 'lucide-react'
import { PageIntro, Reveal, SectionHeading, Eyebrow } from '../components/ui'
import { PhotoBand } from '../components/PhotoBand'
import { team } from '../data/team'
import { cn } from '../lib/utils'
import { usePageMeta } from '../lib/usePageMeta'

const audiences = [
  {
    title: 'Students who enjoy mathematics',
    body: 'Go further than the syllabus. Pick a question and follow it until it opens up something you did not expect.',
    icon: Sparkles,
  },
  {
    title: 'Students who are not sure yet',
    body: 'See mathematics in a context that means something — before deciding how you feel about it.',
    icon: Compass,
  },
  {
    title: 'Schools and coordinators',
    body: 'Run something meaningful without adding to the timetable. We provide the structure; you provide the encouragement.',
    icon: NotepadText,
  },
]

const principles = [
  { title: 'Explore widely', body: 'Real problems do not arrive sorted into topics. Start anywhere, and follow what interests you.' },
  { title: 'Show your evidence', body: 'The working matters. Research, diagrams, models and data all count as part of the answer.' },
  { title: 'Make it matter', body: 'Mathematics is a way of understanding the world. Use it on something you actually care about.' },
]

const tileStyles = [
  'bg-navy text-paper',
  'bg-sun text-ink',
  'bg-leaf text-ink',
  'bg-paper-deep text-navy',
]

export function About() {
  usePageMeta("Why Omnimath?", "Why Omnimath exists: a student-led mathematics competition connecting maths to elections, history, economics, games, science and everyday life.")
  return (
    <>
      <PageIntro
        eyebrow="About us"
        sky="dusk"
        title={
          <>
            Why <em>Omnimath?</em>
          </>
        }
        lead="For too many students, mathematics feels disconnected from the world around them. Omnimath was created to challenge that."
      />

      {/* Story */}
      <section className="py-20 md:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <Reveal>
              <p className="font-display text-[clamp(1.9rem,3.6vw,2.9rem)] leading-[1.15] text-ink">
                Students often experience mathematics through formulas, exercises or tests,
                without any opportunity to see where it could be of interest within real life.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-8 flex items-center gap-3">
                <span className="h-px w-10 bg-navy/30" aria-hidden="true" />
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                  The reason Omnimath exists
                </p>
              </div>
            </Reveal>
          </div>

          <div className="space-y-6 text-[15.5px] leading-[1.75] text-ink-soft">
            <Reveal>
              <p>
                Omnimath was created to challenge that. We want students to discover the
                relevance of maths to aspects of daily life — whether that be elections, games,
                history, economics, or even everyday decisions — and to ultimately make maths
                sound more interesting and more worth exploring.
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <p>
                We want students to find areas that genuinely interest them, develop confidence
                in problem solving, and discover that mathematics can be far more than a
                worksheet.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="rounded-2xl border border-line-soft bg-[#fffdf7] p-6">
                <p className="eyebrow">Our belief</p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink">
                  Mathematics is not an isolated school subject. It is a powerful framework for
                  understanding the systems, decisions and structures that shape the world.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-line-soft bg-cloud/70 py-20 md:py-24">
        <div className="container-x">
          <SectionHeading
            eyebrow="What we value"
            title={
              <>
                Three things we look <em>for.</em>
              </>
            }
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft md:grid-cols-3">
            {principles.map((principle, index) => (
              <Reveal key={principle.title} delay={index * 0.06} className="bg-paper">
                <div className="flex h-full flex-col p-7">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                    0{index + 1}
                  </p>
                  <h3 className="mt-8 font-display text-[1.9rem] text-ink">{principle.title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{principle.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <PhotoBand
        src="photos/auckland.webp"
        alt="Auckland's skyline seen across the harbour from Devonport"
        eyebrow="Aotearoa New Zealand"
        line="Written here, for students here."
        align="center"
      />

      {/* Who it is for */}
      <section className="py-20 md:py-28" id="who">
        <div className="container-x">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              align="center"
              eyebrow="Who are we for?"
              title={
                <>
                  Everyone who is <em>curious.</em>
                </>
              }
              lead="The competition is designed for all students: those who enjoy mathematics, those who are unsure about it, and those who might simply need the opportunity to see it from a different perspective."
              className="[&_h2]:text-[clamp(2.6rem,5.8vw,5rem)]"
            />
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
            {audiences.map((audience, index) => {
              const Icon = audience.icon
              return (
                <Reveal key={audience.title} delay={index * 0.06}>
                  <article className="group h-full rounded-2xl border border-line-soft bg-[#fffdf7] p-6 transition-colors duration-500 hover:border-navy/25">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-paper-deep text-navy transition-colors duration-500 group-hover:bg-navy group-hover:text-paper">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <h3 className="mt-6 font-display text-[1.6rem] leading-tight text-ink">
                      {audience.title}
                    </h3>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{audience.body}</p>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-line-soft bg-paper-deep/40 py-20 md:py-28" id="team">
        <div className="container-x">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow>Who we are</Eyebrow>
              <h2 className="display mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)]">
                A student-led initiative,
                <br />
                <em>based in New Zealand.</em>
              </h2>
            </div>
            <Reveal delay={0.1}>
              <p className="max-w-xs text-[13.5px] leading-relaxed text-ink-soft">
                Omnimath is built by students, for students. The team behind it is being
                announced — this space is reserved for names, faces and titles.
              </p>
            </Reveal>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, index) => (
              <Reveal key={member.role} delay={index * 0.06}>
                <article className="group">
                  <div
                    className={cn(
                      'relative aspect-[4/5] overflow-hidden rounded-2xl border border-black/5',
                      tileStyles[index % tileStyles.length],
                    )}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.13]"
                      aria-hidden="true"
                      style={{
                        backgroundImage:
                          'radial-gradient(currentColor 1px, transparent 1px)',
                        backgroundSize: '18px 18px',
                      }}
                    />
                    {member.photo ? (
                      <img
                        src={member.photo.startsWith('http') ? member.photo : `${import.meta.env.BASE_URL}${member.photo.replace(/^\//, '')}`}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <span className="font-display text-[5rem] leading-none opacity-30">?</span>
                        <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] opacity-65">
                          Portrait to come
                        </span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 font-mono text-[8px] uppercase tracking-[0.16em] opacity-50">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[1.35rem] leading-tight text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                    {member.role}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24">
        <div className="container-x">
          <div className="on-navy relative overflow-hidden rounded-3xl bg-navy px-7 py-12 md:px-12 md:py-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                backgroundSize: '56px 56px',
              }}
            />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <Eyebrow className="!text-sun">Join us</Eyebrow>
                <h2 className="display mt-4 max-w-xl text-[clamp(2rem,4vw,3.2rem)] text-paper">
                  Bring Omnimath to your students.
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/schools" className="btn btn-sun">
                  Register a school
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link to="/contact" className="btn btn-ghost">
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
