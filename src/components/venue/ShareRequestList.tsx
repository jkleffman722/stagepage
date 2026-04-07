'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ShareRequest } from '@/lib/types'
import { toast } from 'sonner'

const STATUS_BADGE: Record<ShareRequest['status'], React.ReactNode> = {
  pending: <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>,
  approved: <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>,
  denied: <Badge variant="outline" className="text-red-500 border-red-300">Denied</Badge>,
  revoked: <Badge variant="outline" className="text-zinc-400">Revoked</Badge>,
}

export function ShareRequestList({
  requests,
  venueId,
}: {
  requests: ShareRequest[]
  venueId: string
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const pending = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const past = requests.filter(r => ['denied', 'revoked'].includes(r.status))

  async function updateStatus(id: string, status: ShareRequest['status']) {
    setLoadingId(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('share_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Request ${status}`)
      router.refresh()
    }
    setLoadingId(null)
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-zinc-400">
          No requests yet. When artists request access to your packet,
          they&apos;ll appear here.
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">
          Pending {pending.length > 0 && <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 rounded-full px-1.5">{pending.length}</span>}
        </TabsTrigger>
        <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
        <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="space-y-3 mt-4">
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4">No pending requests.</p>
        ) : (
          pending.map(r => (
            <RequestCard
              key={r.id}
              request={r}
              loading={loadingId === r.id}
              actions={
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateStatus(r.id, 'approved')} disabled={loadingId === r.id}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'denied')} disabled={loadingId === r.id}>
                    Deny
                  </Button>
                </div>
              }
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="approved" className="space-y-3 mt-4">
        {approved.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4">No approved requests.</p>
        ) : (
          approved.map(r => (
            <RequestCard
              key={r.id}
              request={r}
              loading={loadingId === r.id}
              actions={
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'revoked')} disabled={loadingId === r.id}>
                  Revoke access
                </Button>
              }
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="past" className="space-y-3 mt-4">
        {past.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4">No past requests.</p>
        ) : (
          past.map(r => (
            <RequestCard key={r.id} request={r} loading={false} actions={null} />
          ))
        )}
      </TabsContent>
    </Tabs>
  )
}

function RequestCard({
  request,
  loading,
  actions,
}: {
  request: ShareRequest
  loading: boolean
  actions: React.ReactNode
}) {
  return (
    <Card className={loading ? 'opacity-60' : ''}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {request.requester_name ?? 'Unknown'}
              </span>
              {STATUS_BADGE[request.status]}
            </div>
            <p className="text-sm text-zinc-500">{request.requester_email}</p>
            {request.event_date && (
              <p className="text-sm text-zinc-500">
                Event date: {new Date(request.event_date).toLocaleDateString()}
              </p>
            )}
            {request.message && (
              <p className="text-sm text-zinc-600 mt-1 italic">&ldquo;{request.message}&rdquo;</p>
            )}
            <p className="text-xs text-zinc-400">
              Requested {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
