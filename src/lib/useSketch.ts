import { useEffect, useRef } from 'react'

export type DrawFn = (
  ctx: CanvasRenderingContext2D,
  time: number,
  width: number,
  height: number,
  dt: number,
) => void

/**
 * Canvas animation loop with DPR handling, offscreen pausing, and a single
 * static frame when the visitor prefers reduced motion.
 */
export function useSketch(draw: DrawFn) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const drawRef = useRef(draw)

  useEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let visible = true
    let staticDrawn = false

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, rect.width)
      const h = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      staticDrawn = false
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true
        if (visible && reduced) staticDrawn = false
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible) {
        last = now
        return
      }
      if (reduced) {
        if (staticDrawn) return
        staticDrawn = true
        drawRef.current(ctx, 4.2, canvas.clientWidth, canvas.clientHeight, 0.016)
        return
      }
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      drawRef.current(ctx, now / 1000, canvas.clientWidth, canvas.clientHeight, dt)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return ref
}
