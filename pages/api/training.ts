import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase, supabaseAdmin } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Simple admin check using a whitelist of emails in env
// Set NEXT_PUBLIC_ADMIN_EMAILS for client hints, and ADMIN_EMAILS for server enforcement
function isAdminEmail(email?: string | null) {
  if (!email) return false
  const list = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS preflight support
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(200).end()
  }

  try {
    // Diagnostics for environment variables
    console.log('🔧 [TRAINING] Env check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      adminEmailsSet: !!(process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS),
    })

    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : undefined

    // Try to get user from token for audit/admin check
    let userEmail: string | null = null
    if (token) {
      try {
        const { data } = await supabase.auth.getUser(token)
        userEmail = data?.user?.email ?? null
      } catch (e) {
        // ignore, userEmail remains null
      }
    }

    if (req.method === 'GET') {
      // Return all sections as a map
      const { data, error } = await supabaseAdmin
        .from('ai_training_docs')
        .select('id, section, title, content, updated_by, updated_at')
        .order('section', { ascending: true })

      if (error) {
        console.error('❌ [TRAINING] GET error:', error)
        if ((error as any).code === '42P01' || /relation .* does not exist/i.test((error as any).message || '')) {
          return res.status(200).json({ sections: {}, hint: 'Table ai_training_docs not found. Create it using the SQL in README (Admin Training Page section).' })
        }
        return res.status(500).json({ error: 'Failed to fetch training docs' })
      }

      const sections: Record<string, any> = {}
      for (const row of data || []) {
        sections[row.section] = row
      }
      return res.status(200).json({ sections })
    }

    if (req.method === 'PUT') {
      const debug = req.query.debug === '1'
      if (!token) {
        return res.status(401).json({ error: 'Not authenticated. Please sign in first.' })
      }
      if (!userEmail) {
        return res.status(401).json({ error: 'Could not resolve user email from token.' })
      }

      // Check admin via env OR via DB (public.admins)
      let isDbAdmin = false
      try {
        const { data: adminRow } = await supabaseAdmin
          .from('admins')
          .select('email')
          .eq('email', userEmail)
          .maybeSingle()
        isDbAdmin = !!adminRow
      } catch (e) {
        // ignore, default false
      }

      // Collect body early for diagnostics
      const { section, content, title } = req.body || {}

      const validSections = ['policies','faqs','processes','tone','product_knowledge']
      if (!validSections.includes(section)) {
        return res.status(400).json({ error: 'Invalid section. Use one of: policies, faqs, processes, tone, product_knowledge' })
      }

      const isEnvAdmin = isAdminEmail(userEmail)
      console.log('🔎 [TRAINING] POST diagnostics (pre-insert):', {
        userEmail,
        isEnvAdmin,
        isDbAdmin,
        section,
        titleLength: typeof title === 'string' ? title.length : 0,
        contentLength: typeof content === 'string' ? content.length : 0,
        supabaseUrlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30),
      })

      if (!isEnvAdmin && !isDbAdmin) {
        return res.status(403).json({ error: 'Admin privileges required. Add your email to ADMIN_EMAILS or public.admins.' })
      }

      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Content is required' })
      }

      const insertPayload = {
        section,
        title: typeof title === 'string' ? title.trim().slice(0, 200) : 'Knowledge Base',
        content,
        updated_by: userEmail,
        // updated_at is set by DB default if configured; fallback to now via upsert
        updated_at: new Date().toISOString(),
      }

      // Prefer user-JWT write using RLS policy
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        }
      )

      let data, error
      console.log('📝 [TRAINING] Attempting insert via user JWT (RLS)')
      ;({ data, error } = await userClient
        .from('ai_training_docs')
        .upsert(insertPayload, { onConflict: 'section' })
        .select('id, section, title, content, updated_by, updated_at')
        .single())

      // If RLS path fails and service key is available, try fallback
      if (error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('⚠️ [TRAINING] RLS insert failed, falling back to service role insert', {
          code: (error as any).code,
          message: (error as any).message,
          details: (error as any).details,
        })
        ;({ data, error } = await supabaseAdmin
          .from('ai_training_docs')
          .upsert(insertPayload, { onConflict: 'section' })
          .select('id, section, title, content, updated_by, updated_at')
          .single())
      }

      if (error) {
        console.error('❌ [TRAINING] POST error:', {
          code: (error as any).code,
          message: (error as any).message,
          details: (error as any).details,
          hint: (error as any).hint,
        })
        // Permission error (likely RLS) when missing service role key
        if ((error as any).code === '42501') {
          return res.status(500).json({ error: 'Permission denied by RLS. Make sure your email is in public.admins and you are logged in with that email.' })
        }
        return res.status(500).json({ error: 'Failed to save training doc', code: (error as any).code, message: (error as any).message })
      }

      const response = { doc: data }
      if (debug) {
        ;(response as any).debug = {
          usedPath: 'rls_or_service_role',
          isEnvAdmin,
          isDbAdmin,
          section,
          titleLength: typeof title === 'string' ? title.length : 0,
          contentLength: typeof content === 'string' ? content.length : 0,
        }
      }
      return res.status(200).json(response)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('❌ [TRAINING] Unexpected error:', err)
    return res.status(500).json({ error: 'Unexpected server error' })
  }
}
