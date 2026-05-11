'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Plus, Upload, MapPin, Trash2, AlertCircle, Clock, CheckCircle2,
  CircleDot, Circle, ChevronDown, ChevronUp, Lock, FileText, ClipboardList, Download,
  MoreHorizontal, Music2, List,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { RoutingAddShowModal } from './RoutingAddShowModal'
import { RoutingImportModal } from './RoutingImportModal'
import { AssignVenueModal } from './AssignVenueModal'
import { NewTourModal } from './NewTourModal'

interface Tour { id: string; tour_name: string; artist_name: string }

type ShowHealth = 'critical' | 'warning' | 'on-track' | 'ready' | 'no-venue'
type PacketStatus = 'approved' | 'pending' | 'denied' | 'revoked' | null

interface Attachment {
  id: string
  file_name: string
  storage_path: string
}

interface ShowRow {
  id: string
  tour_id: string
  event_date: string
  venue_id: string | null
  venue_name: string | null
  venue_city: string | null
  venue_state: string | null
  tour_name: string
  artist_name: string
  health: ShowHealth
  packetStatus: PacketStatus
  advanceFilled: number
  hasAdvance: boolean
  confirmedHotPoints: number
  attachments: Attachment[]
  primaryContact: string | null
  ctaHref: string
  daySheetHref: string
  daysUntil: number
}

interface Props {
  tours: Tour[]
  shows: ShowRow[]
}

const HEALTH_ICON: Record<ShowHealth, { icon: React.ReactNode; className: string }> = {
  'no-venue':  { icon: <Circle className="h-2.5 w-2.5" />,       className: 'text-zinc-400' },
  'critical':  { icon: <AlertCircle className="h-2.5 w-2.5" />,  className: 'text-red-500' },
  'warning':   { icon: <Clock className="h-2.5 w-2.5" />,        className: 'text-amber-500' },
  'on-track':  { icon: <CircleDot className="h-2.5 w-2.5" />,    className: 'text-blue-500' },
  'ready':     { icon: <CheckCircle2 className="h-2.5 w-2.5" />, className: 'text-green-500' },
}

function getNextAction(show: ShowRow): string {
  if (!show.venue_id) return 'Assign a venue'
  if (!show.packetStatus || show.packetStatus === 'revoked') return 'Request venue tech packet'
  if (show.packetStatus === 'denied') return 'Packet denied — contact venue directly'
  if (show.packetStatus === 'pending') return 'Waiting on packet approval'
  // Packet approved
  if (!show.hasAdvance || show.advanceFilled < 3) return 'Start advance sheet'
  if (show.advanceFilled < 12) return 'Continue advance sheet'
  return 'Review & share advance'
}

export function RoutingPageClient({ tours, shows }: Props) {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [activeTourFilter, setActiveTourFilter] = useState<string | null>(null)
  const [venueModalShow, setVenueModalShow] = useState<{ id: string; event_date: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [newTourOpen, setNewTourOpen] = useState(false)

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const filtered = activeTourFilter
    ? shows.filter(s => s.tour_id === activeTourFilter)
    : shows

  async function handleDelete(showId: string) {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('shows').delete().eq('id', showId)
    if (error) { toast.error(error.message); setDeleting(false); return }
    toast.success('Show removed')
    setConfirmDelete(null)
    setDeleting(false)
    router.refresh()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = filtered.filter(s => new Date(s.event_date + 'T12:00:00') >= today)
  const past = filtered.filter(s => new Date(s.event_date + 'T12:00:00') < today)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Routing</h1>
          <p className="mt-1 text-zinc-500 text-sm">All shows across your tours, sorted by date.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import Sheet
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Show
          </Button>
        </div>
      </div>

      {/* Tour filter chips + Add New Tour */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setActiveTourFilter(null)}
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
            activeTourFilter === null
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
          )}
        >
          All tours
        </button>
        {tours.map(t => {
          const isActive = activeTourFilter === t.id
          return (
            <div
              key={t.id}
              className={cn(
                'inline-flex items-center rounded-full border text-xs font-medium transition-colors overflow-hidden',
                isActive
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              )}
            >
              <button
                onClick={() => setActiveTourFilter(t.id)}
                className="px-3 py-1"
              >
                {t.tour_name}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'px-1.5 py-1 border-l transition-colors focus:outline-none',
                    isActive
                      ? 'border-white/20 text-white/60 hover:text-white hover:bg-white/10'
                      : 'border-zinc-200 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-50'
                  )}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={6}>
                  <DropdownMenuItem className="p-0">
                    <Link
                      href={`/artist/routing/${t.id}/rider`}
                      className="flex items-center gap-2 px-2 py-1.5 w-full"
                    >
                      <Music2 className="h-3.5 w-3.5 text-zinc-400" />
                      Tech Rider
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="p-0">
                    <Link
                      href={`/artist/routing/${t.id}/input-list`}
                      className="flex items-center gap-2 px-2 py-1.5 w-full"
                    >
                      <List className="h-3.5 w-3.5 text-zinc-400" />
                      Input List
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
        <button
          onClick={() => setNewTourOpen(true)}
          className="px-3 py-1 rounded-full text-xs font-medium border border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          New tour
        </button>
      </div>

      {shows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 py-20 text-center">
          <p className="text-zinc-400 mb-4">No shows yet. Add one or import a routing sheet.</p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import Sheet
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Show
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <ShowSection
              title="Upcoming"
              shows={upcoming}
              tours={tours}
              confirmDelete={confirmDelete}
              deleting={deleting}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onAssignVenue={show => setVenueModalShow(show)}
              onConfirmDelete={id => setConfirmDelete(id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onDelete={handleDelete}
            />
          )}
          {past.length > 0 && (
            <ShowSection
              title="Past"
              shows={past}
              tours={tours}
              confirmDelete={confirmDelete}
              deleting={deleting}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onAssignVenue={show => setVenueModalShow(show)}
              onConfirmDelete={id => setConfirmDelete(id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onDelete={handleDelete}
              muted
            />
          )}
        </div>
      )}

      <RoutingAddShowModal tours={tours} open={addOpen} onClose={() => setAddOpen(false)} />
      <RoutingImportModal tours={tours} open={importOpen} onClose={() => setImportOpen(false)} />
      <NewTourModal open={newTourOpen} onClose={() => setNewTourOpen(false)} />
      {venueModalShow && (
        <AssignVenueModal
          show={venueModalShow}
          open={true}
          onClose={() => setVenueModalShow(null)}
        />
      )}
    </>
  )
}

function ShowSection({
  title, shows, tours, confirmDelete, deleting, expanded,
  onToggleExpand, onAssignVenue, onConfirmDelete, onCancelDelete, onDelete, muted,
}: {
  title: string
  shows: ShowRow[]
  tours: Tour[]
  confirmDelete: string | null
  deleting: boolean
  expanded: Set<string>
  onToggleExpand: (id: string) => void
  onAssignVenue: (show: { id: string; event_date: string }) => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  onDelete: (id: string) => void
  muted?: boolean
}) {
  const multipleTours = tours.length > 1

  return (
    <div>
      <p className={cn('text-xs font-semibold uppercase tracking-wider mb-2', muted ? 'text-zinc-400' : 'text-zinc-500')}>
        {title}
      </p>
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        {shows.map(show => {
          const dot = HEALTH_ICON[show.health]
          const date = new Date(show.event_date + 'T12:00:00')
          const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          const isConfirming = confirmDelete === show.id
          const isExpanded = expanded.has(show.id)

          return (
            <div key={show.id} className={cn('border-b border-zinc-100 last:border-0', muted && 'opacity-60')}>
              {/* Summary row */}
              <div
                className="flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-zinc-50 transition-colors"
                onClick={() => onToggleExpand(show.id)}
              >
                {/* Date */}
                <span className="text-xs text-zinc-500 w-36 shrink-0 font-medium">{formatted}</span>

                {/* Venue + tour */}
                <div className="flex-1 min-w-0">
                  {show.venue_name ? (
                    <p className="text-sm font-medium text-zinc-800 truncate">{show.venue_name}</p>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">No venue</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {(show.venue_city || show.venue_state) && (
                      <span className="text-xs text-zinc-400 flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {[show.venue_city, show.venue_state].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {show.primaryContact && (
                      <span className="text-xs text-zinc-400 truncate max-w-56">{show.primaryContact}</span>
                    )}
                    {multipleTours && (
                      <span className="text-xs text-zinc-400">{show.artist_name} · {show.tour_name}</span>
                    )}
                  </div>
                </div>

                {/* Confirmation progress — only when advance has been started */}
                {show.hasAdvance && show.confirmedHotPoints > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="h-1 w-16 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', show.confirmedHotPoints === 12 ? 'bg-emerald-500' : 'bg-zinc-300')}
                        style={{ width: `${(show.confirmedHotPoints / 12) * 100}%` }}
                      />
                    </div>
                    <span className={cn('text-[10px] tabular-nums font-medium', show.confirmedHotPoints === 12 ? 'text-emerald-600' : 'text-zinc-400')}>
                      {show.confirmedHotPoints}/12
                    </span>
                  </div>
                )}

                {/* Next action */}
                <div className={cn('flex items-center gap-1.5 text-[10px] font-medium shrink-0 max-w-44 text-right', dot.className)}>
                  {dot.icon}
                  <span>{getNextAction(show)}</span>
                </div>

                {/* Delete — stop propagation so it doesn't toggle expand */}
                <div onClick={e => e.stopPropagation()} className="shrink-0">
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Remove?</span>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(show.id)} disabled={deleting}>
                        {deleting ? '…' : 'Yes'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={onCancelDelete}>No</Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-zinc-200 hover:text-red-400"
                      onClick={e => { e.stopPropagation(); onConfirmDelete(show.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Expand chevron */}
                <div className="shrink-0 text-zinc-300">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Lifecycle panel */}
              {isExpanded && (
                <ShowLifecycle show={show} onAssignVenue={onAssignVenue} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Lifecycle panel ────────────────────────────────────────────────────────────

type StageStatus = 'done' | 'active' | 'blocked' | 'locked'

interface Stage {
  key: string
  label: string
  icon: React.ReactNode
  status: StageStatus
  statusText: string
  actionLabel?: string
  actionHref?: string
  actionOnClick?: () => void
}

function ShowLifecycle({
  show,
  onAssignVenue,
}: {
  show: ShowRow
  onAssignVenue: (s: { id: string; event_date: string }) => void
}) {
  const advanceHref = show.ctaHref
  const packetHref = show.venue_id ? `/artist/packets/${show.venue_id}` : null

  const stages: Stage[] = [
    // ── Stage 1: Venue ────────────────────────────────────────────────────────
    {
      key: 'venue',
      label: 'Venue',
      icon: <MapPin className="h-4 w-4" />,
      status: show.venue_id ? 'done' : 'active',
      statusText: show.venue_id
        ? [show.venue_name, show.venue_city, show.venue_state].filter(Boolean).join(', ')
        : 'No venue assigned',
      actionLabel: show.venue_id ? undefined : 'Assign venue',
      actionOnClick: show.venue_id ? undefined : () => onAssignVenue({ id: show.id, event_date: show.event_date }),
    },

    // ── Stage 2: Tech Packet ──────────────────────────────────────────────────
    (() => {
      if (!show.venue_id) return {
        key: 'packet',
        label: 'Tech Packet',
        icon: <FileText className="h-4 w-4" />,
        status: 'locked' as StageStatus,
        statusText: 'Assign a venue first',
      }
      const s = show.packetStatus
      if (s === 'approved') return {
        key: 'packet',
        label: 'Tech Packet',
        icon: <FileText className="h-4 w-4" />,
        status: 'done' as StageStatus,
        statusText: 'Packet received',
        actionLabel: 'View packet',
        actionHref: packetHref ?? advanceHref,
      }
      if (s === 'pending') return {
        key: 'packet',
        label: 'Tech Packet',
        icon: <FileText className="h-4 w-4" />,
        status: 'active' as StageStatus,
        statusText: 'Request sent — awaiting venue',
        actionLabel: 'Open advance',
        actionHref: advanceHref,
      }
      if (s === 'denied') return {
        key: 'packet',
        label: 'Tech Packet',
        icon: <FileText className="h-4 w-4" />,
        status: 'blocked' as StageStatus,
        statusText: 'Request denied — contact venue directly',
        actionLabel: 'Open advance',
        actionHref: advanceHref,
      }
      if (s === 'revoked') return {
        key: 'packet',
        label: 'Tech Packet',
        icon: <FileText className="h-4 w-4" />,
        status: 'blocked' as StageStatus,
        statusText: 'Access revoked',
        actionLabel: 'Open advance',
        actionHref: advanceHref,
      }
      return {
        key: 'packet',
        label: 'Tech Packet',
        icon: <FileText className="h-4 w-4" />,
        status: 'active' as StageStatus,
        statusText: 'Not yet requested',
        actionLabel: 'Request packet',
        actionHref: advanceHref,
      }
    })(),

    // ── Stage 3: Advance Sheet ────────────────────────────────────────────────
    (() => {
      const packetApproved = show.packetStatus === 'approved'
      if (!show.venue_id || !show.packetStatus) return {
        key: 'advance',
        label: 'Advance Sheet',
        icon: <ClipboardList className="h-4 w-4" />,
        status: 'locked' as StageStatus,
        statusText: 'Complete previous steps first',
      }
      if (!show.hasAdvance || show.advanceFilled < 3) return {
        key: 'advance',
        label: 'Advance Sheet',
        icon: <ClipboardList className="h-4 w-4" />,
        status: packetApproved ? 'active' : 'active' as StageStatus,
        statusText: 'Not started',
        actionLabel: 'Start advance',
        actionHref: advanceHref,
      }
      if (show.advanceFilled < 12) return {
        key: 'advance',
        label: 'Advance Sheet',
        icon: <ClipboardList className="h-4 w-4" />,
        status: 'active' as StageStatus,
        statusText: `${show.advanceFilled} fields filled · ${show.confirmedHotPoints}/12 confirmed`,
        actionLabel: 'Continue',
        actionHref: advanceHref,
      }
      return {
        key: 'advance',
        label: 'Advance Sheet',
        icon: <ClipboardList className="h-4 w-4" />,
        status: 'done' as StageStatus,
        statusText: `${show.advanceFilled} fields filled · ${show.confirmedHotPoints}/12 confirmed`,
        actionLabel: 'Review',
        actionHref: advanceHref,
      }
    })(),

    // ── Stage 4: Day Sheet ────────────────────────────────────────────────────
    (() => {
      if (!show.hasAdvance) return {
        key: 'daysheet',
        label: 'Day Sheet',
        icon: <Lock className="h-4 w-4" />,
        status: 'locked' as StageStatus,
        statusText: 'Start advance sheet first',
      }
      return {
        key: 'daysheet',
        label: 'Day Sheet',
        icon: <FileText className="h-4 w-4" />,
        status: 'active' as StageStatus,
        statusText: 'Ready to generate',
        actionLabel: 'View day sheet',
        actionHref: show.daySheetHref,
      }
    })(),
  ]

  return (
    <div className="px-4 pb-4 pt-1 bg-zinc-50 border-t border-zinc-100">
      <div className="flex items-start gap-0">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex-1 flex items-start gap-0 min-w-0">
            <div className="flex-1 min-w-0 px-3 py-3">
              {/* Icon + connector line */}
              <div className="flex items-center gap-0 mb-2">
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center shrink-0 border',
                  stage.status === 'done'    && 'bg-green-50 border-green-200 text-green-600',
                  stage.status === 'active'  && 'bg-white border-zinc-300 text-zinc-600',
                  stage.status === 'blocked' && 'bg-red-50 border-red-200 text-red-500',
                  stage.status === 'locked'  && 'bg-zinc-100 border-zinc-200 text-zinc-300',
                )}>
                  {stage.status === 'done'
                    ? <CheckCircle2 className="h-4 w-4" />
                    : stage.status === 'blocked'
                      ? <AlertCircle className="h-4 w-4" />
                      : stage.icon}
                </div>
                {i < stages.length - 1 && (
                  <div className={cn(
                    'flex-1 h-px mx-2',
                    stage.status === 'done' ? 'bg-green-200' : 'bg-zinc-200'
                  )} />
                )}
              </div>

              {/* Label */}
              <p className={cn(
                'text-xs font-semibold',
                stage.status === 'done'    && 'text-zinc-700',
                stage.status === 'active'  && 'text-zinc-700',
                stage.status === 'blocked' && 'text-red-600',
                stage.status === 'locked'  && 'text-zinc-400',
              )}>
                {stage.label}
              </p>

              {/* Status text */}
              <p className={cn(
                'text-[11px] mt-0.5 leading-tight',
                stage.status === 'done'    && 'text-zinc-500',
                stage.status === 'active'  && 'text-zinc-500',
                stage.status === 'blocked' && 'text-red-500',
                stage.status === 'locked'  && 'text-zinc-400',
              )}>
                {stage.statusText}
              </p>

              {/* Action link */}
              {stage.actionLabel && (
                <div className="mt-2">
                  {stage.actionHref ? (
                    <Link
                      href={stage.actionHref}
                      className="text-[11px] font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                    >
                      {stage.actionLabel} →
                    </Link>
                  ) : (
                    <button
                      onClick={stage.actionOnClick}
                      className="text-[11px] font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                    >
                      {stage.actionLabel} →
                    </button>
                  )}
                </div>
              )}

              {/* PDF attachments — only on the packet stage when approved */}
              {stage.key === 'packet' && stage.status === 'done' && show.attachments.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {show.attachments.map(att => (
                    <AttachmentRow key={att.id} attachment={att} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('tech-packets')
      .createSignedUrl(attachment.storage_path, 60)
    if (error || !data) {
      toast.error('Could not generate download link')
    } else {
      window.open(data.signedUrl, '_blank')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5">
      <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
      <span className="text-[11px] text-zinc-600 flex-1 truncate">{attachment.file_name}</span>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-0.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
      >
        <Download className="h-3 w-3" />
        {loading ? '…' : 'PDF'}
      </button>
    </div>
  )
}
