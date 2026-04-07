'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export function VenueOnboardingForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    capacity: '',
    website: '',
    contact_email: '',
    contact_phone: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('venues').insert({
      owner_id: userId,
      name: form.name,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      website: form.website || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Venue created!')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Venue Details</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Venue Name *</Label>
            <Input id="name" value={form.name} onChange={e => update('name', e.target.value)} required placeholder="The Fillmore" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={e => update('city', e.target.value)} placeholder="San Francisco" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={e => update('state', e.target.value)} placeholder="CA" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={e => update('address', e.target.value)} placeholder="1805 Geary Blvd" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" value={form.capacity} onChange={e => update('capacity', e.target.value)} placeholder="1200" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input id="contact_email" type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} placeholder="production@venue.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input id="contact_phone" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} placeholder="(415) 000-0000" />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save venue & continue'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
