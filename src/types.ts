// ── Source adapter output types ──────────────────────────────────────────────

export interface NppesRecord {
  npi: string
  name: string
  credential: string | null
  primaryTaxonomy: string | null
  practiceAddress: {
    line1: string
    city: string
    state: string
    zip: string
  } | null
  deactivated: boolean
  lastUpdated: string
}

export interface OigRecord {
  npi: string
  excluded: boolean
  exclusionType: string | null
  exclusionDate: string | null
  reinstatedDate: string | null
}

export interface SamRecord {
  npi: string
  excluded: boolean
  exclusionType: string | null
}

// ── Snapshot (persisted per-provider) ────────────────────────────────────────

export interface ProviderSnapshot {
  npi: string
  capturedAt: string
  nppes: NppesRecord | null
  oig: OigRecord | null
  sam: SamRecord | null
}

// ── Change detection output ───────────────────────────────────────────────────

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'REVIEW_NEEDED'
export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'FIRST_SEEN'
export type SourceId = 'NPPES' | 'OIG_LEIE' | 'SAM_GOV'

export interface ChangeEvent {
  npi: string
  source: SourceId
  field: string
  oldValue: string | null
  newValue: string | null
  changeType: ChangeType
  confidence: number
  confidenceTier: ConfidenceTier
  sourceUrl: string
  detectedAt: string
}

// ── Per-provider run result ───────────────────────────────────────────────────

export type ProviderStatus = 'CLEAR' | 'REVIEW_NEEDED' | 'FLAG_HIGH'

export interface ProviderResult {
  npi: string
  displayName: string
  status: ProviderStatus
  nppes: NppesRecord | null
  oig: OigRecord | null
  sam: SamRecord | null
  changes: ChangeEvent[]
  error: string | null
}
