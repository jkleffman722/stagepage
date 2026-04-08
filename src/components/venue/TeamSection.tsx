'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { UserPlus, Crown, Trash2 } from 'lucide-react'

interface Member {
  id: string
  email: string
  role: string
  status: string
  invited_at: string
}

interface Props {
  venueId: string
  members: Member[]
  ownerEmail: string
}

export function TeamSection({ venueId, members, ownerEmail }: Props) {
  const router = useRouter()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const supabase = createClient()

    const { error } = await supabase.from('venue_members').insert({
      venue_id: venueId,
      email: inviteEmail.trim().toLowerCase(),
      role: 'member',
      status: 'pending',
    })

    if (error) {
      if (error.code === '42P01') {
        toast.error('Team feature not enabled — run the SQL from Settings to activate it.')
      } else if (error.code === '23505') {
        toast.error('This person has already been invited.')
      } else {
        toast.error(error.message)
      }
    } else {
      toast.success(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      router.refresh()
    }
    setInviting(false)
  }

  async function handleRemove(memberId: string) {
    const supabase = createClient()
    const { error } = await supabase.from('venue_members').delete().eq('id', memberId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Member removed')
      router.refresh()
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
      {/* Owner row */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center">
            <Crown className="h-3.5 w-3.5 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">{ownerEmail}</p>
            <p className="text-xs text-zinc-400">Owner</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs text-zinc-500">Owner</Badge>
      </div>

      {/* Invited members */}
      {members.map(m => (
        <div key={m.id} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center">
              <span className="text-xs font-medium text-zinc-500">
                {m.email[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm text-zinc-900">{m.email}</p>
              <p className="text-xs text-zinc-400">
                Invited {new Date(m.invited_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={m.status === 'active'
                ? 'text-xs text-green-600 border-green-200'
                : 'text-xs text-yellow-600 border-yellow-200'}
            >
              {m.status === 'active' ? 'Active' : 'Pending'}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemove(m.id)}
              className="text-zinc-400 hover:text-red-500 h-7 w-7 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Invite input */}
      <div className="px-4 py-4">
        <p className="text-xs font-medium text-zinc-500 mb-2.5">Invite by email</p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="colleague@email.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            className="flex-1"
          />
          <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} size="sm">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            {inviting ? 'Inviting...' : 'Invite'}
          </Button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">
          They&apos;ll get access when they sign up with this email address.
        </p>
      </div>
    </div>
  )
}
