'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { parseRoutingSheet, importRoutingShows, parseRoutingPDF } from '@/app/actions/routing-import'
import { Check, X, AlertCircle, Loader2, MapPin, Upload, FileText, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { NewTourModal } from './NewTourModal'

interface Tour { id: string; tour_name: string; artist_name: string }

interface MatchedShow {
  date: string
  venue_name: string
  city: string | null
  state: string | null
  matched_venue_id: string | null
  matched_venue_name: string | null
  match_confidence: 'high' | 'low' | 'none'
}

interface Props {
  tours: Tour[]
  open: boolean
  onClose: () => void
}

type InputMode = 'paste' | 'upload'

export function RoutingImportModal({ tours, open, onClose }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'input' | 'preview' | 'importing'>('input')
  const [inputMode, setInputMode] = useState<InputMode>('paste')
  const [text, setText] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [shows, setShows] = useState<MatchedShow[]>([])
  const [selectedTourId, setSelectedTourId] = useState(tours[0]?.id ?? '')
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [newTourOpen, setNewTourOpen] = useState(false)
  const [localTours, setLocalTours] = useState(tours)

  function handleClose() {
    setStep('input')
    setInputMode('paste')
    setText('')
    setUploadedFile(null)
    setShows([])
    setExcluded(new Set())
    setLocalTours(tours)
    onClose()
  }

  async function readFileAsText(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsText(file)
      })
    }

    if (ext === 'xlsx' || ext === 'xls') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            resolve(XLSX.utils.sheet_to_csv(sheet))
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
      })
    }

    // PDF — read as base64 and send to server action
    if (ext === 'pdf') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = async e => {
          try {
            const base64 = (e.target?.result as string).split(',')[1]
            const result = await parseRoutingPDF(base64)
            if (result.error) reject(new Error(result.error))
            else resolve(result.text)
          } catch (err) {
            reject(err)
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    throw new Error('Unsupported file type')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFile(file)
  }

  async function handleParse() {
    setParsing(true)

    let textToParse = text.trim()

    if (inputMode === 'upload') {
      if (!uploadedFile) { toast.error('Select a file first'); setParsing(false); return }
      try {
        textToParse = await readFileAsText(uploadedFile)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to read file')
        setParsing(false)
        return
      }
    }

    if (!textToParse) { toast.error('No content to parse'); setParsing(false); return }

    const result = await parseRoutingSheet(textToParse)
    setParsing(false)
    if (result.error) { toast.error(result.error); return }
    if (result.shows.length === 0) { toast.error('No shows found.'); return }
    setShows(result.shows)
    setStep('preview')
  }

  async function handleImport() {
    if (!selectedTourId) { toast.error('Select a tour first'); return }
    setStep('importing')

    const toImport = shows
      .filter((_, i) => !excluded.has(i))
      .map(s => ({ date: s.date, venue_id: s.matched_venue_id }))

    const result = await importRoutingShows(selectedTourId, toImport)
    if (result.error) {
      toast.error(result.error)
      setStep('preview')
      return
    }

    toast.success(`${result.count} show${result.count !== 1 ? 's' : ''} imported`)
    router.refresh()
    handleClose()
  }

  const includedCount = shows.length - excluded.size
  const matchedCount = shows.filter((s, i) => !excluded.has(i) && s.matched_venue_id).length

  const canParse = inputMode === 'paste' ? !!text.trim() : !!uploadedFile

  return (
    <>
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Routing Sheet</DialogTitle>
          <DialogDescription>
            Paste text or upload a file (.csv, .xlsx, .pdf). StagePage will parse dates and venues automatically.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 mt-2">
            {/* Tour selector */}
            <div className="space-y-1.5">
              <Label>Import into tour</Label>
              <div className="flex gap-2">
                <select
                  value={selectedTourId}
                  onChange={e => setSelectedTourId(e.target.value)}
                  className="flex-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  {localTours.length === 0 && (
                    <option value="">— no tours yet —</option>
                  )}
                  {localTours.map(t => (
                    <option key={t.id} value={t.id}>{t.tour_name} — {t.artist_name}</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => setNewTourOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New tour
                </Button>
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 w-fit gap-0.5">
              {(['paste', 'upload'] as InputMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={cn(
                    'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                    inputMode === mode
                      ? 'bg-white text-zinc-900 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-700'
                  )}
                >
                  {mode === 'paste' ? 'Paste text' : 'Upload file'}
                </button>
              ))}
            </div>

            {inputMode === 'paste' && (
              <div className="space-y-2">
                <Label>Paste routing sheet</Label>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Paste your routing sheet here. Any format works:\n\nAug 12 – Red Rocks Amphitheatre – Morrison, CO\nAug 14 – Fiddler's Green – Greenwood Village, CO\n\nOr a CSV, spreadsheet paste, email — Claude will figure it out.`}
                  className="min-h-48 font-mono text-sm"
                />
              </div>
            )}

            {inputMode === 'upload' && (
              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-12 cursor-pointer hover:border-zinc-400 hover:bg-zinc-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {uploadedFile ? (
                  <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-6 w-6 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-800">{uploadedFile.name}</p>
                      <p className="text-zinc-400 text-xs">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                      className="ml-2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-zinc-300 mb-3" />
                    <p className="text-sm font-medium text-zinc-600">Click to upload</p>
                    <p className="text-xs text-zinc-400 mt-1">CSV, XLSX, XLS, or PDF</p>
                  </>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!canParse || parsing}>
                {parsing
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Parsing…</>
                  : 'Parse Sheet'
                }
              </Button>
            </div>
          </div>
        )}

        {(step === 'preview' || step === 'importing') && (
          <div className="space-y-4 mt-2">
            {/* Summary */}
            <div className="flex items-center gap-4 text-sm rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-2.5">
              <span className="text-zinc-600">{includedCount} shows to import</span>
              <span className="text-green-600 font-medium">{matchedCount} venues matched</span>
              {includedCount - matchedCount > 0 && (
                <span className="text-zinc-400">{includedCount - matchedCount} without venue</span>
              )}
            </div>

            {/* Show list */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
              {shows.map((show, i) => {
                const isExcluded = excluded.has(i)
                const date = new Date(show.date + 'T12:00:00')
                const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

                return (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 border-b border-zinc-100 last:border-0',
                      isExcluded && 'opacity-40 bg-zinc-50'
                    )}
                  >
                    <span className="text-xs text-zinc-400 w-32 shrink-0">{formatted}</span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{show.venue_name}</p>
                      {(show.city || show.state) && (
                        <p className="text-xs text-zinc-400 flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {[show.city, show.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {show.match_confidence === 'high' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                          <Check className="h-2.5 w-2.5" />
                          {show.matched_venue_name}
                        </span>
                      )}
                      {show.match_confidence === 'low' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          <AlertCircle className="h-2.5 w-2.5" />
                          {show.matched_venue_name}?
                        </span>
                      )}
                      {show.match_confidence === 'none' && (
                        <span className="text-[10px] text-zinc-400">No match</span>
                      )}
                    </div>

                    <button
                      onClick={() => setExcluded(prev => {
                        const next = new Set(prev)
                        if (next.has(i)) next.delete(i); else next.add(i)
                        return next
                      })}
                      className="shrink-0 text-zinc-300 hover:text-zinc-500 transition-colors"
                      title={isExcluded ? 'Include' : 'Exclude'}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-zinc-400">
              Matched venues will automatically receive a packet request. Shows without a match will be created without a venue — you can assign one later.
            </p>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('input')} disabled={step === 'importing'}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={step === 'importing'}>Cancel</Button>
                <Button onClick={handleImport} disabled={includedCount === 0 || step === 'importing'}>
                  {step === 'importing'
                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Importing…</>
                    : `Import ${includedCount} Show${includedCount !== 1 ? 's' : ''}`
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <NewTourModal
      open={newTourOpen}
      onClose={() => setNewTourOpen(false)}
      onCreated={(newTour) => {
        setLocalTours(prev => [...prev, newTour])
        setSelectedTourId(newTour.id)
      }}
    />
    </>
  )
}
