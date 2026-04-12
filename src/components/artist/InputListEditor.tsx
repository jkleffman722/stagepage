'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INPUT_TYPES } from '@/lib/types'
import type { InputListChannel } from '@/lib/types'

// ── Row state ────────────────────────────────────────────────────────────────

interface ChannelRow {
  _key: string       // stable React key (db id or temp id)
  id: string | null  // null = not yet saved
  sort_order: number
  channel_number: string
  source_name: string
  input_type: string
  mic_model: string
  phantom_power: string  // 'true' | 'false' | ''
  stage_location: string
  monitor_mixes: string
  notes: string
  isDirty: boolean
  isDeleted: boolean
}

let _tempCounter = 0
function tempKey() { return `new-${++_tempCounter}` }

function dbRowToState(ch: InputListChannel): ChannelRow {
  return {
    _key: ch.id,
    id: ch.id,
    sort_order: ch.sort_order,
    channel_number: ch.channel_number != null ? String(ch.channel_number) : '',
    source_name: ch.source_name ?? '',
    input_type: ch.input_type ?? '',
    mic_model: ch.mic_model ?? '',
    phantom_power: ch.phantom_power != null ? String(ch.phantom_power) : '',
    stage_location: ch.stage_location ?? '',
    monitor_mixes: ch.monitor_mixes ?? '',
    notes: ch.notes ?? '',
    isDirty: false,
    isDeleted: false,
  }
}

function nextChannelNumber(rows: ChannelRow[]): number {
  const nums = rows
    .filter(r => !r.isDeleted && r.channel_number !== '')
    .map(r => parseInt(r.channel_number))
    .filter(n => !isNaN(n))
  return nums.length > 0 ? Math.max(...nums) + 1 : 1
}

// ── Derive monitor mix count from all rows ────────────────────────────────────

function deriveMonitorMixCount(rows: ChannelRow[]): number | null {
  const mixes = new Set<string>()
  rows
    .filter(r => !r.isDeleted && r.monitor_mixes)
    .forEach(r => {
      r.monitor_mixes.split(',').forEach(m => {
        const cleaned = m.trim().toLowerCase()
        if (cleaned && cleaned !== 'all' && cleaned !== 'all mixes') {
          mixes.add(cleaned)
        }
      })
    })
  return mixes.size > 0 ? mixes.size : null
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  listId: string
  riderId: string | null
  initialChannels: InputListChannel[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InputListEditor({ listId, riderId, initialChannels }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<ChannelRow[]>(() => initialChannels.map(dbRowToState))
  const [saving, setSaving] = useState(false)
  const focusNextRef = useRef<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Focus the source input of a newly added row
  useEffect(() => {
    if (focusNextRef.current) {
      const el = inputRefs.current[focusNextRef.current]
      el?.focus()
      focusNextRef.current = null
    }
  })

  const activeRows = rows.filter(r => !r.isDeleted)
  const dirtyCount =
    rows.filter(r => r.isDirty && !r.isDeleted).length +
    rows.filter(r => r.isDeleted && r.id !== null).length

  function updateRow(key: string, field: 'channel_number' | 'source_name' | 'input_type' | 'mic_model' | 'phantom_power' | 'stage_location' | 'monitor_mixes' | 'notes', value: string) {
    setRows(prev => prev.map(r =>
      r._key === key ? { ...r, [field]: value, isDirty: true } : r
    ))
  }

  function addRow() {
    const key = tempKey()
    const newRow: ChannelRow = {
      _key: key,
      id: null,
      sort_order: rows.filter(r => !r.isDeleted).length,
      channel_number: String(nextChannelNumber(rows)),
      source_name: '',
      input_type: '',
      mic_model: '',
      phantom_power: '',
      stage_location: '',
      monitor_mixes: '',
      notes: '',
      isDirty: true,
      isDeleted: false,
    }
    setRows(prev => [...prev, newRow])
    focusNextRef.current = key
  }

  function deleteRow(key: string) {
    setRows(prev => prev.map(r =>
      r._key === key ? { ...r, isDeleted: true, isDirty: true } : r
    ))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    try {
      // Delete removed rows
      const toDelete = rows.filter(r => r.isDeleted && r.id !== null).map(r => r.id!)
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('input_list_channels')
          .delete()
          .in('id', toDelete)
        if (error) throw error
      }

      // Upsert dirty active rows
      const toUpsert = rows.filter(r => r.isDirty && !r.isDeleted)
      for (const row of toUpsert) {
        const payload = {
          list_id: listId,
          channel_number: row.channel_number ? parseInt(row.channel_number) : null,
          source_name: row.source_name || null,
          input_type: row.input_type || null,
          mic_model: row.mic_model || null,
          phantom_power: row.phantom_power === 'true' ? true : row.phantom_power === 'false' ? false : null,
          stage_location: row.stage_location || null,
          monitor_mixes: row.monitor_mixes || null,
          notes: row.notes || null,
          sort_order: row.sort_order,
          updated_at: new Date().toISOString(),
        }
        if (row.id) {
          const { error } = await supabase.from('input_list_channels').update(payload).eq('id', row.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('input_list_channels').insert(payload)
          if (error) throw error
        }
      }

      // Update list timestamp
      await supabase
        .from('input_lists')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', listId)

      // Auto-update rider audio section with derived channel count + monitor mix count
      if (riderId) {
        const activeNonEmpty = rows.filter(r => !r.isDeleted && r.source_name.trim())
        const totalChannels = activeNonEmpty.length
        const monitorMixCount = deriveMonitorMixCount(rows)

        const { data: audioSection } = await supabase
          .from('tech_rider_sections')
          .select('id, fields')
          .eq('rider_id', riderId)
          .eq('section_key', 'audio')
          .single()

        const updatedFields = {
          ...(audioSection?.fields ?? {}),
          required_channel_count: totalChannels || null,
          ...(monitorMixCount != null ? { required_monitor_mixes: monitorMixCount } : {}),
        }

        if (audioSection) {
          await supabase
            .from('tech_rider_sections')
            .update({ fields: updatedFields, updated_at: new Date().toISOString() })
            .eq('id', audioSection.id)
        } else {
          await supabase.from('tech_rider_sections').insert({
            rider_id: riderId,
            section_key: 'audio',
            section_label: 'Audio System',
            fields: updatedFields,
            sort_order: 1,
          })
        }
      }

      toast.success('Input list saved')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-400">
          Channels sorted by number · changes tracked automatically
        </p>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {dirtyCount} unsaved {dirtyCount === 1 ? 'change' : 'changes'}
            </span>
          )}
          <Button size="sm" onClick={handleSave} disabled={saving || dirtyCount === 0}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 960 }}>
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <Th style={{ width: 52 }}>Ch #</Th>
              <Th style={{ width: 180 }}>Source / Instrument</Th>
              <Th style={{ width: 160 }}>Type</Th>
              <Th style={{ width: 156 }}>Mic / DI Model</Th>
              <Th style={{ width: 64 }}>48V</Th>
              <Th style={{ width: 96 }}>Location</Th>
              <Th style={{ width: 148 }}>Monitor Mixes</Th>
              <Th>Notes</Th>
              <Th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {activeRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-zinc-400 text-sm">
                  No channels yet. Add your first channel below.
                </td>
              </tr>
            ) : (
              activeRows.map((row) => (
                <tr key={row._key} className="group hover:bg-zinc-50/60">
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      value={row.channel_number}
                      onChange={e => updateRow(row._key, 'channel_number', e.target.value)}
                      className="h-7 text-xs text-center px-1"
                      min={1}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      ref={el => { inputRefs.current[row._key] = el }}
                      value={row.source_name}
                      onChange={e => updateRow(row._key, 'source_name', e.target.value)}
                      placeholder="e.g. Kick In, Lead Vocal"
                      className={cn('h-7 text-xs', !row.source_name && 'border-dashed')}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Select
                      value={row.input_type}
                      onValueChange={v => updateRow(row._key, 'input_type', v ?? '')}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {INPUT_TYPES.map(t => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.mic_model}
                      onChange={e => updateRow(row._key, 'mic_model', e.target.value)}
                      placeholder="e.g. SM58"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Select
                      value={row.phantom_power}
                      onValueChange={v => updateRow(row._key, 'phantom_power', v ?? '')}
                    >
                      <SelectTrigger className={cn(
                        'h-7 text-xs',
                        row.input_type === 'Ribbon mic' && row.phantom_power === 'true'
                          ? 'border-red-400 bg-red-50'
                          : ''
                      )}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true" className="text-xs">Yes</SelectItem>
                        <SelectItem value="false" className="text-xs">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.stage_location}
                      onChange={e => updateRow(row._key, 'stage_location', e.target.value)}
                      placeholder="e.g. DSC"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.monitor_mixes}
                      onChange={e => updateRow(row._key, 'monitor_mixes', e.target.value)}
                      placeholder="e.g. Mix 1, Mix 3"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={row.notes}
                      onChange={e => updateRow(row._key, 'notes', e.target.value)}
                      placeholder="Warnings, preferences…"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <button
                      onClick={() => deleteRow(row._key)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-300 hover:text-red-400 transition-all rounded"
                      title="Remove channel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ribbon mic 48V warning */}
      {activeRows.some(r => r.input_type === 'Ribbon mic' && r.phantom_power === 'true') && (
        <p className="text-xs text-red-600 font-medium">
          Warning: one or more ribbon mics have 48V phantom power enabled — this will damage them.
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Channel
        </Button>
        {activeRows.length > 0 && (
          <p className="text-xs text-zinc-400">
            {activeRows.filter(r => r.source_name).length} channels ·{' '}
            {activeRows.filter(r => r.phantom_power === 'true').length} need 48V
          </p>
        )}
      </div>
    </div>
  )
}

function Th({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th
      className="px-2 py-2 text-left text-xs font-medium text-zinc-500 whitespace-nowrap"
      style={style}
    >
      {children}
    </th>
  )
}
