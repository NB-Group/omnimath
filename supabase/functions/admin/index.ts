// Omnimath — password-gated admin inbox
//
// Deploy with:
//   supabase functions deploy admin --no-verify-jwt
//   supabase secrets set ADMIN_PASSWORD_HASH="<iterations>:<saltHex>:<hashHex>"
//
// The password is never stored in this function: only a PBKDF2 hash in the
// Supabase secret. A successful login creates a random bearer token whose
// SHA-256 is kept in admin_sessions. Data is read with the service role and
// files are exposed only as short-lived signed URLs.

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

const ADMIN_PASSWORD_HASH = Deno.env.get('ADMIN_PASSWORD_HASH') ?? ''
const RATE_LIMIT_SALT = Deno.env.get('RATE_LIMIT_SALT') ?? ''
const SESSION_HOURS = 12
const MAX_ITEMS = 100
const LOGIN_LIMIT = 5
const LOGIN_WINDOW_SECONDS = 10 * 60

const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max)

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return new Uint8Array()
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function verifyPassword(password: string): Promise<boolean> {
  const parts = ADMIN_PASSWORD_HASH.split(':')
  if (parts.length !== 3) return false
  const iterations = Number(parts[0])
  const salt = hexToBytes(parts[1])
  const expected = hexToBytes(parts[2])
  if (!Number.isInteger(iterations) || iterations < 10_000 || !salt.length || !expected.length) {
    return false
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    expected.length * 8,
  )
  return timingSafeEqual(new Uint8Array(bits), expected)
}

async function fingerprint(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${RATE_LIMIT_SALT}:${value}`),
  )
  return bytesToHex(new Uint8Array(digest))
}

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return bytesToHex(new Uint8Array(digest))
}

type RateRule = { key: string; limit: number; windowSeconds: number }

async function withinRateLimits(
  admin: SupabaseClient,
  rules: RateRule[],
): Promise<'ok' | 'limited' | 'unavailable'> {
  if (!RATE_LIMIT_SALT) return 'unavailable'
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

function clientIp(request: Request): string | null {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null
  )
}

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : ''
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!ADMIN_PASSWORD_HASH) return json({ error: 'admin_not_configured' }, 500)
  if (!RATE_LIMIT_SALT) return json({ error: 'rate_limit_not_configured' }, 500)

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'backend_not_configured' }, 500)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const kind = clean(body.kind, 40)
  const ip = clientIp(request)

  if (kind === 'login') {
    const ipHash = ip ? await fingerprint(ip) : await fingerprint('unknown')
    const rules: RateRule[] = [
      { key: `admin:login:${ipHash}`, limit: LOGIN_LIMIT, windowSeconds: LOGIN_WINDOW_SECONDS },
      { key: `admin:login:day:${ipHash}`, limit: 30, windowSeconds: 86400 },
    ]
    const limit = await withinRateLimits(admin, rules)
    if (limit === 'limited') return json({ error: 'rate_limited' }, 429)
    if (limit === 'unavailable') return json({ error: 'rate_limit_unavailable' }, 503)

    const password = clean(body.password, 300)
    if (!password) return json({ error: 'invalid_password' }, 401)
    if (!(await verifyPassword(password))) return json({ error: 'invalid_password' }, 401)

    const token = randomToken()
    const hash = await tokenHash(token)
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString()
    const { error } = await admin.from('admin_sessions').insert({
      token_hash: hash,
      expires_at: expiresAt,
    })
    if (error) return json({ error: 'session_failed' }, 500)

    // Opportunistic cleanup; the table stays tiny for a single-admin site.
    await admin.from('admin_sessions').delete().lt('expires_at', new Date().toISOString())

    return json({ ok: true, token, expiresAt })
  }

  const token = bearerToken(request)
  if (!token) return json({ error: 'unauthorized' }, 401)
  const hash = await tokenHash(token)
  const { data: session, error: sessionError } = await admin
    .from('admin_sessions')
    .select('expires_at')
    .eq('token_hash', hash)
    .maybeSingle()

  if (sessionError) return json({ error: 'session_failed' }, 500)
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    if (session) await admin.from('admin_sessions').delete().eq('token_hash', hash)
    return json({ error: 'unauthorized' }, 401)
  }

  if (kind === 'logout') {
    await admin.from('admin_sessions').delete().eq('token_hash', hash)
    return json({ ok: true })
  }

  if (kind === 'overview') {
    const [contactsResult, submissionsResult, contactCount, submissionCount, pendingCount] =
      await Promise.all([
        admin
          .from('contact_messages')
          .select('id,created_at,name,email,topic,school,role,message,source')
          .order('created_at', { ascending: false })
          .limit(MAX_ITEMS),
        admin
          .from('submissions')
          .select(
            'id,created_at,student_name,email,year_level,school,challenge_number,work_link,notes,file_path,file_name,status',
          )
          .order('created_at', { ascending: false })
          .limit(MAX_ITEMS),
        admin.from('contact_messages').select('id', { count: 'exact', head: true }),
        admin.from('submissions').select('id', { count: 'exact', head: true }),
        admin
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

    if (
      contactsResult.error ||
      submissionsResult.error ||
      contactCount.error ||
      submissionCount.error ||
      pendingCount.error
    ) {
      return json({ error: 'read_failed' }, 500)
    }

    const contacts = contactsResult.data ?? []
    const submissions = await Promise.all(
      (submissionsResult.data ?? []).map(async (row) => {
        if (!row.file_path) return { ...row, file_url: null as string | null }
        const { data, error } = await admin.storage
          .from('submissions')
          .createSignedUrl(row.file_path, 3600)
        return { ...row, file_url: error ? null : data.signedUrl }
      }),
    )

    return json({
      ok: true,
      contacts,
      submissions,
      stats: {
        contacts: contactCount.count ?? contacts.length,
        submissions: submissionCount.count ?? submissions.length,
        pending: pendingCount.count ?? 0,
      },
      generatedAt: new Date().toISOString(),
    })
  }

  return json({ error: 'invalid_kind' }, 400)
})
