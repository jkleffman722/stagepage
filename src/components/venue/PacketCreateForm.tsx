'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { PACKET_SECTIONS } from '@/lib/types'
import { toast } from 'sonner'

export function PacketCreateForm({ venueId }: { venueId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    setLoading(true)
    const supabase = createClient()

    const { data: packet, error } = await supabase
      .from('technical_packets')
      .insert({ venue_id: venueId })
      .select()
      .single()

    if (error || !packet) {
      toast.error(error?.message ?? 'Failed to create packet')
      setLoading(false)
      return
    }

    toast.success('Packet created! Start filling in your sections.')
    router.push('/venue/packet')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your packet will include these sections</CardTitle>
        <CardDescription>
          You can fill in any section now or later — all sections start empty.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {PACKET_SECTIONS.map(s => (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 mt-px" />
              <span className="font-medium">{s.label}</span>
              <span className="text-zinc-400">— {s.fields.length} fields</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create packet'}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </CardFooter>
    </Card>
  )
}
