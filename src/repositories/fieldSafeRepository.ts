import type {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  CorrectiveAction,
  Defect,
  Equipment,
  Inspection,
  InspectionDraft,
  User,
} from '../domain/models'

export interface InspectionSubmissionPersistence {
  inspection: Inspection
  responses: ChecklistResponse[]
  defects: Defect[]
  equipment: Equipment
}

export interface FieldSafeRepository {
  initialize(): Promise<void>
  getUsers(): Promise<User[]>
  getEquipment(): Promise<Equipment[]>
  getEquipmentById(id: string): Promise<Equipment | null>
  getInspections(): Promise<Inspection[]>
  getInspectionById(id: string): Promise<Inspection | null>
  getChecklists(): Promise<Checklist[]>
  getChecklistItems(checklistId?: string): Promise<ChecklistItem[]>
  getChecklistResponses(inspectionId?: string): Promise<ChecklistResponse[]>
  getDefects(inspectionId?: string): Promise<Defect[]>
  getCorrectiveActions(): Promise<CorrectiveAction[]>
  getCorrectiveActionById(id: string): Promise<CorrectiveAction | null>
  saveCorrectiveAction(action: CorrectiveAction): Promise<CorrectiveAction>
  saveEquipment(equipment: Equipment): Promise<Equipment>
  saveInspection(inspection: Inspection): Promise<Inspection>
  getInspectionDraft(inspectionId: string): Promise<InspectionDraft | null>
  saveInspectionDraft(draft: InspectionDraft): Promise<InspectionDraft>
  commitInspectionSubmission(
    submission: InspectionSubmissionPersistence,
  ): Promise<void>
  resetDemoData(): Promise<void>
}
