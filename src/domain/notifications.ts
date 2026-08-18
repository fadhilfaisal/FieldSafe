import type {
  Checklist,
  DefectSeverity,
  Equipment,
  Inspection,
  InspectorNotification,
  SupervisorNotification,
  User,
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

export function createInspectionReworkNotification(input: {
  inspection: Inspection
  equipment: Equipment
  checklist: Checklist
  supervisor: User
  reason: string
  rejectionNumber: number
  createdAt: string
}): InspectorNotification {
  return {
    id: `NTF-REWORK-${input.inspection.id}-${input.rejectionNumber}`,
    userId: input.inspection.inspectorId,
    type: 'INSPECTION_REWORK_REQUIRED',
    title: 'Inspection returned for revision',
    message: `${input.equipment.assetCode} · ${input.checklist.name} · Supervisor: ${input.supervisor.name} · Reason: ${input.reason}`,
    createdAt: input.createdAt,
    readAt: null,
    targetRoute: `/inspector/inspection/${input.inspection.id}`,
    inspectionId: input.inspection.id,
  }
}
