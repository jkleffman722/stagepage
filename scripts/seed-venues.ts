/**
 * Seed venues + technical packets from the "01 - By Tour & Show" folder.
 * Run: npx tsx scripts/seed-venues.ts [--dry-run]
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { PACKET_SECTIONS } from '../src/lib/types'

// ─── Config ─────────────────────────────────────────────────────────────────

const ADMIN_USER_ID = '69a0da4c-3f7f-4f15-9e9d-982a3e09d657'
const ROOT = join(process.cwd(), '01 - By Tour & Show')
const DRY_RUN = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const fieldMap = PACKET_SECTIONS.map(s => ({
  section: s.key,
  label: s.label,
  fields: s.fields.map(f => ({ key: f.key, label: f.label, type: f.type })),
}))

// ─── PDF Finder ──────────────────────────────────────────────────────────────

interface VenuePacket {
  pdfPath: string
  showFolder: string   // e.g. "4.10 Ashville NC"
  monthFolder: string  // e.g. "01 - April (US)"
}

function isDir(p: string) {
  try { return statSync(p).isDirectory() } catch { return false }
}

function listPdfs(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => join(dir, f))
  } catch { return [] }
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map(f => join(dir, f))
      .filter(isDir)
  } catch { return [] }
}

function isTechPacket(filename: string): boolean {
  const b = filename.toLowerCase()
  return b.includes('tech pack') || b.includes('techpacket') || b.includes('production pack') || b.includes('tech spec')
}

function bestPdf(pdfs: string[]): string {
  return pdfs.find(p => isTechPacket(basename(p))) ?? pdfs[0]
}

function findVenuePacketPdfs(showDir: string): string[] {
  // Priority 1: PDF in a _Venue Packet* folder (not Previous*) — return ONE best
  for (const sub of listDirs(showDir)) {
    const name = basename(sub)
    if (name.startsWith('_Venue Packet') || name.match(/^0\d+ - Venue Packet/i)) {
      const pdfs = listPdfs(sub).filter(p => !p.includes('Previous'))
      if (pdfs.length > 0) return [bestPdf(pdfs)]
    }
  }

  // Priority 2: ALL PDFs containing "tech pack" directly in show folder (handles multiple venues same date)
  // Exclude "Open Air" standalone since Gallagher Square is preferred for San Diego
  const directPacks = listPdfs(showDir).filter(p => {
    const b = basename(p).toLowerCase()
    return isTechPacket(b) && !b.includes('open air')
  })
  if (directPacks.length > 0) return directPacks

  // Priority 3: First match one level deep in any non-Previous subfolder
  for (const sub of listDirs(showDir)) {
    if (basename(sub).includes('Previous')) continue
    const match = listPdfs(sub).find(p => isTechPacket(basename(p)))
    if (match) return [match]
  }

  return []
}

function findAllVenuePackets(): VenuePacket[] {
  const results: VenuePacket[] = []

  for (const monthDir of listDirs(ROOT)) {
    const monthFolder = basename(monthDir)
    for (const showDir of listDirs(monthDir)) {
      const showFolder = basename(showDir)
      if (showFolder.startsWith('_')) continue // skip _Advance Sheets, _Venue Spec Grid, etc.
      for (const pdfPath of findVenuePacketPdfs(showDir)) {
        results.push({ pdfPath, showFolder, monthFolder })
      }
    }
  }

  return results
}

// ─── Venue Name & Location Parsing ──────────────────────────────────────────

const STATE_ABBREVS = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','BC', // BC = British Columbia
])

function parseCityState(showFolder: string): { city: string; state: string } {
  // Strip leading date like "4.10 " or "8.13 " or "11.3-4 "
  const stripped = showFolder.replace(/^[\d\.\-]+ /, '').trim()
  // Last word might be a state abbreviation
  const parts = stripped.split(/[,\s]+/)
  const lastWord = parts[parts.length - 1]
  if (STATE_ABBREVS.has(lastWord.toUpperCase())) {
    return {
      city: parts.slice(0, -1).join(' '),
      state: lastWord.toUpperCase(),
    }
  }
  return { city: stripped, state: '' }
}

function venueNameFromFile(pdfPath: string): string | null {
  const name = basename(pdfPath, '.pdf')
  // "Tech Pack - Los Angeles - Greek Theatre" → "Greek Theatre"
  const match = name.match(/Tech Pack\s*[-–]\s*[^-–]+\s*[-–]\s*(.+)/i)
  if (match) return match[1].trim()
  // "Tech Pack- Kansas City - The Midland Theatre" → "The Midland Theatre"
  const match2 = name.match(/Tech Pack[-\s]+[^-]+[-–]\s*(.+)/i)
  if (match2) return match2[1].trim()
  return null
}

// ─── PDF Extraction ───────────────────────────────────────────────────────────

// Per-page char count below this → treat the page as visual (diagram, floor plan, stage plot)
const VISUAL_PAGE_THRESHOLD = 80
// Total text below this → vision-only mode (scanned / image-based PDF)
const TEXT_MODE_MIN_CHARS   = 300
// Max pages to render in vision / hybrid mode (Claude token budget)
const MAX_VISION_PAGES      = 20

// Lazy-load pdfjs — point workerSrc to the real worker file so pdfjs can use it in Node.js
type PdfjsLib = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
let _pdfjs: PdfjsLib | null = null
async function getPdfjs(): Promise<PdfjsLib> {
  if (!_pdfjs) {
    const { createRequire } = await import('module')
    const { pathToFileURL } = await import('url')
    const req = createRequire(import.meta.url)
    const workerPath = req.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
    _pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs') as PdfjsLib
    _pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
  }
  return _pdfjs
}

interface PageInfo {
  index: number   // 1-based
  text: string
  isVisual: boolean
}

async function extractPagesFromPdf(fileBuffer: Buffer): Promise<{ pages: PageInfo[]; totalText: string }> {
  const lib = await getPdfjs()
  const { createRequire } = await import('module')
  const req = createRequire(import.meta.url)
  const pdfjsDir = req.resolve('pdfjs-dist/package.json').replace('/package.json', '')
  const doc = await lib.getDocument({
    data: new Uint8Array(fileBuffer),
    standardFontDataUrl: `${pdfjsDir}/standard_fonts/`,
    cMapUrl: `${pdfjsDir}/cmaps/`,
    cMapPacked: true,
    isEvalSupported: false,
  }).promise
  const pages: PageInfo[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = (content.items as Array<{ str?: string }>)
      .map(item => item.str ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    pages.push({ index: i, text, isVisual: text.length < VISUAL_PAGE_THRESHOLD })
  }

  const totalText = pages.map(p => p.text).join('\n\n')
  return { pages, totalText }
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4MB — stay under Claude's 5MB limit

async function renderPageImages(fileBuffer: Buffer, pageIndices: number[]): Promise<Buffer[]> {
  const { pdf } = await import('pdf-to-img')
  const sharp = (await import('sharp')).default
  const wanted = new Set(pageIndices)
  const images: Buffer[] = []
  let n = 0

  const doc = await pdf(fileBuffer, { scale: 1.5 })
  for await (const img of doc) {
    n++
    if (wanted.has(n)) {
      let buf = img as Buffer
      // Compress to JPEG if PNG is over the limit
      if (buf.byteLength > MAX_IMAGE_BYTES) {
        buf = await sharp(buf).jpeg({ quality: 80 }).toBuffer()
      }
      images.push(buf)
    }
    if (images.length === pageIndices.length) break
  }
  return images
}

// ─── Claude Extraction ───────────────────────────────────────────────────────

const EXTRACT_PROMPT = `You are extracting technical production information from a venue tech packet.

First, extract the VENUE NAME from the document — use the official venue name as it appears in the document header or title.

Then map the content to the following JSON structure. Return ONLY valid JSON — no markdown, no explanation.
Leave any field as an empty string "" if the information is not present.
For textarea fields (gear lists), use newlines to separate multiple items.

Field structure:
${JSON.stringify(fieldMap, null, 2)}

Return a JSON object with three top-level keys:

1. "venue_name": the official venue name extracted from the document (string)

2. "fields": the extracted data shaped like:
{
  "contacts": { "production_manager": "", ... },
  "stage": { "full_deck": "", ... },
  ...
}
Include all section keys even if empty. Match field keys exactly.

3. "low_confidence": a flat array of "section_key.field_key" strings for fields where:
- The value was inferred rather than explicitly stated
- Ambiguous or non-standard formatting
- You had to guess the mapping
- The value looks plausible but you are uncertain

If confident in all extractions, return an empty array for low_confidence.`

interface ExtractionResult {
  venue_name: string
  fields: Record<string, Record<string, unknown>>
  low_confidence: string[]
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/png' | 'image/jpeg'; data: string } }

function imgBlock(buf: Buffer): ContentBlock {
  // Detect JPEG by magic bytes (FF D8 FF) vs PNG (89 50 4E 47)
  const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8
  const media_type = (isJpeg ? 'image/jpeg' : 'image/png') as 'image/jpeg' | 'image/png'
  return {
    type: 'image',
    source: { type: 'base64' as const, media_type, data: buf.toString('base64') },
  }
}

type ExtractionMode = 'text' | 'hybrid' | 'vision'

async function extractFromPdf(pdfPath: string): Promise<ExtractionResult & { mode: ExtractionMode }> {
  const fileBuffer = readFileSync(pdfPath)
  const { pages, totalText } = await extractPagesFromPdf(fileBuffer)

  const visualPages = pages.filter(p => p.isVisual)
  const mode: ExtractionMode =
    totalText.length < TEXT_MODE_MIN_CHARS ? 'vision' :
    visualPages.length > 0 ? 'hybrid' : 'text'

  let content: ContentBlock[]

  if (mode === 'text') {
    // All pages have rich text — fast, cheapest path
    content = [{ type: 'text', text: `${EXTRACT_PROMPT}\n\n---\n\nVENUE TECH PACKET TEXT:\n\n${totalText}` }]

  } else if (mode === 'hybrid') {
    // Mostly text with some diagram / floor-plan pages — include those as images
    const toRender = visualPages.map(p => p.index).slice(0, MAX_VISION_PAGES)
    const images = await renderPageImages(fileBuffer, toRender)
    content = [
      ...images.map(imgBlock),
      {
        type: 'text',
        text: `${EXTRACT_PROMPT}\n\n---\n\nThe ${images.length} image(s) above are diagram/floor-plan pages from this document. Use them alongside the text below.\n\nVENUE TECH PACKET TEXT:\n\n${totalText}`,
      },
    ]

  } else {
    // Scanned or image-only PDF — send all pages as images
    const toRender = pages.map(p => p.index).slice(0, MAX_VISION_PAGES)
    const images = await renderPageImages(fileBuffer, toRender)
    content = [
      ...images.map(imgBlock),
      {
        type: 'text',
        text: `${EXTRACT_PROMPT}\n\nThis document is image-based (scanned or visual). Extract all information from the page images above.`,
      },
    ]
  }

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: 'user', content: content as any }],
  }, { timeout: 120_000 })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed: ExtractionResult = JSON.parse(cleaned)

  // Strip low_confidence entries for fields that weren't actually filled — Haiku over-reports these
  const filledPaths = new Set(
    Object.entries(parsed.fields ?? {}).flatMap(([sectionKey, sectionFields]) =>
      Object.entries(sectionFields)
        .filter(([, v]) => v && v !== '')
        .map(([fieldKey]) => `${sectionKey}.${fieldKey}`)
    )
  )
  parsed.low_confidence = (parsed.low_confidence ?? []).filter(path => filledPaths.has(path))

  return { ...parsed, mode }
}

// ─── Supabase Helpers ────────────────────────────────────────────────────────

async function insertVenue(name: string, city: string, state: string) {
  const { data, error } = await supabase
    .from('venues')
    .insert({ name, city: city || null, state: state || null, owner_id: ADMIN_USER_ID })
    .select('id')
    .single()
  if (error) throw new Error(`venues insert: ${error.message}`)
  return data.id as string
}

async function insertPacket(venueId: string) {
  const { data, error } = await supabase
    .from('technical_packets')
    .insert({
      venue_id: venueId,
      is_published: false,
      last_updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`technical_packets insert: ${error.message}`)
  return data.id as string
}

async function insertSections(
  packetId: string,
  fields: Record<string, Record<string, unknown>>,
  lowConfidence: string[]
) {
  const lowConfSet = new Set(lowConfidence)
  const rows = PACKET_SECTIONS.map((sectionDef, index) => {
    const sectionFields = fields[sectionDef.key] ?? {}
    const field_sources: Record<string, unknown> = {}

    for (const fieldDef of sectionDef.fields) {
      const val = sectionFields[fieldDef.key]
      if (val && val !== '') {
        const path = `${sectionDef.key}.${fieldDef.key}`
        field_sources[fieldDef.key] = lowConfSet.has(path)
          ? { type: 'pdf', confidence: 'low' }
          : { type: 'pdf' }
      }
    }

    return {
      packet_id: packetId,
      section_key: sectionDef.key,
      section_label: sectionDef.label,
      fields: sectionFields,
      field_sources,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase.from('packet_sections').insert(rows)
  if (error) throw new Error(`packet_sections insert: ${error.message}`)
}

// ─── Preview Report ──────────────────────────────────────────────────────────

interface PreviewEntry {
  showFolder: string
  pdfFile: string
  venueName: string
  city: string
  state: string
  filledCount: number
  totalCount: number
  lowConfidence: string[]
  fields: Record<string, Record<string, unknown>>
  error?: string
}

function printPreviewReport(entries: PreviewEntry[]) {
  const { writeFileSync } = require('fs')
  const outPath = join(process.cwd(), 'scripts', 'extraction-preview.json')
  writeFileSync(outPath, JSON.stringify(entries, null, 2))
  console.log(`\nFull results saved to: scripts/extraction-preview.json\n`)

  // ── Per-venue summary ──
  console.log('═'.repeat(70))
  console.log('PER-VENUE SUMMARY')
  console.log('═'.repeat(70))
  for (const e of entries) {
    if (e.error) {
      console.log(`❌ ${e.showFolder}: ${e.error}`)
      continue
    }
    const pct = Math.round((e.filledCount / e.totalCount) * 100)
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5))
    console.log(`\n${e.venueName} (${e.city}${e.state ? ', ' + e.state : ''})`)
    console.log(`  ${bar} ${pct}% — ${e.filledCount}/${e.totalCount} fields`)
    if (e.lowConfidence.length > 0) {
      console.log(`  ⚠  Low confidence (${e.lowConfidence.length}): ${e.lowConfidence.slice(0, 5).join(', ')}${e.lowConfidence.length > 5 ? '...' : ''}`)
    }
  }

  // ── Field coverage across all venues ──
  const successful = entries.filter(e => !e.error)
  const total = successful.length
  if (total === 0) return

  const fieldCounts: Record<string, number> = {}
  const lowConfCounts: Record<string, number> = {}

  for (const entry of successful) {
    for (const sectionDef of PACKET_SECTIONS) {
      for (const fieldDef of sectionDef.fields) {
        const path = `${sectionDef.key}.${fieldDef.key}`
        const val = entry.fields[sectionDef.key]?.[fieldDef.key]
        if (val && val !== '') {
          fieldCounts[path] = (fieldCounts[path] ?? 0) + 1
        }
        if (entry.lowConfidence.includes(path)) {
          lowConfCounts[path] = (lowConfCounts[path] ?? 0) + 1
        }
      }
    }
  }

  console.log('\n\n' + '═'.repeat(70))
  console.log('FIELD COVERAGE ACROSS ALL VENUES')
  console.log('═'.repeat(70))

  // Group by section
  for (const sectionDef of PACKET_SECTIONS) {
    const sectionFields = sectionDef.fields.map(f => {
      const path = `${sectionDef.key}.${f.key}`
      const count = fieldCounts[path] ?? 0
      const lowConf = lowConfCounts[path] ?? 0
      return { label: f.label, path, count, lowConf, required: f.required }
    })

    const filled = sectionFields.filter(f => f.count > 0).length
    console.log(`\n${sectionDef.label} (${filled}/${sectionFields.length} fields seen across venues)`)

    for (const f of sectionFields) {
      const pct = Math.round((f.count / total) * 100)
      const req = f.required ? ' *' : ''
      const lc = f.lowConf > 0 ? ` [⚠ low-conf in ${f.lowConf}]` : ''
      const bar = pct === 0 ? '  --' : `  ${String(pct).padStart(3)}%`
      console.log(`${bar}  ${f.label}${req}${lc}`)
    }
  }

  // ── Fields never filled (candidates for removal or schema question) ──
  const neverFilled = PACKET_SECTIONS.flatMap(s =>
    s.fields
      .filter(f => !(fieldCounts[`${s.key}.${f.key}`] ?? 0))
      .map(f => `${s.label}: ${f.label}`)
  )
  if (neverFilled.length > 0) {
    console.log('\n\n' + '═'.repeat(70))
    console.log('FIELDS NEVER FILLED (0% across all venues)')
    console.log('═'.repeat(70))
    neverFilled.forEach(f => console.log(`  - ${f}`))
  }

  // ── Most common low-confidence fields ──
  const topLowConf = Object.entries(lowConfCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  if (topLowConf.length > 0) {
    console.log('\n\n' + '═'.repeat(70))
    console.log('MOST FREQUENTLY LOW-CONFIDENCE')
    console.log('═'.repeat(70))
    for (const [path, count] of topLowConf) {
      console.log(`  ${String(Math.round(count / total * 100)).padStart(3)}% of venues  ${path}`)
    }
  }

  console.log('\n')
}

// ─── Main ────────────────────────────────────────────────────────────────────

const PREVIEW = process.argv.includes('--preview')
const LIMIT = (() => {
  const arg = process.argv.find(a => a.startsWith('--limit='))
  return arg ? parseInt(arg.split('=')[1]) : Infinity
})()

async function main() {
  console.log(`🔍 Scanning ${ROOT}...\n`)

  const packets = findAllVenuePackets()
  console.log(`Found ${packets.length} venue tech packets:\n`)
  for (const p of packets) {
    console.log(`  [${p.monthFolder}] ${p.showFolder}  →  ${basename(p.pdfPath)}`)
  }

  if (DRY_RUN) {
    console.log('\n--dry-run: stopping here.')
    return
  }

  console.log(`\n${PREVIEW ? 'PREVIEW MODE — extracting only, no Supabase writes' : 'Seeding to Supabase'}`)
  console.log('─'.repeat(70) + '\n')

  const previewEntries: PreviewEntry[] = []
  let success = 0
  let failed = 0

  const batch = packets.slice(0, LIMIT)

  for (let i = 0; i < batch.length; i++) {
    const { pdfPath, showFolder } = batch[i]
    const { city, state } = parseCityState(showFolder)
    const label = `[${i + 1}/${batch.length}] ${showFolder}`

    process.stdout.write(`${label} — extracting...`)

    try {
      const result = await extractFromPdf(pdfPath)

      const venueName = result.venue_name?.trim()
        || venueNameFromFile(pdfPath)
        || showFolder.replace(/^[\d\.\-]+ /, '').trim()

      const filledCount = Object.values(result.fields ?? {}).reduce((acc, section) =>
        acc + Object.values(section).filter(v => v && v !== '').length, 0
      )
      const totalCount = PACKET_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0)
      const lowCount = result.low_confidence?.length ?? 0
      const modeTag = result.mode === 'hybrid' ? ' [hybrid]' : result.mode === 'vision' ? ' [vision]' : ''

      console.log(`\r${label} — ✅ "${venueName}" (${filledCount}/${totalCount} fields, ${lowCount} low-conf)${modeTag}`)

      if (PREVIEW) {
        previewEntries.push({
          showFolder, pdfFile: basename(pdfPath), venueName, city, state,
          filledCount, totalCount, lowConfidence: result.low_confidence ?? [],
          fields: result.fields ?? {},
        })
      } else {
        const venueId = await insertVenue(venueName, city, state)
        const packetId = await insertPacket(venueId)
        await insertSections(packetId, result.fields ?? {}, result.low_confidence ?? [])
      }

      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`\r${label} — ❌ ${msg}`)
      if (PREVIEW) {
        const { city: c, state: s } = parseCityState(showFolder)
        previewEntries.push({
          showFolder, pdfFile: basename(pdfPath),
          venueName: showFolder, city: c, state: s,
          filledCount: 0, totalCount: 0, lowConfidence: [], fields: {},
          error: msg,
        })
      }
      failed++
    }

    // 2s between requests
    if (i < batch.length - 1) await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`\n✅ ${success} succeeded  ❌ ${failed} failed`)

  if (PREVIEW && previewEntries.length > 0) printPreviewReport(previewEntries)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
