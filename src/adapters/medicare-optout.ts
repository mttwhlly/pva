import fetch from 'node-fetch'
import type { MedicareOptOutRecord } from '../types.js'

// CMS Medicare Opt-Out Affidavits — public dataset, no auth
// Dataset: https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/opt-out-affidavits
// API docs: https://data.cms.gov/developer-tools/api
const DATASET_ID = '0fd0d14e-a23c-4301-826f-7df92fd33e3d'
const BASE = `https://data.cms.gov/api/1/datastore/query/${DATASET_ID}/0`
export const OPT_OUT_SOURCE_URL = 'https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/opt-out-affidavits'

export async function fetchMedicareOptOut(npi: string): Promise<MedicareOptOutRecord> {
  // CMS datastore query API — filter by NPI
  const url = `${BASE}?conditions[0][property]=NPI&conditions[0][value]=${npi}&conditions[0][operator]=%3D&limit=1`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CAQH-ProviderVerify/0.1',
    }
  }).catch((err: any) => {
    console.warn(`  ⚠ CMS Opt-Out network error for NPI ${npi} — ${err.message}`)
    return null
  })

  if (!res) return { npi, optedOut: false, optOutEffectiveDate: null, optOutEndDate: null, specialty: null }

  if (!res.ok) {
    console.warn(`  ⚠ CMS Opt-Out API returned ${res.status} for NPI ${npi}`)
    return { npi, optedOut: false, optOutEffectiveDate: null, optOutEndDate: null, specialty: null }
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    return { npi, optedOut: false, optOutEffectiveDate: null, optOutEndDate: null, specialty: null }
  }

  const rows: any[] = data.results ?? data.data ?? []

  if (rows.length === 0) {
    return { npi, optedOut: false, optOutEffectiveDate: null, optOutEndDate: null, specialty: null }
  }

  const r = rows[0]
  return {
    npi,
    optedOut: true,
    optOutEffectiveDate: r.Effective_Date ?? r.effective_date ?? null,
    optOutEndDate: r.End_Date ?? r.end_date ?? null,
    specialty: r.Specialty ?? r.specialty ?? null,
  }
}
