'use client'

import { useState, useRef } from 'react'
import { addShowNote } from '@/app/actions/show-notes'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { NotebookPen } from 'lucide-react'
import type { ShowNote } from '@/lib/types'

interface Props {
  advanceId: string
  initialNotes: ShowNote[]
}

export function ShowNotesLog({ advanceId, initialNotes }: Props) {
  const [notes, setNotes] = useState<ShowNote[]>(initialNotes)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Newest first for display
  const sorted = [...notes].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  async function handleAdd() {
    if (!body.trim()) return
    setSubmitting(true)
    const result = await addShowNote(advanceId, body)
    if ('error' in result) {
      toast.error(result.error)
      setSubmitting(false)
      return
    }
    setNotes(prev => [...prev, result.note!])
    setBody('')
    setSubmitting(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden" id="show-notes">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100">
        <NotebookPen className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-700">
          Notes
          {notes.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-zinc-400">({notes.length})</span>
          )}
        </h2>
        <span className="text-xs text-zinc-400 ml-1">— internal log, not shared</span>
      </div>

      {/* Add note */}
      <div className="px-4 pt-3 pb-3 border-b border-zinc-100">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Log a call, email outcome, or follow-up… (⌘↵ to submit)"
          rows={3}
          className="w-full text-sm text-zinc-800 placeholder:text-zinc-400 border border-zinc-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-300"
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={submitting || !body.trim()}
          >
            {submitting ? 'Adding…' : 'Add note'}
          </Button>
        </div>
      </div>

      {/* Existing notes — newest first */}
      {sorted.length > 0 ? (
        <div className="divide-y divide-zinc-50">
          {sorted.map(note => (
            <div key={note.id} className="px-4 py-3">
              <p className="text-xs text-zinc-400 mb-1">
                {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {note.created_by_name}
              </p>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{note.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-4 text-sm text-zinc-400 text-center">
          No notes yet — log your first call or email outcome above
        </div>
      )}
    </div>
  )
}
