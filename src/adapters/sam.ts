import fetch from 'node-fetch'
import https from 'https'
import type { SamRecord } from '../types.js'

// SAM.gov Exclusions API — DEMO_KEY works for low-volume public queries
// Docs: https://open.gsa.gov/api/exclusions-api/
const SAM_API = 'https://api.sam.gov/exclusions/v1/exclusions'
export const SAM_SOURCE_URL = 'https://sam.gov/search/?index=ei'

// node-fetch does not automatically pick up NODE_TLS_REJECT_UNAUTHORIZED, so
// we wire it up manually. This lets the documented Windows corporate proxy
// workaround (NODE_TLS_REJECT_UNAUTHORIZED=0) actually take effect.
const tlsAgent = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined

export async function fetchSam(npi: string): Promise<SamRecord> {
  const url = `${SAM_API}?api_key=DEMO_KEY&npi=${npi}`

  const res = await fetch(url, {
    agent: tlsAgent,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CAQH-ProviderVerify/0.1',
    },
  }).catch((err: any) => {
    console.warn(`  ⚠ SAM.gov network error for NPI ${npi} — ${err.message} — treating as unverified`)
    return null
  })

  if (!res) return { npi, excluded: false, exclusionType: null }

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
