import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'

export function Logo({
  tone = 'dark',
  className,
  markOnly = false,
}: {
  tone?: 'dark' | 'light'
  className?: string
  markOnly?: boolean
}) {
  const base = import.meta.env.BASE_URL
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'grid place-items-center',
          tone === 'light' ? 'rounded-xl bg-[#fffdf7] p-1' : '',
        )}
      >
        <img
          src={`${base}omnimath-logo.png`}
          alt=""
          width={48}
          height={32}
          className="h-9 w-auto md:h-10"
          draggable={false}
        />
      </span>
      {markOnly ? null : (
        <span
          className={cn(
            'font-display text-[1.65rem] leading-none tracking-[-0.015em] md:text-[1.8rem]',
            tone === 'dark' ? 'text-ink' : 'text-paper',
          )}
        >
          Omnimath
        </span>
      )}
    </span>
  )
}

export function LogoLink({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <Link to="/" aria-label="Omnimath — home" className="focus-ring rounded-lg">
      <Logo tone={tone} />
    </Link>
  )
}
