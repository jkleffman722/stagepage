'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function PacketPublishToggle({
  packetId,
  isPublished,
  missingRequiredCount = 0,
}: {
  packetId: string
  isPublished: boolean
  missingRequiredCount?: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function doPublish() {
    setLoading(true)
    setConfirming(false)
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

  function handleClick() {
    if (!isPublished && missingRequiredCount > 0) {
      setConfirming(true)
    } else {
      doPublish()
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-orange-600">
          {missingRequiredCount} required field{missingRequiredCount !== 1 ? 's' : ''} missing. Publish anyway?
        </span>
        <Button size="sm" variant="outline" onClick={doPublish} disabled={loading}>Yes, publish</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant={isPublished ? 'outline' : 'default'} onClick={handleClick} disabled={loading}>
      {loading ? '...' : isPublished ? 'Unpublish' : 'Publish'}
    </Button>
  )
}
