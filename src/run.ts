import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { fetchNppes } from './adapters/nppes.js'
import { fetchOig } from './adapters/oig.js'
import { fetchSam } from './adapters/sam.js'
import { loadSnapshot, saveSnapshot } from './store.js'
import { diffProvider } from './diff.js'
import type { ProviderResult, ChangeEvent, ProviderStatus } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusFromChanges(changes: ChangeEvent[]): ProviderStatus {
  if (changes.some(c => c.confidenceTier === 'HIGH')) return 'FLAG_HIGH'
  if (changes.some(c => c.confidenceTier === 'MEDIUM' || c.confidenceTier === 'REVIEW_NEEDED')) return 'REVIEW_NEEDED'
  return 'CLEAR'
}

function statusIcon(status: ProviderStatus): string {
  if (status === 'FLAG_HIGH') return '🚨'
  if (status === 'REVIEW_NEEDED') return '⚠️ '
  return '✓ '
}

function statusLabel(status: ProviderStatus): string {
  if (status === 'FLAG_HIGH') return 'HIGH FLAG'
  if (status === 'REVIEW_NEEDED') return 'REVIEW NEEDED'
  return 'CLEAR'
}

function addrStr(r: any): string {
  if (!r?.practiceAddress) return 'unknown'
  const a = r.practiceAddress
  return `${a.line1}, ${a.city} ${a.state} ${a.zip}`
}

function bar(char: string, n: number) { return char.repeat(n) }

// ── Print report ──────────────────────────────────────────────────────────────

function printReport(results: ProviderResult[], runAt: string) {
  const totalChanges = results.reduce((s, r) => s + r.changes.length, 0)
  const highFlags = results.filter(r => r.status === 'FLAG_HIGH').length
  const width = 60

  console.log('\n' + bar('─', width))
  console.log('  CAQH Provider Verification Run')
  console.log(`  ${runAt}`)
  console.log(`  ${results.length} provider${results.length !== 1 ? 's' : ''} checked`)
  console.log(bar('─', width))

  for (const r of results) {
    console.log()

    if (r.error) {
      console.log(`  ✗  NPI ${r.npi} — ERROR: ${r.error}`)
      continue
    }

    const nameStr = r.displayName ? `${r.displayName}` : `NPI ${r.npi}`
    console.log(`  ${statusIcon(r.status)} NPI ${r.npi} — ${nameStr}`)
    console.log(`     Status: [${statusLabel(r.status)}]`)

    // Source summary lines
    if (r.nppes) {
      const deact = r.nppes.deactivated ? ' ⚠ DEACTIVATED' : ' Active'
      const tax = r.nppes.primaryTaxonomy ? ` · ${r.nppes.primaryTaxonomy}` : ''
      const addr = r.nppes.practiceAddress
        ? ` · ${r.nppes.practiceAddress.city}, ${r.nppes.practiceAddress.state}`
        : ''
      console.log(`     NPPES:${deact}${tax}${addr}`)
    }
    if (r.oig) {
      console.log(`     OIG:   ${r.oig.excluded ? `⛔ EXCLUDED (${r.oig.exclusionType ?? 'unknown type'}, effective ${r.oig.exclusionDate ?? '?'})` : 'Not excluded'}`)
    }
    if (r.sam) {
      console.log(`     SAM:   ${r.sam.excluded ? `⛔ EXCLUDED (${r.sam.exclusionType ?? 'unknown type'})` : 'Not excluded'}`)
    }

    // Change events
    if (r.changes.length > 0) {
      console.log()
      console.log(`     Changes detected (${r.changes.length}):`)
      for (const c of r.changes) {
        const tier = c.confidenceTier === 'HIGH' ? '🔴 HIGH' : c.confidenceTier === 'MEDIUM' ? '🟡 MEDIUM' : '🔵 REVIEW'
        console.log(`       [${tier}] ${c.source} · ${c.field}`)
        if (c.changeType === 'FIRST_SEEN') {
          console.log(`         First seen: ${c.newValue ?? '—'}`)
        } else {
          console.log(`         Before: ${c.oldValue ?? 'none'}`)
          console.log(`         After:  ${c.newValue ?? 'none'}`)
        }
        console.log(`         Source: ${c.sourceUrl}  (confidence ${c.confidence.toFixed(2)})`)
      }
    }
  }

  console.log()
  console.log(bar('─', width))
  console.log(`  ${results.length} providers  ·  ${totalChanges} change${totalChanges !== 1 ? 's' : ''} detected  ·  ${highFlags} HIGH flag${highFlags !== 1 ? 's' : ''}`)
  console.log(`  Snapshots saved → ./snapshots/`)
  console.log(`  Run again to detect further changes.`)
  console.log(bar('─', width))
  console.log()
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const providersPath = join(__dirname, '..', 'data', 'providers.json')
  const providers: Array<{ npi: string; name: string }> = JSON.parse(
    readFileSync(providersPath, 'utf-8')
  )

  const runAt = new Date().toISOString()
  const results: ProviderResult[] = []

  for (const p of providers) {
    const { npi } = p
    process.stdout.write(`  Checking NPI ${npi}...`)

    try {
      // Fan out to all three sources in parallel
      const [nppes, oig, sam] = await Promise.all([
        fetchNppes(npi),
        fetchOig(npi),
        fetchSam(npi),
      ])

      const prevSnapshot = loadSnapshot(npi)
      const changes = diffProvider(prevSnapshot, nppes, oig, sam)

      // Save updated snapshot
      saveSnapshot({ npi, capturedAt: runAt, nppes, oig, sam })

      const displayName = nppes.name !== 'NOT FOUND' ? nppes.name : p.name
      const status = statusFromChanges(changes)

      results.push({ npi, displayName, status, nppes, oig, sam, changes, error: null })
      process.stdout.write(` ${statusIcon(status)}\n`)

    } catch (err: any) {
      process.stdout.write(` ✗\n`)
      results.push({
        npi, displayName: p.name,
        status: 'REVIEW_NEEDED',
        nppes: null, oig: null, sam: null,
        changes: [], error: err.message,
      })
    }
  }

  printReport(results, runAt)
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
