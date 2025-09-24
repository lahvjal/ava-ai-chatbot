import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // If already authenticated, go to training
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        window.location.replace('/admin/training')
      }
    }
    run()
  }, [])

  const signInWithPassword = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setMessage('Signed in. Redirecting...')
      // Let Next handle navigation; most admin pages are under /admin
      window.location.href = '/admin/training'
    } catch (e: any) {
      setError(e?.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const signInWithMagicLink = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/admin/training' } })
      if (error) throw error
      setMessage('Magic link sent. Check your email to continue.')
    } catch (e: any) {
      setError(e?.message || 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Admin • Login</title>
      </Head>
      <main className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Login</h1>
        <p className="text-gray-600 mb-6">Sign in with your admin email. Your email must be present in the <code>public.admins</code> table to access admin pages.</p>

        <div className="space-y-4 bg-white border rounded p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password (optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>}
          {message && <div className="p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-800">{message}</div>}

          <div className="flex items-center gap-3">
            <button
              onClick={signInWithPassword}
              disabled={loading || !email || !password}
              className={`px-4 py-2 rounded text-white ${loading || !email || !password ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? 'Signing in...' : 'Sign in with password'}
            </button>
            <button
              onClick={signInWithMagicLink}
              disabled={loading || !email}
              className={`px-4 py-2 rounded border ${loading || !email ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <Link href="/admin/training" className="text-blue-600 hover:underline">Back to Admin Training</Link>
        </div>
      </main>
    </div>
  )
}
