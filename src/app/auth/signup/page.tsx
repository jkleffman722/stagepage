'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role') === 'artist' ? 'artist' : 'venue'
  const isVenue = role === 'venue'

  const [displayName, setDisplayName] = useState('')
  const [orgName, setOrgName] = useState('') // venue name OR artist/band/tour name
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, display_name: displayName },
      },
    })

    if (error || !data.user) {
      toast.error(error?.message ?? 'Signup failed')
      setLoading(false)
      return
    }

    if (isVenue) {
      const { error: venueError } = await supabase.from('venues').insert({
        owner_id: data.user.id,
        name: orgName,
      })
      if (venueError) {
        toast.error('Account created but venue setup failed — finish setup on the dashboard.')
      }
      router.push('/venue/dashboard')
    } else {
      router.push('/artist/dashboard')
    }

    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-12 bg-zinc-900 border-r border-zinc-800">
        <span className="text-white text-xl font-semibold tracking-tight">StagePage</span>
        <div>
          <blockquote className="text-zinc-300 text-lg leading-relaxed">
            {isVenue
              ? '"Finally, one place to keep our tech packet up to date instead of emailing PDFs every tour."'
              : '"All the venue info I need, always current. No more chasing down outdated riders."'}
          </blockquote>
          <p className="mt-4 text-zinc-500 text-sm">
            {isVenue ? 'Venue Production Manager' : 'Tour Production Coordinator'}
          </p>
        </div>
        <p className="text-zinc-600 text-sm">© {new Date().getFullYear()} StagePage</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-white text-xl font-semibold tracking-tight lg:hidden">StagePage</div>

          <div className="mb-8">
            <h1 className="text-white text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-zinc-400 text-sm">
              {isVenue ? "Set up your venue's technical packet" : 'Access venue tech packets for your shows'}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Your name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Alex Smith"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org" className="text-zinc-300">
                {isVenue ? 'Venue name' : 'Artist / band / tour name'}
              </Label>
              <Input
                id="org"
                type="text"
                placeholder={isVenue ? 'The Fillmore' : 'Taylor Swift | The Eras Tour'}
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                required
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
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
                placeholder="At least 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
              />
            </div>

            <Button type="submit" className="w-full h-10 mt-2" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-zinc-300 underline underline-offset-2 hover:text-white">
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-zinc-600">
            {isVenue ? 'Signing up as an artist? ' : 'Signing up as a venue? '}
            <Link
              href={`/auth/signup?role=${isVenue ? 'artist' : 'venue'}`}
              className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300"
            >
              Switch
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
