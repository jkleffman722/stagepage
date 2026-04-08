import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarLayout } from '@/components/shared/SidebarLayout'

export default async function ArtistLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'venue') redirect('/venue/dashboard')

  return (
    <SidebarLayout
      role="artist"
      userName={profile?.display_name ?? user.email ?? undefined}
    >
      {children}
    </SidebarLayout>
  )
}
