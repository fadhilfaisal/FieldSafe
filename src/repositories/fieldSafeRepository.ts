import type {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  CorrectiveAction,
  Defect,
  Equipment,
  Inspection,
  User,
} from '../domain/models'

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
  getDefects(): Promise<Defect[]>
  getCorrectiveActions(): Promise<CorrectiveAction[]>
  saveEquipment(equipment: Equipment): Promise<Equipment>
  resetDemoData(): Promise<void>
}
