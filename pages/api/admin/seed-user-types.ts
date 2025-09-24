import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

// One-time/occasional script to normalize user metadata for admin gating
// - Sets user_metadata.user_type to 'admin' for specified emails, 'customer' for all others
// - Also sets app_metadata.is_admin = true for admin emails (and false for others)
// - Requires Authorization: Bearer <JWT>, and the caller must be admin (via JWT metadata or public.admins)

const ADMIN_EMAILS = new Set<string>((process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)
)

const FALLBACK_ADMIN_EMAILS = new Set<string>([
  'velthedesigner@gmail.com',
  'erikag@aveyo.com',
  'easton.c@aveyo.com',
].map(e => e.toLowerCase()))

function isAdminEmail(email?: string | null) {
  const e = (email || '').toLowerCase().trim()
  return ADMIN_EMAILS.has(e) || FALLBACK_ADMIN_EMAILS.has(e)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Require service role key to be configured
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Service role key not configured on server' })
  }

  // Authn the caller using their JWT
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring('Bearer '.length) : undefined

  let callerEmail: string | null = null
  let callerIsAdmin = false
  try {
    if (token) {
      const { data } = await supabase.auth.getUser(token)
      const user = data?.user as any
      callerEmail = user?.email || null
      const am = user?.app_metadata || {}
      const um = user?.user_metadata || user?.raw_user_meta_data || {}
      if (am?.is_admin === true) callerIsAdmin = true
      if (typeof um?.user_type === 'string' && um.user_type.toLowerCase() === 'admin') callerIsAdmin = true
    }
  } catch {}

  if (!callerIsAdmin && callerEmail) {
    try {
      const { data: row } = await supabaseAdmin
        .from('admins')
        .select('email')
        .eq('email', callerEmail)
        .maybeSingle()
      callerIsAdmin = !!row
    } catch {}
  }

  if (!callerIsAdmin) return res.status(403).json({ error: 'Admin only' })

  try {
    // Page through all users
    let nextPageToken: string | undefined = undefined
    let updated = 0
    let examined = 0

    do {
      const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ page: nextPageToken ? undefined : 1, perPage: 1000 })
      if (error) throw error

      const users = (data?.users || []) as any[]
      examined += users.length

      for (const u of users) {
        const email = (u.email || '').toLowerCase()
        const shouldBeAdmin = isAdminEmail(email)
        const desiredUserType = shouldBeAdmin ? 'admin' : 'customer'
        const currentUserType = (u.user_metadata?.user_type || u.raw_user_meta_data?.user_type || '').toLowerCase()
        const currentIsAdmin = u.app_metadata?.is_admin === true

        const needsUpdate = currentUserType !== desiredUserType || currentIsAdmin !== shouldBeAdmin
        if (!needsUpdate) continue

        const newUserMeta = { ...(u.user_metadata || u.raw_user_meta_data || {}), user_type: desiredUserType }
        const newAppMeta = { ...(u.app_metadata || {}), is_admin: shouldBeAdmin }

        const { error: updErr } = await (supabaseAdmin as any).auth.admin.updateUserById(u.id, {
          app_metadata: newAppMeta,
          user_metadata: newUserMeta,
        })
        if (updErr) {
          console.error('Failed updating user metadata', { email, id: u.id, updErr })
          continue
        }
        updated += 1
      }

      // Note: listUsers in v2 returns no pagination token; for large sets we could loop by page numbers.
      nextPageToken = undefined
    } while (nextPageToken)

    return res.status(200).json({ ok: true, examined, updated })
  } catch (e: any) {
    console.error('seed-user-types failed', e)
    return res.status(500).json({ error: e?.message || 'Failed to seed user types' })
  }
}
