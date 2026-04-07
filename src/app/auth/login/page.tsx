'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.user) {
      toast.error(error?.message ?? 'Sign in failed')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    router.push(profile?.role === 'artist' ? '/artist/dashboard' : '/venue/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-12 bg-zinc-900 border-r border-zinc-800">
        <span className="text-white text-xl font-semibold tracking-tight">StagePage</span>
        <div>
          <blockquote className="text-zinc-300 text-lg leading-relaxed">
            &ldquo;Finally, one place to keep our tech packet up to date instead of emailing PDFs every tour.&rdquo;
          </blockquote>
          <p className="mt-4 text-zinc-500 text-sm">Venue Production Manager</p>
        </div>
        <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} StagePage</p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-2 text-white text-xl font-semibold tracking-tight lg:hidden">StagePage</div>

          <div className="mb-8">
            <h1 className="text-white text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-zinc-400 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@venue.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
              />
            </div>

            <Button type="submit" className="w-full h-10 mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-zinc-300 underline underline-offset-2 hover:text-white">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
