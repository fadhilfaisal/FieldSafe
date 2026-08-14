import type {
  CorrectiveAction,
  Defect,
  EquipmentStatus,
  IsoDateTime,
  DefectSeverity,
} from './models'

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
