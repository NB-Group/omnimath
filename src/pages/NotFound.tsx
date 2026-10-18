import { Link } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { Formula } from '../components/ui'
import { PALETTE_EVENT } from '../components/Header'
import { usePageMeta } from '../lib/usePageMeta'

export function NotFound() {
  usePageMeta("Page not found", "The page you were looking for does not exist.")
  return (
    <section className="relative overflow-hidden">
      <div className="dot-paper absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="container-x relative flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Error · Page not found
        </p>
        <h1 className="display mt-6 text-[clamp(6rem,18vw,15rem)] leading-[0.8] text-ink">
          4<span className="text-navy">0</span>4
        </h1>
        <div className="mt-6 rounded-xl border border-line-soft bg-[#fffdf7] px-5 py-3">
          <Formula tex={String.raw`\lim_{x \to 0} \frac{1}{x} = \text{undefined, much like this page}`} className="text-[15px] text-ink" />
        </div>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft">
          The page you were looking for does not exist — or it has moved somewhere else in the
          set of all possible pages.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={15} aria-hidden="true" />
            Back to home
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(PALETTE_EVENT))}
            className="btn btn-ghost"
          >
            <Search size={15} aria-hidden="true" />
            Search the site
          </button>
        </div>
      </div>
    </section>
  )
}
