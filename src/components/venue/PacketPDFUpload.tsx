'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PACKET_SECTIONS, type SectionKey } from '@/lib/types'
import { toast } from 'sonner'
import { Upload, FileText, Check, X, Loader2 } from 'lucide-react'

interface Props {
  packetId: string
  venueId: string
  userId: string
  existingAttachments: { id: string; file_name: string; storage_path: string }[]
}

type ParsedFields = Record<string, Record<string, string>>
type Step = 'idle' | 'uploading' | 'parsing' | 'review' | 'saving'

export function PacketPDFUpload({ packetId, venueId, userId, existingAttachments }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [parsedFields, setParsedFields] = useState<ParsedFields | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; path: string } | null>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') {
      toast.error('Please select a PDF file')
      return
    }

    setStep('uploading')

    // 1. Upload to Supabase Storage
    const supabase = createClient()
    const path = `${userId}/${packetId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('tech-packets')
      .upload(path, file)

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`)
      setStep('idle')
      return
    }

    // 2. Record in packet_attachments
    await supabase.from('packet_attachments').insert({
      packet_id: packetId,
      file_name: file.name,
      storage_path: path,
      file_type: 'application/pdf',
    })

    setUploadedFile({ name: file.name, path })
    setStep('parsing')

    // 3. Read file as base64 and send to Claude
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]

      const res = await fetch('/api/parse-packet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64: base64, mediaType: 'application/pdf' }),
      })

      if (!res.ok) {
        toast.error('Failed to extract fields from PDF')
        setStep('idle')
        return
      }

      const { fields } = await res.json()
      setParsedFields(fields)
      setStep('review')
    }
    reader.readAsDataURL(file)
  }

  async function handleApply() {
    if (!parsedFields) return
    setStep('saving')

    const supabase = createClient()
    const now = new Date().toISOString()

    // Upsert each section that has at least one non-empty value
    for (const [sectionIndex, sectionDef] of PACKET_SECTIONS.entries()) {
      const sectionData = parsedFields[sectionDef.key]
      if (!sectionData) continue

      const hasContent = Object.values(sectionData).some(v => v && v.trim() !== '')
      if (!hasContent) continue

      // Convert string values to proper types
      const fields: Record<string, string | number | boolean | null> = {}
      sectionDef.fields.forEach(f => {
        const val = sectionData[f.key]
        if (!val || val.trim() === '') {
          fields[f.key] = null
        } else if (f.type === 'boolean') {
          fields[f.key] = val.toLowerCase() === 'true' || val.toLowerCase() === 'yes'
        } else if (f.type === 'number') {
          fields[f.key] = Number(val)
        } else {
          fields[f.key] = val
        }
      })

      await supabase.from('packet_sections').upsert({
        packet_id: packetId,
        section_key: sectionDef.key,
        section_label: sectionDef.label,
        fields,
        sort_order: sectionIndex,
        updated_at: now,
      }, { onConflict: 'packet_id,section_key' })
    }

    // Update packet last_updated_at
    await supabase
      .from('technical_packets')
      .update({ last_updated_at: now })
      .eq('id', packetId)

    toast.success('Fields applied from PDF — review and edit any section below')
    setStep('idle')
    setParsedFields(null)
    router.refresh()
  }

  function handleDiscard() {
    setParsedFields(null)
    setStep('idle')
  }

  // Count non-empty sections from parsed result
  const filledSections = parsedFields
    ? PACKET_SECTIONS.filter(s => {
        const data = parsedFields[s.key]
        return data && Object.values(data).some(v => v && v.trim() !== '')
      })
    : []

  return (
    <div className="space-y-4">
      {/* Existing attachments */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-600">Uploaded PDFs</p>
          {existingAttachments.map(att => (
            <AttachmentRow key={att.id} attachment={att} />
          ))}
        </div>
      )}

      {/* Upload area */}
      {step === 'idle' && (
        <div
          className="border-2 border-dashed border-zinc-200 rounded-lg p-6 text-center cursor-pointer hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-600">Upload tech packet PDF</p>
          <p className="text-xs text-zinc-400 mt-1">
            We'll extract and map the fields automatically
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {/* Progress states */}
      {(step === 'uploading' || step === 'parsing' || step === 'saving') && (
        <Card>
          <CardContent className="py-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            <div>
              <p className="text-sm font-medium">
                {step === 'uploading' && 'Uploading PDF...'}
                {step === 'parsing' && 'Reading PDF and mapping fields...'}
                {step === 'saving' && 'Applying fields to packet...'}
              </p>
              {step === 'parsing' && (
                <p className="text-xs text-zinc-400 mt-0.5">This usually takes 10–20 seconds</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review extracted fields */}
      {step === 'review' && parsedFields && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  Fields extracted from {uploadedFile?.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  Found data in {filledSections.length} of {PACKET_SECTIONS.length} sections.
                  Review below, then apply to your packet.
                </CardDescription>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={handleApply}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Apply fields
                </Button>
                <Button size="sm" variant="outline" onClick={handleDiscard}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Discard
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {PACKET_SECTIONS.map(sectionDef => {
              const data = parsedFields[sectionDef.key as SectionKey]
              const filledFields = sectionDef.fields.filter(
                f => data?.[f.key] && data[f.key].trim() !== ''
              )
              if (filledFields.length === 0) return null
              return (
                <div key={sectionDef.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      {sectionDef.label}
                    </p>
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                      {filledFields.length} field{filledFields.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="bg-white rounded border border-blue-100 divide-y divide-blue-50">
                    {filledFields.map(f => (
                      <div key={f.key} className="px-3 py-2 flex gap-4">
                        <span className="text-xs text-zinc-400 w-36 shrink-0 pt-0.5">{f.label}</span>
                        <span className="text-xs text-zinc-700 whitespace-pre-line">{data[f.key]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AttachmentRow({
  attachment,
}: {
  attachment: { id: string; file_name: string; storage_path: string }
}) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('tech-packets')
      .createSignedUrl(attachment.storage_path, 60)

    if (error || !data) {
      toast.error('Could not generate download link')
    } else {
      window.open(data.signedUrl, '_blank')
    }
    setDownloading(false)
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
      <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
      <span className="text-sm text-zinc-700 flex-1 truncate">{attachment.file_name}</span>
      <Button size="sm" variant="ghost" onClick={handleDownload} disabled={downloading}>
        {downloading ? 'Loading...' : 'Download'}
      </Button>
    </div>
  )
}
