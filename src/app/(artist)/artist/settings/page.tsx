'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ArtistSettingsPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load current profile
  if (!loaded) {
    const supabase = createClient()
    supabase.from('profiles').select('display_name').single().then(({ data }) => {
      if (data) setDisplayName(data.display_name ?? '')
      setLoaded(true)
    })
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', (await supabase.auth.getUser()).data.user!.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile saved')
      router.refresh()
    }
    setSaving(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-0.5 text-sm">Manage your account</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Profile</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
          <div>
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name or tour name"
              className="mt-1.5"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Account</h2>
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-500 mb-4">Sign out of your account on this device.</p>
          <Button variant="outline" onClick={handleSignOut}>Sign out</Button>
        </div>
      </section>
    </div>
  )
}
