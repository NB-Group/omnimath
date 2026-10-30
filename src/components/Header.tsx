import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, ChevronDown, Menu, Search, X } from 'lucide-react'
import { navigation } from '../lib/site'
import { cn } from '../lib/utils'
import { LogoLink } from './Logo'
import { Magnetic } from './ui'

export const PALETTE_EVENT = 'omnimath:palette'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const reduced = useReducedMotion()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  const isSectionActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  // The homepage opens on the night sky; until the page scrolls (which brings
  // the cream nav bar back over daylight content) the bar sits on dark, so its
  // ink has to flip.
  const night = location.pathname === '/' && !scrolled

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500',
          scrolled
            ? 'nav-blur border-b border-line/80 shadow-[0_18px_40px_-38px_rgba(6,26,56,0.55)]'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="container-x flex h-[76px] items-center justify-between gap-6">
          <LogoLink tone={night ? 'light' : 'dark'} />

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {navigation.map((item) => {
              const active = isSectionActive(item.to)
              if (item.children) {
                return (
                  <div key={item.to} className="group relative">
                    <Link
                      to={item.to}
                      className={cn(
                        'focus-ring relative inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors',
                        night
                          ? active
                            ? 'text-paper'
                            : 'text-paper/70 hover:text-paper'
                          : active
                            ? 'text-ink'
                            : 'text-ink/70 hover:text-ink',
                      )}
                      aria-haspopup="true"
                    >
                      {item.label}
                      <ChevronDown
                        size={13}
                        className="mt-0.5 opacity-50 transition-transform duration-300 group-hover:rotate-180 group-focus-within:rotate-180"
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          'absolute inset-x-3.5 -bottom-0.5 h-px origin-left transition-transform duration-300',
                          night ? 'bg-sun' : 'bg-navy',
                          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                        )}
                        aria-hidden="true"
                      />
                    </Link>
                    <div className="invisible absolute left-1/2 top-full z-50 w-[23rem] -translate-x-1/2 pt-2 opacity-0 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <div className="rounded-2xl border border-line-soft bg-[#fffdf7] p-2 shadow-[0_34px_70px_-34px_rgba(6,26,56,0.45)]">
                        <p className="px-3 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                          The Competition
                        </p>
                        {item.children.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            className="group/item flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-paper-deep/70"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" aria-hidden="true" />
                            <span>
                              <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                                {child.label}
                                <ArrowUpRight
                                  size={13}
                                  className="opacity-0 transition-all duration-300 group-hover/item:translate-x-0.5 group-hover/item:opacity-60"
                                />
                              </span>
                              <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-faint">
                                {child.description}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={cn(
                    'focus-ring group relative inline-flex items-center rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors',
                    night
                      ? active
                        ? 'text-paper'
                        : 'text-paper/70 hover:text-paper'
                      : active
                        ? 'text-ink'
                        : 'text-ink/70 hover:text-ink',
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      'absolute inset-x-3.5 -bottom-0.5 h-px origin-left transition-transform duration-300',
                      night ? 'bg-sun' : 'bg-navy',
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                    )}
                    aria-hidden="true"
                  />
                </NavLink>
              )
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(PALETTE_EVENT))}
              className={cn(
                'focus-ring hidden items-center gap-2 rounded-full border px-3 py-2 transition-colors md:flex',
                night
                  ? 'border-white/20 bg-white/10 text-paper/70 hover:border-sun/50 hover:text-paper'
                  : 'border-line/90 bg-white/50 text-ink-faint hover:border-navy/30 hover:text-ink',
              )}
              aria-label="Search the site (Command K)"
            >
              <Search size={14} aria-hidden="true" />
              <span className="font-mono text-[10.5px] tracking-wider">⌘K</span>
            </button>

            <div className="hidden sm:block">
              <Magnetic>
                <Link to="/schools" className="btn btn-primary !px-4 !py-2.5 text-[13px]">
                  Take part
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </Magnetic>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn(
                'focus-ring grid h-10 w-10 place-items-center rounded-full border lg:hidden',
                night ? 'border-white/20 text-paper' : 'border-line/90 text-ink',
              )}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="on-navy fixed inset-0 z-[90] flex flex-col lg:hidden"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="container-x flex h-[76px] shrink-0 items-center justify-between">
              <LogoLink tone="light" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-paper/25 text-paper"
                aria-label="Close menu"
                autoFocus
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <nav className="container-x flex-1 overflow-y-auto pb-16" aria-label="Mobile">
              <ul className="mt-6 space-y-2">
                {navigation.map((item, index) => (
                  <motion.li
                    key={item.to}
                    initial={reduced ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + index * 0.045, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      to={item.to}
                      className="group flex items-baseline gap-4 border-b border-paper/10 py-3.5"
                    >
                      <span className="font-mono text-[10px] text-paper/55">0{index + 1}</span>
                      <span className="font-display text-[2.35rem] leading-none text-paper transition-colors group-hover:text-sun">
                        {item.label}
                      </span>
                    </Link>
                    {item.children ? (
                      <ul className="ml-8 mt-2 space-y-1 pb-1">
                        {item.children.map((child) => (
                          <li key={child.to}>
                            <Link
                              to={child.to}
                              className="flex items-center gap-2 py-1.5 text-[13.5px] text-paper/60 transition-colors hover:text-sun"
                            >
                              <span className="h-px w-4 bg-paper/30" aria-hidden="true" />
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </motion.li>
                ))}
              </ul>

              <motion.div
                initial={reduced ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34, duration: 0.5 }}
                className="mt-8 flex flex-col gap-3"
              >
                <Link to="/schools" className="btn btn-sun w-full">
                  Take part through your school
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <a
                  href="mailto:hello@omnimath.co.nz"
                  className="mt-2 text-center font-mono text-[11px] tracking-wider text-paper/60"
                >
                  hello@omnimath.co.nz
                </a>
              </motion.div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
