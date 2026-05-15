import type {
  ProviderSnapshot, NppesRecord, OigRecord, SamRecord,
  MedicareOptOutRecord, MedicareEnrollmentRecord, StateBoardRecord,
  ChangeEvent, ConfidenceTier, SourceId
} from './types.js'
import { NPPES_SOURCE_URL } from './adapters/nppes.js'
import { OIG_SOURCE_URL } from './adapters/oig.js'
import { SAM_SOURCE_URL } from './adapters/sam.js'
import { OPT_OUT_SOURCE_URL } from './adapters/medicare-optout.js'
import { ENROLLMENT_SOURCE_URL } from './adapters/medicare-enrollment.js'
import { STATE_BOARD_SOURCE_URL } from './adapters/state-board.js'

function tier(confidence: number): ConfidenceTier {
  if (confidence >= 0.9) return 'HIGH'
  if (confidence >= 0.6) return 'MEDIUM'
  return 'REVIEW_NEEDED'
}

function event(
  npi: string,
  source: SourceId,
  sourceUrl: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  confidence: number,
): ChangeEvent {
  const changeType = oldValue === null ? 'FIRST_SEEN'
    : newValue === null ? 'REMOVED'
    : 'MODIFIED'
  return {
    npi, source, field, oldValue, newValue,
    changeType,
    confidence,
    confidenceTier: tier(confidence),
    sourceUrl,
    detectedAt: new Date().toISOString(),
  }
}

// ── NPPES diff ────────────────────────────────────────────────────────────────

function diffNppes(
  npi: string,
  prev: NppesRecord | null,
  curr: NppesRecord,
): ChangeEvent[] {
  const events: ChangeEvent[] = []
  const src = NPPES_SOURCE_URL

  if (!prev) {
    events.push(event(npi, 'NPPES', src, 'record', null, curr.name, 0.5))
    return events
  }

  if (curr.deactivated && !prev.deactivated)
    events.push(event(npi, 'NPPES', src, 'deactivated', 'false', 'true', 0.95))

  if (curr.name !== prev.name)
    events.push(event(npi, 'NPPES', src, 'name', prev.name, curr.name, 0.6))

  if (curr.credential !== prev.credential)
    events.push(event(npi, 'NPPES', src, 'credential', prev.credential, curr.credential, 0.6))

  if (curr.primaryTaxonomy !== prev.primaryTaxonomy)
    events.push(event(npi, 'NPPES', src, 'primaryTaxonomy', prev.primaryTaxonomy, curr.primaryTaxonomy, 0.65))

  // Address — compare formatted string
  const prevAddr = prev.practiceAddress
    ? `${prev.practiceAddress.line1}, ${prev.practiceAddress.city}, ${prev.practiceAddress.state} ${prev.practiceAddress.zip}`
    : null
  const currAddr = curr.practiceAddress
    ? `${curr.practiceAddress.line1}, ${curr.practiceAddress.city}, ${curr.practiceAddress.state} ${curr.practiceAddress.zip}`
    : null
  if (prevAddr !== currAddr)
    events.push(event(npi, 'NPPES', src, 'practiceAddress', prevAddr, currAddr, 0.7))

  return events
}

// ── OIG diff ──────────────────────────────────────────────────────────────────

function diffOig(
  npi: string,
  prev: OigRecord | null,
  curr: OigRecord,
): ChangeEvent[] {
  const events: ChangeEvent[] = []
  const src = OIG_SOURCE_URL

  if (!prev) {
    if (curr.excluded)
      events.push(event(npi, 'OIG_LEIE', src, 'excluded', null, `true (${curr.exclusionType})`, 1.0))
    return events
  }

  if (curr.excluded && !prev.excluded) {
    events.push(event(npi, 'OIG_LEIE', src, 'excluded',
      'false',
      `true — ${curr.exclusionType ?? 'unknown type'} (effective ${curr.exclusionDate ?? 'unknown'})`,
      1.0
    ))
  }

  if (!curr.excluded && prev.excluded) {
    events.push(event(npi, 'OIG_LEIE', src, 'excluded', 'true', 'false (reinstated)', 0.9))
  }

  return events
}

// ── SAM diff ──────────────────────────────────────────────────────────────────

function diffSam(
  npi: string,
  prev: SamRecord | null,
  curr: SamRecord,
): ChangeEvent[] {
  const events: ChangeEvent[] = []
  const src = SAM_SOURCE_URL

  if (!prev) {
    if (curr.excluded)
      events.push(event(npi, 'SAM_GOV', src, 'excluded', null, `true (${curr.exclusionType})`, 1.0))
    return events
  }

  if (curr.excluded && !prev.excluded)
    events.push(event(npi, 'SAM_GOV', src, 'excluded', 'false', `true — ${curr.exclusionType ?? 'unknown'}`, 1.0))

  if (!curr.excluded && prev.excluded)
    events.push(event(npi, 'SAM_GOV', src, 'excluded', 'true', 'false (removed)', 0.9))

  return events
}

// ── Medicare Opt-Out diff ─────────────────────────────────────────────────────

function diffMedicareOptOut(
  npi: string,
  prev: MedicareOptOutRecord | null,
  curr: MedicareOptOutRecord,
): ChangeEvent[] {
  const events: ChangeEvent[] = []
  const src = OPT_OUT_SOURCE_URL

  if (!prev) {
    // Only emit first-seen if opted out — not opted-out is the normal state
    if (curr.optedOut)
      events.push(event(npi, 'CMS_OPT_OUT', src, 'optedOut',
        null,
        `true (effective ${curr.optOutEffectiveDate ?? 'unknown'}, ends ${curr.optOutEndDate ?? 'unknown'})`,
        0.9
      ))
    return events
  }

  if (curr.optedOut && !prev.optedOut)
    events.push(event(npi, 'CMS_OPT_OUT', src, 'optedOut',
      'false',
      `true — opted out of Medicare effective ${curr.optOutEffectiveDate ?? 'unknown'}`,
      0.9
    ))

  if (!curr.optedOut && prev.optedOut)
    events.push(event(npi, 'CMS_OPT_OUT', src, 'optedOut', 'true', 'false (opt-out ended)', 0.8))

  if (curr.optedOut && prev.optedOut && curr.optOutEndDate !== prev.optOutEndDate)
    events.push(event(npi, 'CMS_OPT_OUT', src, 'optOutEndDate', prev.optOutEndDate, curr.optOutEndDate, 0.65))

  return events
}

// ── Medicare Enrollment diff ──────────────────────────────────────────────────

function diffMedicareEnrollment(
  npi: string,
  prev: MedicareEnrollmentRecord | null,
  curr: MedicareEnrollmentRecord,
): ChangeEvent[] {
  const events: ChangeEvent[] = []
  const src = ENROLLMENT_SOURCE_URL

  if (!prev) {
    // First seen — only interesting if NOT enrolled (enrolled is expected)
    if (!curr.enrolled)
      events.push(event(npi, 'CMS_ENROLLMENT', src, 'enrolled', null, 'false — not found in Medicare enrollment', 0.6))
    return events
  }

  if (!curr.enrolled && prev.enrolled)
    events.push(event(npi, 'CMS_ENROLLMENT', src, 'enrolled', 'true', 'false — no longer enrolled in Medicare', 0.85))

  if (curr.enrolled && !prev.enrolled)
    events.push(event(npi, 'CMS_ENROLLMENT', src, 'enrolled', 'false', 'true — now enrolled in Medicare', 0.75))

  if (curr.specialty !== prev.specialty && curr.specialty && prev.specialty)
    events.push(event(npi, 'CMS_ENROLLMENT', src, 'specialty', prev.specialty, curr.specialty, 0.6))

  if (curr.state !== prev.state && curr.state && prev.state)
    events.push(event(npi, 'CMS_ENROLLMENT', src, 'enrollmentState', prev.state, curr.state, 0.7))

  return events
}

// ── State Board diff ──────────────────────────────────────────────────────────

function diffStateBoard(
  npi: string,
  prev: StateBoardRecord | null,
  curr: StateBoardRecord,
): ChangeEvent[] {
  const events: ChangeEvent[] = []
  const src = STATE_BOARD_SOURCE_URL

  if (!prev) {
    if (curr.status === 'SUSPENDED' || curr.status === 'REVOKED')
      events.push(event(npi, 'STATE_BOARD', src, 'licenseStatus',
        null, `${curr.status} — ${curr.state} license ${curr.licenseNumber ?? ''}`, 1.0))
    if (curr.status === 'EXPIRED')
      events.push(event(npi, 'STATE_BOARD', src, 'licenseStatus',
        null, `EXPIRED — ${curr.state} license expired ${curr.expirationDate ?? 'unknown'}`, 0.85))
    if (curr.disciplinaryActions.length > 0)
      events.push(event(npi, 'STATE_BOARD', src, 'disciplinaryAction',
        null,
        curr.disciplinaryActions.map(a => `${a.actionType} (${a.actionDate}): ${a.description}`).join('; '),
        0.9
      ))
    return events
  }

  // License status change
  if (curr.status !== prev.status) {
    const confidence =
      (curr.status === 'REVOKED' || curr.status === 'SUSPENDED') ? 1.0 :
      curr.status === 'EXPIRED' ? 0.85 : 0.75
    events.push(event(npi, 'STATE_BOARD', src, 'licenseStatus',
      prev.status, `${curr.status}${curr.expirationDate ? ` (${curr.expirationDate})` : ''}`,
      confidence
    ))
  }

  // New disciplinary actions (compare by actionDate+actionType)
  const prevActionKeys = new Set(prev.disciplinaryActions.map(a => `${a.actionDate}|${a.actionType}`))
  const newActions = curr.disciplinaryActions.filter(
    a => !prevActionKeys.has(`${a.actionDate}|${a.actionType}`)
  )
  for (const action of newActions) {
    events.push(event(npi, 'STATE_BOARD', src, 'disciplinaryAction',
      null, `${action.actionType} (${action.actionDate}): ${action.description}`, 0.9))
  }

  // Expiration date change
  if (curr.expirationDate !== prev.expirationDate && curr.expirationDate)
    events.push(event(npi, 'STATE_BOARD', src, 'licenseExpirationDate',
      prev.expirationDate, curr.expirationDate, 0.65))

  return events
}

// ── Main diff entry point ─────────────────────────────────────────────────────

export function diffProvider(
  prev: ProviderSnapshot | null,
  nppes: NppesRecord,
  oig: OigRecord,
  sam: SamRecord,
  medicareOptOut: MedicareOptOutRecord,
  medicareEnrollment: MedicareEnrollmentRecord,
  stateBoard: StateBoardRecord,
): ChangeEvent[] {
  const npi = nppes.npi
  return [
    ...diffNppes(npi, prev?.nppes ?? null, nppes),
    ...diffOig(npi, prev?.oig ?? null, oig),
    ...diffSam(npi, prev?.sam ?? null, sam),
    ...diffMedicareOptOut(npi, prev?.medicareOptOut ?? null, medicareOptOut),
    ...diffMedicareEnrollment(npi, prev?.medicareEnrollment ?? null, medicareEnrollment),
    ...diffStateBoard(npi, prev?.stateBoard ?? null, stateBoard),
  ]
}
