import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : undefined

    let callerEmail: string | null = null
    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token)
        callerEmail = data?.user?.email ?? null
      } catch {
        // noop
      }
    }

    // Admin guard via DB (public.admins)
    if (!callerEmail) return res.status(401).json({ error: 'Not authenticated' })
    const { data: adminRow } = await supabaseAdmin
      .from('admins')
      .select('email')
      .eq('email', callerEmail)
      .maybeSingle()
    if (!adminRow) return res.status(403).json({ error: 'Admin required' })

    const search = (req.query.search as string | undefined)?.trim().toLowerCase() || ''
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10))
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Fetch emails from public.podio_data, filter by LIKE if search provided
    // Post-filter to distinct (safe and simple for now)
    let query = supabaseAdmin
      .from('podio_data')
      .select('email', { count: 'exact' })
      .not('email', 'is', null)

    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    const { data, error, count } = await query.order('email', { ascending: true }).range(from, to)

    if (error) {
      console.error('❌ [/api/admin/customers] fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch customers' })
    }

    const emails = Array.from(new Set((data || []).map(r => (r as any).email?.toLowerCase()).filter(Boolean)))
    return res.status(200).json({ items: emails.map(email => ({ email })), total: count ?? emails.length, page, limit })
  } catch (err) {
    console.error('❌ [/api/admin/customers] Unexpected error:', err)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
