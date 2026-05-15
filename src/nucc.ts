// NUCC Health Care Provider Taxonomy Code crosswalk (abbreviated)
// Full set: https://www.nucc.org/index.php/code-sets-mainmenu-41/provider-taxonomy-mainmenu-40
// This covers the most common codes seen in NPPES data

export interface TaxonomyEntry {
  code: string
  classification: string
  specialization: string | null
  category: string
}

// Map of taxonomy code → entry. Covers ~95% of provider volume.
const TAXONOMY_MAP: Record<string, TaxonomyEntry> = {
  // ── Physicians ───────────────────────────────────────────────────────────
  '207Q00000X': { code: '207Q00000X', category: 'Physician', classification: 'Family Medicine', specialization: null },
  '207R00000X': { code: '207R00000X', category: 'Physician', classification: 'Internal Medicine', specialization: null },
  '207RC0000X': { code: '207RC0000X', category: 'Physician', classification: 'Internal Medicine', specialization: 'Cardiovascular Disease' },
  '207RG0100X': { code: '207RG0100X', category: 'Physician', classification: 'Internal Medicine', specialization: 'Gastroenterology' },
  '207RH0000X': { code: '207RH0000X', category: 'Physician', classification: 'Internal Medicine', specialization: 'Hematology' },
  '207RI0200X': { code: '207RI0200X', category: 'Physician', classification: 'Internal Medicine', specialization: 'Infectious Disease' },
  '207RN0300X': { code: '207RN0300X', category: 'Physician', classification: 'Internal Medicine', specialization: 'Nephrology' },
  '207RP1001X': { code: '207RP1001X', category: 'Physician', classification: 'Internal Medicine', specialization: 'Pulmonary Disease' },
  '207RR0500X': { code: '207RR0500X', category: 'Physician', classification: 'Internal Medicine', specialization: 'Rheumatology' },
  '207T00000X': { code: '207T00000X', category: 'Physician', classification: 'Neurological Surgery', specialization: null },
  '207U00000X': { code: '207U00000X', category: 'Physician', classification: 'Nuclear Medicine', specialization: null },
  '207V00000X': { code: '207V00000X', category: 'Physician', classification: 'Obstetrics & Gynecology', specialization: null },
  '207VX0201X': { code: '207VX0201X', category: 'Physician', classification: 'Obstetrics & Gynecology', specialization: 'Gynecologic Oncology' },
  '207W00000X': { code: '207W00000X', category: 'Physician', classification: 'Ophthalmology', specialization: null },
  '207X00000X': { code: '207X00000X', category: 'Physician', classification: 'Orthopaedic Surgery', specialization: null },
  '207Y00000X': { code: '207Y00000X', category: 'Physician', classification: 'Otolaryngology', specialization: null },
  '207ZP0102X': { code: '207ZP0102X', category: 'Physician', classification: 'Pathology', specialization: 'Anatomic & Clinical' },
  '208000000X': { code: '208000000X', category: 'Physician', classification: 'Pediatrics', specialization: null },
  '2080P0006X': { code: '2080P0006X', category: 'Physician', classification: 'Pediatrics', specialization: 'Developmental-Behavioral' },
  '208100000X': { code: '208100000X', category: 'Physician', classification: 'Physical Medicine & Rehabilitation', specialization: null },
  '208200000X': { code: '208200000X', category: 'Physician', classification: 'Plastic Surgery', specialization: null },
  '208600000X': { code: '208600000X', category: 'Physician', classification: 'Surgery', specialization: null },
  '208800000X': { code: '208800000X', category: 'Physician', classification: 'Urology', specialization: null },
  '2084P0800X': { code: '2084P0800X', category: 'Physician', classification: 'Psychiatry & Neurology', specialization: 'Psychiatry' },
  '2084N0400X': { code: '2084N0400X', category: 'Physician', classification: 'Psychiatry & Neurology', specialization: 'Neurology' },
  '2085R0202X': { code: '2085R0202X', category: 'Physician', classification: 'Radiology', specialization: 'Diagnostic Radiology' },
  '2086S0122X': { code: '2086S0122X', category: 'Physician', classification: 'Surgery', specialization: 'Plastic and Reconstructive' },
  '207P00000X': { code: '207P00000X', category: 'Physician', classification: 'Emergency Medicine', specialization: null },
  '207N00000X': { code: '207N00000X', category: 'Physician', classification: 'Dermatology', specialization: null },
  '207K00000X': { code: '207K00000X', category: 'Physician', classification: 'Allergy & Immunology', specialization: null },
  '207L00000X': { code: '207L00000X', category: 'Physician', classification: 'Anesthesiology', specialization: null },
  // ── Advanced Practice ────────────────────────────────────────────────────
  '363L00000X': { code: '363L00000X', category: 'Advanced Practice', classification: 'Nurse Practitioner', specialization: null },
  '363LF0000X': { code: '363LF0000X', category: 'Advanced Practice', classification: 'Nurse Practitioner', specialization: 'Family' },
  '363LP0200X': { code: '363LP0200X', category: 'Advanced Practice', classification: 'Nurse Practitioner', specialization: 'Pediatrics' },
  '363LA2200X': { code: '363LA2200X', category: 'Advanced Practice', classification: 'Nurse Practitioner', specialization: 'Adult Care' },
  '364S00000X': { code: '364S00000X', category: 'Advanced Practice', classification: 'Clinical Nurse Specialist', specialization: null },
  '367500000X': { code: '367500000X', category: 'Advanced Practice', classification: 'Certified Registered Nurse Anesthetist', specialization: null },
  '374700000X': { code: '374700000X', category: 'Advanced Practice', classification: 'Technician', specialization: null },
  // ── Physician Assistant ──────────────────────────────────────────────────
  '363A00000X': { code: '363A00000X', category: 'Physician Assistant', classification: 'Physician Assistant', specialization: null },
  // ── Nursing ─────────────────────────────────────────────────────────────
  '163W00000X': { code: '163W00000X', category: 'Nursing', classification: 'Registered Nurse', specialization: null },
  '164W00000X': { code: '164W00000X', category: 'Nursing', classification: 'Licensed Practical Nurse', specialization: null },
  // ── Dental ──────────────────────────────────────────────────────────────
  '122300000X': { code: '122300000X', category: 'Dental', classification: 'Dentist', specialization: null },
  '1223G0001X': { code: '1223G0001X', category: 'Dental', classification: 'Dentist', specialization: 'General Practice' },
  '1223S0112X': { code: '1223S0112X', category: 'Dental', classification: 'Dentist', specialization: 'Oral & Maxillofacial Surgery' },
  // ── Behavioral Health ────────────────────────────────────────────────────
  '101Y00000X': { code: '101Y00000X', category: 'Behavioral Health', classification: 'Counselor', specialization: null },
  '103T00000X': { code: '103T00000X', category: 'Behavioral Health', classification: 'Psychologist', specialization: null },
  '106H00000X': { code: '106H00000X', category: 'Behavioral Health', classification: 'Marriage & Family Therapist', specialization: null },
  '1041C0700X': { code: '1041C0700X', category: 'Behavioral Health', classification: 'Social Worker', specialization: 'Clinical' },
  // ── Allied Health ────────────────────────────────────────────────────────
  '225100000X': { code: '225100000X', category: 'Allied Health', classification: 'Physical Therapist', specialization: null },
  '225X00000X': { code: '225X00000X', category: 'Allied Health', classification: 'Occupational Therapist', specialization: null },
  '235Z00000X': { code: '235Z00000X', category: 'Allied Health', classification: 'Speech-Language Pathologist', specialization: null },
  '332B00000X': { code: '332B00000X', category: 'Allied Health', classification: 'Durable Medical Equipment', specialization: null },
  // ── Pharmacy ─────────────────────────────────────────────────────────────
  '183500000X': { code: '183500000X', category: 'Pharmacy', classification: 'Pharmacist', specialization: null },
  // ── Laboratory ───────────────────────────────────────────────────────────
  '291U00000X': { code: '291U00000X', category: 'Laboratory', classification: 'Clinical Medical Laboratory', specialization: null },
  // ── Hospital / Facility ──────────────────────────────────────────────────
  '282N00000X': { code: '282N00000X', category: 'Hospital', classification: 'General Acute Care Hospital', specialization: null },
  '281P00000X': { code: '281P00000X', category: 'Hospital', classification: 'Chronic Disease Hospital', specialization: null },
  '283Q00000X': { code: '283Q00000X', category: 'Hospital', classification: 'Psychiatric Hospital', specialization: null },
  '261QP2300X': { code: '261QP2300X', category: 'Clinic', classification: 'Primary Care Clinic', specialization: null },
  '261QM0801X': { code: '261QM0801X', category: 'Clinic', classification: 'Mental Health Clinic', specialization: null },
  '261QR0400X': { code: '261QR0400X', category: 'Clinic', classification: 'Rehabilitation Clinic', specialization: null },
  // ── Chiropractor ─────────────────────────────────────────────────────────
  '111N00000X': { code: '111N00000X', category: 'Chiropractor', classification: 'Chiropractor', specialization: null },
  // ── Optometry ────────────────────────────────────────────────────────────
  '152W00000X': { code: '152W00000X', category: 'Optometry', classification: 'Optometrist', specialization: null },
}

export function lookupTaxonomy(code: string): TaxonomyEntry | null {
  return TAXONOMY_MAP[code] ?? null
}

export function taxonomyCategory(code: string | null): string | null {
  if (!code) return null
  // Code may be in description form already — extract code portion if needed
  const match = code.match(/[0-9A-Z]{10}/)
  if (match) return TAXONOMY_MAP[match[0]]?.category ?? null
  return null
}
