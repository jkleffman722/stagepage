'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PACKET_SECTIONS, type FieldDefinition } from '@/lib/types'
import { Search, FileText, Download } from 'lucide-react'
import { toast } from 'sonner'

interface Section {
  section_key: string
  fields: Record<string, string | number | boolean | null>
}

interface Attachment {
  id: string
  file_name: string
  storage_path: string
}

interface Venue {
  name: string
  city: string | null
  state: string | null
  capacity: number | null
  website: string | null
  contact_email: string | null
  contact_phone: string | null
}

interface Props {
  venue: Venue
  sections: Section[]
  attachments: Attachment[]
  lastUpdated: string
}

export function PacketViewer({ venue, sections, attachments, lastUpdated }: Props) {
  const [query, setQuery] = useState('')

  const sectionMap = new Map(sections.map(s => [s.section_key, s]))

  const normalizedQuery = query.toLowerCase().trim()

  function fieldMatches(field: FieldDefinition, sectionKey: string): boolean {
    if (!normalizedQuery) return true
    const section = sectionMap.get(sectionKey)
    const value = section?.fields?.[field.key]
    return (
      field.label.toLowerCase().includes(normalizedQuery) ||
      (value != null && String(value).toLowerCase().includes(normalizedQuery))
    )
  }

  function sectionHasMatches(sectionKey: string, fields: FieldDefinition[]): boolean {
    const sectionDef = PACKET_SECTIONS.find(s => s.key === sectionKey)
    if (!normalizedQuery) return true
    if (sectionDef?.label.toLowerCase().includes(normalizedQuery)) return true
    return fields.some(f => fieldMatches(f, sectionKey))
  }

  const visibleSections = PACKET_SECTIONS.filter(sectionDef => {
    const section = sectionMap.get(sectionDef.key)
    if (!section) return false
    const hasData = sectionDef.fields.some(f => {
      const val = section.fields?.[f.key]
      return val !== null && val !== '' && val !== undefined
    })
    if (!hasData) return false
    return sectionHasMatches(sectionDef.key, sectionDef.fields)
  })

  const matchCount = normalizedQuery
    ? PACKET_SECTIONS.reduce((acc, sectionDef) => {
        const section = sectionMap.get(sectionDef.key)
        if (!section) return acc
        return acc + sectionDef.fields.filter(f => {
          const val = section.fields?.[f.key]
          return val !== null && val !== '' && fieldMatches(f, sectionDef.key)
        }).length
      }, 0)
    : null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
        <p className="text-zinc-500 mt-0.5">
          {[venue.city, venue.state].filter(Boolean).join(', ')}
          {venue.capacity ? ` · ${venue.capacity.toLocaleString()} cap` : ''}
        </p>
        <p className="text-xs text-zinc-400 mt-1">
          Last updated {new Date(lastUpdated).toLocaleDateString()}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Search fields — e.g. 'console', 'monitor', 'elevator', 'parking'..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
        />
        {normalizedQuery && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-xs text-zinc-400">
              {matchCount} result{matchCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* PDF downloads */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-600">Original Documents</p>
          {attachments.map(att => (
            <PDFDownloadRow key={att.id} attachment={att} />
          ))}
        </div>
      )}

      {/* Contact info */}
      {!normalizedQuery && (venue.contact_email || venue.contact_phone || venue.website) && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Venue Contact</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5 text-sm">
            {venue.contact_email && (
              <div className="flex gap-4">
                <span className="text-zinc-400 w-20 shrink-0">Email</span>
                <span>{venue.contact_email}</span>
              </div>
            )}
            {venue.contact_phone && (
              <div className="flex gap-4">
                <span className="text-zinc-400 w-20 shrink-0">Phone</span>
                <span>{venue.contact_phone}</span>
              </div>
            )}
            {venue.website && (
              <div className="flex gap-4">
                <span className="text-zinc-400 w-20 shrink-0">Website</span>
                <a href={venue.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {venue.website}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      {visibleSections.length === 0 && normalizedQuery ? (
        <Card>
          <CardContent className="py-8 text-center text-zinc-400">
            No fields matching &ldquo;{query}&rdquo;
          </CardContent>
        </Card>
      ) : (
        visibleSections.map(sectionDef => {
          const section = sectionMap.get(sectionDef.key)
          if (!section) return null

          const visibleFields = sectionDef.fields.filter(f => {
            const val = section.fields?.[f.key]
            const hasValue = val !== null && val !== '' && val !== undefined
            if (!hasValue) return false
            if (!normalizedQuery) return true
            return fieldMatches(f, sectionDef.key)
          })

          if (visibleFields.length === 0) return null

          return (
            <Card key={sectionDef.key}>
              <CardHeader className="py-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{sectionDef.label}</CardTitle>
                  {normalizedQuery && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                      {visibleFields.length} match{visibleFields.length !== 1 ? 'es' : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <dl className="space-y-3">
                  {visibleFields.map(field => {
                    const val = section.fields?.[field.key]
                    let display: string
                    if (field.type === 'boolean') {
                      display = val === true || val === 'true' ? 'Yes' : 'No'
                    } else {
                      display = String(val)
                    }

                    const isMatch = normalizedQuery && fieldMatches(field, sectionDef.key)

                    return (
                      <div key={field.key} className={`flex gap-4 rounded-sm ${isMatch ? 'bg-yellow-50 -mx-1 px-1 py-0.5' : ''}`}>
                        <dt className="text-sm text-zinc-400 min-w-40 shrink-0 pt-0.5">{field.label}</dt>
                        <dd className="text-sm whitespace-pre-line">{display}</dd>
                      </div>
                    )
                  })}
                </dl>
              </CardContent>
            </Card>
          )
        })
      )}

      <div className="flex items-center gap-2 pt-2">
        <Badge variant="outline" className="text-xs text-zinc-400">Read only</Badge>
        <p className="text-xs text-zinc-400">This packet is maintained by {venue.name}</p>
      </div>
    </div>
  )
}

function PDFDownloadRow({ attachment }: { attachment: Attachment }) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('tech-packets')
      .createSignedUrl(attachment.storage_path, 60)

    if (error || !data) {
      toast.error('Could not generate download link')
    } else {
      window.open(data.signedUrl, '_blank')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
      <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
      <span className="text-sm text-zinc-700 flex-1 truncate">{attachment.file_name}</span>
      <Button size="sm" variant="ghost" onClick={handleDownload} disabled={loading}>
        <Download className="h-3.5 w-3.5 mr-1" />
        {loading ? 'Loading...' : 'Download'}
      </Button>
    </div>
  )
}
