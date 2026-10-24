import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { CompetitionLayout } from './pages/CompetitionLayout'
import { Challenges } from './pages/Challenges'
import { Submissions } from './pages/Submissions'
import { Schools } from './pages/Schools'
import { Submit } from './pages/Submit'
import { Contact } from './pages/Contact'
import { Results } from './pages/Results'
import { NotFound } from './pages/NotFound'

/**
 * After a deploy, a tab still running the old bundle asks for chunk files
 * that no longer exist and the route white-screens. Reload once so the
 * browser picks up the new HTML and chunk names; the flag stops a loop if
 * the fresh bundle is also broken.
 */
function lazyWithRecover<T>(load: () => Promise<T>) {
  return async () => {
    try {
      return await load()
    } catch (error) {
      if (!sessionStorage.getItem('omnimath:chunk-reload')) {
        sessionStorage.setItem('omnimath:chunk-reload', '1')
        window.location.reload()
      }
      throw error
    }
  }
}

const Admin = lazy(
  lazyWithRecover(() => import('./pages/Admin').then((module) => ({ default: module.Admin }))),
)
const Register = lazy(lazyWithRecover(() => import('./pages/Register')))

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

function AdminFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        Loading staff inbox…
      </p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
        <Routes>
          <Route
            path="admin"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Admin />
              </Suspense>
            }
          />
          <Route
            path="register"
            element={
              <Suspense fallback={<AdminFallback />}>
                <Register />
              </Suspense>
            }
          />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="competition" element={<CompetitionLayout />}>
              <Route index element={<Navigate to="/competition/challenges" replace />} />
              <Route path="challenges" element={<Challenges />} />
              <Route path="submissions" element={<Submissions />} />
            </Route>
            <Route path="schools" element={<Schools />} />
            <Route path="submit" element={<Submit />} />
            <Route path="contact" element={<Contact />} />
            <Route path="results" element={<Results />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
    </BrowserRouter>
  )
}
