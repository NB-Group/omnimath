import { NavLink, Outlet } from 'react-router-dom'
import { BookOpenCheck, Trophy } from 'lucide-react'
import { cn } from '../lib/utils'

const tabs = [
  { to: '/competition/challenges', label: 'Challenges', icon: Trophy },
  { to: '/competition/submissions', label: 'Submissions', icon: BookOpenCheck },
]

export function CompetitionLayout() {
  return (
    <>
      <div className="sticky top-[76px] z-40 border-b border-line-soft bg-paper/85 backdrop-blur-md">
        <div className="container-x flex h-14 items-center justify-between gap-4">
          <nav className="flex items-center gap-1" aria-label="Competition sections">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-300',
                      isActive
                        ? 'bg-navy text-paper shadow-[0_8px_20px_-12px_rgba(0,42,94,0.7)]'
                        : 'text-ink-soft hover:bg-paper-deep/70 hover:text-ink',
                    )
                  }
                >
                  <Icon size={14} aria-hidden="true" />
                  {tab.label}
                </NavLink>
              )
            })}
          </nav>
          <p className="hidden font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-faint sm:block">
            2027 · Years 5–8 · Aotearoa
          </p>
        </div>
      </div>
      <Outlet />
    </>
  )
}
