// Omnimath — Turnstile-verified form endpoint
//
// Deploy with:
//   supabase functions deploy submit --no-verify-jwt
//   supabase secrets set TURNSTILE_SECRET_KEY=...
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Supabase Edge Functions runtime. The service role never leaves this
// function; the browser only ever sees the anon key.
//
// Files are not proxied through this function. After Turnstile verification
// the function creates a short-lived signed upload URL, the browser uploads
// directly to Storage, and a second call marks the row received. This keeps
// large scans away from the function request-size limit.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''
const TURNSTILE_HOSTNAMES = (Deno.env.get('TURNSTILE_HOSTNAMES') ?? '')
  .split(',')
  .map((hostname) => hostname.trim())
  .filter(Boolean)
const RATE_LIMIT_SALT = Deno.env.get('RATE_LIMIT_SALT') ?? ''
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']
const MAX_FILE_BYTES = 10 * 1024 * 1024

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)

type TurnstileResult = {
  success?: boolean
  action?: string
  hostname?: string
}

/**
 * Verify the token, its action, and the hostname it was solved on. The action
 * binds a contact token to the contact form and a submission token to the
 * submission flow; the hostname allowlist rejects tokens minted elsewhere.
 */
async function verifyTurnstile(
  token: string,
  ip: string | null,
  expectedAction: 'contact' | 'submission',
): Promise<boolean> {
  if (!TURNSTILE_SECRET || !token || TURNSTILE_HOSTNAMES.length === 0) return false
  const body = new URLSearchParams()
  body.set('secret', TURNSTILE_SECRET)
  body.set('response', token)
  if (ip) body.set('remoteip', ip)

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return false
    const result = (await response.json()) as TurnstileResult
    return (
      result.success === true &&
      result.action === expectedAction &&
      typeof result.hostname === 'string' &&
      TURNSTILE_HOSTNAMES.includes(result.hostname)
    )
  } catch {
    return false
  }
}

type RateRule = {
  key: string
  limit: number
  windowSeconds: number
}

/** Salted hash so the rate-limit table never stores raw IPs or emails. */
async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${RATE_LIMIT_SALT}:${value}`),
  )
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Fixed-window throttle persisted in Postgres. It works across edge-function
 * instances, unlike an in-memory counter. Any storage failure fails closed.
 */
async function withinRateLimits(
  admin: SupabaseClient,
  rules: RateRule[],
): Promise<'ok' | 'limited' | 'unavailable'> {
  if (!RATE_LIMIT_SALT) return 'unavailable'
  // The buckets are independent rows, so consume them concurrently. A denied
  // bucket still spends the others, which is acceptable for a fixed window.
  const results = await Promise.all(
    rules.map((rule) =>
      admin.rpc('consume_rate_limit', {
        p_bucket: rule.key,
        p_limit: rule.limit,
        p_window_seconds: rule.windowSeconds,
      }),
    ),
  )
  if (results.some((result) => result.error)) return 'unavailable'
  if (results.some((result) => result.data !== true)) return 'limited'
  return 'ok'
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80) || 'work.pdf'
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!TURNSTILE_SECRET) return json({ error: 'captcha_not_configured' }, 500)

  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ error: 'invalid_json' }, 400)
    }
    body = parsed as Record<string, unknown>
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  const kind = clean(body.kind, 40)
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'backend_not_configured' }, 500)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  if (kind === 'contact') {
    const website = clean(body.website, 500)
    if (website) return json({ ok: true })
    if (!(await verifyTurnstile(clean(body.turnstileToken, 4096), ip, 'contact'))) {
      return json({ error: 'captcha_failed' }, 400)
    }

    const name = clean(body.name, 200)
    const email = clean(body.email, 320)
    const topic = clean(body.topic, 120)
    const message = clean(body.message, 6000)
    const school = clean(body.school, 200)
    const role = clean(body.role, 120)

    if (!name || !EMAIL_RE.test(email) || !topic || !message) {
      return json({ error: 'invalid_fields' }, 400)
    }

    const contactEmailHash = await fingerprint(email.toLowerCase())
    const contactIpHash = ip ? await fingerprint(ip) : null
    const contactRules: RateRule[] = [
      { key: `contact:email:short:${contactEmailHash}`, limit: 3, windowSeconds: 600 },
      { key: `contact:email:day:${contactEmailHash}`, limit: 10, windowSeconds: 86400 },
    ]
    if (contactIpHash) {
      contactRules.push(
        { key: `contact:ip:short:${contactIpHash}`, limit: 12, windowSeconds: 600 },
        { key: `contact:ip:day:${contactIpHash}`, limit: 50, windowSeconds: 86400 },
      )
    }
    const contactLimit = await withinRateLimits(admin, contactRules)
    if (contactLimit === 'limited') return json({ error: 'rate_limited' }, 429)
    if (contactLimit === 'unavailable') return json({ error: 'rate_limit_unavailable' }, 503)

    const { error } = await admin.from('contact_messages').insert({
      name,
      email,
      topic,
      school: school || null,
      role: role || null,
      message,
      source: 'website',
    })
    if (error) return json({ error: 'insert_failed' }, 500)
    return json({ ok: true })
  }

  if (kind === 'submission_prepare') {
    const website = clean(body.website, 500)
    if (website) return json({ ok: true, done: true })
    if (!(await verifyTurnstile(clean(body.turnstileToken, 4096), ip, 'submission'))) {
      return json({ error: 'captcha_failed' }, 400)
    }

    const name = clean(body.name, 200)
    const email = clean(body.email, 320)
    const school = clean(body.school, 200)
    const schoolId = clean(body.schoolId, 64)
    const link = clean(body.link, 1000)
    const notes = clean(body.notes, 4000)
    const year = Number(body.year)
    const challenge = Number(body.challenge)

    // schoolId must name a real school; the school column keeps the display
    // name so rows stay readable even without an account link.
    let schoolName: string | null = null
    if (schoolId) {
      if (!UUID_RE.test(schoolId)) return json({ error: 'invalid_fields' }, 400)
      const { data: schoolRow } = await admin
        .from('schools')
        .select('name')
        .eq('id', schoolId)
        .maybeSingle()
      if (!schoolRow) return json({ error: 'invalid_fields' }, 400)
      schoolName = clean(schoolRow.name, 200)
    }

    if (
      !name ||
      !EMAIL_RE.test(email) ||
      !Number.isInteger(year) ||
      year < 5 ||
      year > 8 ||
      !Number.isInteger(challenge) ||
      challenge < 1 ||
      challenge > 15
    ) {
      return json({ error: 'invalid_fields' }, 400)
    }

    const fileInfo = body.file as
      | { name?: unknown; type?: unknown; size?: unknown }
      | null
      | undefined

    let fileName: string | null = null
    let filePath: string | null = null

    if (fileInfo && typeof fileInfo === 'object') {
      const rawName = clean(fileInfo.name, 200)
      const rawType = clean(fileInfo.type, 120)
      const size = Number(fileInfo.size)
      const extension = (rawName.split('.').pop() ?? '').toLowerCase()

      if (!rawName || !Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
        return json({ error: 'invalid_file' }, 400)
      }
      if (!ALLOWED_TYPES.includes(rawType) && !ALLOWED_EXTENSIONS.includes(extension)) {
        return json({ error: 'file_type_not_allowed' }, 400)
      }

      fileName = rawName
      // School-scoped folder: the storage RLS policies let a coordinator read
      // only files whose first folder is their own school id.
      const folder = schoolId || String(year)
      filePath = `${folder}/${crypto.randomUUID()}-${safeFileName(rawName)}`
    }

    if (!filePath && !link) return json({ error: 'file_or_link_required' }, 400)

    const submissionEmailHash = await fingerprint(email.toLowerCase())
    const submissionIpHash = ip ? await fingerprint(ip) : null
    const submissionRules: RateRule[] = [
      { key: `submission:email:short:${submissionEmailHash}`, limit: 5, windowSeconds: 600 },
      { key: `submission:email:day:${submissionEmailHash}`, limit: 20, windowSeconds: 86400 },
    ]
    if (submissionIpHash) {
      submissionRules.push(
        { key: `submission:ip:short:${submissionIpHash}`, limit: 40, windowSeconds: 600 },
        { key: `submission:ip:day:${submissionIpHash}`, limit: 200, windowSeconds: 86400 },
      )
    }
    const submissionLimit = await withinRateLimits(admin, submissionRules)
    if (submissionLimit === 'limited') return json({ error: 'rate_limited' }, 429)
    if (submissionLimit === 'unavailable') return json({ error: 'rate_limit_unavailable' }, 503)

    // A signed upload URL reserves a row. Cap abandoned uploads per email so
    // an attacker cannot fill the private bucket with unused reservations.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: pendingCount, error: pendingError } = await admin
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('email', email)
      .eq('status', 'pending')
      .gte('created_at', dayAgo)
    if (pendingError) return json({ error: 'rate_limit_unavailable' }, 503)
    if ((pendingCount ?? 0) >= 8) return json({ error: 'rate_limited' }, 429)

    const { data: inserted, error: insertError } = await admin
      .from('submissions')
      .insert({
        student_name: name,
        email,
        year_level: year,
        school: schoolName ?? school ?? null,
        school_id: schoolId || null,
        challenge_number: challenge,
        work_link: link || null,
        notes: notes || null,
        file_path: filePath,
        file_name: fileName,
        status: filePath ? 'pending' : 'received',
        source: 'website',
      })
      .select('id')
      .single()

    if (insertError || !inserted) return json({ error: 'insert_failed' }, 500)

    if (!filePath) return json({ ok: true, done: true, id: inserted.id })

    const { data: upload, error: uploadError } = await admin.storage
      .from('submissions')
      .createSignedUploadUrl(filePath)

    if (uploadError || !upload) {
      await admin.from('submissions').delete().eq('id', inserted.id)
      return json({ error: 'upload_init_failed' }, 500)
    }

    return json({
      ok: true,
      id: inserted.id,
      upload: { path: filePath, token: upload.token, signedUrl: upload.signedUrl },
    })
  }

  if (kind === 'submission_confirm') {
    const id = clean(body.id, 40)
    if (!UUID_RE.test(id)) return json({ error: 'invalid_id' }, 400)
    const { error } = await admin
      .from('submissions')
      .update({ status: 'received' })
      .eq('id', id)
      .eq('status', 'pending')
    if (error) return json({ error: 'confirm_failed' }, 500)
    return json({ ok: true })
  }

  if (kind === 'submission_cancel') {
    const id = clean(body.id, 40)
    if (!UUID_RE.test(id)) return json({ error: 'invalid_id' }, 400)
    const { data: row } = await admin
      .from('submissions')
      .select('file_path,status')
      .eq('id', id)
      .maybeSingle()
    if (row?.status === 'pending') {
      if (row.file_path) {
        await admin.storage.from('submissions').remove([row.file_path])
      }
      await admin.from('submissions').delete().eq('id', id)
    }
    return json({ ok: true })
  }

  return json({ error: 'invalid_kind' }, 400)
})
