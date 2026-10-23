import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, KeyRound, Loader2 } from 'lucide-react'
import { LogoLink } from '../components/Logo'
import { Turnstile } from '../components/Turnstile'
import { cn } from '../lib/utils'
import { getSupabase } from '../lib/supabase'
import { callStaffFunctionAnon } from '../lib/staffClient'

type School = { id: string; name: string }
type Outcome = 'activated' | 'pending'

const cardClass =
  'rounded-2xl border border-line bg-white/85 p-6 shadow-[0_24px_60px_-40px_rgba(6,26,56,0.35)] backdrop-blur'
const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-navy/60 focus:ring-2 focus:ring-navy/15'
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-paper transition hover:bg-navy/90 disabled:opacity-50'

const errors: Record<string, string> = {
  captcha: 'The verification did not pass. Please try again.',
  email_taken:
    'That email is already registered. Ask the competition admin to reset its password if it is yours.',
  pending_exists:
    'An application with this email is already awaiting approval. We will be in touch.',
  school: 'Choose a school from the list.',
  invite: 'That invite code is not valid for this school, or it has expired.',
  weak_password: 'Passwords need at least 10 characters.',
  email: 'That email address does not look right.',
  name: 'Please fill in your name.',
  network: 'The registration could not be sent. Check your connection and try again.',
}

export default function Register() {
  useEffect(() => {
    document.title = 'Omnimath · Coordinator registration'
  }, [])

  const [schools, setSchools] = useState<School[] | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [message, setMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    let cancelled = false
    getSupabase().then(async (client) => {
      if (!client) {
        if (!cancelled) setSchools([])
        return
      }
      const { data } = await client.from('schools').select('id, name').order('name')
      if (!cancelled) setSchools((data as School[] | null) ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!turnstileToken) {
      setError(errors.captcha)
      return
    }
    setBusy(true)
    setError('')
    const result = await callStaffFunctionAnon({
      action: 'apply_staff',
      name: name.trim(),
      email: email.trim(),
      password,
      schoolId,
      code: code.trim() ? code.trim().toUpperCase() : undefined,
      message: message.trim() || undefined,
      turnstileToken,
    })
    setBusy(false)
    if (!result.ok) {
      setError(errors[result.error ?? 'network'] ?? 'The registration could not be completed.')
      setResetSignal((value) => value + 1)
      return
    }
    setOutcome(result.data?.activated ? 'activated' : 'pending')
  }

  if (outcome) {
    return (
      <div className="dot-paper min-h-screen bg-paper px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-xl">
          <LogoLink />
          <div className={cn(cardClass, 'mt-8')}>
            {outcome === 'activated' ? (
              <>
                <CheckCircle2 size={22} className="text-leaf" />
                <h1 className="mt-3 font-display text-2xl">Your account is ready</h1>
                <p className="mt-2 text-sm text-ink-soft">
                  The invite code activated your coordinator account straight away.
                  Sign in with the email and password you just chose.
                </p>
                <Link to="/admin" className={cn(btnPrimary, 'mt-5')}>
                  <KeyRound size={15} /> Go to the staff console
                </Link>
              </>
            ) : (
              <>
                <Clock size={22} className="text-navy/70" />
                <h1 className="mt-3 font-display text-2xl">Application received</h1>
                <p className="mt-2 text-sm text-ink-soft">
                  Your registration is waiting for the competition admin's approval.
                  Keep your email and password; you will sign in at this site's staff
                  console once approved.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dot-paper min-h-screen bg-paper px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <LogoLink />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="display text-4xl sm:text-5xl">Coordinator registration</h1>
            <p className="mt-4 max-w-md text-ink-soft">
              School coordinators mark their own school's submissions. Register with
              an invite code from the competition admin for instant access, or apply
              without one and we will review your application.
            </p>
            <p className="mt-3 max-w-md text-sm text-ink-faint">
              Your school is not listed, or you are not sure who to contact? Write to
              us through the contact page and we will sort it out.
            </p>
          </div>
          <form onSubmit={submit} className={cardClass}>
            <label className="block text-sm font-medium text-ink" htmlFor="reg-code">
              Invite code <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="reg-code"
              className={cn(inputClass, 'mt-1.5 font-mono uppercase tracking-[0.12em]')}
              placeholder="ACDEFGHJKLMNP"
              value={code}
              maxLength={12}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />

            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="reg-name">
              Your name
            </label>
            <input
              id="reg-name"
              required
              className={cn(inputClass, 'mt-1.5')}
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />

            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              className={cn(inputClass, 'mt-1.5')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="reg-password">
              Password <span className="font-normal text-ink-faint">(10+ characters)</span>
            </label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className={cn(inputClass, 'mt-1.5')}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <label className="mt-4 block text-sm font-medium text-ink" htmlFor="reg-school">
              School
            </label>
            <select
              id="reg-school"
              required
              className={cn(inputClass, 'mt-1.5')}
              value={schoolId}
              onChange={(event) => setSchoolId(event.target.value)}
            >
              <option value="">
                {schools === null ? 'Loading schools…' : 'Choose your school…'}
              </option>
              {(schools ?? []).map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>

            {code.trim() ? null : (
              <>
                <label className="mt-4 block text-sm font-medium text-ink" htmlFor="reg-message">
                  A note for the admin <span className="font-normal text-ink-faint">(optional)</span>
                </label>
                <textarea
                  id="reg-message"
                  rows={3}
                  maxLength={1000}
                  className={cn(inputClass, 'mt-1.5 resize-none')}
                  placeholder="Your role at the school helps us approve faster."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </>
            )}

            <Turnstile onToken={setTurnstileToken} action="staff_register" resetSignal={resetSignal} />

            {error ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
            <button type="submit" disabled={busy} className={cn(btnPrimary, 'mt-4 w-full')}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              {code.trim() ? 'Create account' : 'Submit application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
