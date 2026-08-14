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

export type InspectionStatus = 'Completed'
export type InspectionResult = 'Pass' | 'Fail'

export interface Inspection {
  id: EntityId
  equipmentId: EntityId
  checklistId: EntityId
  inspectorId: EntityId
  status: InspectionStatus
  result: InspectionResult
  startedAt: IsoDateTime
  completedAt: IsoDateTime
}

export type ChecklistResponseResult = 'Pass' | 'Fail' | 'Not Applicable'

export interface ChecklistResponse {
  id: EntityId
  inspectionId: EntityId
  checklistItemId: EntityId
  result: ChecklistResponseResult
  notes?: string
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
  status: DefectStatus
  reportedAt: IsoDateTime
  resolvedAt: IsoDateTime | null
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
  users: User[]
  equipment: Equipment[]
  checklists: Checklist[]
  checklistItems: ChecklistItem[]
  inspections: Inspection[]
  checklistResponses: ChecklistResponse[]
  defects: Defect[]
  correctiveActions: CorrectiveAction[]
}
