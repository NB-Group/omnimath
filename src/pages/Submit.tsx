import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Check,
  FileCheck2,
  Loader2,
  Lock,
  Paperclip,
  Send,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { PageIntro, Reveal, Eyebrow } from '../components/ui'
import { getSupabase, submitWork, type WorkPayload, type WorkResult } from '../lib/supabase'
import { yearChallengeRanges, type YearLevel } from '../lib/site'
import { worlds } from '../data/worlds'
import { cn } from '../lib/utils'
import { Turnstile } from '../components/Turnstile'
import { turnstileEnabled } from '../lib/turnstile'
import { usePageMeta } from '../lib/usePageMeta'

const inputClass =
  'h-12 w-full rounded-xl border border-line bg-[#fffdf7] px-3.5 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-faint/80 focus:border-navy focus:ring-2 focus:ring-navy/15'

const guide = [
  'Name files clearly, e.g. Ari_Challenge04.pdf.',
  'Submit one challenge per form — it keeps marking tidy.',
  'Include your working, research and any evidence you have.',
  'School students should hand work to their coordinator first; use this form for scans or independent entry.',
]

export function Submit() {
  usePageMeta("Online Submission", "Submit completed Omnimath challenge work online as an independent student.")
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [year, setYear] = useState<number | ''>('')
  const [challenge, setChallenge] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<WorkResult | null>(null)
  const [failure, setFailure] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)
  const [schools, setSchools] = useState<{ id: string; name: string }[] | null>(null)
  const [schoolId, setSchoolId] = useState('')

  useEffect(() => {
    let cancelled = false
    getSupabase().then((client) => {
      if (!client || cancelled) return
      client
        .from('schools')
        .select('id, name')
        .order('name')
        .then(({ data }) => {
          if (!cancelled) setSchools((data ?? []) as { id: string; name: string }[])
        })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const challengeOptions = useMemo(() => {
    if (!year) return Array.from({ length: 15 }, (_, index) => index + 1)
    const range = yearChallengeRanges[year as YearLevel]
    return Array.from({ length: range.to - range.from + 1 }, (_, index) => range.from + index)
  }, [year])

  const pickFile = (next: File | null) => {
    if (!next) {
      setFile(null)
      return
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    const allowedExtension = /\.(pdf|jpe?g|png)$/i.test(next.name)
    if (!allowed.includes(next.type) && !allowedExtension) {
      setErrors((current) => ({ ...current, file: 'Please choose a PDF, JPG or PNG.' }))
      return
    }
    if (next.size > 10 * 1024 * 1024) {
      setErrors((current) => ({ ...current, file: 'That file is larger than 10 MB.' }))
      return
    }
    setErrors((current) => {
      const rest = { ...current }
      delete rest.file
      return rest
    })
    setFile(next)
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    const payload: WorkPayload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      year: Number(year),
      school: String(data.get('school') ?? ''),
      schoolId: schoolId && schoolId !== 'other' ? schoolId : '',
      challenge: Number(challenge),
      link: String(data.get('link') ?? ''),
      notes: String(data.get('notes') ?? ''),
      file,
      turnstileToken: token ?? undefined,
    }

    const next: Record<string, string> = {}
    if (payload.name.trim().length < 2) next.name = 'Please enter the student’s name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
      next.email = 'Please enter a valid email address.'
    }
    if (!year) next.year = 'Choose a year level.'
    if (!challenge) next.challenge = 'Choose a challenge.'
    if (!payload.file && !payload.link?.trim()) {
      next.file = 'Attach a file or add a link to your work.'
    }
    if (turnstileEnabled && !payload.turnstileToken) {
      next.turnstile = 'Please complete the quick verification below.'
    }

    setErrors(next)
    if (Object.keys(next).length > 0) return

    setStatus('submitting')
    setFailure('')
    const outcome = await submitWork(payload)
    setToken(null)
    setResetSignal((value) => value + 1)
    setResult(outcome)
    if (!outcome.ok) {
      setFailure(outcome.message)
      setStatus('error')
      return
    }
    setStatus('success')
  }

  const reset = () => {
    formRef.current?.reset()
    setYear('')
    setChallenge('')
    setSchoolId('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
    setResult(null)
    setErrors({})
    setToken(null)
    setResetSignal((value) => value + 1)
    setStatus('idle')
  }

  if (status === 'success' && result?.ok) {
    const offline = !result.delivered
    return (
      <>
        <PageIntro
          eyebrow="Online submission"
          title={
            offline ? (
              <>
                Almost <em>there.</em>
              </>
            ) : (
              <>
                Work <em>received.</em>
              </>
            )
          }
          lead={
            offline
              ? 'One more step: send the same submission by email, with your file attached.'
              : 'Thank you — that is one more challenge explored.'
          }
        />
        <section className="py-16 md:py-24">
          <div className="container-x max-w-2xl">
            <div className="rounded-3xl border border-line-soft bg-[#fffdf7] p-7 md:p-10">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-leaf/15 text-leaf-deep">
                  <Check size={26} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-[2rem] leading-none text-ink">
                    {offline ? 'One more step.' : 'Submission logged.'}
                  </h2>
                  <p className="mt-1.5 text-[13px] text-ink-soft">
                    {offline
                      ? 'Our online inbox is unavailable right now, so please send the same submission by email.'
                      : 'We will confirm receipt by email within a few days.'}
                  </p>
                </div>
              </div>

              {offline && result.mailto ? (
                <div className="mt-7 rounded-2xl border border-line-soft bg-paper p-5">
                  <div className="flex items-start gap-3">
                    <Paperclip size={17} className="mt-0.5 shrink-0 text-navy" aria-hidden="true" />
                    <p className="text-[12.5px] leading-relaxed text-ink-soft">
                      Email cannot attach files automatically. Open the draft, then attach your
                      work before sending.
                    </p>
                  </div>
                  <a href={result.mailto} className="btn btn-primary mt-4">
                    Open email draft
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button type="button" onClick={reset} className="btn btn-ghost">
                  Submit another challenge
                </button>
                <Link to="/" className="link-underline text-[13px] font-semibold text-navy">
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <PageIntro
        eyebrow="Online submission"
        title={
          <>
            Send your work,
            <br />
            from <em>anywhere.</em>
          </>
        }
        lead="Independent students can complete the Challenge and submit their work online. Physical badges are still awarded through school programmes."
      />

      <section className="py-16 md:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <Eyebrow>Before you send</Eyebrow>
            <ul className="mt-6 space-y-4">
              {guide.map((item, index) => (
                <Reveal key={item} delay={index * 0.04}>
                  <li className="flex gap-3.5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-navy/15 bg-[#fffdf7] font-mono text-[9px] text-navy">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[13.5px] leading-relaxed text-ink-soft">{item}</p>
                  </li>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={0.2}>
              <div className="mt-8 rounded-2xl border border-line-soft bg-paper-deep/50 p-5">
                <div className="flex items-center gap-2.5">
                  <Lock size={14} className="text-navy" aria-hidden="true" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                    Privacy
                  </p>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  All information is kept private. Work is only seen by the Omnimath team and is
                  used for marking and recognition.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-line-soft bg-[#fffdf7] p-4">
                <ShieldCheck size={16} className="shrink-0 text-leaf-deep" aria-hidden="true" />
                <p className="text-[11.5px] text-ink-soft">
                  Prefer email? Send to{' '}
                  <a href="mailto:hello@omnimath.co.nz" className="link-underline font-semibold text-navy">
                    hello@omnimath.co.nz
                  </a>
                  .
                </p>
              </div>
            </Reveal>
          </div>

          <form
            ref={formRef}
            onSubmit={onSubmit}
            noValidate
            className="rounded-2xl border border-line-soft bg-[#fffdf7] p-6 md:p-8"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-[1.7rem] leading-none text-ink">Submission form</h2>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                2027 season
              </span>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field label="Student name" error={errors.name} htmlFor="submit-name">
                <input id="submit-name" name="name" autoComplete="name" className={inputClass} placeholder="Full name" />
              </Field>
              <Field label="Email" error={errors.email} htmlFor="submit-email">
                <input
                  id="submit-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Year level" error={errors.year} htmlFor="submit-year">
                <select
                  id="submit-year"
                  className={inputClass}
                  value={year}
                  onChange={(event) => {
                    const value = event.target.value ? Number(event.target.value) : ''
                    setYear(value)
                    if (value && challenge) {
                      const range = yearChallengeRanges[value as YearLevel]
                      if (challenge < range.from || challenge > range.to) setChallenge('')
                    }
                  }}
                >
                  <option value="">Choose a year</option>
                  {[5, 6, 7, 8].map((value) => (
                    <option key={value} value={value}>
                      Year {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="School (optional)" htmlFor="submit-school">
                {schools && schools.length > 0 ? (
                  <>
                    {schoolId === 'other' ? (
                      <input
                        id="submit-school"
                        name="school"
                        autoComplete="organization"
                        className={inputClass}
                        placeholder="Type your school's name"
                      />
                    ) : (
                      <select
                        id="submit-school"
                        className={inputClass}
                        value={schoolId}
                        onChange={(event) => setSchoolId(event.target.value)}
                      >
                        <option value="">Choose a school</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                        <option value="other">My school is not listed…</option>
                      </select>
                    )}
                    {schoolId === 'other' ? (
                      <button
                        type="button"
                        onClick={() => setSchoolId('')}
                        className="mt-1.5 text-left text-xs text-navy underline-offset-2 hover:underline"
                      >
                        ← Back to the school list
                      </button>
                    ) : null}
                  </>
                ) : (
                  <input
                    id="submit-school"
                    name="school"
                    autoComplete="organization"
                    className={inputClass}
                    placeholder="School name"
                  />
                )}
              </Field>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field label="Challenge" error={errors.challenge} htmlFor="submit-challenge">
                <select
                  id="submit-challenge"
                  className={inputClass}
                  value={challenge}
                  onChange={(event) => setChallenge(event.target.value ? Number(event.target.value) : '')}
                >
                  <option value="">Choose a challenge</option>
                  {challengeOptions.map((number) => (
                    <option key={number} value={number}>
                      Challenge {String(number).padStart(2, '0')} · {worlds[(number - 1) % worlds.length].short}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Link to work (optional)" htmlFor="submit-link">
                <input
                  id="submit-link"
                  name="link"
                  className={inputClass}
                  placeholder="Drive, Dropbox or similar"
                />
              </Field>
            </div>

            <div className="mt-5">
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
                Upload work · PDF, JPG or PNG · max 10 MB
              </p>
              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3.5">
                  <FileCheck2 size={18} className="shrink-0 text-leaf-deep" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{file.name}</p>
                    <p className="font-mono text-[9px] text-ink-faint">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      if (fileRef.current) fileRef.current.value = ''
                    }}
                    className="grid h-8 w-8 place-items-center rounded-full border border-line text-ink-faint transition-colors hover:border-red-300 hover:text-red-600"
                    aria-label="Remove file"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="submit-file"
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper/60 px-4 py-7 text-center transition-colors hover:border-navy/40',
                    errors.file && 'border-red-300',
                  )}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-paper-deep text-navy">
                    <Upload size={17} aria-hidden="true" />
                  </span>
                  <span className="mt-2.5 text-[13px] font-medium text-ink">Choose a file</span>
                  <span className="mt-1 text-[11px] text-ink-faint">PDF, JPG or PNG · up to 10 MB</span>
                  <input
                    ref={fileRef}
                    id="submit-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="sr-only"
                    onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              )}
              {errors.file ? (
                <p className="mt-1.5 text-[11px] text-red-600" role="alert">
                  {errors.file}
                </p>
              ) : null}
            </div>

            <div className="mt-5">
              <Field label="Notes (optional)" htmlFor="submit-notes">
                <textarea
                  id="submit-notes"
                  name="notes"
                  rows={4}
                  className={cn(inputClass, 'h-auto min-h-28 resize-y py-3 leading-relaxed')}
                  placeholder="Anything we should know before marking?"
                />
              </Field>
            </div>

            <Turnstile action="submission" onToken={setToken} resetSignal={resetSignal} />
            {errors.turnstile ? (
              <p className="mt-2 text-[11px] text-red-600" role="alert">
                {errors.turnstile}
              </p>
            ) : null}

            {status === 'error' ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
                {failure}
              </p>
            ) : null}

            <div className="mt-7 flex flex-col gap-4 border-t border-line-soft pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn btn-primary disabled:opacity-70"
              >
                {status === 'submitting' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    Submit work
                    <Send size={15} aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="max-w-[16rem] text-[10.5px] leading-relaxed text-ink-faint">
                {turnstileEnabled ? 'Protected by Cloudflare Turnstile. ' : ''}
                By submitting you confirm this is your own work and that it may be marked and
                recognised by Omnimath.
              </p>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string
  error?: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
