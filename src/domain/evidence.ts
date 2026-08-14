import type { EvidenceReference } from './models'

export const DEMO_EVIDENCE_PUBLIC_URL =
  '/evidence/hydraulic-hose-damage.png'

export const DEMO_EVIDENCE: EvidenceReference = {
  id: 'demo-hydraulic-hose-damage',
  label: 'Hydraulic hose damage',
  assetPath: DEMO_EVIDENCE_PUBLIC_URL,
}

export function resolveEvidenceAssetPath(reference: EvidenceReference) {
  if (reference.id === DEMO_EVIDENCE.id) {
    return DEMO_EVIDENCE_PUBLIC_URL
  }

  const path = reference.assetPath.trim().replaceAll('\\', '/')
  if (/^(?:https?:|blob:|data:|\/\/)/i.test(path)) return path

  const publicPath = path
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/^public\//i, '')

  return `/${publicPath}`
}

export function normalizeEvidenceReference(
  reference: EvidenceReference | null,
): EvidenceReference | null {
  if (!reference) return null

  const assetPath = resolveEvidenceAssetPath(reference)
  return assetPath === reference.assetPath
    ? reference
    : { ...reference, assetPath }
}
