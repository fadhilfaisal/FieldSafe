import type {
  Checklist,
  CorrectiveAction,
  Defect,
  DefectSeverity,
  Equipment,
  EquipmentStatus,
  EquipmentType,
  Inspection,
  User,
} from '../domain/models'
import {
  deriveEquipmentStatus,
  getHighestDefectSeverity,
} from '../domain/safety'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'

const EQUIPMENT_TYPES: EquipmentType[] = [
  'Truck',
  'Crane',
  'Forklift',
  'MEWP',
  'Loader',
]

const EQUIPMENT_STATUS_ORDER: Record<EquipmentStatus, number> = {
  'Out of Service': 0,
  Restricted: 1,
  Fit: 2,
}

export interface CompliancePeriod {
  key: string
  label: string
  inspectionCount: number
  passedCount: number
  failedCount: number
  complianceRate: number
}

export interface EquipmentTypeCompliance extends CompliancePeriod {
  equipmentType: EquipmentType
}

export interface ManagerComplianceAnalytics {
  inspectionCount: number
  passedCount: number
  failedCount: number
  complianceRate: number
  trend: CompliancePeriod[]
  byEquipmentType: EquipmentTypeCompliance[]
}

export interface DefectVolumePeriod {
  key: string
  label: string
  defectCount: number
}

export interface DefectCategoryMetric {
  category: string
  defectCount: number
}

export interface ManagerDefectAnalytics {
  totalDefects: number
  unresolvedDefects: number
  severityBreakdown: Record<DefectSeverity, number>
  statusBreakdown: {
    open: number
    underReview: number
    resolved: number
  }
  volumeTrend: DefectVolumePeriod[]
  commonCategories: DefectCategoryMetric[]
}

export interface ManagerEquipmentListItem {
  equipment: Equipment
  status: EquipmentStatus
  unresolvedDefects: Defect[]
  highestUnresolvedSeverity: DefectSeverity | null
  latestInspection: Inspection | null
  activeCorrectiveActionCount: number
}

export interface ManagerInspectionHistoryItem {
  inspection: Inspection
  checklist: Checklist | null
  inspector: User | null
  defects: Defect[]
}

export interface ManagerDefectContext {
  defect: Defect
  category: string
  inspection: Inspection | null
  correctiveActions: CorrectiveAction[]
}

export interface ManagerCorrectiveActionContext {
  action: CorrectiveAction
  defect: Defect | null
  owner: User | null
}

export interface ManagerEquipmentDetail extends ManagerEquipmentListItem {
  inspectionHistory: ManagerInspectionHistoryItem[]
  defectContexts: ManagerDefectContext[]
  correctiveActionContexts: ManagerCorrectiveActionContext[]
}

export interface ManagerOverview {
  complianceRate: number
  recentInspectionCount: number
  openDefectCount: number
  equipmentStatusCounts: Record<EquipmentStatus, number>
  totalEquipmentCount: number
  highestRiskEquipment: ManagerEquipmentListItem[]
}

export class ManagerDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManagerDataError'
  }
}

function calculateRate(passedCount: number, inspectionCount: number) {
  if (inspectionCount === 0) return 0
  return Math.round((passedCount / inspectionCount) * 1_000) / 10
}

function monthKey(value: string) {
  return value.slice(0, 7)
}

function monthLabel(key: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${key}-01T00:00:00.000Z`))
}

interface ManagerSnapshot {
  equipment: Equipment[]
  inspections: Inspection[]
  checklists: Checklist[]
  checklistItems: Awaited<ReturnType<FieldSafeRepository['getChecklistItems']>>
  checklistResponses: Awaited<ReturnType<FieldSafeRepository['getChecklistResponses']>>
  defects: Defect[]
  correctiveActions: CorrectiveAction[]
  users: User[]
}

export class ManagerService {
  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getOverview(): Promise<ManagerOverview> {
    const snapshot = await this.loadSnapshot()
    const compliance = this.calculateCompliance(snapshot)
    const equipment = this.calculateEquipmentBoard(snapshot)
    const recentThreshold = Date.parse(this.now()) - 30 * 86_400_000
    const recentInspectionCount = snapshot.inspections.filter((inspection) => {
      const timestamp = inspection.submittedAt ?? inspection.completedAt
      return (
        inspection.status === 'Completed' &&
        timestamp !== null &&
        Date.parse(timestamp) >= recentThreshold
      )
    }).length

    return {
      complianceRate: compliance.complianceRate,
      recentInspectionCount,
      openDefectCount: snapshot.defects.filter(
        (defect) => defect.status !== 'Resolved',
      ).length,
      equipmentStatusCounts: {
        Fit: equipment.filter((item) => item.status === 'Fit').length,
        Restricted: equipment.filter((item) => item.status === 'Restricted')
          .length,
        'Out of Service': equipment.filter(
          (item) => item.status === 'Out of Service',
        ).length,
      },
      totalEquipmentCount: equipment.length,
      highestRiskEquipment: equipment
        .filter((item) => item.status !== 'Fit')
        .slice(0, 5),
    }
  }

  async getComplianceAnalytics(): Promise<ManagerComplianceAnalytics> {
    return this.calculateCompliance(await this.loadSnapshot())
  }

  async getDefectAnalytics(): Promise<ManagerDefectAnalytics> {
    const snapshot = await this.loadSnapshot()
    const volume = new Map<string, number>()
    const categories = new Map<string, number>()
    const responseById = new Map(
      snapshot.checklistResponses.map((response) => [response.id, response]),
    )
    const itemById = new Map(
      snapshot.checklistItems.map((item) => [item.id, item]),
    )

    for (const defect of snapshot.defects) {
      const key = monthKey(defect.reportedAt)
      volume.set(key, (volume.get(key) ?? 0) + 1)

      const response = responseById.get(defect.checklistResponseId)
      const item = response ? itemById.get(response.checklistItemId) : null
      const category = item?.category ?? defect.title
      categories.set(category, (categories.get(category) ?? 0) + 1)
    }

    return {
      totalDefects: snapshot.defects.length,
      unresolvedDefects: snapshot.defects.filter(
        (defect) => defect.status !== 'Resolved',
      ).length,
      severityBreakdown: {
        Minor: snapshot.defects.filter((defect) => defect.severity === 'Minor')
          .length,
        Major: snapshot.defects.filter((defect) => defect.severity === 'Major')
          .length,
        Critical: snapshot.defects.filter(
          (defect) => defect.severity === 'Critical',
        ).length,
      },
      statusBreakdown: {
        open: snapshot.defects.filter((defect) => defect.status === 'Open')
          .length,
        underReview: snapshot.defects.filter(
          (defect) => defect.status === 'Under Review',
        ).length,
        resolved: snapshot.defects.filter(
          (defect) => defect.status === 'Resolved',
        ).length,
      },
      volumeTrend: [...volume.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, defectCount]) => ({
          key,
          label: monthLabel(key),
          defectCount,
        })),
      commonCategories: [...categories.entries()]
        .map(([category, defectCount]) => ({ category, defectCount }))
        .sort(
          (left, right) =>
            right.defectCount - left.defectCount ||
            left.category.localeCompare(right.category),
        ),
    }
  }

  async getEquipmentBoard(): Promise<ManagerEquipmentListItem[]> {
    return this.calculateEquipmentBoard(await this.loadSnapshot())
  }

  async getEquipmentDetail(equipmentId: string): Promise<ManagerEquipmentDetail> {
    const snapshot = await this.loadSnapshot()
    const boardItem = this.calculateEquipmentBoard(snapshot).find(
      (item) => item.equipment.id === equipmentId,
    )
    if (!boardItem) throw new ManagerDataError('Equipment not found.')

    const equipmentInspections = snapshot.inspections
      .filter(
        (inspection) =>
          inspection.equipmentId === equipmentId &&
          inspection.status === 'Completed',
      )
      .sort((left, right) =>
        (right.submittedAt ?? right.completedAt ?? '').localeCompare(
          left.submittedAt ?? left.completedAt ?? '',
        ),
      )
    const inspectionHistory = equipmentInspections.map((inspection) => {
      const checklist = snapshot.checklists.find(
        (item) => item.id === inspection.checklistId,
      )
      const inspector = snapshot.users.find(
        (item) => item.id === inspection.inspectorId,
      )
      return {
        inspection,
        checklist: checklist ?? null,
        inspector: inspector ?? null,
        defects: snapshot.defects.filter(
          (defect) => defect.inspectionId === inspection.id,
        ),
      }
    })
    const responseById = new Map(
      snapshot.checklistResponses.map((response) => [response.id, response]),
    )
    const itemById = new Map(
      snapshot.checklistItems.map((item) => [item.id, item]),
    )
    const defectContexts = boardItem.unresolvedDefects
      .map((defect) => {
        const inspection = equipmentInspections.find(
          (item) => item.id === defect.inspectionId,
        )
        const response = responseById.get(defect.checklistResponseId)
        const item = response ? itemById.get(response.checklistItemId) : null
        return {
          defect,
          category: item?.category ?? defect.title,
          inspection: inspection ?? null,
          correctiveActions: snapshot.correctiveActions.filter(
            (action) => action.defectId === defect.id,
          ),
        }
      })
      .sort((left, right) =>
        right.defect.reportedAt.localeCompare(left.defect.reportedAt),
      )
    const correctiveActionContexts = snapshot.correctiveActions
      .filter((action) => action.equipmentId === equipmentId)
      .map((action) => {
        const defect = snapshot.defects.find(
          (item) => item.id === action.defectId,
        )
        const owner = snapshot.users.find(
          (item) => item.id === action.assignedToUserId,
        )
        return { action, defect: defect ?? null, owner: owner ?? null }
      })
      .sort((left, right) =>
        right.action.createdAt.localeCompare(left.action.createdAt),
      )

    return {
      ...boardItem,
      inspectionHistory,
      defectContexts,
      correctiveActionContexts,
    }
  }

  private async loadSnapshot(): Promise<ManagerSnapshot> {
    const [
      equipment,
      inspections,
      checklists,
      checklistItems,
      checklistResponses,
      defects,
      correctiveActions,
      users,
    ] = await Promise.all([
      this.repository.getEquipment(),
      this.repository.getInspections(),
      this.repository.getChecklists(),
      this.repository.getChecklistItems(),
      this.repository.getChecklistResponses(),
      this.repository.getDefects(),
      this.repository.getCorrectiveActions(),
      this.repository.getUsers(),
    ])

    return {
      equipment,
      inspections,
      checklists,
      checklistItems,
      checklistResponses,
      defects,
      correctiveActions,
      users,
    }
  }

  private calculateCompliance(
    snapshot: ManagerSnapshot,
  ): ManagerComplianceAnalytics {
    const completed = snapshot.inspections.filter(
      (inspection) =>
        inspection.status === 'Completed' && inspection.result !== null,
    )
    const passedCount = completed.filter(
      (inspection) => inspection.result === 'Pass',
    ).length
    const trend = new Map<string, Inspection[]>()

    for (const inspection of completed) {
      const timestamp = inspection.submittedAt ?? inspection.completedAt
      if (!timestamp) continue
      const key = monthKey(timestamp)
      trend.set(key, [...(trend.get(key) ?? []), inspection])
    }

    const equipmentById = new Map(
      snapshot.equipment.map((item) => [item.id, item]),
    )
    const byEquipmentType = EQUIPMENT_TYPES.map((equipmentType) => {
      const matching = completed.filter(
        (inspection) =>
          equipmentById.get(inspection.equipmentId)?.type === equipmentType,
      )
      const typePassed = matching.filter(
        (inspection) => inspection.result === 'Pass',
      ).length
      return {
        key: equipmentType,
        label: equipmentType,
        equipmentType,
        inspectionCount: matching.length,
        passedCount: typePassed,
        failedCount: matching.length - typePassed,
        complianceRate: calculateRate(typePassed, matching.length),
      }
    })

    return {
      inspectionCount: completed.length,
      passedCount,
      failedCount: completed.length - passedCount,
      complianceRate: calculateRate(passedCount, completed.length),
      trend: [...trend.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, inspections]) => {
          const periodPassed = inspections.filter(
            (inspection) => inspection.result === 'Pass',
          ).length
          return {
            key,
            label: monthLabel(key),
            inspectionCount: inspections.length,
            passedCount: periodPassed,
            failedCount: inspections.length - periodPassed,
            complianceRate: calculateRate(periodPassed, inspections.length),
          }
        }),
      byEquipmentType,
    }
  }

  private calculateEquipmentBoard(
    snapshot: ManagerSnapshot,
  ): ManagerEquipmentListItem[] {
    return snapshot.equipment
      .map((equipment) => {
        const equipmentDefects = snapshot.defects.filter(
          (defect) => defect.equipmentId === equipment.id,
        )
        const unresolvedDefects = equipmentDefects.filter(
          (defect) => defect.status !== 'Resolved',
        )
        const latestInspection = snapshot.inspections
          .filter(
            (inspection) =>
              inspection.equipmentId === equipment.id &&
              inspection.status === 'Completed',
          )
          .sort((left, right) =>
            (right.submittedAt ?? right.completedAt ?? '').localeCompare(
              left.submittedAt ?? left.completedAt ?? '',
            ),
          )[0]

        return {
          equipment,
          status: deriveEquipmentStatus(equipmentDefects),
          unresolvedDefects,
          highestUnresolvedSeverity: getHighestDefectSeverity(
            unresolvedDefects.map((defect) => defect.severity),
          ),
          latestInspection: latestInspection ?? null,
          activeCorrectiveActionCount: snapshot.correctiveActions.filter(
            (action) =>
              action.equipmentId === equipment.id && action.status !== 'Done',
          ).length,
        }
      })
      .sort(
        (left, right) =>
          EQUIPMENT_STATUS_ORDER[left.status] -
            EQUIPMENT_STATUS_ORDER[right.status] ||
          left.equipment.assetCode.localeCompare(right.equipment.assetCode),
      )
  }
}

export const managerService = new ManagerService(fieldSafeRepository)
