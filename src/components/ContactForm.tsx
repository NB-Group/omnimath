import { useRef, useState } from 'react'
import { Check, Loader2, Mail, Send } from 'lucide-react'
import { submitMessage, type MessagePayload } from '../lib/supabase'
import { site } from '../lib/site'
import { Turnstile } from './Turnstile'
import { turnstileEnabled } from '../lib/turnstile'
import { cn } from '../lib/utils'

type Variant = 'contact' | 'coordinator'
type Status = 'idle' | 'submitting' | 'success' | 'error'

const topics = [
  'General enquiry',
  'Schools & coordinators',
  'Register a school',
  'Online submission help',
  'Media & partnerships',
]

const roles = ['Teacher', 'Student', 'School staff', 'Parent / whānau', 'Other']

const inputClass =
  'h-12 w-full rounded-xl border border-line bg-[#fffdf7] px-3.5 text-[14px] text-ink outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-ink-faint/80 focus:border-navy focus:ring-2 focus:ring-navy/15'

export function ContactForm({ variant = 'contact', id }: { variant?: Variant; id?: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mailto, setMailto] = useState<string | null>(null)
  const [failure, setFailure] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [resetSignal, setResetSignal] = useState(0)

  const validate = (payload: MessagePayload) => {
    const next: Record<string, string> = {}
    if (payload.name.trim().length < 2) next.name = 'Please tell us your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
      next.email = 'Please enter a valid email address.'
    }
    if (variant === 'coordinator' && !payload.school?.trim()) {
      next.school = 'Which school are you registering?'
    }
    if (payload.message.trim().length < 10) {
      next.message = 'A sentence or two helps us respond properly.'
    }
    if (turnstileEnabled && !payload.turnstileToken) {
      next.turnstile = 'Please complete the quick verification below.'
    }
    return next
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    const payload: MessagePayload = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      school: String(data.get('school') ?? ''),
      role: String(data.get('role') ?? ''),
      topic:
        variant === 'coordinator'
          ? 'Coordinator registration'
          : String(data.get('topic') ?? 'General enquiry'),
      message: String(data.get('message') ?? ''),
      website: String(data.get('website') ?? ''),
      turnstileToken: token ?? undefined,
    }

    const nextErrors = validate(payload)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setStatus('submitting')
    setFailure('')
    const result = await submitMessage(payload)
    setToken(null)
    setResetSignal((value) => value + 1)
    if (!result.ok) {
      setFailure(result.message)
      setStatus('error')
      return
    }
    if (result.delivered) {
      setMailto(null)
    } else {
      setMailto(result.mailto)
    }
    setStatus('success')
  }

  const reset = () => {
    setStatus('idle')
    setMailto(null)
    setErrors({})
    setToken(null)
    setResetSignal((value) => value + 1)
    formRef.current?.reset()
  }

  if (status === 'success') {
    return (
      <div
        id={id}
        className="rounded-2xl border border-line-soft bg-[#fffdf7] p-7 md:p-9"
        aria-live="polite"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf/15 text-leaf-deep">
            <Check size={22} aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-[1.7rem] leading-none text-ink">
              {mailto ? 'One more step.' : 'Message received.'}
            </h3>
            <p className="mt-1.5 text-[13px] text-ink-soft">
              {mailto
                ? 'Our online inbox is unavailable right now. Send the same message as an email and we will pick it up:'
                : 'Thank you. We aim to respond to enquiries within a few days.'}
            </p>
          </div>
        </div>

        {mailto ? (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-line-soft bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 text-[13px] text-ink-soft">
              <Mail size={16} className="text-navy" aria-hidden="true" />
              The draft will open in your email app.
            </div>
            <a href={mailto} className="btn btn-primary !px-4 !py-2.5 text-[12.5px]">
              Open email draft
            </a>
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button type="button" onClick={reset} className="btn btn-ghost !px-4 !py-2.5 text-[12.5px]">
            Send another message
          </button>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
            All information is kept private
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      id={id}
      onSubmit={onSubmit}
      noValidate
      className="rounded-2xl border border-line-soft bg-[#fffdf7] p-6 md:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-[1.6rem] leading-none text-ink">
          {variant === 'coordinator' ? 'Register your school' : 'Send a message'}
        </h3>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
          {variant === 'coordinator' ? 'Coordinator' : 'Enquiry'}
        </span>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={errors.name} htmlFor={`${variant}-name`}>
          <input
            id={`${variant}-name`}
            name="name"
            autoComplete="name"
            className={inputClass}
            placeholder="Jane Smith"
            aria-invalid={Boolean(errors.name)}
          />
        </Field>
        <Field label="Email" error={errors.email} htmlFor={`${variant}-email`}>
          <input
            id={`${variant}-email`}
            name="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            placeholder="jane@school.nz"
            aria-invalid={Boolean(errors.email)}
          />
        </Field>
      </div>

      {variant === 'coordinator' ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-[1.3fr_1fr]">
          <Field label="School" error={errors.school} htmlFor="coordinator-school">
            <input
              id="coordinator-school"
              name="school"
              autoComplete="organization"
              className={inputClass}
              placeholder="School name"
              aria-invalid={Boolean(errors.school)}
            />
          </Field>
          <Field label="Your role" htmlFor="coordinator-role">
            <select id="coordinator-role" name="role" className={inputClass} defaultValue="Teacher">
              {roles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="What is this about?" htmlFor="contact-topic">
            <select id="contact-topic" name="topic" className={inputClass} defaultValue={topics[0]}>
              {topics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </Field>
          <Field label="School (optional)" htmlFor="contact-school">
            <input
              id="contact-school"
              name="school"
              autoComplete="organization"
              className={inputClass}
              placeholder="If relevant"
            />
          </Field>
        </div>
      )}

      <div className="mt-5">
        <Field label="Message" error={errors.message} htmlFor={`${variant}-message`}>
          <textarea
            id={`${variant}-message`}
            name="message"
            rows={5}
            className={cn(inputClass, 'h-auto min-h-32 resize-y py-3 leading-relaxed')}
            placeholder={
              variant === 'coordinator'
                ? 'Tell us about your school and what you would like to run.'
                : 'How can we help?'
            }
            aria-invalid={Boolean(errors.message)}
          />
        </Field>
      </div>

      <Turnstile action="contact" onToken={setToken} resetSignal={resetSignal} />
      {errors.turnstile ? (
        <p className="mt-2 text-[11px] text-red-600" role="alert">
          {errors.turnstile}
        </p>
      ) : null}

      {/* Honeypot — hidden from people, tempting to bots. */}
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="website-field">Website</label>
        <input id="website-field" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {status === 'error' ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
          {failure}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-4 border-t border-line-soft pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={status === 'submitting'} className="btn btn-primary disabled:opacity-70">
          {status === 'submitting' ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Sending…
            </>
          ) : (
            <>
              {variant === 'coordinator' ? 'Register interest' : 'Send message'}
              <Send size={15} aria-hidden="true" />
            </>
          )}
        </button>
        <p className="max-w-[15rem] text-[10.5px] leading-relaxed text-ink-faint">
          {turnstileEnabled ? 'Protected by Cloudflare Turnstile. ' : ''}
          We aim to respond within a few days. You can also email{' '}
          <a
            href={`mailto:${variant === 'coordinator' ? site.emails.schools : site.emails.general}`}
            className="link-underline text-navy"
          >
            {variant === 'coordinator' ? site.emails.schools : site.emails.general}
          </a>
          .
        </p>
      </div>
    </form>
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
