import type {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  CorrectiveAction,
  CorrectiveActionStatus,
  Defect,
  DefectSeverity,
  Equipment,
  Inspection,
  User,
} from '../domain/models'
import {
  getHighestDefectSeverity,
  isCorrectiveActionOverdue,
} from '../domain/safety'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'

export interface SupervisorReviewListItem {
  inspection: Inspection
  equipment: Equipment
  checklist: Checklist
  inspector: User
  defects: Defect[]
  failedCount: number
  highestSeverity: DefectSeverity | null
}

export interface SupervisorReviewResponse {
  response: ChecklistResponse
  item: ChecklistItem
  defect: Defect | null
}

export interface SupervisorReviewDetail extends SupervisorReviewListItem {
  responses: SupervisorReviewResponse[]
  actions: CorrectiveAction[]
}

export interface SupervisorActionListItem {
  action: CorrectiveAction
  equipment: Equipment
  defect: Defect
  inspection: Inspection
  owner: User
  overdue: boolean
}

export interface SupervisorDashboard {
  pendingReviews: SupervisorReviewListItem[]
  actions: SupervisorActionListItem[]
  openActionCount: number
  overdueActionCount: number
  criticalDefectCount: number
  outOfServiceCount: number
}

export interface CreateCorrectiveActionInput {
  defectId: string
  description: string
  assignedToUserId: string
  dueDate: string
  supervisorId: string
}

export class SupervisorWorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupervisorWorkflowError'
  }
}

const reviewSeverityRank: Record<DefectSeverity, number> = {
  Minor: 1,
  Major: 2,
  Critical: 3,
}

export class SupervisorService {
  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getReviews(
    status: Inspection['reviewStatus'] | 'All' = 'All',
  ): Promise<SupervisorReviewListItem[]> {
    const [inspections, equipment, checklists, users, defects, responses] =
      await Promise.all([
        this.repository.getInspections(),
        this.repository.getEquipment(),
        this.repository.getChecklists(),
        this.repository.getUsers(),
        this.repository.getDefects(),
        this.repository.getChecklistResponses(),
      ])

    return inspections
      .filter(
        (inspection) =>
          inspection.status === 'Completed' &&
          inspection.submittedAt !== null &&
          (status === 'All' || inspection.reviewStatus === status),
      )
      .map((inspection) => {
        const assignedEquipment = equipment.find(
          (item) => item.id === inspection.equipmentId,
        )
        const checklist = checklists.find(
          (item) => item.id === inspection.checklistId,
        )
        const inspector = users.find(
          (item) => item.id === inspection.inspectorId,
        )
        if (!assignedEquipment || !checklist || !inspector) {
          throw new SupervisorWorkflowError(
            `Inspection ${inspection.id} has incomplete related data.`,
          )
        }
        const inspectionDefects = defects.filter(
          (defect) => defect.inspectionId === inspection.id,
        )
        return {
          inspection,
          equipment: assignedEquipment,
          checklist,
          inspector,
          defects: inspectionDefects,
          failedCount: responses.filter(
            (response) =>
              response.inspectionId === inspection.id &&
              response.result === 'Fail',
          ).length,
          highestSeverity: getHighestDefectSeverity(
            inspectionDefects.map((defect) => defect.severity),
          ),
        }
      })
      .sort((left, right) => {
        const severityDifference =
          (right.highestSeverity
            ? reviewSeverityRank[right.highestSeverity]
            : 0) -
          (left.highestSeverity ? reviewSeverityRank[left.highestSeverity] : 0)
        if (severityDifference !== 0) return severityDifference
        return (right.inspection.submittedAt ?? '').localeCompare(
          left.inspection.submittedAt ?? '',
        )
      })
  }

  async getReviewDetail(inspectionId: string): Promise<SupervisorReviewDetail> {
    const [reviews, responses, items, defects, actions] = await Promise.all([
      this.getReviews('All'),
      this.repository.getChecklistResponses(inspectionId),
      this.repository.getChecklistItems(),
      this.repository.getDefects(inspectionId),
      this.repository.getCorrectiveActions(),
    ])
    const review = reviews.find(
      (item) => item.inspection.id === inspectionId,
    )
    if (!review) throw new SupervisorWorkflowError('Inspection review not found.')

    const resolvedResponses = responses
      .map((response) => {
        const item = items.find(
          (candidate) => candidate.id === response.checklistItemId,
        )
        if (!item) {
          throw new SupervisorWorkflowError(
            `Checklist response ${response.id} has no checklist item.`,
          )
        }
        return {
          response,
          item,
          defect:
            defects.find(
              (defect) => defect.checklistResponseId === response.id,
            ) ?? null,
        }
      })
      .sort((left, right) => left.item.sequence - right.item.sequence)

    return {
      ...review,
      responses: resolvedResponses,
      actions: actions.filter((action) =>
        defects.some((defect) => defect.id === action.defectId),
      ),
    }
  }

  async markReviewReviewed(inspectionId: string, supervisorId: string) {
    const inspection = await this.repository.getInspectionById(inspectionId)
    if (!inspection || inspection.status !== 'Completed') {
      throw new SupervisorWorkflowError('Inspection review not found.')
    }
    const supervisor = (await this.repository.getUsers()).find(
      (user) =>
        user.id === supervisorId && user.role === 'Supervisor' && user.isActive,
    )
    if (!supervisor) {
      throw new SupervisorWorkflowError('Active Supervisor not found.')
    }
    if (inspection.reviewStatus === 'Reviewed') return inspection

    return this.repository.saveInspection({
      ...inspection,
      reviewStatus: 'Reviewed',
      reviewedAt: this.now(),
      reviewedByUserId: supervisorId,
    })
  }

  async getTechnicians() {
    return (await this.repository.getUsers()).filter(
      (user) => user.role === 'Technician' && user.isActive,
    )
  }

  async getActions(): Promise<SupervisorActionListItem[]> {
    const [actions, equipment, defects, inspections, users] = await Promise.all([
      this.repository.getCorrectiveActions(),
      this.repository.getEquipment(),
      this.repository.getDefects(),
      this.repository.getInspections(),
      this.repository.getUsers(),
    ])
    const asOf = this.now()

    return actions
      .map((action) => {
        const relatedEquipment = equipment.find(
          (item) => item.id === action.equipmentId,
        )
        const defect = defects.find((item) => item.id === action.defectId)
        const inspection = defect
          ? inspections.find((item) => item.id === defect.inspectionId)
          : null
        const owner = users.find(
          (item) => item.id === action.assignedToUserId,
        )
        if (!relatedEquipment || !defect || !inspection || !owner) {
          throw new SupervisorWorkflowError(
            `Corrective action ${action.id} has incomplete related data.`,
          )
        }
        return {
          action,
          equipment: relatedEquipment,
          defect,
          inspection,
          owner,
          overdue: isCorrectiveActionOverdue(action, asOf),
        }
      })
      .sort((left, right) => {
        if (left.overdue !== right.overdue) return left.overdue ? -1 : 1
        return left.action.dueAt.localeCompare(right.action.dueAt)
      })
  }

  async getActionDetail(actionId: string) {
    const actions = await this.getActions()
    const action = actions.find((item) => item.action.id === actionId)
    if (!action) {
      throw new SupervisorWorkflowError('Corrective action not found.')
    }
    return action
  }

  async createCorrectiveAction(input: CreateCorrectiveActionInput) {
    const description = input.description.trim()
    if (!description) {
      throw new SupervisorWorkflowError('Action description is required.')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
      throw new SupervisorWorkflowError('Choose a valid due date.')
    }

    const [defects, equipment, users, actions] = await Promise.all([
      this.repository.getDefects(),
      this.repository.getEquipment(),
      this.repository.getUsers(),
      this.repository.getCorrectiveActions(),
    ])
    const defect = defects.find((item) => item.id === input.defectId)
    if (!defect || defect.status === 'Resolved') {
      throw new SupervisorWorkflowError('Open defect not found.')
    }
    if (actions.some((action) => action.defectId === defect.id)) {
      throw new SupervisorWorkflowError(
        'A corrective action already exists for this defect.',
      )
    }
    const relatedEquipment = equipment.find(
      (item) => item.id === defect.equipmentId,
    )
    const technician = users.find(
      (user) =>
        user.id === input.assignedToUserId &&
        user.role === 'Technician' &&
        user.isActive,
    )
    const supervisor = users.find(
      (user) =>
        user.id === input.supervisorId &&
        user.role === 'Supervisor' &&
        user.isActive,
    )
    if (!relatedEquipment || !technician || !supervisor) {
      throw new SupervisorWorkflowError(
        'Corrective action owner or equipment could not be resolved.',
      )
    }

    const nextNumber =
      Math.max(
        0,
        ...actions.map((action) => {
          const match = /^CA-(\d+)$/.exec(action.id)
          return match ? Number(match[1]) : 0
        }),
      ) + 1
    const createdAt = this.now()
    const action: CorrectiveAction = {
      id: `CA-${String(nextNumber).padStart(3, '0')}`,
      defectId: defect.id,
      equipmentId: relatedEquipment.id,
      assignedToUserId: technician.id,
      createdByUserId: supervisor.id,
      title: `Correct ${defect.title.toLowerCase()}`,
      description,
      status: 'Open',
      createdAt,
      dueAt: `${input.dueDate}T23:59:59.999Z`,
      completedAt: null,
    }

    return this.repository.saveCorrectiveAction(action)
  }

  async updateCorrectiveActionStatus(
    actionId: string,
    status: CorrectiveActionStatus,
  ) {
    const action = await this.repository.getCorrectiveActionById(actionId)
    if (!action) {
      throw new SupervisorWorkflowError('Corrective action not found.')
    }

    return this.repository.saveCorrectiveAction({
      ...action,
      status,
      completedAt: status === 'Done' ? this.now() : null,
    })
  }

  async getDashboard(): Promise<SupervisorDashboard> {
    const [pendingReviews, actions, defects, equipment] = await Promise.all([
      this.getReviews('Pending Review'),
      this.getActions(),
      this.repository.getDefects(),
      this.repository.getEquipment(),
    ])

    return {
      pendingReviews,
      actions,
      openActionCount: actions.filter(
        (item) => item.action.status !== 'Done',
      ).length,
      overdueActionCount: actions.filter((item) => item.overdue).length,
      criticalDefectCount: defects.filter(
        (defect) =>
          defect.severity === 'Critical' && defect.status !== 'Resolved',
      ).length,
      outOfServiceCount: equipment.filter(
        (item) => item.status === 'Out of Service',
      ).length,
    }
  }
}

export const supervisorService = new SupervisorService(fieldSafeRepository)
