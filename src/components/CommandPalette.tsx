import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowUpRight,
  BookOpenCheck,
  CornerDownLeft,
  Home,
  Info,
  Mail,
  School,
  Search,
  Trophy,
} from 'lucide-react'
import { PALETTE_EVENT } from './Header'
import { cn } from '../lib/utils'

type Command = {
  label: string
  hint: string
  to: string
  group: 'Pages' | 'Actions'
  icon: typeof Home
}

const commands: Command[] = [
  { label: 'Home', hint: 'Mathematics beyond the classroom', to: '/', group: 'Pages', icon: Home },
  { label: 'About Omnimath', hint: 'Why we built it, and who it is for', to: '/about', group: 'Pages', icon: Info },
  { label: 'Challenges', hint: 'Fifteen real-world problems', to: '/competition/challenges', group: 'Pages', icon: Trophy },
  { label: 'Submissions', hint: 'Evidence, marking and deadlines', to: '/competition/submissions', group: 'Pages', icon: BookOpenCheck },
  { label: 'For Schools', hint: 'Run Omnimath with your students', to: '/schools', group: 'Pages', icon: School },
  { label: 'Contact', hint: 'General enquiries and school support', to: '/contact', group: 'Pages', icon: Mail },
  { label: 'Register your school', hint: 'Become an Omnimath coordinator', to: '/schools#register', group: 'Actions', icon: School },
  { label: 'Explore the challenges', hint: 'See all fifteen challenge cards', to: '/competition/challenges', group: 'Actions', icon: ArrowUpRight },
  { label: 'Email the team', hint: 'hello@omnimath.co.nz', to: 'mailto:hello@omnimath.co.nz', group: 'Actions', icon: Mail },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(PALETTE_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(PALETTE_EVENT, onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => {
      document.body.style.overflow = previous
      window.clearTimeout(timer)
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(q) ||
        command.hint.toLowerCase().includes(q) ||
        command.group.toLowerCase().includes(q),
    )
  }, [query])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    const element = document.getElementById(`palette-command-${active}`)
    element?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = useCallback(
    (command: Command) => {
      setOpen(false)
      if (command.to.startsWith('mailto:')) {
        window.location.href = command.to
      } else {
        navigate(command.to)
      }
    },
    [navigate],
  )

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((value) => (results.length ? (value + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((value) => (results.length ? (value - 1 + results.length) % results.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const selected = results[active]
      if (selected) run(selected)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  let currentGroup = ''

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-navy-ink/70 backdrop-blur-md"
            onClick={close}
            aria-label="Close search"
            tabIndex={-1}
          />
          <motion.div
            className="relative w-full max-w-[580px] overflow-hidden rounded-2xl border border-line bg-[#fffdf7] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.65)]"
            initial={{ opacity: 0, y: -14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-line-soft px-4">
              <Search size={17} className="shrink-0 text-ink-faint" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search pages, challenges, actions…"
                className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
                aria-label="Search"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden shrink-0 rounded-md border border-line bg-paper px-1.5 py-1 font-mono text-[10px] text-ink-faint sm:block">
                esc
              </kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-faint">
                  Nothing matched “{query}”.
                </p>
              ) : (
                results.map((command, index) => {
                  const showGroup = command.group !== currentGroup
                  currentGroup = command.group
                  const Icon = command.icon
                  const isActive = index === active
                  return (
                    <div key={`${command.group}-${command.label}`}>
                      {showGroup ? (
                        <p className="px-3 pb-1 pt-3 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-faint">
                          {command.group}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        id={`palette-command-${index}`}
                        onMouseMove={() => setActive(index)}
                        onClick={() => run(command)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                          isActive ? 'bg-paper-deep' : 'hover:bg-paper-deep/60',
                        )}
                      >
                        <span
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors',
                            isActive
                              ? 'border-navy/15 bg-navy text-paper'
                              : 'border-line-soft bg-paper text-ink-soft',
                          )}
                        >
                          <Icon size={15} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-ink">
                            {command.label}
                          </span>
                          <span className="block truncate text-[12px] text-ink-faint">{command.hint}</span>
                        </span>
                        {isActive ? (
                          <CornerDownLeft size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                        ) : null}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line-soft bg-paper/60 px-4 py-2.5 font-mono text-[10px] text-ink-faint">
              <span className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-leaf" aria-hidden="true" />
                Omnimath index
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
