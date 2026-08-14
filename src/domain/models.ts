export type EntityId = string
export type IsoDateTime = string

export type UserRole = 'Inspector' | 'Supervisor' | 'Manager' | 'Technician'

export interface User {
  id: EntityId
  name: string
  email: string
  role: UserRole
  isActive: boolean
}

export type EquipmentType = 'Truck' | 'Crane' | 'Forklift' | 'MEWP' | 'Loader'
export type EquipmentStatus = 'Fit' | 'Restricted' | 'Out of Service'

export interface Equipment {
  id: EntityId
  assetCode: string
  name: string
  type: EquipmentType
  manufacturer: string
  model: string
  site: string
  status: EquipmentStatus
  checklistId: EntityId
  lastInspectionAt: IsoDateTime | null
  createdAt: IsoDateTime
}

export interface Checklist {
  id: EntityId
  name: string
  equipmentTypes: EquipmentType[]
  version: number
  isActive: boolean
}

export interface ChecklistItem {
  id: EntityId
  checklistId: EntityId
  sequence: number
  category: string
  prompt: string
  guidance?: string
  isCritical: boolean
}

export type InspectionStatus = 'Assigned' | 'In Progress' | 'Completed'
export type InspectionResult = 'Pass' | 'Fail'
export type InspectionReviewStatus = 'Pending Review' | 'Reviewed'
export type InspectionSyncStatus = 'SYNCED' | 'PENDING_SYNC'
export type SimulatedConnectivityState = 'ONLINE' | 'OFFLINE'

export interface SignaturePoint {
  x: number
  y: number
}

export interface SignatureData {
  strokes: SignaturePoint[][]
}

export interface Inspection {
  id: EntityId
  equipmentId: EntityId
  checklistId: EntityId
  inspectorId: EntityId
  status: InspectionStatus
  result: InspectionResult | null
  assignedAt: IsoDateTime
  dueAt: IsoDateTime
  startedAt: IsoDateTime | null
  completedAt: IsoDateTime | null
  submittedAt: IsoDateTime | null
  signature: SignatureData | null
  syncStatus: InspectionSyncStatus
  reviewStatus: InspectionReviewStatus | null
  reviewedAt: IsoDateTime | null
  reviewedByUserId: EntityId | null
}

export type ChecklistResponseResult = 'Pass' | 'Fail' | 'Not Applicable'

export interface ChecklistResponse {
  id: EntityId
  inspectionId: EntityId
  checklistItemId: EntityId
  result: ChecklistResponseResult
  notes?: string
}

export interface EvidenceReference {
  id: string
  label: string
  assetPath: string
}

export type DefectSeverity = 'Minor' | 'Major' | 'Critical'
export type DefectStatus = 'Open' | 'Under Review' | 'Resolved'

export interface Defect {
  id: EntityId
  inspectionId: EntityId
  equipmentId: EntityId
  checklistResponseId: EntityId
  reportedByUserId: EntityId
  title: string
  description: string
  severity: DefectSeverity
  evidenceReference: EvidenceReference | null
  status: DefectStatus
  reportedAt: IsoDateTime
  resolvedAt: IsoDateTime | null
}

export interface DraftDefect {
  description: string
  severity: DefectSeverity | null
  evidenceReference: EvidenceReference | null
}

export interface DraftChecklistResponse {
  checklistItemId: EntityId
  result: Exclude<ChecklistResponseResult, 'Not Applicable'>
  defect: DraftDefect | null
}

export interface InspectionDraft {
  inspectionId: EntityId
  responses: DraftChecklistResponse[]
  signature: SignatureData | null
  updatedAt: IsoDateTime
}

export type CorrectiveActionStatus = 'Open' | 'In Progress' | 'Done'

export interface CorrectiveAction {
  id: EntityId
  defectId: EntityId
  equipmentId: EntityId
  assignedToUserId: EntityId
  createdByUserId: EntityId
  title: string
  description: string
  status: CorrectiveActionStatus
  createdAt: IsoDateTime
  dueAt: IsoDateTime
  completedAt: IsoDateTime | null
}

export interface OperationalData {
  simulatedConnectivity: SimulatedConnectivityState
  users: User[]
  equipment: Equipment[]
  checklists: Checklist[]
  checklistItems: ChecklistItem[]
  inspections: Inspection[]
  checklistResponses: ChecklistResponse[]
  defects: Defect[]
  correctiveActions: CorrectiveAction[]
  inspectionDrafts: InspectionDraft[]
}
