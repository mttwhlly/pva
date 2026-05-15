import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { fetchNppes } from './adapters/nppes.js'
import { fetchOig } from './adapters/oig.js'
import { fetchSam } from './adapters/sam.js'
import { fetchMedicareOptOut } from './adapters/medicare-optout.js'
import { fetchMedicareEnrollment } from './adapters/medicare-enrollment.js'
import { fetchStateBoardSimulated } from './adapters/state-board.js'
import { loadSnapshot, saveSnapshot } from './store.js'
import { diffProvider } from './diff.js'
import type { ProviderResult, ChangeEvent, ProviderStatus } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function statusFromChanges(changes: ChangeEvent[]): ProviderStatus {
  if (changes.some(c => c.confidenceTier === 'HIGH')) return 'FLAG_HIGH'
  if (changes.some(c => c.confidenceTier === 'MEDIUM' || c.confidenceTier === 'REVIEW_NEEDED')) return 'REVIEW_NEEDED'
  return 'CLEAR'
}

function statusIcon(status: ProviderStatus): string {
  if (status === 'FLAG_HIGH') return '🚨'
  if (status === 'REVIEW_NEEDED') return '⚠️ '
  return '✓  '
}

function statusLabel(status: ProviderStatus): string {
  if (status === 'FLAG_HIGH') return 'HIGH FLAG'
  if (status === 'REVIEW_NEEDED') return 'REVIEW NEEDED'
  return 'CLEAR'
}

function tierIcon(tier: string): string {
  if (tier === 'HIGH') return '🔴 HIGH   '
  if (tier === 'MEDIUM') return '🟡 MEDIUM '
  return '🔵 REVIEW '
}

const W = 66
function line(char = '─') { return char.repeat(W) }

function printReport(results: ProviderResult[], runAt: string) {
  const totalChanges = results.reduce((s, r) => s + r.changes.length, 0)
  const highFlags = results.filter(r => r.status === 'FLAG_HIGH').length
  const reviewNeeded = results.filter(r => r.status === 'REVIEW_NEEDED').length

  console.log('\n' + line())
  console.log('  CAQH Provider Verification Agent')
  console.log(`  ${runAt}`)
  console.log(`  ${results.length} providers · 6 sources · ${totalChanges} changes detected`)
  console.log(line())

  for (const r of results) {
    console.log()
    if (r.error) {
      console.log(`  ✗  NPI ${r.npi} — ERROR: ${r.error}`)
      continue
    }

    const name = r.displayName ?? `NPI ${r.npi}`
    const cat = r.nppes?.taxonomyCategory ? ` · ${r.nppes.taxonomyCategory}` : ''
    console.log(`  ${statusIcon(r.status)} ${name}${cat}`)
    console.log(`     NPI ${r.npi}  ·  [${statusLabel(r.status)}]`)
    console.log()

    if (r.nppes) {
      const addr = r.nppes.practiceAddress
        ? `${r.nppes.practiceAddress.city}, ${r.nppes.practiceAddress.state}`
        : 'address unknown'
      const deact = r.nppes.deactivated ? '⚠ DEACTIVATED' : 'Active'
      console.log(`     NPPES / NPI Registry   ${deact} · ${r.nppes.primaryTaxonomy ?? 'unknown taxonomy'} · ${addr}`)
    }
    if (r.oig)
      console.log(`     OIG LEIE               ${r.oig.excluded
        ? `⛔ EXCLUDED — ${r.oig.exclusionType ?? 'unknown'} (${r.oig.exclusionDate ?? '?'})`
        : 'Not excluded'}`)
    if (r.sam)
      console.log(`     SAM.gov                ${r.sam.excluded
        ? `⛔ EXCLUDED — ${r.sam.exclusionType ?? 'unknown'}`
        : 'Not excluded'}`)
    if (r.medicareOptOut)
      console.log(`     Medicare Opt-Out       ${r.medicareOptOut.optedOut
        ? `⚠ OPTED OUT (effective ${r.medicareOptOut.optOutEffectiveDate ?? '?'}, ends ${r.medicareOptOut.optOutEndDate ?? '?'})`
        : 'Not opted out'}`)
    if (r.medicareEnrollment)
      console.log(`     Medicare Enrollment    ${r.medicareEnrollment.enrolled
        ? `Enrolled · ${r.medicareEnrollment.enrollmentType ?? ''} · ${r.medicareEnrollment.specialty ?? 'unknown specialty'}`
        : 'Not enrolled'}`)
    if (r.stateBoard) {
      const sb = r.stateBoard
      const disc = sb.disciplinaryActions.length > 0
        ? ` · ${sb.disciplinaryActions.length} disciplinary action(s)` : ''
      console.log(`     State Board (${sb.state}) [sim]  ${sb.status}${sb.expirationDate ? ` · exp ${sb.expirationDate}` : ''}${disc}`)
    }

    if (r.changes.length > 0) {
      console.log()
      console.log(`     ── Changes detected (${r.changes.length}) ────────────────────`)
      for (const c of r.changes) {
        console.log()
        console.log(`       [${tierIcon(c.confidenceTier)}]  ${c.source} · ${c.field}`)
        if (c.changeType === 'FIRST_SEEN') {
          console.log(`         First seen : ${c.newValue ?? '—'}`)
        } else {
          console.log(`         Before     : ${c.oldValue ?? 'none'}`)
          console.log(`         After      : ${c.newValue ?? 'none'}`)
        }
        console.log(`         Source     : ${c.sourceUrl}`)
        console.log(`         Confidence : ${c.confidence.toFixed(2)}`)
      }
    }
  }

  console.log()
  console.log(line())
  console.log(`  ${results.length} providers checked`)
  console.log(`  ${totalChanges} change${totalChanges !== 1 ? 's' : ''} detected  ·  ${highFlags} HIGH  ·  ${reviewNeeded} REVIEW NEEDED`)
  console.log(`  Sources: NPPES · OIG LEIE · SAM.gov · CMS Opt-Out · CMS Enrollment · State Board*`)
  console.log(`  * State board results are simulated in this demo`)
  console.log(`  Snapshots saved → ./snapshots/  (run again to see only real deltas)`)
  console.log(line())
  console.log()
}

async function run() {
  const providersPath = join(__dirname, '..', 'data', 'providers.json')
  const providers: Array<{ npi: string; name: string }> = JSON.parse(
    readFileSync(providersPath, 'utf-8')
  )

  const runAt = new Date().toISOString()
  const results: ProviderResult[] = []

  console.log(`\n  Checking ${providers.length} providers across 6 sources...\n`)

  for (const p of providers) {
    const { npi } = p
    process.stdout.write(`  → NPI ${npi}  `)

    try {
      const [nppes, oig, sam, medicareOptOut, medicareEnrollment, stateBoard] = await Promise.all([
        fetchNppes(npi),
        fetchOig(npi),
        fetchSam(npi),
        fetchMedicareOptOut(npi),
        fetchMedicareEnrollment(npi),
        fetchStateBoardSimulated(npi),
      ])

      const prevSnapshot = loadSnapshot(npi)
      const changes = diffProvider(
        prevSnapshot, nppes, oig, sam,
        medicareOptOut, medicareEnrollment, stateBoard
      )

      saveSnapshot({ npi, capturedAt: runAt, nppes, oig, sam, medicareOptOut, medicareEnrollment, stateBoard })

      const displayName = nppes.name !== 'NOT FOUND' ? nppes.name : p.name
      const status = statusFromChanges(changes)

      results.push({
        npi, displayName, status,
        nppes, oig, sam, medicareOptOut, medicareEnrollment, stateBoard,
        changes, error: null
      })

      process.stdout.write(`${statusIcon(status)}\n`)

    } catch (err: any) {
      process.stdout.write(` ✗\n`)
      results.push({
        npi, displayName: p.name, status: 'REVIEW_NEEDED',
        nppes: null, oig: null, sam: null,
        medicareOptOut: null, medicareEnrollment: null, stateBoard: null,
        changes: [], error: err.message,
      })
    }
  }

  printReport(results, runAt)
}

run().catch(err => {
  console.error('\nFatal error:', err)
  process.exit(1)
})
