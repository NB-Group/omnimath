import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { LogoLink } from '../components/Logo'
import { cn } from '../lib/utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const TOKEN_KEY = 'omnimath:admin-token'

type Contact = {
  id: string
  created_at: string
  name: string
  email: string
  topic: string
  school: string | null
  role: string | null
  message: string
}

type Submission = {
  id: string
  created_at: string
  student_name: string
  email: string
  year_level: number
  school: string | null
  challenge_number: number
  work_link: string | null
  notes: string | null
  file_path: string | null
  file_name: string | null
  status: 'pending' | 'received'
  file_url: string | null
}

type AdminData = {
  ok: true
  contacts: Contact[]
  submissions: Submission[]
  stats: { contacts: number; submissions: number; pending: number }
  generatedAt: string
}

type AdminResponse = (AdminData | { ok?: false; error?: string }) & { token?: string }

type Tab = 'submissions' | 'messages'

type Result = { status: number; data: AdminResponse | null }

async function callAdmin(body: Record<string, unknown>, token?: string): Promise<Result> {
  if (!supabaseUrl || !anonKey) return { status: 0, data: null }
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as AdminResponse | null
    return { status: response.status, data }
  } catch {
    return { status: 0, data: null }
  }
}

function messageFor(result: Result): string {
  if (!supabaseUrl || !anonKey) return 'The admin backend is not configured in this build.'
  if (result.status === 429) return 'Too many attempts. Wait a few minutes and try again.'
  if (result.status === 0) return 'Could not reach the admin service. Check your connection and retry.'
  if (result.status === 503) return 'The admin service is unavailable right now. Try again shortly.'
  if (result.data && 'error' in result.data) {
    if (result.data.error === 'invalid_password') return 'Wrong password. Try again.'
    if (result.data.error === 'admin_not_configured') return 'The admin password has not been configured yet.'
  }
  return 'That did not work. Please try again.'
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-NZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function safeExternalUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

const inputClass =
  'h-12 w-full rounded-xl border border-line bg-[#fffdf7] px-3.5 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-faint/80 focus:border-navy focus:ring-2 focus:ring-navy/15'

function StatusPill({ status }: { status: Submission['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]',
        status === 'received'
          ? 'bg-leaf/15 text-leaf-deep'
          : 'bg-sun/25 text-[#7a5a00]',
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'received' ? 'bg-leaf-deep' : 'bg-[#b8860b]',
        )}
      />
      {status}
    </span>
  )
}

export function Admin() {
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready'>('idle')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<AdminData | null>(null)
  const [tab, setTab] = useState<Tab>('submissions')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'received' | 'pending'>('all')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Admin — Omnimath'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex,nofollow'
    document.head.appendChild(meta)
    return () => {
      document.title = previousTitle
      meta.remove()
    }
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem(TOKEN_KEY)
    if (!stored) return
    setToken(stored)
    setStatus('checking')
    void loadOverview(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadOverview(currentToken: string) {
    setError('')
    const result = await callAdmin({ kind: 'overview' }, currentToken)
    if (result.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY)
      setToken(null)
      setData(null)
      setStatus('idle')
      return
    }
    if (result.status !== 200 || !result.data || !('ok' in result.data) || result.data.ok !== true) {
      setError(messageFor(result))
      setStatus('idle')
      return
    }
    setData(result.data as AdminData)
    setStatus('ready')
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!password) {
      setError('Enter the admin password.')
      return
    }
    setStatus('checking')
    setError('')
    const result = await callAdmin({ kind: 'login', password })
    if (result.status === 200 && result.data && result.data.ok === true && result.data.token) {
      sessionStorage.setItem(TOKEN_KEY, result.data.token)
      setToken(result.data.token)
      setPassword('')
      await loadOverview(result.data.token)
      return
    }
    setError(messageFor(result))
    setStatus('idle')
  }

  async function refresh() {
    if (!token) return
    setRefreshing(true)
    await loadOverview(token)
    setRefreshing(false)
  }

  async function logout() {
    if (token) await callAdmin({ kind: 'logout' }, token).catch(() => {})
    sessionStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setData(null)
    setStatus('idle')
    setPassword('')
  }

  const filteredSubmissions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (data?.submissions ?? []).filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false
      if (!needle) return true
      return [
        row.student_name,
        row.email,
        row.school ?? '',
        `challenge ${row.challenge_number}`,
        row.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [data, filter, query])

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return data?.contacts ?? []
    return (data?.contacts ?? []).filter((row) =>
      [row.name, row.email, row.topic, row.school ?? '', row.message]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [data, query])

  const header = (
    <header className="border-b border-line-soft bg-paper/95 backdrop-blur">
      <div className="container-x flex h-20 items-center justify-between gap-4">
        <LogoLink />
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-line bg-[#fffdf7] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint sm:inline-flex">
            Staff inbox
          </span>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-navy/30 hover:text-navy"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to site
          </Link>
        </div>
      </div>
    </header>
  )

  if (status === 'checking' && !data) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        {header}
        <div className="grid min-h-[calc(100vh-5rem)] place-items-center px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-navy text-paper">
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            </span>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              Checking your session
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        {header}
        <main className="container-x grid min-h-[calc(100vh-5rem)] place-items-center py-16">
          <div className="w-full max-w-md rounded-3xl border border-line-soft bg-[#fffdf7] p-7 shadow-[0_30px_80px_-50px_rgba(0,42,94,0.45)] md:p-9">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy text-paper">
              <Lock size={20} aria-hidden="true" />
            </span>
            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
              Staff access
            </p>
            <h1 className="mt-2 font-display text-[2rem] leading-none text-ink">
              Open the inbox.
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
              Enter the admin password to read contact messages and student submissions.
              Sessions expire automatically after 12 hours.
            </p>

            <form onSubmit={handleLogin} className="mt-7">
              <label
                htmlFor="admin-password"
                className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint"
              >
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  className={cn(inputClass, 'pr-12')}
                  placeholder="Admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <ShieldCheck size={16} aria-hidden="true" />
                  ) : (
                    <Lock size={16} aria-hidden="true" />
                  )}
                </button>
              </div>

              {error ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] leading-relaxed text-red-700">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === 'checking'}
                className="btn btn-primary mt-5 w-full disabled:opacity-70"
              >
                {status === 'checking' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Checking…
                  </>
                ) : (
                  'Unlock inbox'
                )}
              </button>
            </form>

            <p className="mt-6 border-t border-line-soft pt-4 text-[10.5px] leading-relaxed text-ink-faint">
              This page is private. Never share the password or this URL publicly.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {header}
      <main className="container-x py-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
              Omnimath staff
            </p>
            <h1 className="mt-2 font-display text-[clamp(2.4rem,4vw,3.4rem)] leading-none text-ink">
              The inbox.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[12px] font-semibold text-ink-soft transition-colors hover:border-navy/30 hover:text-navy disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={cn(refreshing && 'animate-spin')}
                aria-hidden="true"
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[12px] font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600"
            >
              <LogOut size={14} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] leading-relaxed text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-line-soft bg-[#fffdf7] p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Messages
              </span>
              <Mail size={16} className="text-navy/50" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-[2.6rem] leading-none text-navy">
              {data.stats.contacts}
            </p>
          </div>
          <div className="rounded-2xl border border-line-soft bg-[#fffdf7] p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Submissions
              </span>
              <FileText size={16} className="text-navy/50" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-[2.6rem] leading-none text-navy">
              {data.stats.submissions}
            </p>
          </div>
          <div className="rounded-2xl border border-line-soft bg-[#fffdf7] p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Pending files
              </span>
              <Inbox size={16} className="text-navy/50" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-[2.6rem] leading-none text-navy">
              {data.stats.pending}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-b border-line-soft pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-7">
            {(
              [
                ['submissions', `Submissions ${data.stats.submissions}`],
                ['messages', `Messages ${data.stats.contacts}`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={cn(
                  'relative pb-3 text-[13px] font-semibold transition-colors',
                  tab === value ? 'text-navy' : 'text-ink-faint hover:text-ink-soft',
                )}
              >
                {label}
                <span
                  className={cn(
                    'absolute inset-x-0 -bottom-4 h-[2px]',
                    tab === value ? 'bg-navy' : 'bg-transparent',
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {tab === 'submissions' ? (
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as 'all' | 'received' | 'pending')
                }
                className="h-10 rounded-full border border-line bg-[#fffdf7] px-3 text-[12px] text-ink-soft outline-none focus:border-navy"
                aria-label="Filter submissions by status"
              >
                <option value="all">All statuses</option>
                <option value="received">Received</option>
                <option value="pending">Pending file</option>
              </select>
            ) : null}
            <label className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, school…"
                className="h-10 w-full rounded-full border border-line bg-[#fffdf7] pl-9 pr-3 text-[12px] text-ink outline-none placeholder:text-ink-faint/80 focus:border-navy sm:w-64"
                aria-label="Search inbox"
              />
            </label>
          </div>
        </div>

        {tab === 'submissions' ? (
          <div className="mt-6 space-y-3">
            {filteredSubmissions.length === 0 ? (
              <EmptyState
                icon={<FileText size={20} aria-hidden="true" />}
                title="No submissions here."
                body="New work will appear here as soon as a student sends it."
              />
            ) : (
              filteredSubmissions.map((row) => {
                const workUrl = safeExternalUrl(row.work_link)
                return (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-line-soft bg-[#fffdf7] p-5 md:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-[1.5rem] leading-none text-ink">
                            {row.student_name}
                          </h2>
                          <StatusPill status={row.status} />
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
                          <span>Year {row.year_level}</span>
                          <span className="text-line">·</span>
                          <span>Challenge {String(row.challenge_number).padStart(2, '0')}</span>
                          {row.school ? (
                            <>
                              <span className="text-line">·</span>
                              <span>{row.school}</span>
                            </>
                          ) : null}
                        </p>
                        <a
                          href={`mailto:${row.email}`}
                          className="mt-1.5 inline-block text-[12px] text-navy underline decoration-navy/25 underline-offset-2 hover:decoration-navy"
                        >
                          {row.email}
                        </a>
                      </div>
                      <time className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                        {formatDate(row.created_at)}
                      </time>
                    </div>

                    {row.notes ? (
                      <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
                        {row.notes}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
                      {row.file_url ? (
                        <a
                          href={row.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-navy px-4 text-[12px] font-semibold text-paper transition-colors hover:bg-navy-deep"
                        >
                          <Download size={14} aria-hidden="true" />
                          Download {row.file_name || 'file'}
                        </a>
                      ) : row.file_path ? (
                        <span className="text-[11.5px] text-ink-faint">
                          File link unavailable. Refresh to try again.
                        </span>
                      ) : (
                        <span className="text-[11.5px] text-ink-faint">
                          No file attached
                        </span>
                      )}
                      {workUrl ? (
                        <a
                          href={workUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[12px] font-semibold text-ink-soft transition-colors hover:border-navy/30 hover:text-navy"
                        >
                          <ExternalLink size={14} aria-hidden="true" />
                          Open work link
                        </a>
                      ) : null}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {filteredContacts.length === 0 ? (
              <EmptyState
                icon={<Mail size={20} aria-hidden="true" />}
                title="No messages here."
                body="Enquiries from the contact form will land here."
              />
            ) : (
              filteredContacts.map((row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border border-line-soft bg-[#fffdf7] p-5 md:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-[1.5rem] leading-none text-ink">
                        {row.name}
                      </h2>
                      <p className="mt-2 text-[12px] text-ink-soft">
                        {row.topic}
                        {row.role ? ` · ${row.role}` : ''}
                        {row.school ? ` · ${row.school}` : ''}
                      </p>
                      <a
                        href={`mailto:${row.email}`}
                        className="mt-1.5 inline-block text-[12px] text-navy underline decoration-navy/25 underline-offset-2 hover:decoration-navy"
                      >
                        {row.email}
                      </a>
                    </div>
                    <time className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                      {formatDate(row.created_at)}
                    </time>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
                    {row.message}
                  </p>
                </article>
              ))
            )}
          </div>
        )}

        <p className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
          <span>Latest 100 messages and submissions</span>
          <span>Refreshed {formatDate(data.generatedAt)}</span>
        </p>
      </main>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-[#fffdf7]/60 px-6 py-14 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-paper-deep text-navy">
        {icon}
      </span>
      <h2 className="mt-4 font-display text-[1.5rem] leading-none text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  )
}
