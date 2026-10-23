import type { SupabaseClient, User } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let clientPromise: Promise<SupabaseClient | null> | null = null

/**
 * A session-persisting Supabase client for the staff console. Separate from
 * the anonymous client in supabase.ts so the public site never carries a
 * staff session.
 */
export function getStaffClient(): Promise<SupabaseClient | null> {
  if (!url || !anonKey) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'omnimath:staff-session',
        },
      }),
    )
  }
  return clientPromise
}

export type StaffProfile = {
  id: string
  email: string
  name: string
  role: 'admin' | 'coordinator'
  school_id: string | null
}

export async function loadStaffProfile(
  client: SupabaseClient,
  user: User,
): Promise<StaffProfile | null> {
  const { data } = await client
    .from('staff')
    .select('id, email, name, role, school_id')
    .eq('id', user.id)
    .maybeSingle()
  return (data as StaffProfile | null) ?? null
}

/**
 * For accounts without a staff row: did they register and are they waiting
 * (or were they rejected)? Drives the sign-in error message.
 */
export async function loadApplicationStatus(
  client: SupabaseClient,
  user: User,
): Promise<'pending' | 'rejected' | null> {
  const { data } = await client
    .from('staff_applications')
    .select('status')
    .eq('auth_id', user.id)
    .maybeSingle()
  const status = (data as { status?: string } | null)?.status
  return status === 'pending' || status === 'rejected' ? status : null
}

/** Calls the staff Edge Function with the caller's own session token. */
export async function callStaffFunction(
  client: SupabaseClient,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  const { data: session } = await client.auth.getSession()
  const token = session.session?.access_token
  if (!token) return { ok: false, error: 'unauthorized' }
  return callStaffFunctionAnon(body, token)
}

/**
 * Calls the staff Edge Function without a login. Only the public actions
 * (registration) accept this; admin actions still verify the caller.
 */
export async function callStaffFunctionAnon(
  body: Record<string, unknown>,
  token?: string,
): Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }> {
  try {
    const response = await fetch(`${url}/functions/v1/staff`, {
      method: 'POST',
      headers: {
        apikey: anonKey ?? '',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null
    if (!response.ok) {
      const code = typeof data?.error === 'string' ? data.error : 'failed'
      return { ok: false, error: code }
    }
    return { ok: true, data: data ?? undefined }
  } catch {
    return { ok: false, error: 'network' }
  }
}
