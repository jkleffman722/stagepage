'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, LogOut, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface Props {
  collapsed: boolean
  onToggle: () => void
  navItems: NavItem[]
  bottomNavItems?: NavItem[]
  userName?: string
  entityName?: string
  homeHref: string
}

export function AppSidebar({
  collapsed,
  onToggle,
  navItems,
  bottomNavItems = [],
  userName,
  entityName,
  homeHref,
}: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen flex flex-col bg-zinc-900 border-r border-zinc-800 z-20 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-[220px]'
      )}
    >
      {/* Logo + toggle */}
      <div className="flex items-center h-14 border-b border-zinc-800 shrink-0 px-3">
        {!collapsed && (
          <Link
            href={homeHref}
            className="flex-1 text-white font-semibold text-sm tracking-tight truncate mr-2"
          >
            StagePage
          </Link>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'rounded-md p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Entity name */}
      {!collapsed && entityName && (
        <div className="px-3 pt-3 pb-2">
          <p className="text-xs font-medium text-zinc-500 truncate">{entityName}</p>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-3 pt-2 border-t border-zinc-800 space-y-0.5">
        {bottomNavItems.map(item => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}

        {/* User row */}
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 mt-1',
            collapsed && 'flex-col gap-1 px-0'
          )}
        >
          <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
            <span className="text-xs text-zinc-300 font-medium">{initials}</span>
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 text-xs text-zinc-300 truncate min-w-0">
                {userName ?? 'Account'}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-zinc-500 hover:text-white transition-colors shrink-0"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {collapsed && (
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
