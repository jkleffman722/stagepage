import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarLayout } from '@/components/shared/SidebarLayout'
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Calendar,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/venue/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/venue/packet', label: 'Technical Packet', icon: FileText },
  { href: '/venue/requests', label: 'Share Requests', icon: Inbox },
  { href: '/venue/calendar', label: 'Calendar', icon: Calendar },
]

const bottomNavItems = [
  { href: '/venue/settings', label: 'Settings', icon: Settings },
]

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
      navItems={navItems}
      bottomNavItems={bottomNavItems}
      userName={profileResult.data?.display_name ?? user.email ?? undefined}
      entityName={venueResult.data?.name ?? undefined}
      homeHref="/venue/dashboard"
    >
      {children}
    </SidebarLayout>
  )
}
