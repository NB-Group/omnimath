export const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

const backendConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
)

/**
 * Turnstile is only active when both the backend and a site key exist.
 * Without them the forms use the direct/mailto fallbacks, which is fine for
 * local development or a static preview.
 */
export const turnstileEnabled = Boolean(turnstileSiteKey && backendConfigured)

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loader: Promise<TurnstileApi> | null = null

export function loadTurnstile(): Promise<TurnstileApi> {
  if (!turnstileEnabled) return Promise.reject(new Error('Turnstile is not configured'))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-omnimath-turnstile]')
    const script = existing ?? document.createElement('script')
    if (!existing) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.omnimathTurnstile = 'true'
      document.head.appendChild(script)
    }

    let attempts = 0
    const poll = () => {
      if (window.turnstile) {
        resolve(window.turnstile)
        return
      }
      attempts += 1
      if (attempts > 120) {
        reject(new Error('Turnstile failed to load'))
        return
      }
      window.setTimeout(poll, 100)
    }
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load')), {
      once: true,
    })
    poll()
  })

  return loader
}
