import type { StateBoardRecord, DisciplinaryAction } from '../types.js'

export const STATE_BOARD_SOURCE_URL = 'https://www.fsmb.org/physician-data-center/state-medical-boards/'

// ── Simulation seed data ──────────────────────────────────────────────────────
//
// NOTE: This adapter is explicitly simulated.
// Real implementation requires per-state Playwright extraction (50 state medical
// boards + DC have varying APIs, HTML structures, and PDF formats).
// This seeds realistic scenarios to demonstrate what the diff engine surfaces
// when license status changes — the pattern is identical to the real adapters.
//
// In production: replace fetchStateBoardSimulated() with per-state HTTP extractors.
// The StateBoardRecord interface and diff logic remain unchanged.

interface SeedEntry {
  state: string
  licenseNumber: string
  licenseType: string
  status: StateBoardRecord['status']
  expirationDate: string
  disciplinaryActions: DisciplinaryAction[]
}

// Seeded by NPI — deterministic so re-runs are consistent
const SEED_DATA: Record<string, SeedEntry> = {
  // Clean active license
  '1003000126': {
    state: 'IL',
    licenseNumber: 'MD-054-123456',
    licenseType: 'Medical Doctor',
    status: 'ACTIVE',
    expirationDate: '2026-09-30',
    disciplinaryActions: [],
  },
  // License expiring soon / recently expired — generates REVIEW flag
  '1730139189': {
    state: 'TX',
    licenseNumber: 'K9876',
    licenseType: 'Medical Doctor',
    status: 'EXPIRED',
    expirationDate: '2024-12-31',
    disciplinaryActions: [],
  },
  // Disciplinary action — generates HIGH flag
  '1679576722': {
    state: 'FL',
    licenseNumber: 'ME98765',
    licenseType: 'Medical Doctor',
    status: 'ACTIVE',
    expirationDate: '2025-10-31',
    disciplinaryActions: [
      {
        actionType: 'Letter of Concern',
        actionDate: '2024-08-15',
        description: 'Prescribing practices review — continuing education required',
      },
    ],
  },
  // Revoked license (real OIG excluded org) — generates HIGH flag
  '1215968847': {
    state: 'FL',
    licenseNumber: 'CLINIC-FL-2008-00892',
    licenseType: 'Mental Health Clinic',
    status: 'REVOKED',
    expirationDate: '2016-06-30',
    disciplinaryActions: [
      {
        actionType: 'Revocation',
        actionDate: '2016-01-20',
        description: 'License revoked following federal OIG exclusion — §1128(a)(1) conviction of Medicare/Medicaid fraud',
      },
    ],
  },
}

const DEFAULT_SEED: SeedEntry = {
  state: 'UNKNOWN',
  licenseNumber: null as any,
  licenseType: 'Medical Doctor',
  status: 'UNKNOWN',
  expirationDate: '',
  disciplinaryActions: [],
}

export async function fetchStateBoardSimulated(npi: string): Promise<StateBoardRecord> {
  // Simulate a small network delay so the parallel fetch feels real
  await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120))

  const seed = SEED_DATA[npi] ?? DEFAULT_SEED

  return {
    npi,
    state: seed.state,
    licenseNumber: seed.licenseNumber ?? null,
    licenseType: seed.licenseType,
    status: seed.status,
    expirationDate: seed.expirationDate || null,
    disciplinaryActions: seed.disciplinaryActions,
    simulated: true,
  }
}
