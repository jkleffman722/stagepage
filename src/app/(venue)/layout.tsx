import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VenueNav } from '@/components/shared/VenueNav'

export default async function VenueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: venue } = await supabase
    .from('venues')
    .select('name')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <VenueNav venueName={venue?.name} />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
