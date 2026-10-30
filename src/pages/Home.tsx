import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, ArrowUpRight, BadgeCheck, MoveRight } from 'lucide-react'
import { LogoGlobe } from '../components/LogoGlobe'
import { WorldCards } from '../components/WorldCards'
import { BadgeSeal } from '../components/BadgeSeal'
import { MaskedStatement } from '../components/MaskedStatement'
import { PhotoBand } from '../components/PhotoBand'
import { ArrowLink, Eyebrow, Formula, Magnetic, Reveal, SectionHeading, Stat } from '../components/ui'
import { worlds } from '../data/worlds'
import { isViewTransitionActive } from '../lib/viewTransitionState'
import { usePageMeta } from '../lib/usePageMeta'

function HeroLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const skip = useReducedMotion() || isViewTransitionActive()
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className="block"
        initial={skip ? false : { y: '112%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1.05, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  )
}

const steps = [
  {
    title: 'Six weeks. Six challenges.',
    body: 'You have six weeks to complete six real-world challenges. Work through them at your own pace, in any order. Time yourself strategically.',
  },
  {
    title: 'Explore problems',
    body: 'Do research, test ideas and compare approaches. The depth and quality of your work matter as much as reaching a conclusion.',
  },
  {
    title: 'Submit as you go',
    body: 'Hand work to your school coordinator at any point during the six weeks, as long as it is in by the final deadline. Early, steady work can earn recognition along the way.',
  },
  {
    title: 'Earn recognition',
    body: 'Your submission is marked out of 60 on depth, reasoning and evidence. Meet the standard and you earn an Omnimath badge. Higher scores earn additional recognition.',
  },
]

const checklist = [
  'Promote Omnimath to your students',
  'Help students register',
  'Collect completed work',
  'Distribute badges and awards',
]

export function Home() {
  usePageMeta()
  const reduced = useReducedMotion()
  const skip = reduced || isViewTransitionActive()
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      {/* Pulled up under the fixed header so the night sky starts at the very
          top of the page, behind the transparent nav bar. */}
      <section className="on-night sky-night relative -mt-[76px] overflow-hidden pt-[76px]">
        <div className="milkyway absolute inset-0" aria-hidden="true" />
        <div className="starfield absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-40 top-10 h-[46rem] w-[46rem] rounded-full bg-navy/45 blur-[120px]"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -left-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-sun/10 blur-[120px]" aria-hidden="true" />

        <div className="container-x relative grid gap-8 pb-14 pt-10 md:pt-16 lg:grid-cols-[1.04fr_1fr] lg:items-center lg:gap-6 lg:pb-24">
          <div className="relative z-10">
            <motion.div
              initial={skip ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft backdrop-blur"
            >
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-leaf" />
              </span>
              2027 season · Years 5–8 · Aotearoa New Zealand
            </motion.div>

            <h1 className="display mt-7 text-[clamp(3.1rem,7.4vw,6.5rem)]">
              <HeroLine>Mathematics</HeroLine>
              <HeroLine delay={0.08}>
                <em>beyond</em> the
              </HeroLine>
              <HeroLine delay={0.16}>
                <span className="sun-underline">classroom.</span>
              </HeroLine>
            </h1>

            <motion.p
              initial={skip ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft md:text-lg"
            >
              Omnimath is a mathematics competition for students in Years 5–8 that takes
              maths out of the worksheet and into the world — elections, history, economics,
              games, science and the systems of everyday life.
            </motion.p>

            <motion.div
              initial={skip ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Magnetic>
                <Link to="/competition/challenges" className="btn btn-primary">
                  Explore the challenges
                  <ArrowRight size={16} className="arrow" aria-hidden="true" />
                </Link>
              </Magnetic>
              <Link to="/competition" className="btn btn-ghost">
                Competition information
              </Link>
            </motion.div>

            <motion.div
              initial={skip ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-12 grid max-w-md grid-cols-3 gap-5 border-t border-line pt-6"
            >
              <Stat value="06" label="Challenges" valueClassName="text-sun" />
              <Stat value="06" label="Weeks" valueClassName="text-sun" />
              <Stat value="60" label="Marks" valueClassName="text-sun" />
            </motion.div>
          </div>

          {/* Globe */}
          <div className="relative mx-auto aspect-square w-full max-w-[34rem] lg:max-w-none">
            <motion.div
              className="absolute inset-0"
              initial={skip ? false : { clipPath: 'circle(0% at 50% 50%)' }}
              animate={{ clipPath: 'circle(70% at 50% 50%)' }}
              transition={{ duration: 1.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <LogoGlobe className="absolute inset-0" />
            </motion.div>

            {/* Pulse ring: only mounted when it can actually animate. With
                reduced motion (or during a view-transition skip) the ring has
                no opacity/scale, so it would collapse to a 1px yellow
                hairline across the globe. */}
            {!skip && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sun/45"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: [0.7, 1.05, 1.2], opacity: [0, 0.75, 0] }}
                transition={{ duration: 2.2, delay: 0.4, ease: 'easeOut' }}
              />
            )}

            <motion.div
              initial={skip ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="litsurface absolute left-0 top-[10%] hidden animate-float rounded-xl border border-line-soft bg-[#fffdf7]/95 px-4 py-3 shadow-[0_20px_50px_-30px_rgba(6,26,56,0.5)] backdrop-blur-sm lg:block"
            >
              <Formula tex={String.raw`\sum_{k=1}^{n} k = \frac{n(n+1)}{2}`} className="text-[13px] text-ink" />
              <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-ink-faint">
                Patterns everywhere
              </p>
            </motion.div>

            <motion.div
              initial={skip ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="litsurface absolute bottom-[9%] right-0 hidden animate-float rounded-xl border border-line-soft bg-[#fffdf7]/95 px-4 py-3 shadow-[0_20px_50px_-30px_rgba(6,26,56,0.5)] backdrop-blur-sm lg:block"
              style={{ animationDelay: '-3.4s' }}
            >
              <Formula tex={String.raw`P(A\mid B)=\frac{P(B\mid A)\,P(A)}{P(B)}`} className="text-[13px] text-ink" />
              <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-ink-faint">
                Decisions under uncertainty
              </p>
            </motion.div>

            <div className="absolute inset-x-8 bottom-[3%] flex items-center gap-3">
              <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-faint">
                Six worlds · One way of thinking
              </p>
              <span className="h-px flex-1 bg-ink/10" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="mask-fade-x relative overflow-hidden border-y border-white/10 bg-white/[0.045] py-4 backdrop-blur-sm">
          <div className="flex w-max animate-marquee">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={copy === 1}>
                {worlds.map((world) => (
                  <span key={world.id} className="flex items-center gap-10">
                    <span className="whitespace-nowrap font-display text-[1.35rem] text-ink/75">
                      {world.title}
                    </span>
                    <span className="text-[0.8rem] text-sun" aria-hidden="true">
                      ✦
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* The sky eases into daylight below the fold. */}
        <div
          className="pointer-events-none h-28 w-full bg-gradient-to-b from-[#0d2148] via-[#5c6486] to-paper md:h-36"
          aria-hidden="true"
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What is the challenge                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative py-20 md:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="The challenge"
              title={
                <>
                  What is the <em>Omnimath</em> Challenge?
                </>
              }
            />
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link to="/competition/challenges" className="btn btn-primary">
                  Explore challenges
                  <ArrowRight size={16} className="arrow" aria-hidden="true" />
                </Link>
                <ArrowLink to="/about">Why we started</ArrowLink>
              </div>
            </Reveal>
          </div>

          <div>
            <Reveal>
              <p className="text-[1.35rem] leading-[1.55] text-ink md:text-[1.5rem]">
                Complete six real-world challenges and record evidence of your research and
                investigation. Entries are marked out of 60 based on the depth, accuracy and
                clarity of the work.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">
                Students who complete the Challenge to the required standard receive an
                Omnimath badge, with higher-scoring entries earning additional recognition.
                There is no single correct answer for many questions — what matters is what
                you investigated, what you found, and how far you took it.
              </p>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="mt-9 grid gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft sm:grid-cols-3">
                {[
                  { value: '6', label: 'Real-world challenges', detail: 'Your choice, any order' },
                  { value: '60', label: 'Marks available', detail: '10 marks per challenge' },
                  { value: '30', label: 'Marks for a badge', detail: 'Quality dependent' },
                ].map((item) => (
                  <div key={item.label} className="bg-[#fffdf7] p-5">
                    <p className="display text-4xl text-navy">{item.value}</p>
                    <p className="mt-2 text-[12.5px] font-semibold text-ink">{item.label}</p>
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.22}>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line-soft bg-paper-deep/50 p-4">
                <BadgeCheck size={18} className="mt-0.5 shrink-0 text-leaf-deep" aria-hidden="true" />
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">The Omnimath badge.</span> A physical
                  badge is awarded through school programmes; independent entrants can complete
                  the Challenge online.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Photograph                                                        */}
      {/* ---------------------------------------------------------------- */}
      <PhotoBand
        src="photos/reading-room.webp"
        alt="A grand reading room with long rows of desks under a vaulted ceiling"
        eyebrow="The work"
        line="Six weeks to follow a question as far as it will go."
      />

      {/* ---------------------------------------------------------------- */}
      {/* Worlds                                                            */}
      {/* ---------------------------------------------------------------- */}
      <WorldCards />

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-line-soft bg-cloud/70 py-20 md:py-28">
        <div className="container-x">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="How it works"
              title={
                <>
                  Six weeks.
                  <br />
                  <em>Four moves.</em>
                </>
              }
              className="max-w-xl"
            />
            <Reveal delay={0.15}>
              <p className="max-w-sm text-[14.5px] leading-relaxed text-ink-soft">
                Omnimath is built to be open-ended, but the rhythm is simple: explore,
                investigate, submit, and be recognised for the thinking you can show.
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.05} className="bg-paper">
                <article className="group flex h-full flex-col p-6 transition-colors duration-500 hover:bg-[#fffdf7] md:p-7">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                      Step 0{index + 1}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-sun transition-colors duration-500 group-hover:bg-leaf" aria-hidden="true" />
                  </div>
                  <h3 className="mt-10 font-display text-[1.75rem] leading-[1.05] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{step.body}</p>
                  <div className="mt-auto pt-6">
                    <MoveRight
                      size={18}
                      className="text-ink/20 transition-all duration-500 group-hover:translate-x-1 group-hover:text-navy"
                      aria-hidden="true"
                    />
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Through your school                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="container-x grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <SectionHeading
              eyebrow="Take part"
              title={
                <>
                  Through your <em>school.</em>
                </>
              }
              lead="Students at participating schools submit their work to the person coordinating Omnimath at their school. If your school is not yet involved, a teacher or staff member can become a coordinator."
            />
            <Reveal delay={0.15}>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                Independent students can also complete the Challenge and submit work online,
                though physical badges are rewarded through school programmes.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/schools" className="btn btn-primary">
                  For schools
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link to="/submit" className="btn btn-ghost">
                  Online submission
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="relative mx-auto w-full max-w-md">
            <div className="paper-note -rotate-1 p-6 shadow-[0_34px_70px_-46px_rgba(6,26,56,0.55)] md:p-7">
              <div className="flex items-center justify-between border-b border-navy/10 pb-4">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-navy/70">
                  School coordinator
                </p>
                <span className="rounded-full bg-navy px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-wider text-paper">
                  2027
                </span>
              </div>
              <p className="mt-5 font-display text-[1.7rem] leading-tight text-ink">
                Four things to look after
              </p>
              <ul className="mt-5 space-y-3.5">
                {checklist.map((item, index) => (
                  <li key={item} className="flex items-center gap-3 text-[13.5px] text-ink-soft">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-navy/15 bg-white font-mono text-[9px] text-navy">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-2 border-t border-navy/10 pt-4">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf" aria-hidden="true" />
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                  Six weeks · Six challenges · One badge
                </p>
              </div>
            </div>

          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="on-navy relative overflow-hidden py-24 md:py-32">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden="true"
          style={{
            backgroundImage:
              'linear-gradient(to right, #f7f3e8 1px, transparent 1px), linear-gradient(to bottom, #f7f3e8 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="container-x relative grid items-center gap-14 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <Eyebrow>Join us</Eyebrow>
            <MaskedStatement className="mt-6 max-w-3xl text-[clamp(2.6rem,5.6vw,4.6rem)]">
              Mathematics is not an isolated subject.
            </MaskedStatement>
            <p className="mt-6 max-w-xl text-[15.5px] leading-relaxed text-paper/55">
              It is a framework for understanding the systems, decisions and structures that
              shape our world. Omnimath exists to help students see that for themselves.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/schools" className="btn btn-sun">
                Bring Omnimath to your school
                <ArrowRight size={16} className="arrow" aria-hidden="true" />
              </Link>
              <Link to="/contact" className="btn btn-ghost">
                Contact the team
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-56 md:w-64 lg:w-full lg:max-w-[18rem]">
            <div className="absolute inset-0 rounded-full bg-sun/10 blur-3xl" aria-hidden="true" />
            <BadgeSeal className="relative w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      </section>
    </>
  )
}
