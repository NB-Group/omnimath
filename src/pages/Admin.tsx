import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  BadgeCheck,
  BookOpenCheck,
  Check,
  ChevronLeft,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { LogoLink } from '../components/Logo'
import { cn } from '../lib/utils'
import {
  callStaffFunction,
  getStaffClient,
  loadApplicationStatus,
  loadStaffProfile,
  type StaffProfile,
} from '../lib/staffClient'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Mark = {
  score: number
  comment: string | null
  awarded_by_name: string | null
  updated_at: string
}

type Submission = {
  id: string
  created_at: string
  student_name: string
  email: string
  year_level: number
  school: string | null
  school_id: string | null
  challenge_number: number
  work_link: string | null
  notes: string | null
  file_path: string | null
  file_name: string | null
  status: 'pending' | 'received'
  marks: Mark | null
}

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

type School = { id: string; name: string }

type StaffRow = {
  id: string
  email: string
  name: string
  role: 'admin' | 'coordinator'
  school_id: string | null
  schools: { name: string } | null
}

type ApplicationRow = {
  id: string
  email: string
  name: string
  message: string | null
  created_at: string
  school_name: string
}

type Tab = 'submissions' | 'messages' | 'org'

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

function randomPassword(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function Admin() {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [authError, setAuthError] = useState('')
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    let cancelled = false
    getStaffClient().then(async (client) => {
      if (cancelled) return
      setClient(client)
      if (!client) {
        setBooting(false)
        return
      }
      const { data } = await client.auth.getSession()
      const sessionUser = data.session?.user ?? null
      if (sessionUser) {
        const staff = await loadStaffProfile(client, sessionUser)
        if (cancelled) return
        if (!staff) {
          await client.auth.signOut()
          const status = await loadApplicationStatus(client, sessionUser)
          setAuthError(
            status === 'pending'
              ? 'Your registration is awaiting approval. Try again once the competition admin has approved it.'
              : 'This account does not have access to the staff console.',
          )
        } else {
          setUser(sessionUser)
          setProfile(staff)
        }
      }
      setBooting(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const signOut = useCallback(async () => {
    await client?.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [client])

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper">
        <Loader2 className="animate-spin text-navy/50" size={22} />
      </div>
    )
  }

  if (!client) {
    return (
      <Shell>
        <div className="card">
          <ShieldCheck size={20} className="text-navy/70" />
          <h1 className="mt-3 font-display text-2xl">Staff console unavailable</h1>
          <p className="mt-2 text-sm text-ink-soft">
            The backend is not configured for this deployment.
          </p>
        </div>
      </Shell>
    )
  }

  if (!user || !profile) {
    return (
      <Shell>
        <SignIn
          client={client}
          authError={authError}
          onSignedIn={(user, profile) => {
            setUser(user)
            setProfile(profile)
            setAuthError('')
          }}
          onError={setAuthError}
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <Console
        client={client}
        user={user}
        profile={profile}
        onSignOut={signOut}
      />
    </Shell>
  )
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                     */
/* -------------------------------------------------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-paper min-h-screen bg-paper px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">{children}</div>
    </div>
  )
}

function cardClass() {
  return 'rounded-2xl border border-line bg-white/85 p-6 shadow-[0_24px_60px_-40px_rgba(6,26,56,0.35)] backdrop-blur'
}

const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-navy/60 focus:ring-2 focus:ring-navy/15'
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-paper transition hover:bg-navy/90 disabled:opacity-50'
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink transition hover:border-navy/40 disabled:opacity-50'

/* -------------------------------------------------------------------------- */
/* Sign in                                                                    */
/* -------------------------------------------------------------------------- */

function SignIn({
  client,
  authError,
  onSignedIn,
  onError,
}: {
  client: SupabaseClient
  authError: string
  onSignedIn: (user: User, profile: StaffProfile) => void
  onError: (message: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const reduced = useReducedMotion()
  const enter = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
        }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    onError('')
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error || !data.user) {
      onError('That email or password is not recognised.')
      setBusy(false)
      return
    }
    const staff = await loadStaffProfile(client, data.user)
    if (!staff) {
      await client.auth.signOut()
      const status = await loadApplicationStatus(client, data.user)
      onError(
        status === 'pending'
          ? 'Your registration is awaiting approval. Try again once it has been approved.'
          : 'This account does not have access to the staff console.',
      )
      setBusy(false)
      return
    }
    onSignedIn(data.user, staff)
  }

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <motion.div {...enter(0)}>
        <LogoLink />
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          Staff access
        </p>
        <h1 className="display mt-3 text-4xl sm:text-5xl">Staff console</h1>
        <p className="mt-4 max-w-md text-ink-soft">
          Coordinators review and mark their own school's submissions. The
          competition admin oversees every school, the message inbox and staff
          accounts.
        </p>
        <p className="mt-6 max-w-md border-l-2 border-sun pl-4 text-sm text-ink-soft">
          Coordinators create their account on the{' '}
          <Link to="/register" className="text-navy underline-offset-2 hover:underline">
            registration page
          </Link>{' '}
          — an invite code gives instant access.
        </p>
      </motion.div>
      <motion.form
        {...enter(0.12)}
        onSubmit={submit}
        className={cardClass()}
      >
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          <Lock size={12} /> Sign in
        </div>
        <label className="mt-5 block text-sm font-medium text-ink" htmlFor="staff-email">
          Email
        </label>
        <input
          id="staff-email"
          type="email"
          autoComplete="email"
          required
          className={cn(inputClass, 'mt-1.5')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label className="mt-4 block text-sm font-medium text-ink" htmlFor="staff-password">
          Password
        </label>
        <input
          id="staff-password"
          type="password"
          autoComplete="current-password"
          required
          className={cn(inputClass, 'mt-1.5')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {authError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{authError}</p>
        ) : null}
        <motion.button
          type="submit"
          disabled={busy}
          whileHover={reduced || busy ? undefined : { y: -1 }}
          whileTap={reduced ? undefined : { scale: 0.98 }}
          className={cn(btnPrimary, 'mt-5 w-full')}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          Sign in
        </motion.button>
        <p className="mt-4 text-center text-xs text-ink-faint">
          New school coordinator?{' '}
          <Link to="/register" className="text-navy underline-offset-2 hover:underline">
            Register here
          </Link>
        </p>
      </motion.form>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Console                                                                    */
/* -------------------------------------------------------------------------- */

function Console({
  client,
  user,
  profile,
  onSignOut,
}: {
  client: SupabaseClient
  user: User
  profile: StaffProfile
  onSignOut: () => void
}) {
  const isAdmin = profile.role === 'admin'
  const [tab, setTab] = useState<Tab>('submissions')
  const [schoolName, setSchoolName] = useState<string | null>(null)
  useDocumentTitle(isAdmin ? 'Omnimath · Admin console' : 'Omnimath · Coordinator console')

  useEffect(() => {
    if (profile.school_id) {
      client
        .from('schools')
        .select('name')
        .eq('id', profile.school_id)
        .maybeSingle()
        .then(({ data }) => setSchoolName(data?.name ?? null))
    }
  }, [client, profile.school_id, isAdmin])

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'submissions', label: 'Submissions', icon: <BookOpenCheck size={14} /> },
    ...(isAdmin
      ? [
          { key: 'messages' as Tab, label: 'Messages', icon: <Inbox size={14} /> },
          { key: 'org' as Tab, label: 'Schools & staff', icon: <Users size={14} /> },
        ]
      : []),
  ]

  const reduced = useReducedMotion()
  const enter = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
        }

  return (
    <div>
      <motion.header
        {...enter(0)}
        className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5"
      >
        <div className="flex items-center gap-3">
          <LogoLink />
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full bg-navy/10 font-display text-sm text-navy"
          >
            {profile.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{profile.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              {isAdmin ? 'Admin · all schools' : `Coordinator · ${schoolName ?? profile.school_id}`}
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={reduced ? undefined : { y: -1 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            onClick={onSignOut}
            className={btnGhost}
            title="Sign out"
          >
            <LogOut size={15} />
          </motion.button>
        </div>
      </motion.header>

      <motion.nav {...enter(0.08)} className="mt-6 flex flex-wrap items-center gap-1.5">
        {tabs.map((entry) => {
          const active = tab === entry.key
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={cn(
                'relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors',
                active ? 'text-paper' : 'text-ink-soft hover:text-navy',
              )}
            >
              {active ? (
                <motion.span
                  layoutId="console-tab-pill"
                  className="absolute inset-0 rounded-full bg-navy"
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
              <span className="relative z-10 inline-flex items-center gap-2">
                {entry.icon}
                {entry.label}
              </span>
            </button>
          )
        })}
      </motion.nav>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6"
        >
          {tab === 'submissions' && (
            <SubmissionsTab client={client} profile={profile} isAdmin={isAdmin} />
          )}
          {tab === 'messages' && isAdmin && <MessagesTab client={client} />}
          {tab === 'org' && isAdmin && <OrgTab client={client} user={user} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}

/* -------------------------------------------------------------------------- */
/* Submissions + marking                                                      */
/* -------------------------------------------------------------------------- */

function SubmissionsTab({
  client,
  profile,
  isAdmin,
}: {
  client: SupabaseClient
  profile: StaffProfile
  isAdmin: boolean
}) {
  const [rows, setRows] = useState<Submission[] | null>(null)
  const [schools, setSchools] = useState<School[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [selected, setSelected] = useState<Submission | null>(null)

  const load = useCallback(async () => {
    setError('')
    setRows(null)
    let query = client
      .from('submissions')
      .select(
        'id, created_at, student_name, email, year_level, school, school_id, challenge_number, work_link, notes, file_path, file_name, status, marks(score, comment, awarded_by_name, updated_at)',
      )
      .order('created_at', { ascending: false })
      .limit(500)
    if (!isAdmin && profile.school_id) {
      query = query.eq('school_id', profile.school_id)
    }
    const { data, error } = await query
    if (error) {
      setError('Submissions could not be loaded. Refresh to try again.')
      setRows([])
      return
    }
    setRows(
      (data ?? []).map((row) => ({ ...row, marks: row.marks ?? null }) as unknown as Submission),
    )
  }, [client, isAdmin, profile.school_id])

  useEffect(() => {
    load()
    if (isAdmin) {
      client
        .from('schools')
        .select('id, name')
        .order('name')
        .then(({ data }) => setSchools((data ?? []) as School[]))
    }
  }, [load, client, isAdmin])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (schoolFilter && row.school_id !== schoolFilter) return false
      if (!needle) return true
      return (
        row.student_name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        String(row.challenge_number).padStart(2, '0').includes(needle)
      )
    })
  }, [rows, search, schoolFilter])

  const marked = filtered.filter((row) => row.marks).length
  const average = marked
    ? (filtered.reduce((sum, row) => sum + (row.marks?.score ?? 0), 0) / marked).toFixed(1)
    : '—'

  const exportCsv = () => {
    const header = [
      'submitted_at',
      'student',
      'email',
      'year',
      'school',
      'challenge',
      'status',
      'mark',
      'marker',
      'mark_comment',
    ]
    const lines = filtered.map((row) =>
      [
        row.created_at,
        row.student_name,
        row.email,
        row.year_level,
        row.school ?? row.school_id ?? '',
        row.challenge_number,
        row.status,
        row.marks?.score ?? '',
        row.marks?.awarded_by_name ?? '',
        row.marks?.comment ?? '',
      ]
        .map(csvCell)
        .join(','),
    )
    const blob = new Blob([[header.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `omnimath-submissions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-4">
      <div className={cn(cardClass(), 'flex flex-wrap items-center gap-3')}>
        <div className="relative min-w-56 flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className={cn(inputClass, 'pl-8')}
            placeholder="Search student, email or challenge…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {isAdmin ? (
          <select
            className={cn(inputClass, 'w-56')}
            value={schoolFilter}
            onChange={(event) => setSchoolFilter(event.target.value)}
          >
            <option value="">All schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="button" onClick={load} className={btnGhost}>
          <RefreshCw size={14} /> Refresh
        </button>
        {isAdmin ? (
          <button type="button" onClick={exportCsv} className={btnGhost}>
            <Download size={14} /> CSV
          </button>
        ) : null}
        {rows ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            {filtered.length} shown · {marked} marked · avg {average}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <AnimatePresence initial={false}>
        {selected ? (
          <SubmissionDetail
            client={client}
            profile={profile}
            submission={selected}
            onClose={() => setSelected(null)}
            onSaved={(mark) => {
              setRows((current) =>
                (current ?? []).map((row) =>
                  row.id === selected.id ? { ...row, marks: mark } : row,
                ),
              )
              setSelected({ ...selected, marks: mark })
            }}
          />
        ) : null}
      </AnimatePresence>

      <div className={cn(cardClass(), 'overflow-x-auto p-0')}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3">Yr</th>
              <th className="px-4 py-3">Ch</th>
              <th className="px-4 py-3">Work</th>
              <th className="px-4 py-3">Mark</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <Loader2 size={18} className="mx-auto animate-spin text-navy/50" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  No submissions{schoolFilter ? ' for this school' : ''} yet.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className="cursor-pointer border-b border-line/60 transition last:border-0 hover:bg-sun/10"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                    {fmtDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{row.student_name}</span>
                    <span className="block text-xs text-ink-faint">{row.email}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{row.school ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.year_level}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink">
                    {String(row.challenge_number).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    {row.file_path ? (
                      <span className="inline-flex items-center gap-1 text-navy">
                        <FileText size={13} /> File
                      </span>
                    ) : row.work_link ? (
                      <span className="inline-flex items-center gap-1 text-navy">
                        <ExternalLink size={13} /> Link
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.marks ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/15 px-2.5 py-0.5 font-mono text-xs text-[#256b1d]">
                        <Check size={12} /> {row.marks.score}/10
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-ink-faint">unmarked</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SubmissionDetail({
  client,
  profile,
  submission,
  onClose,
  onSaved,
}: {
  client: SupabaseClient
  profile: StaffProfile
  submission: Submission
  onClose: () => void
  onSaved: (mark: Mark) => void
}) {
  const [score, setScore] = useState<string>(submission.marks ? String(submission.marks.score) : '')
  const [comment, setComment] = useState(submission.marks?.comment ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileBusy, setFileBusy] = useState(false)

  useDocumentTitle('Omnimath · Mark submission')

  useEffect(() => {
    setScore(submission.marks ? String(submission.marks.score) : '')
    setComment(submission.marks?.comment ?? '')
    setError('')
  }, [submission])

  const openFile = async () => {
    if (!submission.file_path) return
    setFileBusy(true)
    const { data } = await client.storage
      .from('submissions')
      .createSignedUrl(submission.file_path, 300)
    setFileBusy(false)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
    else setError('The file could not be opened. It may still be uploading.')
  }

  const save = async () => {
    const value = Number(score)
    if (!Number.isInteger(value) || value < 0 || value > 10) {
      setError('The mark must be a whole number from 0 to 10.')
      return
    }
    setBusy(true)
    setError('')
    const payload = {
      submission_id: submission.id,
      score: value,
      comment: comment.trim() ? comment.trim().slice(0, 2000) : null,
      awarded_by: profile.id,
      awarded_by_name: profile.name,
    }
    const { data, error } = await client
      .from('marks')
      .upsert(payload, { onConflict: 'submission_id' })
      .select('score, comment, awarded_by_name, updated_at')
      .single()
    setBusy(false)
    if (error || !data) {
      setError('The mark could not be saved. Check the score and try again.')
      return
    }
    onSaved(data as Mark)
  }

  const reduced = useReducedMotion()

  return (
    <motion.section
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(cardClass(), 'border-navy/30')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint transition hover:text-navy"
          >
            <ChevronLeft size={13} /> Back to list
          </button>
          <h2 className="mt-2 font-display text-2xl">{submission.student_name}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {submission.email} · Year {submission.year_level} · Challenge{' '}
            {String(submission.challenge_number).padStart(2, '0')}
            {submission.school ? ` · ${submission.school}` : ''}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Received {fmtDate(submission.created_at)} ·{' '}
            {submission.status === 'pending' ? 'file upload pending' : 'complete'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {submission.file_path ? (
            <button type="button" onClick={openFile} disabled={fileBusy} className={btnGhost}>
              {fileBusy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Open file
            </button>
          ) : null}
          {submission.work_link ? (
            <a
              href={submission.work_link}
              target="_blank"
              rel="noreferrer noopener"
              className={btnGhost}
            >
              <ExternalLink size={14} /> Open link
            </a>
          ) : null}
        </div>
      </div>

      {submission.notes ? (
        <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm text-ink-soft">
          {submission.notes}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-[120px_1fr_auto] sm:items-end">
        <div>
          <label
            className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint"
            htmlFor="mark-score"
          >
            Mark / 10
          </label>
          <input
            id="mark-score"
            type="number"
            min={0}
            max={10}
            step={1}
            className={cn(inputClass, 'mt-1.5 font-mono')}
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
        </div>
        <div>
          <label
            className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint"
            htmlFor="mark-comment"
          >
            Comment (optional)
          </label>
          <input
            id="mark-comment"
            className={cn(inputClass, 'mt-1.5')}
            placeholder="Feedback for the student…"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
        <button type="button" onClick={save} disabled={busy} className={btnPrimary}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save mark
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {submission.marks ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          Current mark {submission.marks.score}/10 by {submission.marks.awarded_by_name ?? 'staff'}{' '}
          · updated {fmtDate(submission.marks.updated_at)}
        </p>
      ) : null}
    </motion.section>
  )
}

/* -------------------------------------------------------------------------- */
/* Messages (admin)                                                           */
/* -------------------------------------------------------------------------- */

function MessagesTab({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Contact[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const reduced = useReducedMotion()

  const load = useCallback(async () => {
    setError('')
    setRows(null)
    const { data, error } = await client
      .from('contact_messages')
      .select('id, created_at, name, email, topic, school, role, message')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) {
      setError('Messages could not be loaded.')
      setRows([])
      return
    }
    setRows((data ?? []) as Contact[])
  }, [client])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="grid gap-4">
      <div className={cn(cardClass(), 'flex items-center justify-between')}>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {rows ? `${rows.length} messages` : 'Loading…'}
        </span>
        <button type="button" onClick={load} className={btnGhost}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-leaf/15 px-4 py-3 font-mono text-sm text-[#256b1d]">
          {notice}
        </p>
      ) : null}
      <div className="grid gap-3">
        {rows === null ? (
          <div className={cardClass()}>
            <Loader2 size={18} className="mx-auto animate-spin text-navy/50" />
          </div>
        ) : rows.length === 0 ? (
          <div className={cn(cardClass(), 'text-center text-sm text-ink-soft')}>
            <Mail size={18} className="mx-auto mb-2 text-navy/40" />
            No messages yet.
          </div>
        ) : (
          rows.map((row, index) => (
            <motion.article
              key={row.id}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: Math.min(index * 0.05, 0.4),
                ease: [0.16, 1, 0.3, 1],
              }}
              className={cardClass()}
            >
              {/coordinator|school/i.test(row.topic) ? (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sun/15 px-3 py-2">
                  <p className="text-xs text-[#7a5c00]">
                    They want coordinator access — point them at the registration page.
                  </p>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={async () => {
                      const base = `${window.location.origin}${window.location.pathname.replace(/\/admin\/?$/, '')}/register`
                      await navigator.clipboard.writeText(
                        `Register your coordinator account here: ${base} — with an invite code it is instant, otherwise it waits for our approval.`,
                      )
                      setNotice('Registration reply copied; paste it into an email.')
                    }}
                  >
                    <Copy size={13} /> Copy reply
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-ink">
                  {row.name}{' '}
                  <span className="text-sm font-normal text-ink-faint">
                    · {row.topic}
                    {row.school ? ` · ${row.school}` : ''}
                  </span>
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                  {fmtDate(row.created_at)}
                </span>
              </div>
              <a
                href={`mailto:${row.email}`}
                className="mt-1 inline-block text-sm text-navy underline-offset-2 hover:underline"
              >
                {row.email}
              </a>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{row.message}</p>
            </motion.article>
          ))
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Schools & coordinators (admin)                                             */
/* -------------------------------------------------------------------------- */

function OrgTab({ client, user }: { client: SupabaseClient; user: User }) {
  const [schools, setSchools] = useState<School[] | null>(null)
  const [staff, setStaff] = useState<StaffRow[] | null>(null)
  const [applications, setApplications] = useState<ApplicationRow[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [coordinator, setCoordinator] = useState({
    name: '',
    email: '',
    school: '',
    password: randomPassword(),
  })
  const [busy, setBusy] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [invite, setInvite] = useState<{ code: string; school: string } | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)

  const load = useCallback(async () => {
    setError('')
    const [schoolsResult, staffResult, applicationsResult] = await Promise.all([
      client.from('schools').select('id, name').order('name'),
      client
        .from('staff')
        .select('id, email, name, role, school_id, schools(name)')
        .order('created_at', { ascending: true }),
      client
        .from('staff_applications')
        .select('id, email, name, message, created_at, school_name')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
    ])
    if (schoolsResult.error || staffResult.error) {
      setError('The organisation could not be loaded. Refresh to try again.')
      return
    }
    setSchools((schoolsResult.data ?? []) as School[])
    setStaff(
      (staffResult.data ?? []).map((row) => ({ ...row, schools: row.schools ?? null }) as unknown as StaffRow),
    )
    if (!applicationsResult.error) {
      setApplications((applicationsResult.data ?? []) as ApplicationRow[])
    }
  }, [client])

  useEffect(() => {
    load()
  }, [load])

  const addCoordinator = async () => {
    const name = coordinator.name.trim()
    const email = coordinator.email.trim()
    if (!name || !email || !coordinator.school.trim()) {
      setError('Fill in the coordinator name, email and school.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const result = await callStaffFunction(client, {
      action: 'create_coordinator',
      name,
      email,
      password: coordinator.password,
      schoolName: coordinator.school.trim(),
    })
    setBusy(false)
    if (!result.ok) {
      setError(
        result.error === 'email_taken'
          ? 'That email is already registered — approve their application instead, or reset the password below.'
          : result.error === 'school'
            ? 'Fill in the school name; new schools are registered automatically.'
            : 'The coordinator could not be created. Check the details and try again.',
      )
      return
    }
    setCoordinator({ name: '', email: '', school: '', password: randomPassword() })
    setNotice(
      `Coordinator ${name} created for ${coordinator.school.trim()}. Share the password with them securely.`,
    )
    load()
  }

  const deleteSchool = async (school: School) => {
    const staffCount = (staff ?? []).filter((row) => row.school_id === school.id).length
    const warning = staffCount
      ? `Delete ${school.name}? This also removes its ${staffCount} coordinator account${
          staffCount === 1 ? '' : 's'
        } and unlinks its submissions. This cannot be undone.`
      : `Delete ${school.name}? Its submissions lose their school link. This cannot be undone.`
    if (!window.confirm(warning)) return
    setBusy(true)
    setError('')
    setNotice('')
    const { error } = await client.from('schools').delete().eq('id', school.id)
    setBusy(false)
    if (error) {
      setError('The school could not be deleted.')
      return
    }
    setNotice(`Deleted ${school.name}.`)
    load()
  }

  const createInvite = async () => {
    const school = coordinator.school.trim()
    if (!school) {
      setError('Type the school for the invite first — it can be a new one.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const result = await callStaffFunction(client, {
      action: 'create_invite',
      schoolName: school,
    })
    setBusy(false)
    if (!result.ok || typeof result.data?.code !== 'string') {
      setError('The invite code could not be created.')
      return
    }
    setInvite({ code: result.data.code, school })
  }

  const resetPassword = async (row: StaffRow) => {
    const password = randomPassword()
    if (
      !window.confirm(
        `Generate a new password for ${row.name}? The old one stops working immediately.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const result = await callStaffFunction(client, {
      action: 'set_password',
      userId: row.id,
      password,
    })
    setBusy(false)
    if (!result.ok) {
      setError('The password could not be reset.')
      return
    }
    setNotice(`New password for ${row.name}: ${password}`)
  }

  const deleteStaff = async (row: StaffRow) => {
    if (!window.confirm(`Remove ${row.name} (${row.email})? Their access stops immediately.`)) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const result = await callStaffFunction(client, {
      action: 'delete_staff',
      userId: row.id,
    })
    setBusy(false)
    if (!result.ok) {
      setError('The account could not be removed.')
      return
    }
    setNotice(`Removed ${row.name}.`)
    load()
  }

  const copyInvite = async () => {
    if (!invite) return
    await navigator.clipboard.writeText(invite.code)
    setInviteCopied(true)
    window.setTimeout(() => setInviteCopied(false), 1200)
  }

  const approve = async (row: ApplicationRow) => {
    if (!window.confirm(`Approve ${row.name} (${row.email}) as coordinator of ${row.school_name}?`)) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const result = await callStaffFunction(client, {
      action: 'approve_application',
      applicationId: row.id,
    })
    setBusy(false)
    if (!result.ok) {
      setError('The application could not be approved.')
      return
    }
    setNotice(
      result.data?.notified
        ? `Approved ${row.name}; an email has been sent.`
        : `Approved ${row.name}. No mail service is configured yet, so let them know they can sign in now.`,
    )
    load()
  }

  const reject = async (row: ApplicationRow) => {
    if (
      !window.confirm(
        `Decline ${row.name} (${row.email})? Their account is deleted and the email can register again.`,
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const result = await callStaffFunction(client, {
      action: 'reject_application',
      applicationId: row.id,
    })
    setBusy(false)
    if (!result.ok) {
      setError('The application could not be declined.')
      return
    }
    setNotice(`Declined ${row.name}.`)
    load()
  }

  const changeOwnPassword = async () => {
    const password = window.prompt('Choose a new password (10+ characters)') ?? ''
    if (password.length < 10) {
      if (password) setError('Passwords need at least 10 characters.')
      return
    }
    setBusy(true)
    const { error } = await client.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      setError('The password could not be changed.')
      return
    }
    setNotice('Your password has been changed.')
  }

  const copyPassword = async () => {
    if (!passwordRef.current) return
    await navigator.clipboard.writeText(passwordRef.current.value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-leaf/15 px-4 py-3 font-mono text-sm text-[#256b1d] lg:col-span-2">
          {notice}
        </p>
      ) : null}

      <section className={cardClass()}>
        <h2 className="font-display text-xl">Schools</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Schools appear automatically as coordinators register or are created
          here — there is nothing to maintain by hand. Deleting one removes its
          coordinator accounts and unlinks its submissions.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {schools === null ? (
            <li className="py-4">
              <Loader2 size={16} className="animate-spin text-navy/50" />
            </li>
          ) : schools.length === 0 ? (
            <li className="py-4 text-sm text-ink-soft">
              No schools yet — they show up when the first coordinator joins.
            </li>
          ) : (
            schools.map((school) => (
              <li key={school.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-ink">{school.name}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-ink-faint">
                    {(staff ?? []).filter((row) => row.school_id === school.id).length} staff
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteSchool(school)}
                    className={btnGhost}
                    title="Delete school"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className={cardClass()}>
        <h2 className="font-display text-xl">Add a coordinator</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Coordinators sign in at this same address and mark their school's submissions.
        </p>
        <div className="mt-4 grid gap-3">
          <input
            className={inputClass}
            placeholder="Coordinator name"
            value={coordinator.name}
            onChange={(event) =>
              setCoordinator((state) => ({ ...state, name: event.target.value }))
            }
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={coordinator.email}
            onChange={(event) =>
              setCoordinator((state) => ({ ...state, email: event.target.value }))
            }
          />
          <input
            className={cn(inputClass, 'mt-1.5')}
            placeholder="School (typed; new schools register themselves)"
            list="org-school-list"
            value={coordinator.school}
            onChange={(event) =>
              setCoordinator((state) => ({ ...state, school: event.target.value }))
            }
          />
          <datalist id="org-school-list">
            {(schools ?? []).map((school) => (
              <option key={school.id} value={school.name} />
            ))}
          </datalist>
          <div className="flex gap-2">
            <input
              ref={passwordRef}
              className={cn(inputClass, 'font-mono')}
              value={coordinator.password}
              onChange={(event) =>
                setCoordinator((state) => ({ ...state, password: event.target.value }))
              }
              placeholder="Password (10+ characters)"
            />
            <button type="button" onClick={copyPassword} className={btnGhost} title="Copy">
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <button type="button" onClick={addCoordinator} disabled={busy} className={btnPrimary}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create coordinator
          </button>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Or let them register themselves</p>
          <p className="mt-1 text-sm text-ink-soft">
            Generate an invite code for the chosen school; the coordinator uses it
            on the public register page for instant access.
          </p>
          <button
            type="button"
            onClick={createInvite}
            disabled={busy || !coordinator.school.trim()}
            className={cn(btnGhost, 'mt-3')}
          >
            <Ticket size={14} /> Create invite code
          </button>
          {invite ? (
            <div className="mt-3 rounded-xl bg-sun/15 px-4 py-3">
              <p className="text-xs text-[#7a5c00]">
                {invite.school} · code valid for 14 days, one use. Activate it at
              </p>
              <p className="mt-0.5 font-mono text-xs text-ink">
                nb-group.github.io/omnimath/register
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="font-mono text-base tracking-[0.18em] text-ink">
                  {invite.code}
                </code>
                <button type="button" onClick={copyInvite} className={btnGhost} title="Copy code">
                  {inviteCopied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={changeOwnPassword}
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-navy underline-offset-2 hover:underline"
        >
          <KeyRound size={13} /> Change my password ({user.email})
        </button>
      </section>

      <section className={cardClass()}>
        <h2 className="font-display text-xl">Registration applications</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Self-registered coordinators from the public register page. Approving
          gives their existing account access; declining deletes it.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {applications === null ? (
            <li className="py-4">
              <Loader2 size={16} className="animate-spin text-navy/50" />
            </li>
          ) : applications.length === 0 ? (
            <li className="py-4 text-sm text-ink-soft">No applications waiting.</li>
          ) : (
            applications.map((row) => (
              <li key={row.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-ink">{row.name}</span>
                    <span className="block text-xs text-ink-faint">
                      {row.email} · {row.school_name} · {fmtDate(row.created_at)}
                    </span>
                    {row.message ? (
                      <p className="mt-1 max-w-sm text-xs text-ink-soft">“{row.message}”</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => approve(row)}
                      className={btnGhost}
                      title="Approve"
                    >
                      <BadgeCheck size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(row)}
                      className={btnGhost}
                      title="Decline"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className={cn(cardClass(), 'lg:col-span-2 overflow-x-auto p-0')}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">School</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff === null ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <Loader2 size={18} className="mx-auto animate-spin text-navy/50" />
                </td>
              </tr>
            ) : (
              staff.map((row) => (
                <tr key={row.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{row.name}</span>
                    <span className="block text-xs text-ink-faint">{row.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide',
                        row.role === 'admin'
                          ? 'bg-sun/25 text-[#7a5c00]'
                          : 'bg-navy/10 text-navy',
                      )}
                    >
                      {row.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {row.role === 'admin' ? 'All schools' : (row.schools?.name ?? '—')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => resetPassword(row)}
                        className={btnGhost}
                        title="Reset password"
                      >
                        <KeyRound size={13} />
                      </button>
                      {row.id !== user.id ? (
                        <button
                          type="button"
                          onClick={() => deleteStaff(row)}
                          className={btnGhost}
                          title="Remove account"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
