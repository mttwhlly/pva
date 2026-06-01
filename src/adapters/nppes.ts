import fetch from 'node-fetch'
import type { NppesRecord } from '../types.js'
import { lookupTaxonomy } from '../nucc.js'

const BASE = 'https://npiregistry.cms.hhs.gov/api'
const SOURCE_URL = 'https://npiregistry.cms.hhs.gov'

export async function fetchNppes(npi: string): Promise<NppesRecord> {
  const url = `${BASE}/?number=${npi}&version=2.1`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'CAQH-ProviderVerify/0.1' }
  }).catch((err: any) => {
    throw new Error(`NPPES network error for NPI ${npi} — ${err.message}`)
  })

  if (!res.ok) throw new Error(`NPPES HTTP ${res.status} for NPI ${npi}`)

  const data = await res.json() as any
  const results: any[] = data.results ?? []

  if (results.length === 0) {
    return {
      npi,
      name: 'NOT FOUND',
      credential: null,
      primaryTaxonomy: null,
      taxonomyCategory: null,
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

  // Primary practice address (prefer LOCATION over MAILING)
  const practiceAddr = addresses.find((a: any) => a.address_purpose === 'LOCATION')
    ?? addresses[0]
    ?? null

  // Primary taxonomy + NUCC category enrichment
  const primaryTaxEntry = taxonomies.find((t: any) => t.primary) ?? taxonomies[0] ?? null
  const primaryTaxonomy = primaryTaxEntry?.desc ?? null
  const primaryTaxCode = primaryTaxEntry?.code ?? null
  const nuccEntry = primaryTaxCode ? lookupTaxonomy(primaryTaxCode) : null
  const taxonomyCategoryVal = nuccEntry?.category ?? null

  const deactivated = basic.status === 'D'

  return {
    npi,
    name,
    credential: basic.credential ?? null,
    primaryTaxonomy,
    taxonomyCategory: taxonomyCategoryVal,
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
