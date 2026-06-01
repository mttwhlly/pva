import fetch from 'node-fetch'
import { existsSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { OigRecord } from '../types.js'

// OIG LEIE monthly extract — the most reliable programmatic source.
// The web search endpoint does not expose a stable JSON API; the CSV is the
// authoritative published format. We cache it on disk for 24 h so repeated
// runs in the same day don't re-download the ~5 MB file.
const LEIE_CSV_URL = 'https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv'
export const OIG_SOURCE_URL = 'https://oig.hhs.gov/exclusions'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR  = join(__dirname, '../../.cache')
const CACHE_FILE = join(CACHE_DIR, 'leie.csv')
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours

interface LeieEntry {
  exclType: string | null
  exclDate: string | null
  reinDate: string | null
}

// Session-level index — built once per process from the (possibly cached) CSV
let leieIndex: Map<string, LeieEntry> | null = null

function isCacheFresh(): boolean {
  if (!existsSync(CACHE_FILE)) return false
  const age = Date.now() - statSync(CACHE_FILE).mtimeMs
  return age < CACHE_TTL_MS
}

async function fetchCsv(): Promise<string | null> {
  if (isCacheFresh()) {
    return readFileSync(CACHE_FILE, 'utf-8')
  }

  process.stdout.write('  ↓ Downloading OIG LEIE extract...')

  const res = await fetch(LEIE_CSV_URL, {
    headers: { 'User-Agent': 'CAQH-ProviderVerify/0.1' },
  }).catch((err: any) => {
    console.warn(` failed — ${err.message} — treating all providers as unverified`)
    return null
  })

  if (!res?.ok) {
    console.warn(` HTTP ${res?.status ?? 'error'} — treating all providers as unverified`)
    return null
  }

  const text = await res.text()

  // Persist to disk cache
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(CACHE_FILE, text, 'utf-8')
  } catch {
    // Cache write failure is non-fatal
  }

  console.log(` done (cached to .cache/leie.csv for 24 h)`)
  return text
}

async function getLeieIndex(): Promise<Map<string, LeieEntry>> {
  if (leieIndex) return leieIndex

  const csv = await fetchCsv()
  leieIndex = new Map()
  if (!csv) return leieIndex

  const lines = csv.split('\n')

  // Normalise header row — strip quotes, upper-case
  const headers = lines[0]
    .split(',')
    .map(h => h.trim().replace(/^"|"$/g, '').toUpperCase())

  const npiIdx  = headers.indexOf('NPI')
  const typeIdx = headers.indexOf('EXCLTYPE')
  const dateIdx = headers.indexOf('EXCLDATE')
  const reinIdx = headers.indexOf('REINDATE')

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (!cols || cols.length <= npiIdx) continue

    const npi = cols[npiIdx]?.trim().replace(/^"|"$/g, '') ?? ''
    if (!npi || npi === '-') continue   // many old records predate NPI adoption

    leieIndex.set(npi, {
      exclType: cols[typeIdx]?.replace(/^"|"$/g, '') || null,
      exclDate: cols[dateIdx]?.replace(/^"|"$/g, '') || null,
      reinDate: cols[reinIdx]?.replace(/^"|"$/g, '') || null,
    })
  }

  return leieIndex
}

// Minimal CSV parser — handles quoted fields with embedded commas
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let inQuote = false
  let current = ''
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export async function fetchOig(npi: string): Promise<OigRecord> {
  const index = await getLeieIndex()
  const entry = index.get(npi)

  if (!entry) {
    return { npi, excluded: false, exclusionType: null, exclusionDate: null, reinstatedDate: null }
  }

  return {
    npi,
    excluded: true,
    exclusionType: entry.exclType,
    exclusionDate: entry.exclDate,
    reinstatedDate: entry.reinDate,
  }
}
