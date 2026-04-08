'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Venue } from '@/lib/types'

interface Props {
  venue: Venue
}

export function VenueSettingsForm({ venue }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({
    name: venue.name ?? '',
    city: venue.city ?? '',
    state: venue.state ?? '',
    capacity: venue.capacity ? String(venue.capacity) : '',
    website: venue.website ?? '',
    contact_email: venue.contact_email ?? '',
    contact_phone: venue.contact_phone ?? '',
  })

  function set(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('venues')
      .update({
        name: values.name,
        city: values.city || null,
        state: values.state || null,
        capacity: values.capacity ? Number(values.capacity) : null,
        website: values.website || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venue.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Venue profile saved')
      router.refresh()
    }
    setSaving(false)
  }

  const fields = [
    { key: 'name', label: 'Venue Name', required: true },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'website', label: 'Website' },
    { key: 'contact_email', label: 'Contact Email' },
    { key: 'contact_phone', label: 'Contact Phone' },
  ]

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {fields.map(f => (
          <div key={f.key} className={f.key === 'name' ? 'sm:col-span-2' : ''}>
            <Label htmlFor={f.key} className="text-sm">
              {f.label}
              {f.required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
              id={f.key}
              type={f.type ?? 'text'}
              value={values[f.key as keyof typeof values]}
              onChange={e => set(f.key, e.target.value)}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>
      <div className="pt-1">
        <Button onClick={handleSave} disabled={saving || !values.name}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
