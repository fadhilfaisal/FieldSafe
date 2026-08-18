import type {
  Checklist,
  DefectSeverity,
  Equipment,
  Inspection,
  SupervisorNotification,
} from './models'

export function createSupervisorReviewNotification(input: {
  supervisorId: string
  inspection: Inspection
  equipment: Equipment
  checklist: Checklist
  highestSeverity: DefectSeverity | null
}): SupervisorNotification {
  const severityContext = input.highestSeverity
    ? `${input.highestSeverity} defect reported`
    : 'Failed checklist response reported'

  return {
    id: `NTF-REVIEW-${input.inspection.id}-${input.supervisorId}`,
    userId: input.supervisorId,
    type: 'FAILED_INSPECTION_REVIEW',
    title: 'Inspection requires review',
    message: `${input.equipment.assetCode} · ${input.checklist.name} · ${severityContext}`,
    createdAt:
      input.inspection.submittedAt ??
      input.inspection.completedAt ??
      input.inspection.assignedAt,
    readAt: null,
    targetRoute: `/supervisor/reviews/${input.inspection.id}`,
    inspectionId: input.inspection.id,
  }
}
