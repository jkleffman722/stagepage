'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function PacketPublishToggle({
  packetId,
  isPublished,
}: {
  packetId: string
  isPublished: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('technical_packets')
      .update({ is_published: !isPublished })
      .eq('id', packetId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(isPublished ? 'Packet set to draft' : 'Packet published')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button size="sm" variant={isPublished ? 'outline' : 'default'} onClick={toggle} disabled={loading}>
      {loading ? '...' : isPublished ? 'Unpublish' : 'Publish'}
    </Button>
  )
}
