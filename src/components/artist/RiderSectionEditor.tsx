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
import type { RiderSectionDefinition, TechRiderSection, FieldDefinition } from '@/lib/types'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Check, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  riderId: string
  sectionDef: RiderSectionDefinition
  existingSection: TechRiderSection | null
  sortOrder: number
}

export function RiderSectionEditor({ riderId, sectionDef, existingSection, sortOrder }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState(!existingSection)
  const [saving, setSaving] = useState(false)

  const initialValues: Record<string, string> = {}
  sectionDef.fields.forEach(f => {
    const existing = existingSection?.fields?.[f.key]
    initialValues[f.key] = existing != null ? String(existing) : ''
  })
  const [values, setValues] = useState(initialValues)

  function setValue(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

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

    const payload = {
      rider_id: riderId,
      section_key: sectionDef.key,
      section_label: sectionDef.label,
      fields,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    }

    const { error } = existingSection
      ? await supabase.from('tech_rider_sections').update(payload).eq('id', existingSection.id)
      : await supabase.from('tech_rider_sections').insert(payload)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    await supabase
      .from('tech_riders')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', riderId)

    toast.success(`${sectionDef.label} saved`)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <Card className={cn(!hasData && 'border-red-100 bg-red-50/30')}>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{sectionDef.label}</CardTitle>
            {hasData && !editing && emptyCount > 0 && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                {emptyCount} empty
              </Badge>
            )}
            {hasData && !editing && emptyCount === 0 && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                Complete
              </Badge>
            )}
            {!hasData && (
              <Badge variant="outline" className="text-xs text-zinc-400 border-zinc-200">
                Not started
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

            return (
              <div key={field.key} className="space-y-1.5">
                <Label
                  htmlFor={field.key}
                  className={cn(
                    'text-sm',
                    !editing && isEmpty ? 'text-zinc-400' : editing ? '' : 'text-zinc-400'
                  )}
                >
                  {field.label}
                </Label>
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
  const emptyClass = isEmpty ? 'border-zinc-200' : ''

  if (field.type === 'textarea') {
    return (
      <Textarea
        id={field.key}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={disabled ? (isEmpty ? '—' : '—') : field.placeholder}
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
          <SelectValue placeholder={disabled ? '—' : `Select ${field.label.toLowerCase()}`} />
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
          <SelectValue placeholder={disabled ? '—' : 'Select...'} />
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
      placeholder={disabled ? '—' : field.placeholder}
      disabled={disabled}
      className={emptyClass}
    />
  )
}
