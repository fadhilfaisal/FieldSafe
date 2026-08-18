import {
  createFieldSafeSeedData,
  createSeedAssignedInspections,
  createSeedInspectorNotifications,
} from '../data/seed/fieldSafeSeed'
import { normalizeEvidenceReference } from '../domain/evidence'
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
  OperationalData,
  SimulatedConnectivityState,
  User,
  UserNotification,
} from '../domain/models'
import type { StorageAdapter } from '../storage/storageAdapter'
import type { FieldSafeRepository } from './fieldSafeRepository'
import type {
  DefectResolutionPersistence,
  InspectionSubmissionPersistence,
} from './fieldSafeRepository'

export const OPERATIONAL_DATA_SCHEMA_VERSION = 6 as const

export interface PersistedOperationalData {
  schemaVersion: number
  data: OperationalData
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function normalizeOperationalEvidence(data: OperationalData) {
  const normalized = clone(data)
  normalized.defects = normalized.defects.map((defect) => ({
    ...defect,
    evidenceReference: normalizeEvidenceReference(defect.evidenceReference),
  }))
  normalized.inspectionDrafts = normalized.inspectionDrafts.map((draft) => ({
    ...draft,
    responses: draft.responses.map((response) => ({
      ...response,
      defect: response.defect
        ? {
            ...response.defect,
            evidenceReference: normalizeEvidenceReference(
              response.defect.evidenceReference,
            ),
          }
        : null,
    })),
  }))
  return normalized
}

export class BrowserFieldSafeRepository implements FieldSafeRepository {
  constructor(
    private readonly storage: StorageAdapter<PersistedOperationalData>,
  ) {}

  async initialize() {
    const persisted = this.storage.read()

    if (persisted === null) {
      this.writeSeedData()
      return
    }

    if (persisted.schemaVersion === 1) {
      this.writeData(
        this.migrateVersionFive(
          this.migrateVersionFour(
            this.migrateVersionThree(
              this.migrateVersionTwo(this.migrateVersionOne(persisted.data)),
            ),
          ),
        ),
      )
      return
    }

    if (persisted.schemaVersion === 2) {
      this.writeData(
        this.migrateVersionFive(
          this.migrateVersionFour(
            this.migrateVersionThree(this.migrateVersionTwo(persisted.data)),
          ),
        ),
      )
      return
    }

    if (persisted.schemaVersion === 3) {
      this.writeData(
        this.migrateVersionFive(
          this.migrateVersionFour(this.migrateVersionThree(persisted.data)),
        ),
      )
      return
    }

    if (persisted.schemaVersion === 4) {
      this.writeData(
        this.migrateVersionFive(this.migrateVersionFour(persisted.data)),
      )
      return
    }

    if (persisted.schemaVersion === 5) {
      this.writeData(this.migrateVersionFive(persisted.data))
      return
    }

    if (persisted.schemaVersion !== OPERATIONAL_DATA_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported FieldSafe data schema version "${persisted.schemaVersion}".`,
      )
    }
  }

  async getUsers(): Promise<User[]> {
    return clone((await this.readData()).users)
  }

  async getEquipment(): Promise<Equipment[]> {
    return clone((await this.readData()).equipment)
  }

  async getEquipmentById(id: string): Promise<Equipment | null> {
    const equipment = (await this.readData()).equipment.find((item) => item.id === id)
    return equipment ? clone(equipment) : null
  }

  async getInspections(): Promise<Inspection[]> {
    return clone((await this.readData()).inspections)
  }

  async getInspectionById(id: string): Promise<Inspection | null> {
    const inspection = (await this.readData()).inspections.find((item) => item.id === id)
    return inspection ? clone(inspection) : null
  }

  async getSimulatedConnectivity(): Promise<SimulatedConnectivityState> {
    return (await this.readData()).simulatedConnectivity
  }

  async saveSimulatedConnectivity(
    state: SimulatedConnectivityState,
  ): Promise<SimulatedConnectivityState> {
    const data = await this.readData()
    data.simulatedConnectivity = state
    this.writeData(data)
    return state
  }

  async markPendingInspectionsSynced(): Promise<Inspection[]> {
    const data = await this.readData()
    const synchronized: Inspection[] = []

    data.inspections = data.inspections.map((inspection) => {
      if (
        inspection.status !== 'Completed' ||
        inspection.syncStatus !== 'PENDING_SYNC'
      ) {
        return inspection
      }

      const updated: Inspection = { ...inspection, syncStatus: 'SYNCED' }
      synchronized.push(updated)
      return updated
    })

    if (synchronized.length > 0) this.writeData(data)
    return clone(synchronized)
  }

  async getInspectorNotifications(
    userId: string,
  ): Promise<InspectorNotification[]> {
    return (await this.getNotifications(userId)).filter(
      (notification): notification is InspectorNotification =>
        notification.type === 'NEW_ASSIGNMENT' ||
        notification.type === 'OFFLINE_SYNC_COMPLETED',
    )
  }

  async saveInspectorNotification(
    notification: InspectorNotification,
  ): Promise<InspectorNotification> {
    return (await this.saveNotification(notification)) as InspectorNotification
  }

  async getNotifications(userId: string): Promise<UserNotification[]> {
    return clone(
      (await this.readData()).inspectorNotifications.filter(
        (notification) => notification.userId === userId,
      ),
    )
  }

  async saveNotification(
    notification: UserNotification,
  ): Promise<UserNotification> {
    const data = await this.readData()
    const index = data.inspectorNotifications.findIndex(
      (item) => item.id === notification.id,
    )

    if (index === -1) data.inspectorNotifications.push(clone(notification))
    else data.inspectorNotifications[index] = clone(notification)

    this.writeData(data)
    return clone(notification)
  }

  async markInspectorNotificationRead(
    notificationId: string,
    userId: string,
    readAt: string,
  ): Promise<InspectorNotification> {
    return (await this.markNotificationRead(
      notificationId,
      userId,
      readAt,
    )) as InspectorNotification
  }

  async markNotificationRead(
    notificationId: string,
    userId: string,
    readAt: string,
  ): Promise<UserNotification> {
    const data = await this.readData()
    const index = data.inspectorNotifications.findIndex(
      (item) => item.id === notificationId && item.userId === userId,
    )
    if (index === -1) {
      throw new Error('Notification not found.')
    }

    data.inspectorNotifications[index] = {
      ...data.inspectorNotifications[index],
      readAt: data.inspectorNotifications[index].readAt ?? readAt,
    }
    this.writeData(data)
    return clone(data.inspectorNotifications[index])
  }

  async markAllInspectorNotificationsRead(
    userId: string,
    readAt: string,
  ): Promise<InspectorNotification[]> {
    return (await this.markAllNotificationsRead(
      userId,
      readAt,
    )).filter(
      (notification): notification is InspectorNotification =>
        notification.type === 'NEW_ASSIGNMENT' ||
        notification.type === 'OFFLINE_SYNC_COMPLETED',
    )
  }

  async markAllNotificationsRead(
    userId: string,
    readAt: string,
  ): Promise<UserNotification[]> {
    const data = await this.readData()
    data.inspectorNotifications = data.inspectorNotifications.map(
      (notification) =>
        notification.userId === userId && notification.readAt === null
          ? { ...notification, readAt }
          : notification,
    )
    this.writeData(data)
    return clone(
      data.inspectorNotifications.filter(
        (notification) => notification.userId === userId,
      ),
    )
  }

  async getChecklists(): Promise<Checklist[]> {
    return clone((await this.readData()).checklists)
  }

  async getChecklistItems(checklistId?: string): Promise<ChecklistItem[]> {
    const items = (await this.readData()).checklistItems
    return clone(
      checklistId ? items.filter((item) => item.checklistId === checklistId) : items,
    )
  }

  async getChecklistResponses(
    inspectionId?: string,
  ): Promise<ChecklistResponse[]> {
    const responses = (await this.readData()).checklistResponses
    return clone(
      inspectionId
        ? responses.filter((item) => item.inspectionId === inspectionId)
        : responses,
    )
  }

  async getDefects(inspectionId?: string): Promise<Defect[]> {
    const defects = (await this.readData()).defects
    return clone(
      inspectionId
        ? defects.filter((item) => item.inspectionId === inspectionId)
        : defects,
    )
  }

  async getCorrectiveActions(): Promise<CorrectiveAction[]> {
    return clone((await this.readData()).correctiveActions)
  }

  async getCorrectiveActionById(id: string): Promise<CorrectiveAction | null> {
    const action = (await this.readData()).correctiveActions.find(
      (item) => item.id === id,
    )
    return action ? clone(action) : null
  }

  async saveCorrectiveAction(
    action: CorrectiveAction,
  ): Promise<CorrectiveAction> {
    const data = await this.readData()
    const index = data.correctiveActions.findIndex(
      (item) => item.id === action.id,
    )

    if (index === -1) data.correctiveActions.push(clone(action))
    else data.correctiveActions[index] = clone(action)

    this.writeData(data)
    return clone(action)
  }

  async saveEquipment(equipment: Equipment): Promise<Equipment> {
    const data = await this.readData()
    const index = data.equipment.findIndex((item) => item.id === equipment.id)

    if (index === -1) {
      throw new Error(`Cannot save unknown equipment "${equipment.id}".`)
    }

    data.equipment[index] = clone(equipment)
    this.writeData(data)
    return clone(equipment)
  }

  async saveInspection(inspection: Inspection): Promise<Inspection> {
    const data = await this.readData()
    const index = data.inspections.findIndex((item) => item.id === inspection.id)

    if (index === -1) {
      throw new Error(`Cannot save unknown inspection "${inspection.id}".`)
    }

    data.inspections[index] = clone(inspection)
    this.writeData(data)
    return clone(inspection)
  }

  async getInspectionDraft(inspectionId: string): Promise<InspectionDraft | null> {
    const draft = (await this.readData()).inspectionDrafts.find(
      (item) => item.inspectionId === inspectionId,
    )
    return draft ? clone(draft) : null
  }

  async saveInspectionDraft(draft: InspectionDraft): Promise<InspectionDraft> {
    const data = await this.readData()
    const index = data.inspectionDrafts.findIndex(
      (item) => item.inspectionId === draft.inspectionId,
    )

    if (index === -1) data.inspectionDrafts.push(clone(draft))
    else data.inspectionDrafts[index] = clone(draft)

    this.writeData(data)
    return clone(draft)
  }

  async commitInspectionSubmission(
    submission: InspectionSubmissionPersistence,
  ) {
    const data = await this.readData()
    const inspectionIndex = data.inspections.findIndex(
      (item) => item.id === submission.inspection.id,
    )
    const equipmentIndex = data.equipment.findIndex(
      (item) => item.id === submission.equipment.id,
    )

    if (inspectionIndex === -1 || equipmentIndex === -1) {
      throw new Error('Cannot submit an inspection with missing core records.')
    }

    data.inspections[inspectionIndex] = clone(submission.inspection)
    data.equipment[equipmentIndex] = clone(submission.equipment)
    data.checklistResponses = data.checklistResponses
      .filter((item) => item.inspectionId !== submission.inspection.id)
      .concat(clone(submission.responses))
    data.defects = data.defects
      .filter((item) => item.inspectionId !== submission.inspection.id)
      .concat(clone(submission.defects))
    for (const notification of submission.notifications ?? []) {
      const notificationIndex = data.inspectorNotifications.findIndex(
        (item) => item.id === notification.id,
      )
      if (notificationIndex === -1) {
        data.inspectorNotifications.push(clone(notification))
      } else {
        data.inspectorNotifications[notificationIndex] = clone(notification)
      }
    }
    data.inspectionDrafts = data.inspectionDrafts.filter(
      (item) => item.inspectionId !== submission.inspection.id,
    )
    this.writeData(data)
  }

  async commitDefectResolution(resolution: DefectResolutionPersistence) {
    const data = await this.readData()
    const defectIndex = data.defects.findIndex(
      (item) => item.id === resolution.defect.id,
    )
    const equipmentIndex = data.equipment.findIndex(
      (item) => item.id === resolution.equipment.id,
    )

    if (defectIndex === -1 || equipmentIndex === -1) {
      throw new Error('Cannot resolve a defect with missing core records.')
    }
    if (data.defects[defectIndex].status === 'Resolved') {
      throw new Error('This defect has already been resolved.')
    }
    if (
      resolution.defect.status !== 'Resolved' ||
      !resolution.defect.resolvedAt ||
      !resolution.defect.resolvedByUserId
    ) {
      throw new Error('Defect resolution verification metadata is incomplete.')
    }
    if (
      resolution.defect.equipmentId !== resolution.equipment.id ||
      data.defects[defectIndex].equipmentId !== resolution.equipment.id
    ) {
      throw new Error('Defect resolution equipment does not match.')
    }

    data.defects[defectIndex] = clone(resolution.defect)
    data.equipment[equipmentIndex] = clone(resolution.equipment)
    this.writeData(data)
  }

  async resetDemoData() {
    this.writeSeedData()
  }

  private async readData() {
    await this.initialize()
    const persisted = this.storage.read()

    if (!persisted) {
      throw new Error('FieldSafe operational data was not initialized.')
    }

    if (persisted.schemaVersion !== OPERATIONAL_DATA_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported FieldSafe data schema version "${persisted.schemaVersion}".`,
      )
    }

    return normalizeOperationalEvidence(persisted.data)
  }

  private writeData(data: OperationalData) {
    this.storage.write({
      schemaVersion: OPERATIONAL_DATA_SCHEMA_VERSION,
      data: normalizeOperationalEvidence(data),
    })
  }

  private writeSeedData() {
    this.writeData(createFieldSafeSeedData())
  }

  private migrateVersionOne(data: OperationalData): OperationalData {
    const migrated = clone(data)
    migrated.inspections = migrated.inspections.map((inspection) => {
      const legacy = inspection as Inspection & {
        assignedAt?: string
        dueAt?: string
        submittedAt?: string | null
        signature?: Inspection['signature']
        reviewStatus?: Inspection['reviewStatus']
        reviewedAt?: string | null
        reviewedByUserId?: string | null
      }
      const completedAt = legacy.completedAt
      const startedAt = legacy.startedAt

      return {
        ...legacy,
        assignedAt:
          legacy.assignedAt ??
          new Date(
            Date.parse(startedAt ?? completedAt ?? new Date().toISOString()) -
              86_400_000,
          ).toISOString(),
        dueAt: legacy.dueAt ?? completedAt ?? new Date().toISOString(),
        submittedAt: legacy.submittedAt ?? completedAt,
        signature: legacy.signature ?? null,
        reviewStatus: legacy.reviewStatus ?? null,
        reviewedAt: legacy.reviewedAt ?? null,
        reviewedByUserId: legacy.reviewedByUserId ?? null,
      }
    })
    migrated.defects = migrated.defects.map((defect) => ({
      ...defect,
      evidenceReference: defect.evidenceReference ?? null,
    }))
    migrated.inspectionDrafts = migrated.inspectionDrafts ?? []

    const assigned = createSeedAssignedInspections(migrated.equipment)
    for (const inspection of assigned) {
      if (!migrated.inspections.some((item) => item.id === inspection.id)) {
        migrated.inspections.push(inspection)
      }
    }

    return migrated
  }

  private migrateVersionTwo(data: OperationalData): OperationalData {
    const migrated = clone(data)
    const completed = migrated.inspections
      .filter((inspection) => inspection.status === 'Completed')
      .sort((a, b) =>
        (b.submittedAt ?? b.completedAt ?? '').localeCompare(
          a.submittedAt ?? a.completedAt ?? '',
        ),
      )
    const pendingIds = new Set(
      completed.slice(0, 8).map((inspection) => inspection.id),
    )

    migrated.inspections = migrated.inspections.map((inspection) => {
      const legacy = inspection as Inspection & {
        reviewStatus?: Inspection['reviewStatus']
        reviewedAt?: string | null
        reviewedByUserId?: string | null
      }
      if (
        legacy.reviewStatus === 'Pending Review' ||
        legacy.reviewStatus === 'Reviewed'
      ) {
        return legacy
      }
      if (legacy.status !== 'Completed') {
        return {
          ...legacy,
          reviewStatus: null,
          reviewedAt: null,
          reviewedByUserId: null,
        }
      }

      const pending = pendingIds.has(legacy.id)
      return {
        ...legacy,
        reviewStatus: pending ? 'Pending Review' : 'Reviewed',
        reviewedAt: pending ? null : legacy.submittedAt ?? legacy.completedAt,
        reviewedByUserId: pending ? null : 'USR-SUP-001',
      }
    })

    return migrated
  }

  private migrateVersionThree(data: OperationalData): OperationalData {
    const migrated = clone(data)
    const legacyData = migrated as OperationalData & {
      simulatedConnectivity?: SimulatedConnectivityState
    }

    legacyData.simulatedConnectivity =
      legacyData.simulatedConnectivity === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'
    migrated.inspections = migrated.inspections.map((inspection) => {
      const legacy = inspection as Inspection & {
        syncStatus?: Inspection['syncStatus']
      }
      return {
        ...legacy,
        syncStatus:
          legacy.syncStatus === 'PENDING_SYNC' ? 'PENDING_SYNC' : 'SYNCED',
      }
    })

    return migrated
  }

  private migrateVersionFour(data: OperationalData): OperationalData {
    const migrated = clone(data)
    migrated.defects = migrated.defects.map((defect) => {
      const legacy = defect as Defect & {
        resolvedByUserId?: Defect['resolvedByUserId']
      }
      return {
        ...legacy,
        resolvedByUserId: legacy.resolvedByUserId ?? null,
      }
    })
    return migrated
  }

  private migrateVersionFive(data: OperationalData): OperationalData {
    const migrated = clone(data)
    const legacy = migrated as OperationalData & {
      inspectorNotifications?: InspectorNotification[]
    }
    legacy.inspectorNotifications = createSeedInspectorNotifications(
      migrated.inspections,
      migrated.equipment,
      migrated.checklists,
    )
    return migrated
  }
}
