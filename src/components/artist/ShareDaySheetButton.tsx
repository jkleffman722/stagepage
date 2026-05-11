'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Share2, Link2, Trash2, Check } from 'lucide-react'
import { createDaySheetShare, deleteAdvanceShare } from '@/app/actions/advance-shares'
import { cn } from '@/lib/utils'

interface Props {
  advanceId: string
  showId: string
  tourId: string
  existingToken?: string | null
}

export function ShareDaySheetButton({ advanceId, showId, existingToken }: Props) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(existingToken ?? null)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    const result = await createDaySheetShare(advanceId, showId)
    if ('error' in result) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    setToken(result.token)
    setUrl(result.url)
    setLoading(false)
    copyToClipboard(result.url)
  }

  async function handleCopy() {
    const shareUrl = url ?? (token ? `${window.location.origin}/share/day-sheet/${token}` : null)
    if (!shareUrl) return
    copyToClipboard(shareUrl)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      toast.success('Day sheet link copied')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleRevoke() {
    if (!token) return
    setRevoking(true)
    const result = await deleteAdvanceShare(token)
    if (result.error) {
      toast.error(result.error)
      setRevoking(false)
      return
    }
    setToken(null)
    setUrl(null)
    setRevoking(false)
    toast.success('Share link revoked')
  }

  const shareUrl = url ?? (token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/day-sheet/${token}` : null)

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(v => !v)}
        className={cn(open && 'border-zinc-300 bg-zinc-50')}
      >
        <Share2 className="h-3.5 w-3.5 mr-1.5" />
        Share
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-76 rounded-lg border border-zinc-200 bg-white shadow-lg z-50 p-4">
          <p className="text-sm font-medium text-zinc-800 mb-1">Share day sheet</p>
          <p className="text-xs text-zinc-500 mb-3">
            Anyone with the link sees a read-only version — no StagePage account required.
          </p>

          {!token ? (
            <Button size="sm" className="w-full" onClick={handleGenerate} disabled={loading}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              {loading ? 'Generating…' : 'Generate share link'}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2">
                <span className="text-xs text-zinc-500 truncate flex-1 font-mono">{shareUrl}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleCopy} disabled={copied}>
                  {copied
                    ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</>
                    : <><Link2 className="h-3.5 w-3.5 mr-1.5" />Copy link</>
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="text-red-500 hover:text-red-600 hover:border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-zinc-400">Revoking immediately disables access for anyone you shared it with.</p>
            </div>
          )}
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}
