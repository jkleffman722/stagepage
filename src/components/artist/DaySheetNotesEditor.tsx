'use client'

import { useRef, useState } from 'react'
import { saveDaySheetNotes } from '@/app/actions/day-sheet'

interface Props {
  advanceId: string
  initialValue: string
}

export function DaySheetNotesEditor({ advanceId, initialValue }: Props) {
  const [value, setValue] = useState(initialValue)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    setValue(next)
    setStatus('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      await saveDaySheetNotes(advanceId, next)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 1500)
    }, 800)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Day-of Notes</p>
        {status === 'saving' && <span className="text-[10px] text-zinc-400">Saving…</span>}
        {status === 'saved' && <span className="text-[10px] text-emerald-600">Saved</span>}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Last-minute changes, dock overrides, reminders for the crew… (e.g. Use Dock B today. Crew call pushed to 7:30 AM.)"
        className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-amber-400/70 min-h-[72px] resize-none focus:outline-none focus:ring-1 focus:ring-amber-300"
      />
    </div>
  )
}
