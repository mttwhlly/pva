import fetch from 'node-fetch'
import type { MedicareEnrollmentRecord } from '../types.js'

// CMS Medicare Fee-for-Service Public Provider Enrollment Data
// Dataset: https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/medicare-fee-for-service-public-provider-enrollment
// No auth required — public dataset
const DATASET_ID = '2457ea29-fc82-48b0-86ec-3b0755de7515'
const BASE = `https://data.cms.gov/api/1/datastore/query/${DATASET_ID}/0`
export const ENROLLMENT_SOURCE_URL = 'https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/medicare-fee-for-service-public-provider-enrollment'

export async function fetchMedicareEnrollment(npi: string): Promise<MedicareEnrollmentRecord> {
  const url = `${BASE}?conditions[0][property]=NPI&conditions[0][value]=${npi}&conditions[0][operator]=%3D&limit=1`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CAQH-ProviderVerify/0.1',
    }
  }).catch((err: any) => {
    console.warn(`  ⚠ CMS Enrollment network error for NPI ${npi} — ${err.message}`)
    return null
  })

  if (!res) return { npi, enrolled: false, enrollmentType: null, specialty: null, state: null, pacId: null }

  if (!res.ok) {
    console.warn(`  ⚠ CMS Enrollment API returned ${res.status} for NPI ${npi}`)
    return { npi, enrolled: false, enrollmentType: null, specialty: null, state: null, pacId: null }
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    return { npi, enrolled: false, enrollmentType: null, specialty: null, state: null, pacId: null }
  }

  const rows: any[] = data.results ?? data.data ?? []

  if (rows.length === 0) {
    return { npi, enrolled: false, enrollmentType: null, specialty: null, state: null, pacId: null }
  }

  const r = rows[0]

  // Enrollment type: I = Individual, O = Organization
  const rawType = r.ENRLMT_ID?.startsWith('I') ? 'Individual'
    : r.ENRLMT_ID?.startsWith('O') ? 'Organization'
    : r.enrlmt_id?.startsWith('I') ? 'Individual'
    : r.enrlmt_id?.startsWith('O') ? 'Organization'
    : null

  return {
    npi,
    enrolled: true,
    enrollmentType: rawType,
    specialty: r.PRMRY_SPCLTY_CD_DESC ?? r.prmry_spclty_cd_desc ?? r.PROVIDER_TYPE_DESC ?? null,
    state: r.STATE_CD ?? r.state_cd ?? null,
    pacId: r.PECOS_ASSGN_ID ?? r.pecos_assgn_id ?? null,
  }
}
