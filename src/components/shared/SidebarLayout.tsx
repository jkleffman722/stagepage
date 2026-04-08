'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Calendar,
  Settings,
  Search,
  FolderOpen,
} from 'lucide-react'
import { AppSidebar, type NavItem } from './AppSidebar'

const VENUE_NAV: NavItem[] = [
  { href: '/venue/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/venue/packet', label: 'Technical Packet', icon: FileText },
  { href: '/venue/requests', label: 'Share Requests', icon: Inbox },
  { href: '/venue/calendar', label: 'Calendar', icon: Calendar },
]

const VENUE_BOTTOM: NavItem[] = [
  { href: '/venue/settings', label: 'Settings', icon: Settings },
]

const ARTIST_NAV: NavItem[] = [
  { href: '/artist/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/artist/venues', label: 'Find Venues', icon: Search },
  { href: '/artist/packets', label: 'My Packets', icon: FolderOpen },
  { href: '/artist/calendar', label: 'Calendar', icon: Calendar },
]

const ARTIST_BOTTOM: NavItem[] = [
  { href: '/artist/settings', label: 'Settings', icon: Settings },
]

interface Props {
  role: 'venue' | 'artist'
  userName?: string
  entityName?: string
  children: React.ReactNode
}

export function SidebarLayout({ role, userName, entityName, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(JSON.parse(saved))
    setMounted(true)
  }, [])

  function handleToggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(next))
  }

  const navItems = role === 'venue' ? VENUE_NAV : ARTIST_NAV
  const bottomNavItems = role === 'venue' ? VENUE_BOTTOM : ARTIST_BOTTOM
  const homeHref = role === 'venue' ? '/venue/dashboard' : '/artist/dashboard'

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AppSidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        navItems={navItems}
        bottomNavItems={bottomNavItems}
        userName={userName}
        entityName={entityName}
        homeHref={homeHref}
      />
      <main
        className={cn(
          'flex-1 min-w-0 transition-[margin] duration-200 ease-in-out',
          !mounted && 'transition-none',
          collapsed ? 'ml-14' : 'ml-[220px]'
        )}
      >
        <div className="px-8 py-8 max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
