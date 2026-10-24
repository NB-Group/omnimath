import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BadgeCheck, CheckCircle2, Clock, KeyRound, Loader2, Ticket, X } from 'lucide-react'
import { LogoLink } from '../components/Logo'
import { Turnstile } from '../components/Turnstile'
import { cn } from '../lib/utils'
import { getSupabase } from '../lib/supabase'
import { callStaffFunctionAnon } from '../lib/staffClient'

type School = { id: string; name: string }
type Mode = 'apply' | 'invite'
type Outcome = 'activated' | 'pending'

const cardClass =
  'rounded-2xl border border-line bg-white/85 p-6 shadow-[0_24px_60px_-40px_rgba(6,26,56,0.35)] backdrop-blur'
const inputClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-navy/60 focus:ring-2 focus:ring-navy/15'
const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-paper transition hover:bg-navy/90 disabled:opacity-50'
const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink transition hover:border-navy/40 disabled:opacity-50'

const errors: Record<string, string> = {
  captcha: 'The verification did not pass. Please try again.',
  email_taken:
    'That email is already registered. Ask the competition admin to reset its password if it is yours.',
  pending_exists:
    'An application with this email is already awaiting approval. We will be in touch.',
  school: "Fill in your school's name.",
  invite: 'That invite code is not valid, or it has expired.',
  weak_password: 'Passwords need at least 10 characters.',
  email: 'That email address does not look right.',
  name: 'Please fill in your name.',
  network: 'The registration could not be sent. Check your connection and try again.',
}

const ease = [0.16, 1, 0.3, 1] as const

export default function Register() {
  const reduced = useReducedMotion()
  const enter = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease },
        }

  useEffect(() => {
    document.title = 'Omnimath · Coordinator registration'
  }, [])

  const [mode, setMode] = useState<Mode>('apply')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  // Shared account fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Apply-mode fields
  const [schools, setSchools] = useState<School[] | null>(null)
  const [schoolName, setSchoolName] = useState('')
  const [message, setMessage] = useState('')

  // Invite-mode fields
  const [code, setCode] = useState('')
  const [codeCheck, setCodeCheck] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [codeSchool, setCodeSchool] = useState('')

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

  const checkCode = async () => {
    const value = code.trim().toUpperCase()
    if (value.length !== 12 || codeCheck === 'checking') return
    setCodeCheck('checking')
    setError('')
    const result = await callStaffFunctionAnon({ action: 'check_invite', code: value })
    if (result.ok && typeof result.data?.school === 'string') {
      setCodeSchool(result.data.school)
      setCodeCheck('valid')
    } else {
      setCodeSchool('')
      setCodeCheck('invalid')
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (mode === 'invite' && codeCheck !== 'valid') {
      setError(errors.invite)
      return
    }
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
      ...(mode === 'invite' ? { code: code.trim().toUpperCase() } : { schoolName: schoolName.trim() }),
      message: mode === 'apply' && message.trim() ? message.trim() : undefined,
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
          <motion.div
            {...(reduced ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } })}
            transition={{ duration: 0.55, ease }}
            className={cn(cardClass, 'mt-8')}
          >
            {outcome === 'activated' ? (
              <>
                <CheckCircle2 size={22} className="text-leaf" />
                <h1 className="mt-3 font-display text-2xl">Your account is ready</h1>
                <p className="mt-2 text-sm text-ink-soft">
                  The invite code activated your coordinator account straight away.
                  Sign in with the email and password you just chose.
                </p>
              </>
            ) : (
              <>
                <Clock size={22} className="text-navy/70" />
                <h1 className="mt-3 font-display text-2xl">Application received</h1>
                <p className="mt-2 text-sm text-ink-soft">
                  Your registration is waiting for the competition admin's approval.
                  Keep your email and password — you will use them to sign in below
                  once approved.
                </p>
              </>
            )}
            <Link to="/admin" className={cn(btnPrimary, 'mt-5')}>
              <KeyRound size={15} /> Go to the staff console
            </Link>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              Sign-in address · nb-group.github.io/omnimath/admin
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="dot-paper min-h-screen bg-paper px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <LogoLink />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <motion.div {...enter(0)}>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              Coordinator access
            </p>
            <h1 className="display mt-3 text-4xl sm:text-5xl">Coordinator registration</h1>
            <p className="mt-4 max-w-md text-ink-soft">
              School coordinators mark their own school's submissions on this site.
              Apply and we will review your application, or use an invite code from
              the competition admin to start straight away.
            </p>
            <p className="mt-3 max-w-md text-sm text-ink-faint">
              Your school is not in a dropdown anywhere — you type its name, and the
              list of schools grows with real registrations.
            </p>
          </motion.div>

          <motion.div {...enter(0.12)} className={cardClass}>
            {/* Mode switch */}
            <div className="flex gap-1.5 rounded-full bg-paper-deep p-1">
              {(
                [
                  { key: 'apply', label: 'Apply for access' },
                  { key: 'invite', label: 'I have an invite code' },
                ] as { key: Mode; label: string }[]
              ).map((entry) => {
                const active = mode === entry.key
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => {
                      setMode(entry.key)
                      setError('')
                    }}
                    className={cn(
                      'relative flex-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                      active ? 'text-paper' : 'text-ink-soft hover:text-navy',
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="register-mode-pill"
                        className="absolute inset-0 rounded-full bg-navy"
                        transition={{ duration: 0.4, ease }}
                      />
                    ) : null}
                    <span className="relative z-10">{entry.label}</span>
                  </button>
                )
              })}
            </div>

            <form onSubmit={submit} className="mt-5">
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'invite' ? (
                  <motion.div
                    key="invite"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <label className="block text-sm font-medium text-ink" htmlFor="reg-code">
                      Invite code
                    </label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        id="reg-code"
                        className={cn(
                          inputClass,
                          'font-mono uppercase tracking-[0.12em]',
                          codeCheck === 'valid' && 'border-leaf/60',
                          codeCheck === 'invalid' && 'border-red-300',
                        )}
                        placeholder="ACDEFGHJKLMNP"
                        value={code}
                        maxLength={12}
                        onChange={(event) => {
                          setCode(event.target.value.toUpperCase())
                          setCodeCheck('idle')
                        }}
                      />
                      <button
                        type="button"
                        onClick={checkCode}
                        disabled={code.trim().length !== 12 || codeCheck === 'checking'}
                        className={btnGhost}
                      >
                        {codeCheck === 'checking' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Ticket size={14} />
                        )}
                        Check
                      </button>
                    </div>
                    <div className="min-h-6">
                      <AnimatePresence initial={false}>
                        {codeCheck === 'invalid' ? (
                          <motion.p
                            key="bad"
                            initial={reduced ? false : { opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1.5 flex items-center gap-1 text-xs text-red-600"
                          >
                            <X size={13} /> {errors.invite}
                          </motion.p>
                        ) : null}
                        {codeCheck === 'valid' ? (
                          <motion.p
                            key="good"
                            initial={reduced ? false : { opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1.5 flex items-center gap-1 text-xs text-[#256b1d]"
                          >
                            <BadgeCheck size={13} /> Code accepted — coordinator for{' '}
                            <strong>{codeSchool}</strong>
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="apply"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <label className="block text-sm font-medium text-ink" htmlFor="reg-school">
                      Your school
                    </label>
                    <input
                      id="reg-school"
                      required
                      className={cn(inputClass, 'mt-1.5')}
                      placeholder="e.g. Auckland Grammar School"
                      list="reg-school-list"
                      value={schoolName}
                      onChange={(event) => setSchoolName(event.target.value)}
                    />
                    <datalist id="reg-school-list">
                      {(schools ?? []).map((school) => (
                        <option key={school.id} value={school.name} />
                      ))}
                    </datalist>
                    <p className="mt-1 text-xs text-ink-faint">
                      Type the school's full name; new schools are registered on approval.
                    </p>
                    <label className="mt-4 block text-sm font-medium text-ink" htmlFor="reg-message">
                      A note for the admin{' '}
                      <span className="font-normal text-ink-faint">(optional)</span>
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
                  </motion.div>
                )}
              </AnimatePresence>

              {mode === 'invite' && codeCheck !== 'valid' ? (
                <p className="mt-6 rounded-lg bg-paper-deep px-3 py-2.5 text-xs text-ink-soft">
                  Enter the 12-character code from the competition admin and press
                  <strong> Check</strong> — the school on the invite shows up here, then
                  the rest of the form opens.
                </p>
              ) : (
                <motion.div
                  initial={reduced || mode === 'apply' ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.35, ease }}
                  className="overflow-hidden"
                >
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
                </motion.div>
              )}

              {mode === 'invite' && codeCheck !== 'valid' ? null : (
                <>
                  <Turnstile
                    onToken={setTurnstileToken}
                    action="staff_register"
                    resetSignal={resetSignal}
                  />
                  {error ? (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
                  ) : null}
                  <button type="submit" disabled={busy} className={cn(btnPrimary, 'mt-4 w-full')}>
                    {busy ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ArrowRight size={15} />
                    )}
                    {mode === 'invite' ? 'Create account' : 'Submit application'}
                  </button>
                </>
              )}
            </form>

            <p className="mt-5 border-t border-line pt-4 text-center text-xs text-ink-faint">
              Already registered?{' '}
              <Link to="/admin" className="text-navy underline-offset-2 hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
