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

const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })))

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
