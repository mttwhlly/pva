# Provider Verification Agent

A working demonstration of continuous provider data enrichment — the same pattern
used by Parallel Web Systems, applied to CAQH's core domain.

Instead of waiting for providers to self-attest, an agent hits authoritative public
sources directly and surfaces what changed, where it came from, and how confident
it is in the signal.

**No API keys. No cloud setup. Just Node and two government databases.**

---

## Setup (2 minutes)

Requires Node.js 18+. If you're on a Mac: `brew install node`

```bash
npm install
npm run verify
```

That's it.

---

## What it does

Checks 4 providers against 3 public authoritative sources in parallel:

| Source | What it checks | Auth |
|---|---|---|
| **NPPES / NPI Registry** (CMS) | Name, address, taxonomy, deactivation status | None |
| **OIG LEIE** (HHS) | Federal exclusions — billing ineligibility | None |
| **SAM.gov** (GSA) | Federal procurement exclusions | Public DEMO key |

For each provider it:
1. Fetches current data from all three sources simultaneously
2. Diffs against the last known snapshot (stored in `./snapshots/`)
3. Scores each change: HIGH / MEDIUM / REVIEW_NEEDED
4. Prints a structured verification report

On first run everything shows as FIRST_SEEN (no prior state).
On second run it detects only what actually changed.

---

## Simulate a change

After the first run, open any file in `./snapshots/` and change a value —
flip `"excluded": false` to `"excluded": true`, or change an address.
Run again. The diff engine will fire.

---

## Example output

```
────────────────────────────────────────────────────────────
  CAQH Provider Verification Run
  2025-01-15T06:00:00Z
  4 providers checked
────────────────────────────────────────────────────────────

  ✓  NPI 1003000126 — Dr. Jane Smith MD
     Status: [CLEAR]
     NPPES: Active · Family Medicine · Chicago, IL
     OIG:   Not excluded
     SAM:   Not excluded

  🚨 NPI 1679576722 — Dr. Robert Jones MD
     Status: [HIGH FLAG]
     NPPES: Active · Internal Medicine · Boston, MA
     OIG:   ⛔ EXCLUDED (Permissive exclusion, effective 2024-11-01)
     SAM:   Not excluded

     Changes detected (1):
       [🔴 HIGH] OIG_LEIE · excluded
         Before: false
         After:  true — Permissive exclusion (effective 2024-11-01)
         Source: https://oig.hhs.gov/exclusions  (confidence 1.00)

────────────────────────────────────────────────────────────
  4 providers  ·  1 change detected  ·  1 HIGH flag
  Snapshots saved → ./snapshots/
  Run again to detect further changes.
────────────────────────────────────────────────────────────
```

---

## The bigger picture

This is a 200-line proof of concept. At production scale for CAQH this becomes:

- **Azure Durable Functions** instead of a local script (scheduled, retried, distributed)
- **Service Bus** instead of console output (events routed to credentialing workflow, Teams alerts)
- **State board adapters** via Playwright extraction for the 50+ state medical board sites
- **VerificationEvents table** in Azure SQL for audit trail and regulatory defensibility
- **A query API** behind APIM — real-time PSV as a service for payers

The pattern is identical to what Parallel Web Systems sells as infrastructure.
The difference is CAQH already owns the domain, the relationships, and the data context
to make this genuinely authoritative rather than just a web search layer.

---

*Built with Claude Code as a pattern demonstration.*
