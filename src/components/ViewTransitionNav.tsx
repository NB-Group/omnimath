import { useEffect } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'motion/react'
import { setViewTransitionActive } from '../lib/viewTransitionState'

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

/**
 * Intercepts same-origin link clicks and runs the route change inside the
 * View Transitions API. The new page is revealed with a circular mask that
 * grows from the exact click point, over a dimmed, slightly recessed old
 * page. Falls back to plain navigation where the API is unavailable.
 */
export function ViewTransitionNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const reduced = useReducedMotion()

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')

    const onClick = (event: MouseEvent) => {
      if (reduced || event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as Element | null
      const anchor = target?.closest('a')
      if (!anchor) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return
      if (anchor.closest('[data-vt="off"]')) return
      // Let the mobile menu finish closing; its full-screen overlay is not a
      // good match for a page snapshot.
      if (document.querySelector('[role="dialog"]')) return

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      // Hash links and same-page anchors keep the router's smooth-scroll path.
      if (url.hash) return
      if (url.pathname === location.pathname && url.search === location.search) return

      event.preventDefault()
      event.stopPropagation()

      const x = event.clientX
      const y = event.clientY
      let path = url.pathname
      if (base && path.startsWith(base)) path = path.slice(base.length) || '/'
      const to = path + url.search

      const update = () => {
        flushSync(() => navigate(to))
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      }

      const doc = document as ViewTransitionDocument
      if (!doc.startViewTransition) {
        update()
        return
      }

      document.documentElement.style.setProperty('--vt-x', `${x}px`)
      document.documentElement.style.setProperty('--vt-y', `${y}px`)
      document.documentElement.classList.add('vt-capture')
      setViewTransitionActive(true)
      let transition: { finished: Promise<void> } | null = null
      try {
        transition = doc.startViewTransition(update)
      } catch {
        document.documentElement.classList.remove('vt-capture')
        setViewTransitionActive(false)
        update()
        return
      }
      transition.finished
        .catch(() => {})
        .finally(() => {
          document.documentElement.classList.remove('vt-capture')
          setViewTransitionActive(false)
        })
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate, location.pathname, location.search, reduced])

  return null
}
