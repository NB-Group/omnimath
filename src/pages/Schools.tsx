import { Link } from 'react-router-dom'
import { ArrowUpRight, BadgeCheck, CalendarCheck, CheckCircle2, FileText, Gift, Sparkles } from 'lucide-react'
import { PageIntro, Reveal, SectionHeading, Eyebrow } from '../components/ui'
import { ContactForm } from '../components/ContactForm'
import { usePageMeta } from '../lib/usePageMeta'

const steps = [
  {
    title: 'Register your school',
    body: 'A teacher or staff member signs up as the school’s Omnimath coordinator.',
  },
  {
    title: 'Invite students to participate',
    body: 'Students register their name, year level and school.',
  },
  {
    title: 'Run the six-week challenge',
    body: 'Students complete six challenges in any order and at their own pace.',
  },
  {
    title: 'Collect submissions',
    body: 'Students submit their work to the coordinator, on paper or in any format chosen by the school.',
  },
  {
    title: 'Recognise achievement',
    body: 'Students who meet the required standard receive an Omnimath badge. Higher-scoring students receive additional recognition.',
  },
]

const duties = [
  'Promote the competition to students',
  'Help students with registration',
  'Distribute competition information',
  'Collect completed work',
  'Keep track of student progress',
  'Organise small weekly rewards or recognition',
  'Distribute badges and awards at the end',
]

const resources = [
  { title: 'Coordinator handbook', body: 'A short guide to running Omnimath, start to finish.' },
  { title: 'Student information sheet', body: 'Everything students and whānau need to know.' },
  { title: 'Challenge packs', body: 'The fifteen 2027 challenges, grouped by year level.' },
  { title: 'Badge & awards guide', body: 'How recognition works at the end of the season.' },
]

export function Schools() {
  usePageMeta("For Schools", "Bring Omnimath to your school: register a coordinator, run the six-week challenge, and recognise student achievement.")
  return (
    <>
      <PageIntro
        eyebrow="For schools"
        title={
          <>
            Bring Omnimath
            <br />
            to <em>your school.</em>
          </>
        }
        lead="Omnimath is designed to be run through schools with the support of a registered coordinator — a student, teacher or staff member who manages participation, collects submissions, and distributes badges and recognition."
        accent="leaf"
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#register" className="btn btn-primary">
            Register as a coordinator
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <Link to="/contact" className="btn btn-ghost">
            Ask a question
          </Link>
        </div>
      </PageIntro>

      {/* How it works */}
      <section className="py-20 md:py-28" id="how-it-works">
        <div className="container-x grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-40 lg:self-start">
            <SectionHeading
              eyebrow="How it works"
              title={
                <>
                  Five steps,
                  <br />
                  <em>one season.</em>
                </>
              }
              lead="You do not need to redesign your programme. Omnimath slots alongside it, with a clear shape and a light touch."
            />
          </div>

          <div className="relative">
            <span
              className="absolute bottom-6 left-[19px] top-6 w-px bg-line md:left-[23px]"
              aria-hidden="true"
            />
            <ol className="space-y-8">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.05}>
                  <li className="relative flex gap-5 md:gap-7">
                    <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-navy/15 bg-[#fffdf7] font-mono text-[10px] text-navy md:h-12 md:w-12 md:text-[11px]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="pt-1 md:pt-2">
                      <h3 className="font-display text-[1.5rem] leading-tight text-ink md:text-[1.7rem]">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-soft">{step.body}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Duties */}
      <section className="border-y border-line-soft bg-cloud/60 py-20 md:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="What coordinators do"
              title={
                <>
                  A light load.
                  <br />
                  <em>A real difference.</em>
                </>
              }
              lead="Coordinators act as the main contact for Omnimath at their school. The role is administrative, encouraging, and deliberately small."
            />
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line-soft bg-[#fffdf7] p-4">
                <CalendarCheck size={18} className="text-navy" aria-hidden="true" />
                <p className="text-[12.5px] leading-relaxed text-ink-soft">
                  Six weeks, six challenges. Most coordination happens at the start and the end.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {duties.map((duty, index) => (
              <Reveal key={duty} delay={index * 0.03}>
                <div className="flex items-start gap-3 border-b border-line py-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-leaf-deep" aria-hidden="true" />
                  <p className="text-[13.5px] leading-relaxed text-ink-soft">{duty}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Why run + weekly recognition */}
      <section className="py-20 md:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Why run Omnimath?"
              title={
                <>
                  Maths that feels
                  <br />
                  <em>relevant.</em>
                </>
              }
            />
            <div className="mt-6 space-y-5 text-[15px] leading-[1.75] text-ink-soft">
              <Reveal>
                <p>
                  Omnimath allows students to explore mathematics beyond their routine classroom
                  work. As each challenge is placed within a real-world context, students explore
                  it in greater depth and are encouraged to make further links between what they
                  learn in class and how those concepts can be used in practice.
                </p>
              </Reveal>
              <Reveal delay={0.06}>
                <p>
                  This can make mathematics feel more relevant and engaging, particularly for
                  students who may not relate well with traditional exercises.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <p>
                  The open-ended structure allows students to pursue their own interests —
                  whether that be coding, history, economics, games, or anything else. Omnimath
                  rewards curiosity, initiative, and the ability to develop an idea properly.
                </p>
              </Reveal>
            </div>
          </div>

          <Reveal delay={0.1}>
            <div className="relative h-full overflow-hidden rounded-3xl bg-navy p-7 text-paper md:p-9">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    'radial-gradient(#fff 1px, transparent 1px)',
                  backgroundSize: '22px 22px',
                }}
              />
              <div className="relative">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-sun text-ink">
                  <Gift size={19} aria-hidden="true" />
                </span>
                <h3 className="mt-7 font-display text-[2rem] leading-none">Weekly recognition</h3>
                <p className="mt-4 text-[14px] leading-relaxed text-paper/60">
                  Schools are encouraged to keep students engaged throughout the six weeks by
                  offering small rewards for students who submit completed challenges on time or
                  ahead of schedule.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-paper/60">
                  These do not need to be major prizes. They are intended to recognise student
                  progress and keep momentum up.
                </p>
                <div className="mt-7 flex items-center gap-2 border-t border-paper/10 pt-5">
                  <Sparkles size={14} className="text-sun" aria-hidden="true" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/60">
                    Small moments · steady progress
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Resources */}
      <section className="border-t border-line-soft bg-paper-deep/40 py-20 md:py-24" id="resources">
        <div className="container-x">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="Coordinator resources"
              title={
                <>
                  Everything you need,
                  <br />
                  <em>in one place.</em>
                </>
              }
            />
            <Reveal delay={0.12}>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-[#fffdf7] px-4 py-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                <span className="h-1.5 w-1.5 rounded-full bg-sun" aria-hidden="true" />
                Publishing before the 2027 season
              </span>
            </Reveal>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {resources.map((resource, index) => (
              <Reveal key={resource.title} delay={index * 0.05}>
                <article className="group flex h-full flex-col rounded-2xl border border-line-soft bg-[#fffdf7] p-5 transition-colors duration-500 hover:border-navy/25">
                  <div className="flex items-start justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-paper-deep text-navy">
                      <FileText size={16} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-faint">
                      PDF
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-[1.35rem] leading-tight text-ink">
                    {resource.title}
                  </h3>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{resource.body}</p>
                  <p className="mt-auto pt-6 font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                    Coming soon
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Register */}
      <section className="py-20 md:py-28" id="register">
        <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <Eyebrow>Register your school</Eyebrow>
            <h2 className="display mt-5 text-[clamp(2.3rem,4.6vw,3.7rem)]">
              Interested in running
              <br />
              Omnimath at your <em>school?</em>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Tell us a little about your school and we will help you set up as a coordinator.
              If you are a student who wants to bring Omnimath to your school, you are welcome
              to register interest too.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <BadgeCheck size={18} className="mt-0.5 text-leaf-deep" aria-hidden="true" />
                <p className="text-[13px] text-ink-soft">
                  No cost to register. Badges are distributed through school programmes.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <BadgeCheck size={18} className="mt-0.5 text-leaf-deep" aria-hidden="true" />
                <p className="text-[13px] text-ink-soft">
                  We will send a coordinator pack before the season begins.
                </p>
              </div>
            </div>

            <div className="mt-9 rounded-2xl border border-line-soft bg-paper-deep/50 p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Prefer email?
              </p>
              <a
                href="mailto:schools@omnimath.co.nz"
                className="link-underline mt-2 inline-block text-[14px] font-semibold text-navy"
              >
                schools@omnimath.co.nz
              </a>
            </div>
          </div>

          <ContactForm variant="coordinator" />
        </div>
      </section>
    </>
  )
}
