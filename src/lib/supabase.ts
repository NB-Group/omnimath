import type { SupabaseClient } from '@supabase/supabase-js'
import { turnstileEnabled } from './turnstile'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let clientPromise: Promise<SupabaseClient | null> | null = null

/**
 * The Supabase client is loaded on demand so the SDK stays out of the
 * initial bundle. The site is fully usable without a backend: forms fall
 * back to a prefilled email draft.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!url || !anonKey) return null
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, { auth: { persistSession: false } }),
    )
  }
  return clientPromise
}

export type MessagePayload = {
  name: string
  email: string
  topic: string
  school?: string
  role?: string
  message: string
  /** Cloudflare Turnstile token, when verification is enabled. */
  turnstileToken?: string
  /** Honeypot: real people leave this empty. */
  website?: string
}

export type SubmitResult =
  | { ok: true; delivered: true }
  | { ok: true; delivered: false; mailto: string }
  | { ok: false; message: string }

export function buildMailto(payload: MessagePayload): string {
  const to = siteMailbox(payload.topic)
  const subject = encodeURIComponent(`[Omnimath] ${payload.topic} — ${payload.name}`)
  const lines = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Topic: ${payload.topic}`,
    payload.school ? `School: ${payload.school}` : '',
    payload.role ? `Role: ${payload.role}` : '',
    '',
    payload.message,
  ].filter(Boolean)
  return `mailto:${to}?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`
}

function siteMailbox(topic: string): string {
  const schools = /school|coordinat/i.test(topic)
  return schools ? 'schools@omnimath.co.nz' : 'hello@omnimath.co.nz'
}

type FunctionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error?: string; status?: number }

/** Calls the Supabase Edge Function that verifies Turnstile and writes with the service role. */
async function callSubmitFunction(body: BodyInit, headers: Record<string, string> = {}): Promise<FunctionResult> {
  if (!url || !anonKey) return { ok: false, error: 'not_configured' }
  try {
    const response = await fetch(`${url}/functions/v1/submit`, {
      method: 'POST',
      headers: { apikey: anonKey, ...headers },
      body,
    })
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
    if (!response.ok) {
      return {
        ok: false,
        error: typeof data?.error === 'string' ? data.error : undefined,
        status: response.status,
      }
    }
    return { ok: true, data: data ?? {} }
  } catch {
    return { ok: false, error: 'network' }
  }
}

function functionErrorMessage(result: Exclude<FunctionResult, { ok: true }>): string {
  if (result.status === 404) {
    return 'The submission service is not deployed yet. Please email us directly at hello@omnimath.co.nz.'
  }
  if (result.error === 'captcha_failed') {
    return 'The verification expired or failed. Please complete the check again and resubmit.'
  }
  if (result.status === 429 || result.error === 'rate_limited') {
    return 'Too many attempts from this connection. Please wait a few minutes and try again.'
  }
  if (result.error === 'rate_limit_unavailable') {
    return 'The submission service is busy right now. Please try again shortly, or email us directly.'
  }
  return 'We could not send that just now. Please try again, or email us directly at hello@omnimath.co.nz.'
}

export async function submitMessage(payload: MessagePayload): Promise<SubmitResult> {
  if (payload.website) {
    // Silently accept honeypot hits without writing anything.
    return { ok: true, delivered: true }
  }

  const client = await getSupabase()
  // Without a Turnstile key there is no accepted write path (the database
  // only takes the verified function), so fall back to mail straight away.
  if (!client || !turnstileEnabled) {
    return { ok: true, delivered: false, mailto: buildMailto(payload) }
  }

  const contactResult = await callSubmitFunction(
    JSON.stringify({ kind: 'contact', ...payload }),
    { 'Content-Type': 'application/json' },
  )
  if (!contactResult.ok) return { ok: false, message: functionErrorMessage(contactResult) }
  return { ok: true, delivered: true }
}

/* -------------------------------------------------------------------------- */
/* Online challenge submissions                                               */
/* -------------------------------------------------------------------------- */

export type WorkPayload = {
  name: string
  email: string
  year: number
  school?: string
  /** Selected school id, when the student picked a listed school. */
  schoolId?: string
  challenge: number
  link?: string
  notes?: string
  file?: File | null
  /** Cloudflare Turnstile token, when verification is enabled. */
  turnstileToken?: string
}

export type WorkResult =
  | { ok: true; delivered: true }
  | { ok: true; delivered: false; mailto: string }
  | { ok: false; message: string }

export function buildWorkMailto(payload: WorkPayload): string {
  const subject = encodeURIComponent(
    `[Omnimath] Submission — ${payload.name} — Challenge ${String(payload.challenge).padStart(2, '0')}`,
  )
  const lines = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Year level: ${payload.year}`,
    payload.school ? `School: ${payload.school}` : '',
    `Challenge: ${String(payload.challenge).padStart(2, '0')}`,
    payload.link ? `Link to work: ${payload.link}` : '',
    '',
    'Notes:',
    payload.notes || '(none)',
    '',
    'Please attach your work to this email before sending.',
  ].filter(Boolean)
  return `mailto:hello@omnimath.co.nz?subject=${subject}&body=${encodeURIComponent(lines.join('\n'))}`
}

export async function submitWork(payload: WorkPayload): Promise<WorkResult> {
  const client = await getSupabase()
  // No Turnstile key means no accepted write path (the database only takes
  // the verified function), so hand the student a mail draft instead.
  if (!client || !turnstileEnabled) {
    return { ok: true, delivered: false, mailto: buildWorkMailto(payload) }
  }

  if (payload.file && payload.file.size > 10 * 1024 * 1024) {
    return { ok: false, message: 'That file is larger than 10 MB. Please compress it or share a link instead.' }
  }

  // 1. Verify Turnstile and reserve a row + signed upload URL.
  const prepare = await callSubmitFunction(
      JSON.stringify({
        kind: 'submission_prepare',
        name: payload.name,
        email: payload.email,
        year: payload.year,
        challenge: payload.challenge,
        school: payload.school ?? '',
        schoolId: payload.schoolId ?? '',
        link: payload.link ?? '',
        notes: payload.notes ?? '',
        turnstileToken: payload.turnstileToken ?? '',
        file: payload.file
          ? { name: payload.file.name, type: payload.file.type, size: payload.file.size }
          : null,
      }),
      { 'Content-Type': 'application/json' },
    )
    if (!prepare.ok) return { ok: false, message: functionErrorMessage(prepare) }

    const prepared = prepare.data as {
      id?: string
      done?: boolean
      upload?: { path: string; token: string }
    }
    if (prepared.done || !prepared.upload) return { ok: true, delivered: true }

    // 2. Upload the file directly to Storage with the short-lived token.
    if (!payload.file || !prepared.id) {
      return { ok: false, message: 'That submission could not be prepared. Please try again.' }
    }

    const { error: uploadError } = await client.storage
      .from('submissions')
      .uploadToSignedUrl(prepared.upload.path, prepared.upload.token, payload.file, {
        contentType: payload.file.type || 'application/octet-stream',
      })

    if (uploadError) {
      await callSubmitFunction(
        JSON.stringify({ kind: 'submission_cancel', id: prepared.id }),
        { 'Content-Type': 'application/json' },
      )
      return {
        ok: false,
        message:
          'We could not upload that file. Please try again, or email hello@omnimath.co.nz with your work attached.',
      }
    }

    // 3. Mark the row received. If this call fails the file is still in
    //    Storage and the row remains visible as pending to the team.
    await callSubmitFunction(
      JSON.stringify({ kind: 'submission_confirm', id: prepared.id }),
      { 'Content-Type': 'application/json' },
    )
    return { ok: true, delivered: true }
}
