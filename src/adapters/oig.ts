import fetch from 'node-fetch'
import type { OigRecord } from '../types.js'

// OIG LEIE public search — no API key required
// Docs: https://oig.hhs.gov/exclusions/exclusions_databaseresearch.asp
const OIG_API = 'https://oig.hhs.gov/exclusions/exclusions_databaseresearch.asp'
export const OIG_SOURCE_URL = 'https://oig.hhs.gov/exclusions'

// The OIG search API accepts NPI as a query parameter
// Returns JSON with a list of excluded individuals/entities
export async function fetchOig(npi: string): Promise<OigRecord> {
  const url = `${OIG_API}?search_type=npi&npi=${npi}&output_format=json`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CAQH-ProviderVerify/0.1',
    }
  })

  // OIG returns 200 with empty results if not excluded
  if (!res.ok) {
    // OIG API occasionally has downtime — return unknown state rather than throwing
    console.warn(`  ⚠ OIG API returned ${res.status} for NPI ${npi} — treating as unverified`)
    return {
      npi,
      excluded: false,
      exclusionType: null,
      exclusionDate: null,
      reinstatedDate: null,
    }
  }

  const text = await res.text()

  // Handle empty or non-JSON responses gracefully
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    return {
      npi,
      excluded: false,
      exclusionType: null,
      exclusionDate: null,
      reinstatedDate: null,
    }
  }

  const exclusions: any[] = data.exclusions ?? data.results ?? []

  if (exclusions.length === 0) {
    return {
      npi,
      excluded: false,
      exclusionType: null,
      exclusionDate: null,
      reinstatedDate: null,
    }
  }

  const e = exclusions[0]
  return {
    npi,
    excluded: true,
    exclusionType: e.EXCLTYPE ?? e.exclusion_type ?? null,
    exclusionDate: e.EXCLDATE ?? e.exclusion_date ?? null,
    reinstatedDate: e.REINDATE ?? e.reinstatement_date ?? null,
  }
}
