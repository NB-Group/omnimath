import { Mail, MapPin, ShieldCheck } from 'lucide-react'
import { PageIntro, Reveal, Eyebrow } from '../components/ui'
import { ContactForm } from '../components/ContactForm'
import { site } from '../lib/site'
import { usePageMeta } from '../lib/usePageMeta'

export function Contact() {
  usePageMeta("Contact", "Contact the Omnimath team about the competition, schools, or submissions.")
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title={
          <>
            Talk to <em>us.</em>
          </>
        }
        lead="Questions about the competition, running Omnimath at your school, or submitting work? We are a small team, and we read everything."
      />

      <section className="py-16 md:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <Eyebrow>Direct lines</Eyebrow>
            <div className="mt-6 space-y-4">
              <Reveal>
                <a
                  href={`mailto:${site.emails.general}`}
                  className="group block rounded-2xl border border-line-soft bg-[#fffdf7] p-6 transition-colors duration-500 hover:border-navy/30"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper-deep text-navy transition-colors group-hover:bg-navy group-hover:text-paper">
                      <Mail size={17} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                      General
                    </span>
                  </div>
                  <h2 className="mt-6 font-display text-[1.5rem] text-ink">General enquiries</h2>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    Competition questions, media, partnerships and everything else.
                  </p>
                  <p className="mt-4 font-mono text-[11.5px] text-navy">{site.emails.general}</p>
                </a>
              </Reveal>

              <Reveal delay={0.06}>
                <a
                  href={`mailto:${site.emails.schools}`}
                  className="group block rounded-2xl border border-line-soft bg-[#fffdf7] p-6 transition-colors duration-500 hover:border-navy/30"
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper-deep text-navy transition-colors group-hover:bg-navy group-hover:text-paper">
                      <Mail size={17} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-ink-faint">
                      Schools
                    </span>
                  </div>
                  <h2 className="mt-6 font-display text-[1.5rem] text-ink">Schools & coordinators</h2>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    Registering, running the competition, and supporting your students.
                  </p>
                  <p className="mt-4 font-mono text-[11.5px] text-navy">{site.emails.schools}</p>
                </a>
              </Reveal>
            </div>

            <Reveal delay={0.12}>
              <div className="mt-6 rounded-2xl border border-line-soft bg-paper-deep/50 p-5">
                <div className="flex items-center gap-2.5">
                  <MapPin size={15} className="text-navy" aria-hidden="true" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                    Based in
                  </p>
                </div>
                <p className="mt-2 text-[14px] font-medium text-ink">Aotearoa New Zealand</p>
                <p className="mt-1 text-[12px] text-ink-soft">Working with schools nationwide.</p>
              </div>
            </Reveal>
          </div>

          <div>
            <ContactForm />
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-line-soft bg-paper-deep/40 p-4">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-leaf-deep" aria-hidden="true" />
              <p className="text-[11.5px] leading-relaxed text-ink-soft">
                All information is kept private. We aim to respond to enquiries within a few
                days. We never share student details with third parties.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
