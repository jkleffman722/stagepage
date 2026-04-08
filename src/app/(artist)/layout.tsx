import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarLayout } from '@/components/shared/SidebarLayout'
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Calendar,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/artist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/artist/venues', label: 'Find Venues', icon: Search },
  { href: '/artist/packets', label: 'My Packets', icon: FolderOpen },
  { href: '/artist/calendar', label: 'Calendar', icon: Calendar },
]

const bottomNavItems = [
  { href: '/artist/settings', label: 'Settings', icon: Settings },
]

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
      navItems={navItems}
      bottomNavItems={bottomNavItems}
      userName={profile?.display_name ?? user.email ?? undefined}
      homeHref="/artist/dashboard"
    >
      {children}
    </SidebarLayout>
  )
}
