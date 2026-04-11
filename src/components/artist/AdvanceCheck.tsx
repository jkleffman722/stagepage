'use client'

import Link from 'next/link'
import { ADVANCE_CHECK_ITEMS, ADVANCE_CHECK_CATEGORIES } from '@/lib/advance-checks'
import type { TechRiderSection, PacketSection } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Info, MinusCircle, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  riderSections: TechRiderSection[]
  packetSections: PacketSection[]
  packetStatus: string | null
  packetLastUpdated: string | null
  venueId: string | null
  hasVenue: boolean
  tourId: string
  riderId: string | null
}

type CheckStatus = 'review' | 'venue-missing' | 'rider-missing' | 'empty' | 'venue-only'

function getStatus(riderVal: string | null, venueVal: string | null, hasRiderField: boolean, hasVenueField: boolean): CheckStatus {
  if (!hasRiderField && hasVenueField) {
    return venueVal ? 'venue-only' : 'venue-missing'
  }
  if (riderVal && venueVal) return 'review'
  if (riderVal && !venueVal) return 'venue-missing'
  if (!riderVal && venueVal) return 'rider-missing'
  return 'empty'
}

const STATUS_DISPLAY: Record<CheckStatus, { label: string; icon: React.ElementType; className: string }> = {
  'review':        { label: 'Review',         icon: AlertCircle,   className: 'text-amber-600 border-amber-200 bg-amber-50' },
  'venue-missing': { label: 'Venue missing',  icon: AlertCircle,   className: 'text-red-600 border-red-200 bg-red-50' },
  'rider-missing': { label: 'Rider missing',  icon: AlertCircle,   className: 'text-orange-600 border-orange-200 bg-orange-50' },
  'venue-only':    { label: 'Info',           icon: Info,          className: 'text-blue-600 border-blue-200 bg-blue-50' },
  'empty':         { label: 'Not filled',     icon: MinusCircle,   className: 'text-zinc-400 border-zinc-200 bg-zinc-50' },
}

function formatBooleanValue(val: string | null): string | null {
  if (val === 'true') return 'Yes'
  if (val === 'false') return 'No'
  return val
}

export function AdvanceCheck({
  riderSections,
  packetSections,
  packetStatus,
  packetLastUpdated,
  hasVenue,
  tourId,
  riderId,
}: Props) {
  // Build lookup maps
  const riderMap = new Map(riderSections.map(s => [s.section_key, s.fields]))
  const packetMap = new Map(packetSections.map(s => [s.section_key, s.fields]))

  const packetReceived = packetStatus === 'approved'

  // Summary counts (only when packet is received)
  const itemsWithStatus = ADVANCE_CHECK_ITEMS.map(item => {
    const riderVal = item.rider
      ? formatBooleanValue(String(riderMap.get(item.rider.section)?.[item.rider.field] ?? '') || null)
      : null
    const venueVal = item.venue
      ? formatBooleanValue(String(packetMap.get(item.venue.section)?.[item.venue.field] ?? '') || null)
      : null

    const cleanRider = riderVal === 'null' || riderVal === '' ? null : riderVal
    const cleanVenue = venueVal === 'null' || venueVal === '' ? null : venueVal

    const status = getStatus(cleanRider, cleanVenue, !!item.rider, !!item.venue)
    return { item, status, riderVal: cleanRider, venueVal: cleanVenue }
  })

  const reviewCount = itemsWithStatus.filter(i => i.status === 'review').length
  const missingCount = itemsWithStatus.filter(i => i.status === 'venue-missing' || i.status === 'rider-missing').length
  const criticalMissing = itemsWithStatus.filter(i =>
    (i.status === 'venue-missing' || i.status === 'rider-missing') && i.item.priority === 'critical'
  ).length

  // No venue assigned
  if (!hasVenue) {
    return (
      <div className="rounded-xl border-2 border-dashed border-zinc-200 py-12 text-center">
        <ClipboardList className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-zinc-500 font-medium">Advance check available once a venue is assigned</p>
        <p className="text-sm text-zinc-400 mt-1">Assign a venue to this show to start the advancing process.</p>
      </div>
    )
  }

  // Venue assigned but no packet yet
  if (!packetReceived) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-zinc-200 py-12 text-center">
          <ClipboardList className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">
            {packetStatus === 'pending'
              ? 'Waiting for venue to share their tech packet'
              : 'Request the venue tech packet to unlock advance check'}
          </p>
          <p className="text-sm text-zinc-400 mt-1">
            Once the venue shares their packet, StagePage will flag conflicts and missing data here.
          </p>
        </div>
        {!riderId && (
          <p className="text-sm text-center text-zinc-400">
            Also make sure your{' '}
            <Link href={`/artist/tours/${tourId}/rider`} className="underline underline-offset-2 hover:text-zinc-600">
              tech rider
            </Link>{' '}
            is filled in — it&apos;s the other half of the comparison.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs text-zinc-400 mb-0.5">Venue packet</p>
          <p className="text-sm font-medium text-zinc-700">
            Updated {packetLastUpdated ? new Date(packetLastUpdated).toLocaleDateString() : '—'}
          </p>
        </div>
        <div className="h-8 w-px bg-zinc-100" />
        {criticalMissing > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600">{criticalMissing} critical gaps</span>
          </div>
        )}
        {missingCount > criticalMissing && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-700">{missingCount - criticalMissing} missing fields</span>
          </div>
        )}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-zinc-600">{reviewCount} ready to review</span>
          </div>
        )}
      </div>

      {/* Check items grouped by category */}
      {ADVANCE_CHECK_CATEGORIES.map(category => {
        const items = itemsWithStatus.filter(i => i.item.category === category)
        if (items.length === 0) return null

        return (
          <div key={category} className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">{category}</h2>
            <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
              {items.map(({ item, status, riderVal, venueVal }) => {
                const { label: statusLabel, icon: StatusIcon, className } = STATUS_DISPLAY[status]
                const isCritical = item.priority === 'critical'

                return (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-medium', isCritical && status !== 'venue-only' && status !== 'empty' ? 'text-zinc-900' : 'text-zinc-700')}>
                            {item.label}
                          </span>
                          {isCritical && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Critical</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{item.note}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-xs shrink-0 inline-flex items-center gap-1', className)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {statusLabel}
                      </Badge>
                    </div>

                    <div className={cn(
                      'grid gap-3 mt-3',
                      item.rider && item.venue ? 'grid-cols-2' : 'grid-cols-1'
                    )}>
                      {item.rider && (
                        <ValueBox
                          label={item.rider.label}
                          value={riderVal}
                          side="rider"
                        />
                      )}
                      {item.venue && (
                        <ValueBox
                          label={item.venue.label}
                          value={venueVal}
                          side="venue"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ValueBox({
  label,
  value,
  side,
}: {
  label: string
  value: string | null
  side: 'rider' | 'venue'
}) {
  const hasValue = !!value
  return (
    <div className={cn(
      'rounded-md p-3 text-sm',
      side === 'rider' ? 'bg-zinc-50 border border-zinc-100' : 'bg-blue-50/50 border border-blue-100',
    )}>
      <p className={cn(
        'text-[10px] font-semibold uppercase tracking-wide mb-1',
        side === 'rider' ? 'text-zinc-400' : 'text-blue-400',
      )}>
        {label}
      </p>
      <p className={cn(
        hasValue ? 'text-zinc-800' : 'text-zinc-400 italic',
      )}>
        {value ?? 'Not filled in'}
      </p>
    </div>
  )
}
