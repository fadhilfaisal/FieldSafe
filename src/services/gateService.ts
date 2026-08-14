import type { Equipment, EquipmentStatus } from '../domain/models'
import {
  deriveEquipmentStatus,
  deriveGateDecision,
  type GateDecision,
} from '../domain/safety'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'

export interface GateEquipmentOption {
  equipment: Equipment
  status: EquipmentStatus
}

export interface GateCheckResult extends GateEquipmentOption {
  decision: GateDecision
}

export class GateCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GateCheckError'
  }
}

export class GateService {
  constructor(private readonly repository: FieldSafeRepository) {}

  async getEquipmentOptions(): Promise<GateEquipmentOption[]> {
    const [equipment, defects] = await Promise.all([
      this.repository.getEquipment(),
      this.repository.getDefects(),
    ])

    return equipment
      .map((item) => ({
        equipment: item,
        status: deriveEquipmentStatus(
          defects.filter((defect) => defect.equipmentId === item.id),
        ),
      }))
      .sort((left, right) =>
        left.equipment.assetCode.localeCompare(right.equipment.assetCode),
      )
  }

  async checkEquipment(equipmentId: string): Promise<GateCheckResult> {
    const option = (await this.getEquipmentOptions()).find(
      (item) => item.equipment.id === equipmentId,
    )
    if (!option) throw new GateCheckError('Equipment not found.')

    return {
      ...option,
      decision: deriveGateDecision(option.status),
    }
  }
}

export const gateService = new GateService(fieldSafeRepository)
