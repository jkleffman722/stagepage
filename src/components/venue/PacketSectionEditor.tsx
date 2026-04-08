'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SectionDefinition, PacketSection, FieldDefinition, FieldSource } from '@/lib/types'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Check, Pencil, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  packetId: string
  sectionDef: SectionDefinition
  existingSection: PacketSection | null
  sortOrder: number
}

export function PacketSectionEditor({ packetId, sectionDef, existingSection, sortOrder }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(!existingSection)
  const [saving, setSaving] = useState(false)
  const [editedKeys, setEditedKeys] = useState<Set<string>>(new Set())

  const initialValues: Record<string, string> = {}
  sectionDef.fields.forEach(f => {
    const existing = existingSection?.fields?.[f.key]
    initialValues[f.key] = existing != null ? String(existing) : ''
  })
  const [values, setValues] = useState(initialValues)

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
    setEditedKeys(prev => new Set(prev).add(key))
  }

  const fieldSources = existingSection?.field_sources ?? {}

  const filledCount = sectionDef.fields.filter(f => {
    const val = existingSection?.fields?.[f.key]
    return val !== null && val !== '' && val !== undefined
  }).length
  const totalCount = sectionDef.fields.length
  const emptyCount = totalCount - filledCount
  const hasData = filledCount > 0

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    const fields: Record<string, string | number | boolean | null> = {}
    sectionDef.fields.forEach(f => {
      const val = values[f.key]
      if (f.type === 'number') fields[f.key] = val !== '' ? Number(val) : null
      else if (f.type === 'boolean') fields[f.key] = val === 'true'
      else fields[f.key] = val || null
    })

    // Update sources: manually edited fields → 'manual'
    const updatedSources: Record<string, FieldSource> = { ...fieldSources }
    editedKeys.forEach(key => {
      if (fields[key] !== null && fields[key] !== '') {
        updatedSources[key] = { type: 'manual' }
      } else {
        delete updatedSources[key]
      }
    })

    const payload = {
      packet_id: packetId,
      section_key: sectionDef.key,
      section_label: sectionDef.label,
      fields,
      field_sources: updatedSources,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    }

    const { error } = existingSection
      ? await supabase.from('packet_sections').update(payload).eq('id', existingSection.id)
      : await supabase.from('packet_sections').insert(payload)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    await supabase
      .from('technical_packets')
      .update({ last_updated_at: new Date().toISOString() })
      .eq('id', packetId)

    toast.success(`${sectionDef.label} saved`)
    setSaving(false)
    setEditing(false)
    setEditedKeys(new Set())
    router.refresh()
  }

  return (
    <Card className={cn(!hasData && 'border-red-100 bg-red-50/30')}>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{sectionDef.label}</CardTitle>
            {hasData && !editing && emptyCount > 0 && (
              <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                {emptyCount} empty
              </Badge>
            )}
            {hasData && !editing && emptyCount === 0 && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                Complete
              </Badge>
            )}
            {!hasData && (
              <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                No data
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasData && !editing && (
              <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setIsOpen(true) }}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(v => !v)}>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 space-y-4">
          {sectionDef.fields.map(field => {
            const val = values[field.key]
            const isEmpty = !val
            const source = fieldSources[field.key]

            return (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor={field.key}
                    className={cn(
                      'text-sm',
                      !editing && isEmpty ? 'text-red-400' : editing ? '' : 'text-zinc-400'
                    )}
                  >
                    {field.label}
                    {!editing && isEmpty && <span className="ml-1 text-red-400">·</span>}
                  </Label>
                  {!editing && source && (
                    <SourceBadge source={source} />
                  )}
                </div>
                <FieldInput
                  field={field}
                  value={val}
                  onChange={v => setValue(field.key, v)}
                  disabled={!editing}
                  isEmpty={!editing && isEmpty}
                />
              </div>
            )
          })}

          {editing && (
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Check className="h-3.5 w-3.5 mr-1" />
                {saving ? 'Saving...' : 'Save section'}
              </Button>
              {existingSection && (
                <Button size="sm" variant="ghost" onClick={() => {
                  setValues(initialValues)
                  setEditedKeys(new Set())
                  setEditing(false)
                }}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function SourceBadge({ source }: { source: FieldSource }) {
  if (source.type === 'pdf') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-blue-500 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 font-medium truncate max-w-[160px]" title={source.fileName}>
        <FileText className="h-2.5 w-2.5 shrink-0" />
        {source.fileName ?? 'PDF'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-[10px] text-zinc-400 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 font-medium">
      Manual
    </span>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
  isEmpty,
}: {
  field: FieldDefinition
  value: string
  onChange: (v: string) => void
  disabled: boolean
  isEmpty: boolean
}) {
  const emptyClass = isEmpty ? 'border-red-200 bg-red-50/50' : ''

  if (field.type === 'textarea') {
    return (
      <Textarea
        id={field.key}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={disabled ? (isEmpty ? 'Not filled in' : '—') : field.placeholder}
        disabled={disabled}
        className={cn('resize-none', emptyClass)}
        rows={3}
      />
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <Select value={value} onValueChange={v => onChange(v ?? '')} disabled={disabled}>
        <SelectTrigger className={emptyClass}>
          <SelectValue placeholder={disabled ? (isEmpty ? 'Not filled in' : '—') : `Select ${field.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {field.options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (field.type === 'boolean') {
    return (
      <Select value={value} onValueChange={v => onChange(v ?? '')} disabled={disabled}>
        <SelectTrigger className={emptyClass}>
          <SelectValue placeholder={disabled ? (isEmpty ? 'Not filled in' : '—') : 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      id={field.key}
      type={field.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={disabled ? (isEmpty ? 'Not filled in' : '—') : field.placeholder}
      disabled={disabled}
      className={emptyClass}
    />
  )
}
