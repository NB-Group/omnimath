import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Calculator,
  Camera,
  ChartNoAxesCombined,
  CheckCircle2,
  Cuboid,
  Link2,
  PenLine,
} from 'lucide-react'
import { PageIntro, Reveal, SectionHeading, Eyebrow } from '../components/ui'
import { cn } from '../lib/utils'
import { usePageMeta } from '../lib/usePageMeta'

const evidence = [
  { icon: Calculator, title: 'Calculations', body: 'Your working, not just the final number.' },
  { icon: Link2, title: 'Research', body: 'Sources and links that shaped your thinking.' },
  { icon: PenLine, title: 'Diagrams & drawings', body: 'A picture of the structure you found.' },
  { icon: Cuboid, title: 'Physical models', body: 'Built, tested, photographed, explained.' },
  { icon: ChartNoAxesCombined, title: 'Data & graphs', body: 'Collected, plotted, interpreted.' },
  { icon: Camera, title: 'Photos', body: 'Evidence from the real world around you.' },
]

const criteria = [
  { title: 'Depth of research', body: 'How far did you go beyond the first obvious source?' },
  { title: 'Clarity of reasoning', body: 'Can a reader follow how you reached your conclusion?' },
  { title: 'Application of ideas', body: 'Did you use the mathematics you know — and reach for more?' },
  { title: 'Quality of evidence', body: 'Is the work supported by something you can show?' },
  { title: 'Nuance of conclusion', body: 'Do you recognise what is uncertain, limited or still open?' },
]

function ScoreMatrix() {
  return (
    <div className="rounded-2xl border border-line-soft bg-[#fffdf7] p-5 md:p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
          Six challenges × ten marks
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-navy">60 total</p>
      </div>
      <div className="mt-5 space-y-2">
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="flex items-center gap-3">
            <span className="w-5 font-mono text-[9px] text-ink-faint">
              {String(row + 1).padStart(2, '0')}
            </span>
            <div className="grid flex-1 grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, column) => {
                const index = row * 10 + column
                const awarded = index < 30
                return (
                  <span
                    key={column}
                    className={cn(
                      'aspect-square rounded-[3px] transition-colors',
                      awarded ? 'bg-sun' : 'border border-navy/12 bg-transparent',
                    )}
                  />
                )
              })}
            </div>
            <span className="w-7 text-right font-mono text-[8.5px] text-ink-faint">/ 10</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line-soft pt-4">
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-sun" aria-hidden="true" />
          30 marks · badge threshold
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-navy/15" aria-hidden="true" />
          Remaining marks
        </span>
      </div>
    </div>
  )
}

export function Submissions() {
  usePageMeta("Submissions", "What to submit, what counts as evidence, and how Omnimath work is marked out of 60.")
  return (
    <>
      <PageIntro
        eyebrow="Submissions"
        title={
          <>
            Show your working.
            <br />
            <em>Show your evidence.</em>
          </>
        }
        lead="You may submit challenges as soon as you have completed them. There is no requirement to complete one challenge each week, although all work must be in by the end of the sixth week."
      />

      <section className="py-16 md:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="How to submit"
              title={
                <>
                  Simple, but <em>serious.</em>
                </>
              }
            />
            <div className="mt-8 space-y-5">
              {[
                {
                  title: 'Submit through your school',
                  body: 'After registration, all work is submitted directly to your school’s Omnimath coordinator on paper. If necessary, a scanned digital version may also be required.',
                },
                {
                  title: 'Submit as you go',
                  body: 'You do not need to wait until the end. Hand in completed challenges whenever they are ready — coordinators may offer small recognition for early or consistent work.',
                },
                {
                  title: 'Everything by week six',
                  body: 'All six challenges must be completed by the end of the sixth week. Work through them in any order; the deadline is the only fixed point.',
                },
              ].map((step, index) => (
                <Reveal key={step.title} delay={index * 0.06}>
                  <div className="flex gap-4">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-navy/15 bg-[#fffdf7] font-mono text-[10px] text-navy">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-ink">{step.title}</h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{step.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.2}>
              <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line-soft bg-paper-deep/50 p-4">
                <p className="flex-1 text-[13px] leading-relaxed text-ink-soft">
                  Independent student? You can submit work online. Physical badges are still
                  awarded through school programmes.
                </p>
                <Link to="/submit" className="btn btn-primary !px-4 !py-2.5 text-[12.5px]">
                  Submit online
                  <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-line-soft bg-[#fffdf7] p-6 md:p-8">
              <Eyebrow>Assessment</Eyebrow>
              <p className="mt-4 font-display text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.1]">
                Ten marks per challenge.
                <br />
                Sixty in total.
              </p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink-soft">
                At least 30 marks are required for a badge, although this may vary depending on
                the overall quality of work submitted.
              </p>
              <div className="mt-6">
                <ScoreMatrix />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line-soft bg-cloud/60 py-16 md:py-24">
        <div className="container-x">
          <SectionHeading
            eyebrow="What counts as evidence"
            title={
              <>
                Convince us you <em>explored.</em>
              </>
            }
            lead="For many questions there is no single correct answer. Instead, show what you investigated, what you found, and how far you took the challenge."
          />

          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line-soft bg-line-soft sm:grid-cols-2 lg:grid-cols-3">
            {evidence.map((item, index) => {
              const Icon = item.icon
              return (
                <Reveal key={item.title} delay={index * 0.04} className="bg-paper">
                  <div className="group flex h-full items-start gap-4 p-6 transition-colors duration-500 hover:bg-[#fffdf7]">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper-deep text-navy transition-colors duration-500 group-hover:bg-navy group-hover:text-paper">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-[14px] font-semibold text-ink">{item.title}</h3>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{item.body}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
          <Reveal>
            <p className="mt-6 font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-faint">
              …and anything else that shows your thinking.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <SectionHeading
            eyebrow="What we look for"
            title={
              <>
                Five things, every <em>time.</em>
              </>
            }
            lead="The rubric is deliberately open. We are looking for the quality of thought behind the work, not a tick-box answer."
          />

          <div>
            {criteria.map((criterion, index) => (
              <Reveal key={criterion.title} delay={index * 0.04}>
                <div className="group flex items-start gap-4 border-b border-line py-5 first:pt-0">
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-leaf-deep"
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <h3 className="text-[14.5px] font-semibold text-ink">{criterion.title}</h3>
                    <p className="mt-1 text-[13px] text-ink-soft">{criterion.body}</p>
                  </div>
                  <span className="font-mono text-[9px] text-ink-faint">
                    0{index + 1}
                  </span>
                </div>
              </Reveal>
            ))}
            <Reveal>
              <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-navy p-6 text-paper sm:flex-row sm:items-center">
                <div>
                  <p className="font-display text-[1.4rem]">Ready to hand something in?</p>
                  <p className="mt-1 text-[12.5px] text-paper/60">
                    Submit to your coordinator, or send it to us online.
                  </p>
                </div>
                <Link to="/submit" className="btn btn-sun shrink-0">
                  Submit work
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
