import type {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  CorrectiveAction,
  Defect,
  Equipment,
  Inspection,
  InspectionDraft,
  InspectorNotification,
  SimulatedConnectivityState,
  User,
  UserNotification,
} from '../domain/models'

export interface InspectionSubmissionPersistence {
  inspection: Inspection
  responses: ChecklistResponse[]
  defects: Defect[]
  equipment: Equipment
  notifications?: UserNotification[]
}

export interface DefectResolutionPersistence {
  defect: Defect
  equipment: Equipment
}

export interface InspectionRejectionPersistence {
  inspection: Inspection
  draft: InspectionDraft
  notification: UserNotification
}

export interface FieldSafeRepository {
  initialize(): Promise<void>
  getUsers(): Promise<User[]>
  getEquipment(): Promise<Equipment[]>
  getEquipmentById(id: string): Promise<Equipment | null>
  getInspections(): Promise<Inspection[]>
  getInspectionById(id: string): Promise<Inspection | null>
  getSimulatedConnectivity(): Promise<SimulatedConnectivityState>
  saveSimulatedConnectivity(
    state: SimulatedConnectivityState,
  ): Promise<SimulatedConnectivityState>
  markPendingInspectionsSynced(): Promise<Inspection[]>
  getInspectorNotifications(userId: string): Promise<InspectorNotification[]>
  saveInspectorNotification(
    notification: InspectorNotification,
  ): Promise<InspectorNotification>
  markInspectorNotificationRead(
    notificationId: string,
    userId: string,
    readAt: string,
  ): Promise<InspectorNotification>
  markAllInspectorNotificationsRead(
    userId: string,
    readAt: string,
  ): Promise<InspectorNotification[]>
  getNotifications(userId: string): Promise<UserNotification[]>
  saveNotification(
    notification: UserNotification,
  ): Promise<UserNotification>
  markNotificationRead(
    notificationId: string,
    userId: string,
    readAt: string,
  ): Promise<UserNotification>
  markAllNotificationsRead(
    userId: string,
    readAt: string,
  ): Promise<UserNotification[]>
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
  commitDefectResolution(
    resolution: DefectResolutionPersistence,
  ): Promise<void>
  commitInspectionRejection(
    rejection: InspectionRejectionPersistence,
  ): Promise<void>
  resetDemoData(): Promise<void>
}
