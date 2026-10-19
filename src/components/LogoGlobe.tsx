import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'
import type { GlobeHandle } from '../lib/globeScene'

/**
 * The 3D Omnimath globe. Three.js is loaded lazily; the flat logo holds the
 * space until the textured sphere and gold ribbon are ready, then cross-fades.
 */
export function LogoGlobe({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    let disposed = false
    let handle: GlobeHandle | null = null

    import('../lib/globeScene')
      .then(({ createGlobe }) => {
        if (disposed) return
        handle = createGlobe(canvas, wrap, {
          reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          onReady: () => {
            if (!disposed) setReady(true)
          },
        })
      })
      .catch(() => {
        // Keep the flat logo if WebGL or the chunk is unavailable.
      })

    return () => {
      disposed = true
      handle?.dispose()
    }
  }, [])

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <div className="absolute inset-[5%] rounded-full bg-[radial-gradient(circle,rgba(0,62,138,0.14),transparent_68%)] blur-2xl" />
      <div className="absolute inset-[13%] rounded-full bg-[radial-gradient(circle,rgba(254,218,18,0.16),transparent_70%)] blur-2xl" />
      <div className="absolute bottom-[8%] left-1/2 h-[5%] w-[46%] -translate-x-1/2 rounded-[50%] bg-navy/15 blur-xl" />

      <canvas
        ref={canvasRef}
        className={cn(
          'relative block h-full w-full transition-opacity duration-700',
          ready ? 'opacity-100' : 'opacity-0',
        )}
      />

      <img
        src={`${import.meta.env.BASE_URL}omnimath-logo.png`}
        alt=""
        draggable={false}
        className={cn(
          'pointer-events-none absolute inset-0 m-auto w-[92%] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]',
          ready ? 'scale-105 opacity-0' : 'scale-100 opacity-100',
        )}
      />
    </div>
  )
}
