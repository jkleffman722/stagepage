import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  Plus,
  ArrowRight,
  Music2,
  ClipboardCheck,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type PacketStatus = 'approved' | 'pending' | 'denied' | 'revoked' | null

type ShowHealth = 'critical' | 'warning' | 'on-track' | 'ready' | 'no-venue'

interface WorkItem {
  showId: string
  tourId: string
  tourName: string
  artistName: string
  eventDate: string
  venueName: string | null
  venueCity: string | null
  venueState: string | null
  daysUntil: number
  health: ShowHealth
  headline: string
  detail: string
  ctaLabel: string
  ctaHref: string
}

// ── Health computation ─────────────────────────────────────────────────────────

function computeWorkItem(
  showId: string,
  tourId: string,
  tourName: string,
  artistName: string,
  eventDate: string,
  venueId: string | null,
  venueName: string | null,
  venueCity: string | null,
  venueState: string | null,
  packetStatus: PacketStatus,
  advanceFilledCount: number,
  daysUntil: number,
): WorkItem {
  const advanceHref = `/artist/routing/${tourId}/shows/${showId}/advance`
  const base = { showId, tourId, tourName, artistName, eventDate, venueName, venueCity, venueState, daysUntil }

  if (!venueId) {
    return {
      ...base,
      health: 'no-venue',
      headline: 'No venue assigned',
      detail: 'Assign a venue to start the advancing process.',
      ctaLabel: 'Assign venue',
      ctaHref: `/artist/routing`,
    }
  }

  if (!packetStatus || packetStatus === 'denied' || packetStatus === 'revoked') {
    return {
      ...base,
      health: daysUntil < 21 ? 'critical' : 'warning',
      headline: 'Venue packet not requested',
      detail: packetStatus === 'denied'
        ? 'Your packet request was denied. Reach out to the venue directly.'
        : 'Request the tech packet so you can advance this show.',
      ctaLabel: 'Open Advance',
      ctaHref: advanceHref,
    }
  }

  if (packetStatus === 'pending') {
    return {
      ...base,
      health: daysUntil < 14 ? 'critical' : 'warning',
      headline: 'Waiting on venue packet',
      detail: 'Packet requested — you can still fill in your own advance fields while you wait.',
      ctaLabel: 'Open Advance',
      ctaHref: advanceHref,
    }
  }

  // Packet approved
  if (advanceFilledCount < 3) {
    return {
      ...base,
      health: daysUntil < 14 ? 'critical' : 'warning',
      headline: 'Advance not started',
      detail: 'Packet received — start filling out your advance sheet.',
      ctaLabel: 'Start Advance',
      ctaHref: advanceHref,
    }
  }

  if (advanceFilledCount < 12) {
    return {
      ...base,
      health: 'on-track',
      headline: 'Advance in progress',
      detail: `${advanceFilledCount} fields filled — keep going before the show.`,
      ctaLabel: 'Continue',
      ctaHref: advanceHref,
    }
  }

  return {
    ...base,
    health: 'ready',
    headline: 'Advance looks complete',
    detail: 'Review it and share with your crew.',
    ctaLabel: 'Review & Share',
    ctaHref: advanceHref,
  }
}

const HEALTH_ORDER: Record<ShowHealth, number> = {
  critical: 0, warning: 1, 'on-track': 2, ready: 3, 'no-venue': 4,
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // All tours for this user
  const { data: tours } = await supabase
    .from('tours')
    .select('id, tour_name, artist_name')
    .eq('profile_id', user.id)

  const tourIds = (tours ?? []).map(t => t.id)
  const tourMap = new Map((tours ?? []).map(t => [t.id, t]))

  if (tourIds.length === 0) {
    return <EmptyState />
  }

  // All upcoming shows
  const { data: shows } = await supabase
    .from('shows')
    .select('id, tour_id, event_date, venue_id, venues(id, name, city, state)')
    .in('tour_id', tourIds)
    .gte('event_date', todayStr)
    .order('event_date')

  if (!shows || shows.length === 0) {
    return <EmptyState hasToursButNoShows />
  }

  const showIds = shows.map(s => s.id)
  const venueIds = shows.map(s => s.venue_id).filter(Boolean) as string[]

  // Fetch share requests + advances in parallel
  const [requestsResult, advancesResult] = await Promise.all([
    venueIds.length > 0
      ? supabase
          .from('share_requests')
          .select('venue_id, status')
          .in('venue_id', venueIds)
          .eq('requester_profile_id', user.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('show_advances')
      .select('show_id, fields')
      .in('show_id', showIds),
  ])

  // Build lookups — one request per venue (latest)
  const requestByVenue = new Map<string, PacketStatus>()
  for (const r of (requestsResult.data ?? [])) {
    if (!requestByVenue.has(r.venue_id)) {
      requestByVenue.set(r.venue_id, r.status as PacketStatus)
    }
  }

  const advanceByShow = new Map<string, number>()
  for (const a of (advancesResult.data ?? [])) {
    const fields = (a.fields ?? {}) as Record<string, string | null>
    const filled = Object.values(fields).filter(v => v != null && v !== '').length
    advanceByShow.set(a.show_id, filled)
  }

  // Compute work items
  const workItems: WorkItem[] = shows.map(show => {
    const venue = (Array.isArray(show.venues) ? show.venues[0] : show.venues) as { id: string; name: string; city: string | null; state: string | null } | null
    const tour = tourMap.get(show.tour_id)
    const daysUntil = Math.ceil((new Date(show.event_date + 'T12:00:00').getTime() - today.getTime()) / 86_400_000)
    const packetStatus = show.venue_id ? (requestByVenue.get(show.venue_id) ?? null) : null
    const advanceFilled = advanceByShow.get(show.id) ?? 0

    return computeWorkItem(
      show.id,
      show.tour_id,
      tour?.tour_name ?? '',
      tour?.artist_name ?? '',
      show.event_date,
      show.venue_id,
      venue?.name ?? null,
      venue?.city ?? null,
      venue?.state ?? null,
      packetStatus,
      advanceFilled,
      daysUntil,
    )
  })

  // Sort: within same date bucket, critical first
  workItems.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    return HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]
  })

  const urgent = workItems.filter(w => w.daysUntil <= 7)
  const nearTerm = workItems.filter(w => w.daysUntil > 7 && w.daysUntil <= 30)
  const later = workItems.filter(w => w.daysUntil > 30)

  const needsAttention = workItems.filter(w => w.health === 'critical' || w.health === 'warning').length
  const firstName = profile?.display_name?.split(' ')[0] ?? null

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <p className="text-zinc-500 mt-0.5 text-sm">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {needsAttention > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                · {needsAttention} show{needsAttention !== 1 ? 's' : ''} need attention
              </span>
            )}
          </p>
        </div>
        <Link href="/artist/routing/new" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'gap-1.5')}>
          <Plus className="h-3.5 w-3.5" />
          New Tour
        </Link>
      </div>

      {/* Work queue */}
      <div className="space-y-6">
        {urgent.length > 0 && (
          <ShowGroup
            title="Next 7 days"
            shows={urgent}
            urgency="high"
          />
        )}
        {nearTerm.length > 0 && (
          <ShowGroup
            title="8 – 30 days"
            shows={nearTerm}
            urgency="medium"
          />
        )}
        {later.length > 0 && (
          <ShowGroup
            title="Beyond 30 days"
            shows={later}
            urgency="low"
          />
        )}
      </div>
    </div>
  )
}

// ── Show group ─────────────────────────────────────────────────────────────────

function ShowGroup({
  title,
  shows,
  urgency,
}: {
  title: string
  shows: WorkItem[]
  urgency: 'high' | 'medium' | 'low'
}) {
  const titleClass =
    urgency === 'high' ? 'text-red-500' :
    urgency === 'medium' ? 'text-amber-500' :
    'text-zinc-400'

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className={cn('text-xs font-semibold uppercase tracking-wide', titleClass)}>{title}</h2>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>
      <div className="space-y-2">
        {shows.map(item => <ShowWorkCard key={item.showId} item={item} />)}
      </div>
    </section>
  )
}

// ── Show work card ─────────────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<ShowHealth, {
  icon: React.ElementType
  chipClass: string
  label: string
}> = {
  critical:   { icon: AlertCircle,   chipClass: 'text-red-600 bg-red-50 border-red-200',     label: 'Action required' },
  warning:    { icon: Clock,         chipClass: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Needs attention' },
  'on-track': { icon: ClipboardCheck, chipClass: 'text-blue-600 bg-blue-50 border-blue-200', label: 'In progress' },
  ready:      { icon: CheckCircle2,  chipClass: 'text-green-600 bg-green-50 border-green-200', label: 'Ready' },
  'no-venue': { icon: MapPin,        chipClass: 'text-zinc-500 bg-zinc-50 border-zinc-200',  label: 'No venue' },
}

function daysLabel(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `${days} days`
  if (days < 14) return '1 week'
  if (days < 21) return '2 weeks'
  if (days < 30) return '3 weeks'
  return `${Math.ceil(days / 7)} weeks`
}

function ShowWorkCard({ item }: { item: WorkItem }) {
  const cfg = HEALTH_CONFIG[item.health]
  const Icon = cfg.icon

  const formattedDate = new Date(item.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  const locationParts = [item.venueName, [item.venueCity, item.venueState].filter(Boolean).join(', ')].filter(Boolean)

  return (
    <div className={cn(
      'rounded-xl border bg-white px-5 py-4 flex items-center gap-5 transition-shadow hover:shadow-sm',
      item.health === 'critical' && 'border-red-100',
      item.health === 'warning' && 'border-amber-100',
      item.health === 'on-track' && 'border-blue-100',
      item.health === 'ready' && 'border-green-100',
      item.health === 'no-venue' && 'border-zinc-200',
    )}>
      {/* Days-until pill */}
      <div className={cn(
        'shrink-0 rounded-lg border px-3 py-2 text-center min-w-[60px]',
        cfg.chipClass,
      )}>
        <p className="text-xs font-bold leading-none">{daysLabel(item.daysUntil)}</p>
      </div>

      {/* Show info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-zinc-900 truncate">
            {item.venueName ?? 'No venue'}
          </span>
          <span className="text-xs text-zinc-400 shrink-0">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-xs text-zinc-400 truncate">{item.artistName} · {item.tourName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5',
            cfg.chipClass,
          )}>
            <Icon className="h-2.5 w-2.5" />
            {cfg.label}
          </span>
          <span className="text-xs text-zinc-500">{item.detail}</span>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={item.ctaHref}
        className={cn(
          buttonVariants({ size: 'sm' }),
          'shrink-0 gap-1.5',
          item.health === 'ready' && 'bg-green-600 hover:bg-green-700',
          item.health === 'on-track' && 'bg-blue-600 hover:bg-blue-700',
        )}
      >
        {item.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

// ── Empty states ───────────────────────────────────────────────────────────────

function EmptyState({ hasToursButNoShows }: { hasToursButNoShows?: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">Your work queue will appear here.</p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-zinc-200 py-20 text-center">
        <Music2 className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
        {hasToursButNoShows ? (
          <>
            <p className="text-zinc-500 font-medium mb-1">No upcoming shows</p>
            <p className="text-sm text-zinc-400 mb-5">Add shows to your tours to start advancing.</p>
            <Link href="/artist/routing" className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
              <Calendar className="h-4 w-4" />
              Go to Tours
            </Link>
          </>
        ) : (
          <>
            <p className="text-zinc-500 font-medium mb-1">No tours yet</p>
            <p className="text-sm text-zinc-400 mb-5">Create your first tour to start advancing shows.</p>
            <Link href="/artist/routing/new" className={cn(buttonVariants(), 'gap-1.5')}>
              <Plus className="h-4 w-4" />
              Create Tour
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
