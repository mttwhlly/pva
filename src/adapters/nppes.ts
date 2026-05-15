import fetch from 'node-fetch'
import type { NppesRecord } from '../types.js'

const BASE = 'https://npiregistry.cms.hhs.gov/api'
const SOURCE_URL = 'https://npiregistry.cms.hhs.gov'

export async function fetchNppes(npi: string): Promise<NppesRecord> {
  const url = `${BASE}/?number=${npi}&version=2.1`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'CAQH-ProviderVerify/0.1' }
  })

  if (!res.ok) throw new Error(`NPPES HTTP ${res.status} for NPI ${npi}`)

  const data = await res.json() as any
  const results: any[] = data.results ?? []

  if (results.length === 0) {
    // NPI not found — treat as deactivated / unknown
    return {
      npi,
      name: 'NOT FOUND',
      credential: null,
      primaryTaxonomy: null,
      practiceAddress: null,
      deactivated: true,
      lastUpdated: new Date().toISOString(),
    }
  }

  const r = results[0]
  const basic = r.basic ?? {}
  const addresses: any[] = r.addresses ?? []
  const taxonomies: any[] = r.taxonomies ?? []

  // Build display name
  let name: string
  if (basic.organization_name) {
    name = basic.organization_name
  } else {
    const parts = [basic.first_name, basic.middle_name, basic.last_name].filter(Boolean)
    name = parts.join(' ')
  }

  // Primary practice address
  const practiceAddr = addresses.find((a: any) => a.address_purpose === 'LOCATION')
    ?? addresses[0]
    ?? null

  // Primary taxonomy
  const primaryTaxonomy = taxonomies.find((t: any) => t.primary)?.desc
    ?? taxonomies[0]?.desc
    ?? null

  // Deactivated if status is D
  const deactivated = basic.status === 'D'

  return {
    npi,
    name,
    credential: basic.credential ?? null,
    primaryTaxonomy,
    practiceAddress: practiceAddr ? {
      line1: [practiceAddr.address_1, practiceAddr.address_2].filter(Boolean).join(', '),
      city: practiceAddr.city ?? '',
      state: practiceAddr.state ?? '',
      zip: (practiceAddr.postal_code ?? '').substring(0, 5),
    } : null,
    deactivated,
    lastUpdated: basic.last_updated ?? new Date().toISOString(),
  }
}

export { SOURCE_URL as NPPES_SOURCE_URL }
