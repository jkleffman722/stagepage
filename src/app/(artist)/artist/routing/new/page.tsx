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
    <div className="max-w-md">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Set up a tour</h1>
        <p className="mt-1.5 text-zinc-500 text-sm">
          Add shows, find venues, and request tech packets — all in one place.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <TourSetupForm
          userId={user.id}
          defaultRole={profile?.job_role ?? ''}
        />
      </div>
    </div>
  )
}
