import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarLayout } from '@/components/shared/SidebarLayout'

export default async function VenueLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileResult, venueResult] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', user.id).single(),
    supabase.from('venues').select('name').eq('owner_id', user.id).single(),
  ])

  return (
    <SidebarLayout
      role="venue"
      userName={profileResult.data?.display_name ?? user.email ?? undefined}
      entityName={venueResult.data?.name ?? undefined}
    >
      {children}
    </SidebarLayout>
  )
}
