'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

export function MarkRequestAddressed({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleMark() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('packet_field_requests')
      .update({ status: 'addressed', updated_at: new Date().toISOString() })
      .eq('id', requestId)
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Request marked as addressed')
    router.refresh()
  }

  return (
    <button
      onClick={handleMark}
      disabled={loading}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 transition-colors"
    >
      <Check className="h-3 w-3" />
      {loading ? 'Marking…' : 'Mark as addressed'}
    </button>
  )
}
