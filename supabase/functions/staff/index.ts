// Omnimath — staff account management.
//
// The browser calls this with the caller's Supabase Auth token. The function
// verifies the token against Auth, checks the caller is an admin in
// public.staff, and then uses the service role to manage auth users:
//
//   apply_staff          { name, email, password, schoolName?, code?, turnstileToken }
//                        — public registration; an invite code activates the
//                          account instantly (the code carries the school),
//                          without one the application waits for approval with
//                          a typed school name
//   check_invite         { code }                 → { school } — public lookup
//   approve_application  { applicationId }   — links the staff row, registers
//                        the typed school name (reusing a same-named school),
//                        emails if configured
//   reject_application   { applicationId }   — deletes the account, keeps the record
//   create_coordinator   { name, email, password, schoolId }
//   create_invite        { schoolId }            → { code }
//   set_password         { userId, password }
//   delete_staff         { userId }
//   bootstrap_admin      { email, password, name }   — only while no admin exists
//
// apply_staff is the public half: Turnstile is its proof of humanity and the
// invite code (or the admin's approval) is its proof of invitation, so it runs
// before the admin check. Deleting the auth user cascades to public.staff.
// School rows themselves are managed by the admin directly through PostgREST
// (RLS restricts to admins).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// The gateway does not add CORS headers for us; without these the browser's
// preflight OPTIONS fails and every fetch from the site is blocked.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''
const TURNSTILE_HOSTNAMES = (Deno.env.get('TURNSTILE_HOSTNAMES') ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean)

// Optional approval email; the console shows "notify them yourself" until set.
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Omnimath <onboarding@resend.dev>'

// Invite codes: unambiguous uppercase alphabet (no 0/O, 1/I, 8/B, 5/S, 2/Z).
const INVITE_ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679'

async function service(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

/** Verify the caller's JWT and return their auth user id, or null. */
async function callerId(request: Request): Promise<string | null> {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  const user = await response.json().catch(() => null)
  return typeof user?.id === 'string' ? user.id : null
}

async function isAdmin(userId: string): Promise<boolean> {
  const response = await service(
    `/rest/v1/staff?id=eq.${encodeURIComponent(userId)}&role=eq.admin&select=id`,
  )
  if (!response.ok) return false
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0
}

async function adminExists(): Promise<boolean> {
  const response = await service(
    '/rest/v1/staff?role=eq.admin&select=id&limit=1',
  )
  if (!response.ok) return true // fail closed
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0
}

async function schoolExists(schoolId: string): Promise<boolean> {
  const response = await service(
    `/rest/v1/schools?id=eq.${encodeURIComponent(schoolId)}&select=id`,
  )
  if (!response.ok) return false
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0
}

async function createAuthUser(input: {
  email: string
  password: string
  name: string
}): Promise<{ id: string } | { error: string }> {
  const response = await service('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.name },
    }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // Supabase reports a taken email as {code: 422, msg: "... already ..."} —
    // the numeric code must not shadow the message we match on.
    const detail = `${data?.msg ?? ''} ${data?.error_code ?? ''} ${data?.code ?? ''}`.toLowerCase()
    if (detail.includes('already') || detail.includes('been registered')) {
      return { error: 'email_taken' }
    }
    return { error: 'auth_failed' }
  }
  return { id: data.id }
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function newInviteCode(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  let code = ''
  for (const byte of bytes) code += INVITE_ALPHABET[byte % INVITE_ALPHABET.length]
  return code
}

/** Look up an unused, unexpired invite; returns the row or null. */
async function findInvite(code: string): Promise<{ code: string; school_id: string } | null> {
  const response = await service(
    `/rest/v1/staff_invites?code=eq.${encodeURIComponent(code)}&used_at=is.null&expires_at=gt.now&select=code,school_id`,
  )
  if (!response.ok) return null
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}

/** The school name an invite would grant, for the register page's check step. */
async function inviteSchool(code: string): Promise<string | null> {
  const invite = await findInvite(code)
  if (!invite) return null
  const response = await service(
    `/rest/v1/schools?id=eq.${encodeURIComponent(invite.school_id)}&select=name`,
  )
  if (!response.ok) return null
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && typeof rows[0]?.name === 'string' ? rows[0].name : null
}

/** Same canonical siteverify contract as the submit function. */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET || !token || TURNSTILE_HOSTNAMES.length === 0) return false
  const body = new URLSearchParams()
  body.set('secret', TURNSTILE_SECRET)
  body.set('response', token)
  body.set('remoteip', ip)
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    })
    if (!response.ok) return false
    const result = await response.json()
    return result?.success === true &&
      result?.action === 'staff_register' &&
      TURNSTILE_HOSTNAMES.includes(result?.hostname)
  } catch {
    return false
  }
}

/** Best-effort approval email; returns whether a mail service is configured. */
async function notifyApproved(to: string, name: string): Promise<boolean> {
  if (!RESEND_KEY) return false
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        subject: 'Your Omnimath coordinator account is active',
        text:
          `Kia ora ${name},\n\n` +
          'Your Omnimath coordinator account has been approved. Sign in with the ' +
          'email and password you chose:\n\n' +
          'https://nb-group.github.io/omnimath/admin\n\n' +
          'Ngā mihi,\nThe Omnimath team',
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Does this email already have a pending application? */
async function pendingApplicationExists(emailAddr: string): Promise<boolean> {
  const response = await service(
    `/rest/v1/staff_applications?email=eq.${encodeURIComponent(emailAddr)}&status=eq.pending&select=id&limit=1`,
  )
  if (!response.ok) return true // fail closed
  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) && rows.length > 0
}

/**
 * Find a school by name (case-insensitive) or create it. School names are
 * typed by registrants, so the list grows with approvals.
 */
async function resolveSchool(schoolName: string): Promise<string | null> {
  const trimmed = schoolName.trim()
  if (!trimmed) return null
  const wanted = trimmed.toLowerCase()
  const existing = await service('/rest/v1/schools?select=id,name&limit=1000&order=name')
  if (existing.ok) {
    const rows = await existing.json().catch(() => [])
    if (Array.isArray(rows)) {
      const hit = rows.find((row) => typeof row?.name === 'string' && row.name.toLowerCase() === wanted)
      if (hit) return hit.id
    }
  }
  const created = await service('/rest/v1/schools', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name: trimmed }),
  })
  if (!created.ok) return null
  const school = await created.json().catch(() => null)
  return Array.isArray(school) && school[0]?.id ? school[0].id : null
}

Deno.serve(async (request) => {
  // Answer the browser's CORS preflight before anything else.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') return json(405, { error: 'method' })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'body' })
  }

  const action = clean(body.action, 40)
  const email = clean(body.email, 320).toLowerCase()
  const password = typeof body.password === 'string' ? body.password : ''
  const name = clean(body.name, 200)
  const userId = clean(body.userId, 64)
  const schoolId = clean(body.schoolId, 64)

  // Each action states which fields it needs; global checks are limited to
  // shape, and per-action checks reject missing values below.
  const needsEmail = action === 'bootstrap_admin' || action === 'create_coordinator' ||
    action === 'apply_staff'
  const needsPassword = needsEmail || action === 'set_password'
  if (needsEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'email' })
  if (needsPassword && password.length < 10) return json(400, { error: 'weak_password' })

  // Public coordinator registration. A valid invite code (which carries the
  // school) activates the account immediately; without one the applicant
  // types their school's name and waits for admin approval.
  if (action === 'check_invite') {
    const inviteCode = clean(body.code, 32).toUpperCase()
    if (inviteCode.length !== 12) return json(400, { error: 'invite' })
    const school = await inviteSchool(inviteCode)
    if (!school) return json(400, { error: 'invite' })
    return json(200, { ok: true, school })
  }

  if (action === 'apply_staff') {
    if (name.length < 1) return json(400, { error: 'name' })
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
    if (!(await verifyTurnstile(clean(body.turnstileToken, 4096), ip))) {
      return json(403, { error: 'captcha' })
    }
    const inviteCode = clean(body.code, 32).toUpperCase()
    const schoolName = clean(body.schoolName, 200)

    if (inviteCode) {
      if (inviteCode.length !== 12) return json(400, { error: 'invite' })
      const invite = await findInvite(inviteCode)
      if (!invite) return json(400, { error: 'invite' })
      const created = await createAuthUser({ email, password, name })
      if ('error' in created) return json(400, { error: created.error })
      const insert = await service('/rest/v1/staff', {
        method: 'POST',
        body: JSON.stringify({
          id: created.id,
          email,
          name,
          role: 'coordinator',
          school_id: invite.school_id,
        }),
      })
      if (!insert.ok) {
        await service(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' })
        return json(500, { error: 'insert_failed' })
      }
      // Consume the code atomically; a code claimed first by someone else fails.
      const use = await service(
        `/rest/v1/staff_invites?code=eq.${encodeURIComponent(inviteCode)}&used_at=is.null`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            used_at: new Date().toISOString(),
            used_by: created.id,
          }),
        },
      )
      const used = use.ok ? await use.json().catch(() => []) : []
      if (!Array.isArray(used) || used.length === 0) {
        await service(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' })
        return json(400, { error: 'invite' })
      }
      return json(200, { ok: true, activated: true })
    }

    if (!schoolName) return json(400, { error: 'school' })
    if (await pendingApplicationExists(email)) return json(400, { error: 'pending_exists' })
    const created = await createAuthUser({ email, password, name })
    if ('error' in created) return json(400, { error: created.error })
    const insert = await service('/rest/v1/staff_applications', {
      method: 'POST',
      body: JSON.stringify({
        auth_id: created.id,
        email,
        name,
        school_name: schoolName,
        message: clean(body.message, 1000) || null,
        status: 'pending',
      }),
    })
    if (!insert.ok) {
      await service(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' })
      return json(500, { error: 'insert_failed' })
    }
    return json(200, { ok: true, activated: false })
  }

  // Bootstrap: the very first admin account, so the system can start without
  // a service key on the client. Disables itself once an admin exists.
  if (action === 'bootstrap_admin') {
    if (await adminExists()) return json(403, { error: 'bootstrap_closed' })
    if (name.length < 1) return json(400, { error: 'name' })
    const created = await createAuthUser({ email, password, name })
    if ('error' in created) return json(400, { error: created.error })
    const insert = await service('/rest/v1/staff', {
      method: 'POST',
      body: JSON.stringify({
        id: created.id,
        email,
        name,
        role: 'admin',
        school_id: null,
      }),
    })
    if (!insert.ok) return json(500, { error: 'insert_failed' })
    return json(200, { ok: true })
  }

  const caller = await callerId(request)
  if (!caller) return json(401, { error: 'unauthorized' })
  if (!(await isAdmin(caller))) return json(403, { error: 'forbidden' })

  switch (action) {
    case 'create_invite': {
      const schoolName = clean(body.schoolName, 200)
      if (!schoolName) return json(400, { error: 'school' })
      const inviteSchoolId = await resolveSchool(schoolName)
      if (!inviteSchoolId) return json(400, { error: 'school' })
      const code = newInviteCode()
      const insert = await service('/rest/v1/staff_invites', {
        method: 'POST',
        body: JSON.stringify({ code, school_id: inviteSchoolId }),
      })
      if (!insert.ok) return json(500, { error: 'insert_failed' })
      return json(200, { ok: true, code })
    }

    case 'approve_application': {
      const applicationId = clean(body.applicationId, 64)
      if (!applicationId) return json(400, { error: 'application' })
      const response = await service(
        `/rest/v1/staff_applications?id=eq.${encodeURIComponent(applicationId)}&status=eq.pending&select=*`,
      )
      const rows = response.ok ? await response.json().catch(() => []) : []
      if (!Array.isArray(rows) || rows.length === 0 || !rows[0].auth_id) {
        return json(400, { error: 'application' })
      }
      const application = rows[0]
      const schoolId = await resolveSchool(application.school_name)
      if (!schoolId) return json(500, { error: 'school' })
      const insert = await service('/rest/v1/staff', {
        method: 'POST',
        body: JSON.stringify({
          id: application.auth_id,
          email: application.email,
          name: application.name,
          role: 'coordinator',
          school_id: schoolId,
        }),
      })
      if (!insert.ok) return json(500, { error: 'insert_failed' })
      await service(`/rest/v1/staff_applications?id=eq.${encodeURIComponent(applicationId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: caller,
        }),
      })
      const notified = await notifyApproved(application.email, application.name)
      return json(200, { ok: true, notified })
    }

    case 'reject_application': {
      const applicationId = clean(body.applicationId, 64)
      if (!applicationId) return json(400, { error: 'application' })
      const response = await service(
        `/rest/v1/staff_applications?id=eq.${encodeURIComponent(applicationId)}&status=eq.pending&select=auth_id`,
      )
      const rows = response.ok ? await response.json().catch(() => []) : []
      if (!Array.isArray(rows) || rows.length === 0) return json(400, { error: 'application' })
      if (rows[0].auth_id) {
        // Removing the account frees the email; the record stays for review.
        const remove = await service(`/auth/v1/admin/users/${rows[0].auth_id}`, {
          method: 'DELETE',
        })
        if (!remove.ok && remove.status !== 404) {
          return json(400, { error: 'auth_failed', status: remove.status })
        }
      }
      await service(`/rest/v1/staff_applications?id=eq.${encodeURIComponent(applicationId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: caller,
        }),
      })
      return json(200, { ok: true })
    }

    case 'create_coordinator': {
      if (name.length < 1) return json(400, { error: 'name' })
      const schoolName = clean(body.schoolName, 200)
      if (!schoolName) return json(400, { error: 'school' })
      const schoolId = await resolveSchool(schoolName)
      if (!schoolId) return json(400, { error: 'school' })
      const created = await createAuthUser({ email, password, name })
      if ('error' in created) return json(400, { error: created.error })
      const insert = await service('/rest/v1/staff', {
        method: 'POST',
        body: JSON.stringify({
          id: created.id,
          email,
          name,
          role: 'coordinator',
          school_id: schoolId,
        }),
      })
      if (!insert.ok) return json(500, { error: 'insert_failed' })
      return json(200, { ok: true })
    }

    case 'set_password': {
      if (!userId) return json(400, { error: 'user' })
      const update = await service(`/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      })
      if (!update.ok) return json(400, { error: 'auth_failed' })
      return json(200, { ok: true })
    }

    case 'delete_staff': {
      if (!userId) return json(400, { error: 'user' })
      if (userId === caller) return json(400, { error: 'self_delete' })
      const remove = await service(`/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
      })
      // The auth delete cascades to public.staff; a 404 means it was already
      // gone from auth, in which case clean up the staff row directly.
      if (!remove.ok && remove.status !== 404) {
        return json(400, { error: 'auth_failed' })
      }
      await service(`/rest/v1/staff?id=eq.${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      })
      return json(200, { ok: true })
    }

    default:
      return json(400, { error: 'action' })
  }
})
