import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { ProviderSnapshot } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SNAPSHOTS_DIR = join(__dirname, '..', 'snapshots')

function snapshotPath(npi: string): string {
  return join(SNAPSHOTS_DIR, `${npi}.json`)
}

export function loadSnapshot(npi: string): ProviderSnapshot | null {
  const path = snapshotPath(npi)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as ProviderSnapshot
  } catch {
    return null
  }
}

export function saveSnapshot(snapshot: ProviderSnapshot): void {
  if (!existsSync(SNAPSHOTS_DIR)) {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true })
  }
  writeFileSync(snapshotPath(snapshot.npi), JSON.stringify(snapshot, null, 2), 'utf-8')
}
