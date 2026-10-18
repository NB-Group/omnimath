import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { CommandPalette } from './CommandPalette'
import { ScrollProgress } from './ScrollProgress'
import { ViewTransitionNav } from './ViewTransitionNav'

function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return null
}

export function Layout() {
  return (
    <div className="grain flex min-h-screen flex-col">
      <a
        href="#main"
        className="fixed left-4 top-4 z-[110] -translate-y-24 rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <Header />
      <main id="main" className="flex-1 pt-[76px]">
        <Outlet />
      </main>
      <Footer />
      <CommandPalette />
      <ScrollManager />
      <ViewTransitionNav />
    </div>
  )
}
