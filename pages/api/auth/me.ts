import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : undefined

    let email: string | null = null
    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token)
        email = data?.user?.email ?? null
      } catch (e) {
        // ignore
      }
    }

    // Compute isDbAdmin by checking public.admins for this email.
    // Prefer service role client, but fall back to anon client if missing (admins table has RLS disabled by default).
    let isDbAdmin = false
    if (email) {
      try {
        const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseAdmin : supabase
        const { data: row } = await client
          .from('admins')
          .select('email')
          .eq('email', email)
          .maybeSingle()
        isDbAdmin = !!row
      } catch {
        isDbAdmin = false
      }
    }

    return res.status(200).json({ email, isAuthenticated: !!email, isDbAdmin })
  } catch (err) {
    console.error('❌ [/api/auth/me] Unexpected error:', err)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
