import { motion, useReducedMotion } from 'motion/react'
import { cn } from '../lib/utils'

/**
 * A full-bleed duotoned photograph with a line of copy over it. The images are
 * treated to the same navy-and-gold ramp as the six world cards so they read as
 * one set.
 */
export function PhotoBand({
  src,
  alt,
  eyebrow,
  line,
  align = 'left',
  className,
}: {
  src: string
  alt: string
  eyebrow: string
  line: string
  align?: 'left' | 'center'
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <section className={cn('relative overflow-hidden', className)}>
      <motion.img
        src={`${import.meta.env.BASE_URL}${src}`}
        alt={alt}
        loading="lazy"
        decoding="async"
        initial={reduced ? false : { scale: 1.06 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="h-[38vh] min-h-[260px] w-full object-cover md:h-[46vh]"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(3,20,45,0.92)_0%,rgba(3,20,45,0.62)_38%,rgba(3,20,45,0.16)_72%,rgba(3,20,45,0.05)_100%)]"
        aria-hidden="true"
      />
      <div
        className={cn(
          'container-x absolute inset-x-0 bottom-0 flex pb-9 md:pb-12',
          align === 'center' ? 'justify-center text-center' : 'justify-start',
        )}
      >
        <div className={cn(align === 'center' && 'max-w-3xl')}>
          <p className="eyebrow !text-sun">{eyebrow}</p>
          <p className="display mt-3 max-w-2xl text-[clamp(1.55rem,3.2vw,2.5rem)] leading-[1.08] text-paper">
            {line}
          </p>
        </div>
      </div>
    </section>
  )
}
