import { useEffect } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'

export default function AdminIndexRedirect() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.replace('/admin/training')
      } else {
        router.replace('/admin/login')
      }
    }
    run()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      <Head>
        <title>Admin</title>
      </Head>
      <span>Redirecting…</span>
    </div>
  )
}
