'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldConfirmation, ConfirmationMethod } from '@/lib/types'

const METHODS: { value: ConfirmationMethod; label: string }[] = [
  { value: 'phone',      label: 'Phone' },
  { value: 'email',      label: 'Email' },
  { value: 'in-person',  label: 'In person' },
  { value: 'text',       label: 'Text' },
  { value: 'other',      label: 'Other' },
]

function formatConfirmedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface Props {
  fieldKey: string
  confirmation: FieldConfirmation | null
  onConfirm: (c: FieldConfirmation) => void
  onClear: () => void
  // Display name of the current user — passed down from the page
  currentUser: string
}

export function ConfirmButton({ fieldKey, confirmation, onConfirm, onClear, currentUser }: Props) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<ConfirmationMethod>('phone')
  const [note, setNote] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Pre-populate popover from existing confirmation
  useEffect(() => {
    if (open && confirmation) {
      setMethod(confirmation.method)
      setNote(confirmation.note ?? '')
    } else if (open) {
      setMethod('phone')
      setNote('')
    }
  }, [open, confirmation])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleConfirm() {
    onConfirm({
      confirmedAt: new Date().toISOString(),
      confirmedBy: currentUser,
      method,
      note: note.trim() || undefined,
    })
    setOpen(false)
  }

  const isConfirmed = !!confirmation

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={isConfirmed ? `Confirmed ${formatConfirmedDate(confirmation!.confirmedAt)} · ${confirmation!.method}${confirmation!.note ? ` · ${confirmation!.note}` : ''}` : 'Mark as confirmed'}
        className={cn(
          'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border transition-all',
          isConfirmed
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 opacity-100'
            : 'text-zinc-400 bg-transparent border-zinc-200 opacity-0 group-hover:opacity-100 hover:text-zinc-600 hover:bg-zinc-50'
        )}
      >
        <Check className="h-2.5 w-2.5" />
        {isConfirmed ? `Confirmed ${formatConfirmedDate(confirmation!.confirmedAt)}` : 'Confirm'}
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1.5 w-64 rounded-lg border border-zinc-200 bg-white shadow-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-700">
              {isConfirmed ? 'Update confirmation' : 'Mark as confirmed'}
            </p>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Method pills */}
          <div>
            <p className="text-[10px] text-zinc-400 mb-1.5 uppercase tracking-wide font-medium">How was it confirmed?</p>
            <div className="flex flex-wrap gap-1">
              {METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    'px-2 py-1 rounded text-[11px] font-medium border transition-colors',
                    method === m.value
                      ? 'bg-zinc-800 text-white border-zinc-800'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-[10px] text-zinc-400 mb-1 uppercase tracking-wide font-medium">Note (optional)</p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. spoke with Mark Campbell"
              className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-zinc-300"
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            {isConfirmed && (
              <button
                type="button"
                onClick={() => { onClear(); setOpen(false) }}
                className="text-[11px] text-red-500 hover:text-red-700"
              >
                Remove confirmation
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={cn(
                'ml-auto px-3 py-1 rounded text-[11px] font-semibold bg-zinc-800 text-white hover:bg-zinc-700 transition-colors',
              )}
            >
              {isConfirmed ? 'Update' : 'Confirm'}
            </button>
          </div>

          {isConfirmed && (
            <p className="text-[10px] text-zinc-400 border-t border-zinc-100 pt-2">
              By {confirmation!.confirmedBy} · {formatConfirmedDate(confirmation!.confirmedAt)}
              {confirmation!.note && ` · "${confirmation!.note}"`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
