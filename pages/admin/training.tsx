import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import ChatWidget from '../../components/ChatWidget'

interface SectionDoc {
  id?: string
  section: 'policies' | 'faqs' | 'processes' | 'tone' | 'product_knowledge'
  title?: string
  content?: string
  updated_at?: string
  updated_by?: string
}

// client env-based admin check removed; we trust JWT metadata and server check

export default function TrainingAdminPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [sections, setSections] = useState<Record<string, SectionDoc>>({})
  const [active, setActive] = useState<SectionDoc['section']>('policies')
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [serverAdmin, setServerAdmin] = useState<boolean>(false)
  const [actingEmail, setActingEmail] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [searching, setSearching] = useState<boolean>(false)
  const [results, setResults] = useState<string[]>([])
  const [lookupCount, setLookupCount] = useState<number | null>(null)
  const [lookupLoading, setLookupLoading] = useState<boolean>(false)

  const onLogout = async () => {
    try {
      await supabase.auth.signOut()
      // extra safety: clear any lingering storage and reload
      try { localStorage.clear() } catch {}
      try { sessionStorage.clear() } catch {}
    } finally {
      // Use hard navigation to avoid race with useEffect redirects
      if (typeof window !== 'undefined') {
        window.location.replace('/admin/login?logged_out=1')
      } else {
        router.replace('/admin/login')
      }
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user?.email ?? null
      setUserEmail(email)

      // If not authenticated, redirect to login
      if (!sessionData.session) {
        router.replace('/admin/login')
        return
      }

      // Determine admin from JWT immediately (app_metadata.is_admin or user_metadata.user_type === 'admin')
      try {
        const user: any = sessionData.session?.user
        const am = user?.app_metadata || {}
        const um = user?.user_metadata || user?.raw_user_meta_data || {}
        const isAdminJwt = (am?.is_admin === true) || (typeof um?.user_type === 'string' && um.user_type.toLowerCase() === 'admin')
        if (isAdminJwt) setServerAdmin(true)
        // Also confirm with server endpoint for consistency
        const token = sessionData.session?.access_token
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })
          const j = await res.json()
          if (res.ok && typeof j.isDbAdmin === 'boolean') setServerAdmin(prev => prev || j.isDbAdmin)
        }
      } catch {}

      try {
        const res = await fetch('/api/training', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        const json = await res.json()
        if (res.ok) {
          const map: Record<string, SectionDoc> = json.sections || {}
          setSections(map)
          const current = map[active]
          setTitle(current?.title || prettyLabel(active))
          setContent(current?.content || '')
        } else {
          setError(json.error || 'Failed to load training documents')
        }
      } catch (e: any) {
        setError('Failed to load training document')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Search customers (admin only)
  useEffect(() => {
    let active = true
    const run = async () => {
      if (!serverAdmin || !search.trim()) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(search)}&limit=20`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const json = await res.json()
        if (active && res.ok) {
          setResults((json.items || []).map((x: any) => x.email))
        }
      } catch {
        if (active) setResults([])
      } finally {
        if (active) setSearching(false)
      }
    }
    const t = setTimeout(run, 250)
    return () => { active = false; clearTimeout(t) }
  }, [search, serverAdmin])

  const onSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch('/api/training', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ section: active, title, content }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Failed to save training document')
      } else {
        const updated: SectionDoc = json.doc
        setSections(prev => ({ ...prev, [updated.section]: updated }))
        setSuccess('Training document saved successfully')
      }
    } catch (e: any) {
      setError('Failed to save training document')
    } finally {
      setSaving(false)
    }
  }

  const adminAllowed = serverAdmin

  function prettyLabel(k: SectionDoc['section']) {
    return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function switchSection(k: SectionDoc['section']) {
    setActive(k)
    const doc = sections[k]
    setTitle(doc?.title || prettyLabel(k))
    setContent(doc?.content || '')
  }

  async function testLookup(email: string) {
    if (!serverAdmin || !email.trim()) {
      setLookupCount(null)
      return
    }
    setLookupLoading(true)
    setLookupCount(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const res = await fetch('/api/project-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (res.ok) setLookupCount(typeof json.count === 'number' ? json.count : 0)
      else setLookupCount(0)
    } catch {
      setLookupCount(0)
    } finally {
      setLookupLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin • AI Training</title>
      </Head>
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Training Document</h1>
        <p className="text-gray-600 mb-6">
          This page lets admins edit the training document Ava uses for answers. Updates take effect immediately for future chats.
        </p>

        {/* Auth status */}
        <div className="mb-4 flex items-center justify-between">
          {userEmail ? (
            <div className="text-sm text-gray-700">Signed in as <span className="font-medium">{userEmail}</span></div>
          ) : (
            <div className="text-sm text-gray-500">Not signed in. Please sign in via the widget to gain admin access.</div>
          )}
          {userEmail && (
            <button
              onClick={onLogout}
              className="text-sm px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700"
            >
              Logout
            </button>
          )}
        </div>

        {!adminAllowed && (
          <div className="p-4 border border-yellow-300 bg-yellow-50 rounded mb-6 text-sm text-yellow-900">
            Admin access required. Please sign in with an admin account.
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Training editor */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b pb-2">
                {(['policies','faqs','processes','tone','product_knowledge'] as SectionDoc['section'][]).map(k => (
                  <button
                    key={k}
                    onClick={() => switchSection(k)}
                    className={`text-sm px-3 py-1 rounded-t ${active===k ? 'bg-white border border-b-white border-gray-300 font-medium' : 'bg-gray-100 hover:bg-gray-200 border border-transparent'}`}
                  >
                    {prettyLabel(k)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!adminAllowed}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Write your company policies, FAQs, processes, tone, and product knowledge here..."
                  disabled={!adminAllowed}
                />
              </div>

              {error && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
              )}
              {success && (
                <div className="p-3 rounded bg-green-50 border border-green-200 text-sm text-green-800">{success}</div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={onSave}
                  disabled={!adminAllowed || saving}
                  className={`px-4 py-2 rounded text-white ${
                    !adminAllowed || saving ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                {sections[active]?.updated_at && (
                  <div className="text-xs text-gray-500">Last updated: {new Date(sections[active].updated_at as string).toLocaleString()}</div>
                )}
              </div>
            </div>

            {/* Right: Admin test chatbot */}
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search customer email</label>
                  <input
                    type="email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!serverAdmin}
                  />
                </div>
                <button
                  onClick={() => { const v = search.trim(); setActingEmail(v); testLookup(v) }}
                  disabled={!serverAdmin || !search.trim()}
                  className={`px-3 h-10 rounded text-white ${!serverAdmin || !search.trim() ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Use email
                </button>
              </div>
              {!!search && results.length > 0 && (
                <div className="max-h-40 overflow-auto border border-gray-200 rounded p-2 text-sm">
                  {searching && <div className="text-gray-400 mb-1">Searching…</div>}
                  {results.map((e) => (
                    <button
                      key={e}
                      onClick={() => { setActingEmail(e); setSearch(e); testLookup(e) }}
                      className={`block w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${actingEmail===e ? 'bg-blue-50' : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-xs text-gray-600">
                {serverAdmin ? (
                  actingEmail ? (
                    <span>Impersonating: <span className="font-medium">{actingEmail}</span></span>
                  ) : (
                    <span>Pick a customer email to impersonate for testing.</span>
                  )
                ) : (
                  <span>Admin rights required to use test chat.</span>
                )}
              </div>

              {serverAdmin && actingEmail && (
                <div className="text-xs text-gray-600">
                  {lookupLoading ? (
                    <span>Checking projects…</span>
                  ) : (
                    lookupCount !== null ? (
                      <span>Found {lookupCount} project{lookupCount === 1 ? '' : 's'} for <span className="font-medium">{actingEmail}</span></span>
                    ) : null
                  )}
                </div>
              )}

              <ChatWidget apiEndpoint="/api/chat" actingAsEmail={serverAdmin ? (actingEmail || null) : null} />
            </div>
          </div>
        )}
      </main>
    </div>
  )

}
