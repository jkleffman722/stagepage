'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { AppSidebar, type NavItem } from './AppSidebar'

interface Props {
  navItems: NavItem[]
  bottomNavItems?: NavItem[]
  userName?: string
  entityName?: string
  homeHref: string
  children: React.ReactNode
}

export function SidebarLayout({
  navItems,
  bottomNavItems,
  userName,
  entityName,
  homeHref,
  children,
}: Props) {
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
          // Suppress the transition flash on initial load before localStorage is read
          !mounted && 'transition-none',
          collapsed ? 'ml-14' : 'ml-[220px]'
        )}
      >
        <div className="px-8 py-8 max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
