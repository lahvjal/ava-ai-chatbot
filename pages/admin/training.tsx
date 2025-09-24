import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

interface SectionDoc {
  id?: string
  section: 'policies' | 'faqs' | 'processes' | 'tone' | 'product_knowledge'
  title?: string
  content?: string
  updated_at?: string
  updated_by?: string
}

const isAdminClient = (email?: string | null) => {
  if (!email) return false
  const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return list.includes(email.toLowerCase())
}

export default function TrainingAdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [sections, setSections] = useState<Record<string, SectionDoc>>({})
  const [active, setActive] = useState<SectionDoc['section']>('policies')
  const [content, setContent] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user?.email ?? null
      setUserEmail(email)

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

  const adminAllowed = isAdminClient(userEmail)

  function prettyLabel(k: SectionDoc['section']) {
    return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function switchSection(k: SectionDoc['section']) {
    setActive(k)
    const doc = sections[k]
    setTitle(doc?.title || prettyLabel(k))
    setContent(doc?.content || '')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin • AI Training</title>
      </Head>
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Training Document</h1>
        <p className="text-gray-600 mb-6">
          This page lets admins edit the training document Ava uses for answers. Updates take effect immediately for future chats.
        </p>

        {/* Auth status */}
        <div className="mb-4">
          {userEmail ? (
            <div className="text-sm text-gray-700">Signed in as <span className="font-medium">{userEmail}</span></div>
          ) : (
            <div className="text-sm text-gray-500">Not signed in. Please sign in via the widget to gain admin access.</div>
          )}
        </div>

        {!adminAllowed && (
          <div className="p-4 border border-yellow-300 bg-yellow-50 rounded mb-6 text-sm text-yellow-900">
            Admin access required. Ask a team member to add your email to NEXT_PUBLIC_ADMIN_EMAILS in the environment.
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
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
        )}
      </main>
    </div>
  )
}
