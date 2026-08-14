import {
  createFieldSafeSeedData,
  createSeedAssignedInspections,
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
  OperationalData,
  User,
} from '../domain/models'
import type { StorageAdapter } from '../storage/storageAdapter'
import type { FieldSafeRepository } from './fieldSafeRepository'
import type { InspectionSubmissionPersistence } from './fieldSafeRepository'

export const OPERATIONAL_DATA_SCHEMA_VERSION = 2 as const

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
      this.writeData(this.migrateVersionOne(persisted.data))
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
    data.inspectionDrafts = data.inspectionDrafts.filter(
      (item) => item.inspectionId !== submission.inspection.id,
    )
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
}
