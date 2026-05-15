import type {
  ProviderSnapshot, NppesRecord, OigRecord, SamRecord,
  ChangeEvent, ConfidenceTier, SourceId
} from './types.js'
import { NPPES_SOURCE_URL } from './adapters/nppes.js'
import { OIG_SOURCE_URL } from './adapters/oig.js'
import { SAM_SOURCE_URL } from './adapters/sam.js'

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

// ── Main diff entry point ─────────────────────────────────────────────────────

export function diffProvider(
  prev: ProviderSnapshot | null,
  nppes: NppesRecord,
  oig: OigRecord,
  sam: SamRecord,
): ChangeEvent[] {
  const npi = nppes.npi
  return [
    ...diffNppes(npi, prev?.nppes ?? null, nppes),
    ...diffOig(npi, prev?.oig ?? null, oig),
    ...diffSam(npi, prev?.sam ?? null, sam),
  ]
}
