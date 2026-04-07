import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArtistNav } from '@/components/artist/ArtistNav'

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single()

  // Venue users who accidentally land here get sent to their dashboard
  if (profile?.role === 'venue') redirect('/venue/dashboard')

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50">
      <ArtistNav artistName={profile?.display_name ?? undefined} />
      <main className="flex-1 px-6 py-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
