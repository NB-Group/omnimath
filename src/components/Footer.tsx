import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { site } from '../lib/site'
import { LogoLink } from './Logo'

const COPYRIGHT_YEAR = new Date().getFullYear()

const columns = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', to: '/' },
      { label: 'About', to: '/about' },
      { label: 'For Schools', to: '/schools' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'The Competition',
    links: [
      { label: 'Challenges', to: '/competition/challenges' },
      { label: 'Submissions', to: '/competition/submissions' },
      { label: 'Submit work online', to: '/submit' },
      { label: 'Register a school', to: '/schools#register' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="on-navy relative overflow-hidden">
      <div className="container-x relative py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <LogoLink tone="light" />
            <p className="mt-6 max-w-sm text-[14.5px] leading-relaxed text-paper/55">
              A student-led mathematics competition that takes learning beyond the classroom,
              and shows how maths shapes the world we live in.
            </p>
            <p className="mt-6 font-mono text-[10.5px] uppercase tracking-[0.2em] text-paper/55">
              {site.country} · {site.year}
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-sun/80">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group inline-flex items-center gap-1.5 text-[14px] text-paper/65 transition-colors hover:text-paper"
                    >
                      {link.label}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 transition-all duration-300 group-hover:opacity-70"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-sun/80">
              Get in touch
            </h3>
            <ul className="mt-5 space-y-3 text-[14px] text-paper/65">
              <li>
                <a href={`mailto:${site.emails.general}`} className="link-underline hover:text-paper">
                  {site.emails.general}
                </a>
                <span className="mt-1 block text-[11.5px] text-paper/55">General enquiries</span>
              </li>
              <li>
                <a href={`mailto:${site.emails.schools}`} className="link-underline hover:text-paper">
                  {site.emails.schools}
                </a>
                <span className="mt-1 block text-[11.5px] text-paper/55">Schools and coordinators</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-paper/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[11.5px] text-paper/55">
            © {COPYRIGHT_YEAR} Omnimath. All rights reserved.
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-paper/55">
            Mathematics is everywhere.
          </p>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 right-0 select-none font-display text-[19rem] leading-none text-white/[0.025]"
      >
        ∑
      </div>
    </footer>
  )
}
