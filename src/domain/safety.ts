import type {
  CorrectiveAction,
  Defect,
  EquipmentStatus,
  IsoDateTime,
  DefectSeverity,
} from './models'

export type GateDecision = 'Allowed' | 'Restricted' | 'Denied'

export function isCorrectiveActionOverdue(
  action: CorrectiveAction,
  asOf: IsoDateTime = new Date().toISOString(),
) {
  return action.status !== 'Done' && action.dueAt < asOf
}

export function deriveEquipmentStatus(defects: Defect[]): EquipmentStatus {
  return deriveEquipmentStatusFromSeverities(
    defects
      .filter((defect) => defect.status !== 'Resolved')
      .map((defect) => defect.severity),
  )
}

export function deriveEquipmentStatusFromSeverities(
  severities: DefectSeverity[],
): EquipmentStatus {
  if (severities.includes('Critical')) {
    return 'Out of Service'
  }

  if (severities.includes('Major')) {
    return 'Restricted'
  }

  return 'Fit'
}

export function deriveGateDecision(status: EquipmentStatus): GateDecision {
  if (status === 'Fit') return 'Allowed'
  if (status === 'Restricted') return 'Restricted'
  return 'Denied'
}

const severityRank: Record<DefectSeverity, number> = {
  Minor: 1,
  Major: 2,
  Critical: 3,
}

export function getHighestDefectSeverity(
  severities: DefectSeverity[],
): DefectSeverity | null {
  return (
    severities.slice().sort(
      (left, right) => severityRank[right] - severityRank[left],
    )[0] ?? null
  )
}
