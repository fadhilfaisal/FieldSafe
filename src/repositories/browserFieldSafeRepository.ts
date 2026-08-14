import { createFieldSafeSeedData } from '../data/seed/fieldSafeSeed'
import type {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  CorrectiveAction,
  Defect,
  Equipment,
  Inspection,
  OperationalData,
  User,
} from '../domain/models'
import type { StorageAdapter } from '../storage/storageAdapter'
import type { FieldSafeRepository } from './fieldSafeRepository'

export const OPERATIONAL_DATA_SCHEMA_VERSION = 1 as const

export interface PersistedOperationalData {
  schemaVersion: typeof OPERATIONAL_DATA_SCHEMA_VERSION
  data: OperationalData
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export class BrowserFieldSafeRepository implements FieldSafeRepository {
  constructor(
    private readonly storage: StorageAdapter<PersistedOperationalData>,
  ) {}

  async initialize() {
    if (this.storage.read() === null) {
      this.writeSeedData()
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

  async getDefects(): Promise<Defect[]> {
    return clone((await this.readData()).defects)
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

    return clone(persisted.data)
  }

  private writeData(data: OperationalData) {
    this.storage.write({
      schemaVersion: OPERATIONAL_DATA_SCHEMA_VERSION,
      data: clone(data),
    })
  }

  private writeSeedData() {
    this.writeData(createFieldSafeSeedData())
  }
}
