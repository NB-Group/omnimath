import { useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { cn } from '../lib/utils'

/**
 * A scroll-driven mask: outlined text is filled in as the block moves through
 * the viewport. The filled copy is clipped from the right, so the words appear
 * to be written in by a moving mask edge.
 */
export function MaskedStatement({
  children,
  className,
  stroke = 'rgba(247, 243, 232, 0.28)',
}: {
  children: ReactNode
  className?: string
  stroke?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.9', 'end 0.52'],
  })
  const clipPath = useTransform(scrollYProgress, [0, 1], ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <h2
        className="display relative select-none text-transparent"
        style={{ WebkitTextStroke: `1px ${stroke}` }}
      >
        {children}
      </h2>
      <motion.h2
        aria-hidden="true"
        className="display absolute inset-0 text-paper"
        style={reduced ? undefined : { clipPath }}
      >
        {children}
      </motion.h2>
    </div>
  )
}
