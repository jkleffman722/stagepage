'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ARTIST_ROLES } from '@/lib/types'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'

interface Props {
  userId: string
  defaultRole?: string
}

export function TourSetupForm({ userId, defaultRole = '' }: Props) {
  const router = useRouter()
  const [artistName, setArtistName] = useState('')
  const [tourName, setTourName] = useState('')
  const [userRole, setUserRole] = useState(defaultRole)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!artistName.trim() || !tourName.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.from('tours').insert({
      profile_id: userId,
      artist_name: artistName.trim(),
      tour_name: tourName.trim(),
      user_role: userRole || null,
      is_active: true,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    router.push('/artist/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="artistName" className="text-zinc-300">Artist / Band name</Label>
        <Input
          id="artistName"
          placeholder="e.g. Tame Impala"
          value={artistName}
          onChange={e => setArtistName(e.target.value)}
          required
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tourName" className="text-zinc-300">Tour name</Label>
        <Input
          id="tourName"
          placeholder="e.g. The Slow Rush World Tour 2026"
          value={tourName}
          onChange={e => setTourName(e.target.value)}
          required
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="userRole" className="text-zinc-300">
          Your role on this tour
          <span className="text-zinc-500 ml-1 font-normal">(optional)</span>
        </Label>
        <Select value={userRole} onValueChange={v => setUserRole(v ?? '')}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-10">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            {ARTIST_ROLES.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full h-10 mt-2" disabled={loading || !artistName || !tourName}>
        {loading ? 'Creating tour...' : (
          <>
            Continue to dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  )
}
