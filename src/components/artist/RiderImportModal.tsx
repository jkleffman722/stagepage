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
import { parseRiderPDF, parseRiderDocument, applyRiderImport } from '@/app/actions/rider-import'
import type { RiderPreviewSection, ParsedRiderSections } from '@/app/actions/rider-import'
import { ChevronDown, ChevronUp, Loader2, Upload, FileText, X, Check, AlertTriangle, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  riderId: string
  open: boolean
  onClose: () => void
}

type InputMode = 'paste' | 'upload'
type Step = 'input' | 'preview' | 'applying'

export function RiderImportModal({ riderId, open, onClose }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('input')
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [text, setText] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState<RiderPreviewSection[]>([])
  const [parsed, setParsed] = useState<ParsedRiderSections>({})
  const [lowConfidenceKeys, setLowConfidenceKeys] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  function handleClose() {
    setStep('input')
    setInputMode('upload')
    setText('')
    setUploadedFile(null)
    setPreview([])
    setParsed({})
    setLowConfidenceKeys([])
    setExpandedSections(new Set())
    onClose()
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        resolve(dataUrl.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleParse() {
    setParsing(true)
    let textToParse = text.trim()

    if (inputMode === 'upload') {
      if (!uploadedFile) { toast.error('Select a file first'); setParsing(false); return }
      const ext = uploadedFile.name.split('.').pop()?.toLowerCase()
      if (ext === 'pdf') {
        try {
          const base64 = await readFileAsBase64(uploadedFile)
          const result = await parseRiderPDF(base64)
          if (result.error) { toast.error(result.error); setParsing(false); return }
          textToParse = result.text
        } catch {
          toast.error('Failed to read file')
          setParsing(false)
          return
        }
      } else {
        try {
          textToParse = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = e => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsText(uploadedFile)
          })
        } catch {
          toast.error('Failed to read file')
          setParsing(false)
          return
        }
      }
    }

    if (!textToParse) { toast.error('No content to parse'); setParsing(false); return }

    const result = await parseRiderDocument(textToParse)
    setParsing(false)

    if (result.error) { toast.error(result.error); return }

    const totalPopulated = result.preview.reduce((acc, s) => acc + s.populatedCount, 0)
    if (totalPopulated === 0) {
      toast.error('No fields extracted. Check that the document is a tech rider.')
      return
    }

    setPreview(result.preview)
    setParsed(result.parsed)
    setLowConfidenceKeys(result.lowConfidenceKeys)
    // Auto-expand sections that have data or low-confidence flags
    const toExpand = new Set(
      result.preview
        .filter(s => s.populatedCount > 0 || s.lowConfidenceCount > 0)
        .map(s => s.key)
    )
    setExpandedSections(toExpand)
    setStep('preview')
  }

  async function handleApply() {
    setStep('applying')
    const result = await applyRiderImport(riderId, parsed, lowConfidenceKeys)
    if (!result.success) {
      toast.error(result.error ?? 'Import failed')
      setStep('preview')
      return
    }
    const totalFields = preview.reduce((acc, s) => acc + s.populatedCount, 0)
    toast.success(`${totalFields} fields imported into your tech rider`)
    router.refresh()
    handleClose()
  }

  const totalExtracted = preview.reduce((acc, s) => acc + s.populatedCount, 0)
  const totalBlank = preview.reduce((acc, s) => acc + s.blankCount, 0)
  const totalLowConfidence = preview.reduce((acc, s) => acc + s.lowConfidenceCount, 0)
  const canParse = inputMode === 'paste' ? !!text.trim() : !!uploadedFile

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Tech Rider</DialogTitle>
          <DialogDescription>
            Upload a PDF or paste text. StagePage will extract structured fields and populate your rider.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 mt-2">
            <div className="flex rounded-lg border border-zinc-200 p-0.5 bg-zinc-50 w-fit gap-0.5">
              {(['upload', 'paste'] as InputMode[]).map(mode => (
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
                  {mode === 'upload' ? 'Upload file' : 'Paste text'}
                </button>
              ))}
            </div>

            {inputMode === 'upload' && (
              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-12 cursor-pointer hover:border-zinc-400 hover:bg-zinc-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={e => setUploadedFile(e.target.files?.[0] ?? null)}
                />
                {uploadedFile ? (
                  <div className="flex items-center gap-3 text-sm">
                    <FileText className="h-6 w-6 text-zinc-400" />
                    <div>
                      <p className="font-medium text-zinc-800">{uploadedFile.name}</p>
                      <p className="text-zinc-400 text-xs">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setUploadedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="ml-2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-zinc-300 mb-3" />
                    <p className="text-sm font-medium text-zinc-600">Click to upload</p>
                    <p className="text-xs text-zinc-400 mt-1">PDF or plain text</p>
                  </>
                )}
              </div>
            )}

            {inputMode === 'paste' && (
              <div className="space-y-2">
                <Label>Paste rider content</Label>
                <Textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Paste your tech rider text here — any format works."
                  className="min-h-48 font-mono text-sm"
                />
              </div>
            )}

            <p className="text-xs text-zinc-400">
              Existing fields in your rider will not be overwritten — imported values only fill blank fields.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!canParse || parsing}>
                {parsing
                  ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Parsing…</>
                  : 'Parse Document'
                }
              </Button>
            </div>
          </div>
        )}

        {(step === 'preview' || step === 'applying') && (
          <div className="space-y-4 mt-2">
            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-2 text-sm rounded-lg border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-r border-zinc-200">
                <p className="text-xs text-zinc-500 mb-0.5">Extracted</p>
                <p className="font-semibold text-green-700">{totalExtracted} fields</p>
              </div>
              <div className="px-4 py-3 bg-zinc-50 border-r border-zinc-200">
                <p className="text-xs text-zinc-500 mb-0.5">Not found</p>
                <p className="font-semibold text-zinc-500">{totalBlank} fields</p>
              </div>
              <div className={cn('px-4 py-3', totalLowConfidence > 0 ? 'bg-amber-50' : 'bg-zinc-50')}>
                <p className="text-xs text-zinc-500 mb-0.5">Review needed</p>
                <p className={cn('font-semibold', totalLowConfidence > 0 ? 'text-amber-600' : 'text-zinc-400')}>
                  {totalLowConfidence} fields
                </p>
              </div>
            </div>

            {totalLowConfidence > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-3 w-3 inline mr-1 mb-0.5" />
                Fields marked with a warning were inferred — the document was ambiguous or used different terminology. Verify these before relying on them for conflict detection.
              </p>
            )}

            {/* Section list */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-[420px] overflow-y-auto">
              {preview.map(section => {
                const isExpanded = expandedSections.has(section.key)
                const hasData = section.populatedCount > 0

                return (
                  <div key={section.key} className="border-b border-zinc-100 last:border-0">
                    {/* Section header */}
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
                      onClick={() => toggleSection(section.key)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-sm font-medium', !hasData && 'text-zinc-400')}>
                          {section.label}
                        </span>
                        {hasData && (
                          <span className="text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                            {section.populatedCount} extracted
                          </span>
                        )}
                        {section.blankCount > 0 && (
                          <span className="text-[10px] font-medium text-zinc-400 bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5">
                            {section.blankCount} missing
                          </span>
                        )}
                        {section.lowConfidenceCount > 0 && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5 mb-0.5" />
                            {section.lowConfidenceCount} review
                          </span>
                        )}
                        {!hasData && (
                          <span className="text-[10px] text-zinc-400">Nothing found</span>
                        )}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                      }
                    </button>

                    {/* Field list — all fields */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-zinc-50 divide-y divide-zinc-100">
                        {section.fields.map(field => {
                          const isBlank = field.value === null

                          return (
                            <div key={field.key} className="flex items-start gap-3 px-4 py-2">
                              {/* Status icon */}
                              <div className="mt-0.5 shrink-0">
                                {isBlank ? (
                                  <Minus className="h-3.5 w-3.5 text-zinc-300" />
                                ) : field.lowConfidence ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                )}
                              </div>

                              {/* Field label + value */}
                              <div className="min-w-0 flex-1">
                                <span className={cn(
                                  'text-xs block',
                                  isBlank ? 'text-zinc-400' : 'text-zinc-500'
                                )}>
                                  {field.label}
                                </span>
                                {isBlank ? (
                                  <span className="text-xs text-zinc-300 italic">Not found</span>
                                ) : (
                                  <span className={cn(
                                    'text-xs break-words block',
                                    field.lowConfidence ? 'text-amber-800' : 'text-zinc-800'
                                  )}>
                                    {field.value}
                                    {field.lowConfidence && (
                                      <span className="ml-1 text-[10px] text-amber-500 font-medium">
                                        — verify
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-zinc-400">
              Only blank fields will be updated — anything you&apos;ve already filled in will not be overwritten.
            </p>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep('input')} disabled={step === 'applying'}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} disabled={step === 'applying'}>Cancel</Button>
                <Button onClick={handleApply} disabled={step === 'applying' || totalExtracted === 0}>
                  {step === 'applying'
                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Applying…</>
                    : `Apply ${totalExtracted} Field${totalExtracted !== 1 ? 's' : ''}`
                  }
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
