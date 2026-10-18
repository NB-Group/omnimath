import { useEffect } from 'react'

const BASE_TITLE = 'Omnimath'

/**
 * Small document-head helper. The site has no SSR, so titles are set after
 * mount; crawlers that execute JavaScript pick them up, and the static title
 * in index.html is a sensible default for everyone else.
 */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE_TITLE}` : `${BASE_TITLE} — Mathematics Beyond the Classroom`
    if (description) {
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', description)
    }
  }, [title, description])
}
