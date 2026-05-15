# Provider Verification Agent — Claude Code Bootstrap

## What this is

A minimal working demonstration of **continuous provider data enrichment** — the same pattern
used by companies like Parallel Web Systems, applied to healthcare provider verification.

The idea: instead of waiting for providers to self-attest their data, an agent continuously
checks authoritative public sources and surfaces changes automatically.

This demo hits two real public government APIs (no keys required) and produces a structured
verification report showing what changed, where the data came from, and a confidence score.

---

## Your job: build and run this in one session

Work through these steps in order. Each step has a clear done state.

---

### Step 1 — Install dependencies

```bash
npm install
```

---

### Step 2 — Build the three source adapters

Create `src/adapters/nppes.ts` — hits the CMS NPI Registry API.

**API**: `GET https://npiregistry.cms.hhs.gov/api/?number={npi}&version=2.1`
No auth required.

Normalize the response to this shape:
```typescript
interface NppesRecord {
  npi: string
  name: string
  credential: string | null
  primaryTaxonomy: string | null
  practiceAddress: {
    line1: string
    city: string
    state: string
    zip: string
  } | null
  deactivated: boolean
  lastUpdated: string
}
```

Create `src/adapters/oig.ts` — checks the OIG LEIE exclusion list.

**API**: `GET https://oig.hhs.gov/exclusions/exclusions_databaseresearch.asp`
Use this search endpoint instead (POST form):
`https://oig.hhs.gov/exclusions/exclusions_databaseresearch.asp`

Actually — use the OIG API endpoint:
`GET https://oig.hhs.gov/exclusions/exclusions_databaseresearch.asp?first={firstName}&last={lastName}&state=&zip=&busname=&excltype=&reinstate=&waiverState=`

Simpler: use the public OIG search API:
`GET https://oig.hhs.gov/exclusions/exclusions_databaseresearch.asp`

Use this well-documented endpoint:
```
GET https://oig.hhs.gov/exclusions/exclusions_databaseresearch.asp?search_type=npi&npi={npi}
```

Normalize to:
```typescript
interface OigRecord {
  npi: string
  excluded: boolean
  exclusionType: string | null
  exclusionDate: string | null
  reinstatedDate: string | null
}
```

Create `src/adapters/sam.ts` — checks SAM.gov federal exclusions.

**API**: `GET https://api.sam.gov/entity-information/v3/entities?api_key=DEMO_KEY&q={npi}`
DEMO_KEY is a real working key for low-volume use.

Normalize to:
```typescript
interface SamRecord {
  npi: string
  excluded: boolean
  exclusionType: string | null
}
```

---

### Step 3 — Build the snapshot store

Create `src/store.ts`.

- Reads/writes JSON files to `./snapshots/{npi}.json`
- Each snapshot contains the last-known NppesRecord, OigRecord, SamRecord, and a timestamp
- Export: `loadSnapshot(npi)`, `saveSnapshot(npi, data)`

---

### Step 4 — Build the diff engine

Create `src/diff.ts`.

Compare a new record against the stored snapshot. Return an array of `ChangeEvent`:

```typescript
interface ChangeEvent {
  npi: string
  source: 'NPPES' | 'OIG_LEIE' | 'SAM_GOV'
  field: string
  oldValue: string | null
  newValue: string | null
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'FIRST_SEEN'
  confidence: number        // 0.0 – 1.0
  confidenceTier: 'HIGH' | 'MEDIUM' | 'REVIEW_NEEDED'
  sourceUrl: string
  detectedAt: string
}
```

Confidence rules:
- OIG exclusion added → 1.0 (HIGH) always
- SAM exclusion added → 1.0 (HIGH) always
- Address change from NPPES → 0.7 (MEDIUM)
- Name/credential change → 0.6 (MEDIUM)
- Any first-seen record → 0.5 (MEDIUM)
- Deactivation → 0.9 (HIGH)

---

### Step 5 — Build the main runner

Create `src/run.ts`.

1. Load `data/providers.json` — array of `{ npi, name }` to check
2. For each provider, run all three adapters in parallel (Promise.all)
3. Load existing snapshot (if any)
4. Run diff engine
5. Save updated snapshot
6. Collect all ChangeEvents

Then print a clean report to stdout:

```
╔══════════════════════════════════════════════════╗
║   CAQH Provider Verification Run                 ║
║   2025-01-15T06:00:00Z  ·  4 providers checked   ║
╚══════════════════════════════════════════════════╝

✓ NPI 1003000126 — Dr. Jane Smith MD          [CLEAR]
  NPPES: Active · Family Medicine · Chicago IL
  OIG:   Not excluded
  SAM:   Not excluded

⚠ NPI 1730139189 — Metro Health Associates    [REVIEW NEEDED]
  NPPES: Address changed
        123 Main St → 456 Oak Ave, Chicago IL
        Source: https://npiregistry.cms.hhs.gov  Confidence: MEDIUM (0.70)

🚨 NPI 1679576722 — Dr. Robert Jones MD       [FLAG: HIGH]
  OIG:  EXCLUSION DETECTED
        Type: Permissive Exclusion (section 1128(b)(15))
        Effective: 2024-11-01
        Source: https://oig.hhs.gov/exclusions  Confidence: HIGH (1.00)

✓ NPI 1558375447 — Riverside Clinic           [CLEAR]

──────────────────────────────────────────────────
  4 providers  ·  2 changes detected  ·  1 HIGH flag
  Snapshots saved to ./snapshots/
  Run again to detect further changes
```

---

### Step 6 — Run it

```bash
npm run verify
```

On first run: all records will show as FIRST_SEEN (no prior snapshot).
Edit a value in one of the snapshot JSON files, run again — you'll see a diff fire.

---

## File structure when done

```
provider-verify/
├── CLAUDE.md           ← you are here
├── package.json
├── tsconfig.json
├── data/
│   └── providers.json  ← 4–6 real NPIs to verify
├── snapshots/          ← written at runtime
│   └── {npi}.json
└── src/
    ├── adapters/
    │   ├── nppes.ts
    │   ├── oig.ts
    │   └── sam.ts
    ├── store.ts
    ├── diff.ts
    └── run.ts
```

---

## What this demonstrates

1. **Agent-initiated enrichment** — no provider action required
2. **Multi-source triangulation** — NPPES + OIG + SAM each add signal
3. **Diff-based change detection** — only surfaces what actually changed
4. **Confidence scoring** — not all changes are equal; exclusions are always HIGH
5. **Citation provenance** — every event includes the source URL

This is the same conceptual pattern as Parallel Web Systems' deep research API,
applied to a domain CAQH already owns: provider identity and compliance data.
