import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TourSetupForm } from '@/components/artist/TourSetupForm'

export default async function NewTourPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, job_role')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-zinc-950 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-2">
          <span className="text-white text-xl font-semibold tracking-tight">StagePage</span>
        </div>
        <div className="mt-10 mb-8">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Set up your first tour
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            You&apos;ll be able to add shows, find venues, and request tech packets — all in one place.
          </p>
        </div>
        <TourSetupForm
          userId={user.id}
          defaultRole={profile?.job_role ?? ''}
        />
      </div>
    </div>
  )
}
