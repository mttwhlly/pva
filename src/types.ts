// ── Source adapter output types ──────────────────────────────────────────────

export interface NppesRecord {
  npi: string
  name: string
  credential: string | null
  primaryTaxonomy: string | null
  taxonomyCategory: string | null   // from NUCC crosswalk
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

export interface MedicareOptOutRecord {
  npi: string
  optedOut: boolean
  optOutEffectiveDate: string | null
  optOutEndDate: string | null
  specialty: string | null
  // Opt-out means provider declined Medicare assignment — important for network adequacy
}

export interface MedicareEnrollmentRecord {
  npi: string
  enrolled: boolean
  enrollmentType: string | null      // 'Individual' | 'Organization'
  specialty: string | null
  state: string | null
  pacId: string | null               // CMS PAC ID — stable identifier across name changes
}

export interface StateBoardRecord {
  npi: string
  state: string
  licenseNumber: string | null
  licenseType: string | null
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED' | 'UNKNOWN'
  expirationDate: string | null
  disciplinaryActions: DisciplinaryAction[]
  // NOTE: This adapter uses seeded simulation — real impl requires per-state Playwright extraction
  simulated: true
}

export interface DisciplinaryAction {
  actionType: string
  actionDate: string
  description: string
}

// ── Snapshot (persisted per-provider) ────────────────────────────────────────

export interface ProviderSnapshot {
  npi: string
  capturedAt: string
  nppes: NppesRecord | null
  oig: OigRecord | null
  sam: SamRecord | null
  medicareOptOut: MedicareOptOutRecord | null
  medicareEnrollment: MedicareEnrollmentRecord | null
  stateBoard: StateBoardRecord | null
}

// ── Change detection output ───────────────────────────────────────────────────

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'REVIEW_NEEDED'
export type ChangeType = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'FIRST_SEEN'
export type SourceId =
  | 'NPPES'
  | 'OIG_LEIE'
  | 'SAM_GOV'
  | 'CMS_OPT_OUT'
  | 'CMS_ENROLLMENT'
  | 'STATE_BOARD'

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
  medicareOptOut: MedicareOptOutRecord | null
  medicareEnrollment: MedicareEnrollmentRecord | null
  stateBoard: StateBoardRecord | null
  changes: ChangeEvent[]
  error: string | null
}
