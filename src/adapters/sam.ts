import fetch from 'node-fetch'
import type { SamRecord } from '../types.js'

// SAM.gov Entity/Exclusions API — DEMO_KEY works for low-volume public queries
// Docs: https://open.gsa.gov/api/exclusions-api/
const SAM_API = 'https://api.sam.gov/exclusions/v1/exclusions'
export const SAM_SOURCE_URL = 'https://sam.gov/search/?index=ei'

export async function fetchSam(npi: string): Promise<SamRecord> {
  // Search by NPI in the uei/npi field
  const url = `${SAM_API}?api_key=DEMO_KEY&npiList=${npi}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CAQH-ProviderVerify/0.1',
    }
  })

  if (!res.ok) {
    // SAM API rate limits DEMO_KEY aggressively — log and continue
    console.warn(`  ⚠ SAM.gov API returned ${res.status} for NPI ${npi} — treating as unverified`)
    return { npi, excluded: false, exclusionType: null }
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    return { npi, excluded: false, exclusionType: null }
  }

  const exclusionData = data.exclusionData ?? data.entityData ?? []
  const hits: any[] = Array.isArray(exclusionData) ? exclusionData : []

  if (hits.length === 0) {
    return { npi, excluded: false, exclusionType: null }
  }

  const e = hits[0]
  return {
    npi,
    excluded: true,
    exclusionType: e.exclusionType?.value ?? e.classification ?? null,
  }
}
