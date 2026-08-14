import type {
  CorrectiveAction,
  Defect,
  EquipmentStatus,
  IsoDateTime,
} from './models'

export function isCorrectiveActionOverdue(
  action: CorrectiveAction,
  asOf: IsoDateTime = new Date().toISOString(),
) {
  return action.status !== 'Done' && action.dueAt < asOf
}

export function deriveEquipmentStatus(defects: Defect[]): EquipmentStatus {
  const unresolved = defects.filter((defect) => defect.status !== 'Resolved')

  if (unresolved.some((defect) => defect.severity === 'Critical')) {
    return 'Out of Service'
  }

  if (unresolved.some((defect) => defect.severity === 'Major')) {
    return 'Restricted'
  }

  return 'Fit'
}
