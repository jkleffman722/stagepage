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
import type { SectionDefinition, PacketSection, FieldDefinition } from '@/lib/types'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Check, Pencil } from 'lucide-react'

interface Props {
  packetId: string
  sectionDef: SectionDefinition
  existingSection: PacketSection | null
  sortOrder: number
}

export function PacketSectionEditor({ packetId, sectionDef, existingSection, sortOrder }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(!existingSection)
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

  const hasData = existingSection && Object.values(existingSection.fields).some(v => v !== null && v !== '')

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
      packet_id: packetId,
      section_key: sectionDef.key,
      section_label: sectionDef.label,
      fields,
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

    // Update packet last_updated_at
    await supabase
      .from('technical_packets')
      .update({ last_updated_at: new Date().toISOString() })
      .eq('id', packetId)

    toast.success(`${sectionDef.label} saved`)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{sectionDef.label}</CardTitle>
            {hasData && !editing && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                Filled in
              </Badge>
            )}
            {!hasData && (
              <Badge variant="outline" className="text-xs text-zinc-400">
                Empty
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
          {sectionDef.fields.map(field => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={val => setValue(field.key, val)}
              disabled={!editing}
            />
          ))}

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
}: {
  field: FieldDefinition
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const labelEl = (
    <Label htmlFor={field.key} className={disabled ? 'text-zinc-400' : ''}>
      {field.label}
    </Label>
  )

  if (field.type === 'textarea') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Textarea
          id={field.key}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={disabled ? '—' : field.placeholder}
          disabled={disabled}
          className="resize-none"
          rows={3}
        />
      </div>
    )
  }

  if (field.type === 'select' && field.options) {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Select value={value} onValueChange={v => onChange(v ?? '')} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={disabled ? '—' : `Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  if (field.type === 'boolean') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Select value={value} onValueChange={v => onChange(v ?? '')} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={disabled ? '—' : 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {labelEl}
      <Input
        id={field.key}
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={disabled ? '—' : field.placeholder}
        disabled={disabled}
      />
    </div>
  )
}
