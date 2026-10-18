import { useEffect, useRef, useState } from 'react'
import { loadTurnstile, turnstileEnabled, turnstileSiteKey } from '../lib/turnstile'

export function Turnstile({
  onToken,
  action,
  resetSignal = 0,
}: {
  onToken: (token: string | null) => void
  /** Turnstile action; the Edge Function requires this exact value. */
  action: string
  /** Increment to reset the widget after a submission attempt. */
  resetSignal?: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!turnstileEnabled) return
    let disposed = false

    loadTurnstile()
      .then((api) => {
        if (disposed || !container.current || widgetId.current) return
        widgetId.current = api.render(container.current, {
          sitekey: turnstileSiteKey,
          action,
          theme: 'light',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': (code?: string) => {
            // Turnstile error codes are the fastest way to tell a domain
            // mismatch from a challenge/network failure.
            console.error('Turnstile error code:', code)
            setFailed(true)
            onToken(null)
          },
        })
        setMounted(true)
      })
      .catch(() => {
        if (!disposed) setFailed(true)
      })

    return () => {
      disposed = true
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // The widget may already be gone after a route change.
        }
      }
      widgetId.current = null
    }
  }, [onToken, action])

  useEffect(() => {
    if (!resetSignal || !widgetId.current || !window.turnstile) return
    try {
      window.turnstile.reset(widgetId.current)
    } catch {
      // Ignore a stale widget; the next mount will render a fresh one.
    }
    onToken(null)
  }, [resetSignal, onToken])

  if (!turnstileEnabled) return null

  return (
    <div className="mt-5">
      <div ref={container} className="flex min-h-[65px] justify-center" />
      {failed ? (
        <p className="mt-1 text-center text-[11px] text-red-600">
          Verification could not load. Please refresh the page, or email us directly.
        </p>
      ) : null}
      {!mounted && !failed ? (
        <p className="text-center font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
          Loading verification…
        </p>
      ) : null}
    </div>
  )
}
