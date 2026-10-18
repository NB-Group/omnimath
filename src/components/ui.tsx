import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion, useSpring } from 'motion/react'
import { cn } from '../lib/utils'
import { isViewTransitionActive } from '../lib/viewTransitionState'

export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
  once = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
}) {
  const reduced = useReducedMotion()
  const skip = reduced || isViewTransitionActive()
  return (
    <motion.div
      className={className}
      initial={skip ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-10% 0px -8% 0px' }}
      transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** A pointer-magnetism wrapper for buttons and small links. */
export function Magnetic({
  children,
  className,
  strength = 0.22,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  const x = useSpring(0, { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(0, { stiffness: 220, damping: 18, mass: 0.4 })

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)
      x.set(Math.max(-18, Math.min(18, dx * strength)))
      y.set(Math.max(-14, Math.min(14, dy * strength)))
    }
    const leave = () => {
      x.set(0)
      y.set(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [reduced, strength, x, y])

  return (
    <motion.span ref={ref} style={{ x, y }} className={cn('inline-flex', className)}>
      {children}
    </motion.span>
  )
}

export function Formula({
  tex,
  display = false,
  className,
}: {
  tex: string
  display?: boolean
  className?: string
}) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    import('katex')
      .then(({ default: katex }) => {
        if (!alive) return
        setHtml(
          katex.renderToString(tex, {
            throwOnError: false,
            displayMode: display,
            output: 'html',
            strict: 'ignore',
          }),
        )
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [tex, display])

  return (
    <span
      className={className}
      data-tex={tex}
      dangerouslySetInnerHTML={html ? { __html: html } : undefined}
    />
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('eyebrow flex items-center gap-3', className)}>
      <span className="inline-block h-px w-8 bg-current opacity-50" aria-hidden="true" />
      {children}
    </p>
  )
}

export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
  accent = 'sun',
}: {
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  accent?: 'sun' | 'leaf'
}) {
  return (
    <section className="relative overflow-hidden border-b border-line-soft bg-paper pt-16 md:pt-20">
      <div className="dot-paper absolute inset-0 opacity-40" aria-hidden="true" />
      <div
        className={cn(
          'pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl',
          accent === 'sun' ? 'bg-sun/15' : 'bg-leaf/15',
        )}
        aria-hidden="true"
      />
      <div className="container-x relative pb-14 md:pb-20">
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.06}>
          <h1 className="display mt-6 max-w-4xl text-[clamp(2.9rem,6.5vw,5.6rem)]">{title}</h1>
        </Reveal>
        {lead ? (
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft md:text-xl">{lead}</p>
          </Reveal>
        ) : null}
        {children ? <Reveal delay={0.18}>{children}</Reveal> : null}
      </div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'left',
  className,
}: {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      {eyebrow ? (
        <Reveal>
          <Eyebrow className={align === 'center' ? 'justify-center' : undefined}>{eyebrow}</Eyebrow>
        </Reveal>
      ) : null}
      <Reveal delay={0.05}>
        <h2 className="display mt-5 text-[clamp(2.2rem,4.8vw,4rem)]">{title}</h2>
      </Reveal>
      {lead ? (
        <Reveal delay={0.1}>
          <p
            className={cn(
              'mt-5 max-w-2xl text-base leading-relaxed text-ink-soft md:text-lg',
              align === 'center' && 'mx-auto',
            )}
          >
            {lead}
          </p>
        </Reveal>
      ) : null}
    </div>
  )
}

export function ArrowLink({
  to,
  children,
  className,
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <a href={to} className={cn('link-underline group text-sm font-semibold text-navy', className)}>
      {children}
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
        <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  )
}

export function Stat({
  value,
  label,
  detail,
}: {
  value: ReactNode
  label: string
  detail?: string
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
      <p className="display mt-2 text-[2.6rem] leading-none text-navy md:text-6xl">{value}</p>
      {detail ? <p className="mt-2 text-sm text-ink-soft">{detail}</p> : null}
    </div>
  )
}
