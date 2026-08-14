import type {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  Defect,
  DraftChecklistResponse,
  DraftDefect,
  Equipment,
  Inspection,
  InspectionDraft,
  SimulatedConnectivityState,
  SignatureData,
} from '../domain/models'
import {
  deriveEquipmentStatus,
  deriveEquipmentStatusFromSeverities,
} from '../domain/safety'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'

export interface InspectionWorkspace {
  inspection: Inspection
  equipment: Equipment
  checklist: Checklist
  items: ChecklistItem[]
  draft: InspectionDraft | null
  responses: ChecklistResponse[]
  defects: Defect[]
}

export interface InspectorQueueItem {
  inspection: Inspection
  equipment: Equipment
  checklist: Checklist
  draft: InspectionDraft | null
}

export interface ChecklistValidation {
  itemErrors: Record<string, string[]>
  signatureError: string | null
  isChecklistComplete: boolean
  isSubmittable: boolean
}

export interface InspectionSubmissionResult {
  inspection: Inspection
  equipment: Equipment
  defects: Defect[]
}

export class InspectionWorkflowError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InspectionWorkflowError'
  }
}

export class InspectionValidationError extends InspectionWorkflowError {
  constructor(public readonly validation: ChecklistValidation) {
    super('Complete every checklist item and provide a signature before submitting.')
    this.name = 'InspectionValidationError'
  }
}

function createEmptyDraft(inspectionId: string, now: string): InspectionDraft {
  return {
    inspectionId,
    responses: [],
    signature: null,
    updatedAt: now,
  }
}

function isSignaturePresent(signature: SignatureData | null) {
  return Boolean(
    signature?.strokes.some((stroke) => stroke.length >= 2),
  )
}

export function validateInspectionDraft(
  items: ChecklistItem[],
  draft: InspectionDraft | null,
  requireSignature = false,
): ChecklistValidation {
  const itemErrors: Record<string, string[]> = {}

  for (const item of items) {
    const response = draft?.responses.find(
      (candidate) => candidate.checklistItemId === item.id,
    )
    const errors: string[] = []

    if (!response) {
      errors.push('Select Pass or Fail.')
    } else if (response.result === 'Fail') {
      if (!response.defect?.description.trim()) {
        errors.push('Describe the defect.')
      }
      if (!response.defect?.severity) {
        errors.push('Select a severity.')
      }
      if (!response.defect?.evidenceReference) {
        errors.push('Attach photo evidence.')
      }
    }

    if (errors.length > 0) itemErrors[item.id] = errors
  }

  const signatureError =
    requireSignature && !isSignaturePresent(draft?.signature ?? null)
      ? 'Inspector signature is required.'
      : null
  const isChecklistComplete = Object.keys(itemErrors).length === 0

  return {
    itemErrors,
    signatureError,
    isChecklistComplete,
    isSubmittable: isChecklistComplete && signatureError === null,
  }
}

export function countCompletedResponses(
  items: ChecklistItem[],
  draft: InspectionDraft | null,
) {
  const validation = validateInspectionDraft(items, draft)
  return items.filter((item) => !validation.itemErrors[item.id]).length
}

export class InspectionService {
  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getInspectorQueue(inspectorId: string): Promise<InspectorQueueItem[]> {
    const [inspections, equipment, checklists] = await Promise.all([
      this.repository.getInspections(),
      this.repository.getEquipment(),
      this.repository.getChecklists(),
    ])

    const queue = inspections
      .filter(
        (inspection) =>
          inspection.inspectorId === inspectorId &&
          inspection.status !== 'Completed',
      )
      .map((inspection) => {
        const assignedEquipment = equipment.find(
          (item) => item.id === inspection.equipmentId,
        )
        const checklist = checklists.find(
          (item) => item.id === inspection.checklistId,
        )
        if (!assignedEquipment || !checklist) {
          throw new InspectionWorkflowError(
            `Inspection ${inspection.id} has incomplete equipment or checklist data.`,
          )
        }
        return { inspection, equipment: assignedEquipment, checklist }
      })
      .sort((a, b) => a.inspection.dueAt.localeCompare(b.inspection.dueAt))

    return Promise.all(
      queue.map(async (item) => ({
        ...item,
        draft: await this.repository.getInspectionDraft(item.inspection.id),
      })),
    )
  }

  async getInspectorHistory(inspectorId: string) {
    const [inspections, equipment, defects] = await Promise.all([
      this.repository.getInspections(),
      this.repository.getEquipment(),
      this.repository.getDefects(),
    ])

    return inspections
      .filter(
        (inspection) =>
          inspection.inspectorId === inspectorId &&
          inspection.status === 'Completed',
      )
      .map((inspection) => {
        const inspectedEquipment = equipment.find(
          (item) => item.id === inspection.equipmentId,
        )
        if (!inspectedEquipment) {
          throw new InspectionWorkflowError(
            `Inspection ${inspection.id} has no equipment record.`,
          )
        }
        const inspectionDefects = defects.filter(
          (defect) => defect.inspectionId === inspection.id,
        )
        return { inspection, equipment: inspectedEquipment, defects: inspectionDefects }
      })
      .sort((a, b) =>
        (b.inspection.completedAt ?? '').localeCompare(
          a.inspection.completedAt ?? '',
        ),
      )
  }

  async getWorkspace(
    inspectionId: string,
    inspectorId?: string,
  ): Promise<InspectionWorkspace> {
    const inspection = await this.repository.getInspectionById(inspectionId)
    if (!inspection) {
      throw new InspectionWorkflowError('Inspection not found.')
    }
    if (inspectorId && inspection.inspectorId !== inspectorId) {
      throw new InspectionWorkflowError(
        'This inspection is not assigned to the active Inspector.',
      )
    }

    const [equipment, checklists, items, draft, responses, defects] =
      await Promise.all([
        this.repository.getEquipmentById(inspection.equipmentId),
        this.repository.getChecklists(),
        this.repository.getChecklistItems(inspection.checklistId),
        this.repository.getInspectionDraft(inspection.id),
        this.repository.getChecklistResponses(inspection.id),
        this.repository.getDefects(inspection.id),
      ])
    const checklist = checklists.find((item) => item.id === inspection.checklistId)

    if (!equipment) throw new InspectionWorkflowError('Equipment not found.')
    if (!checklist) throw new InspectionWorkflowError('Checklist not found.')
    if (items.length === 0) {
      throw new InspectionWorkflowError('Checklist contains no inspection items.')
    }

    return {
      inspection,
      equipment,
      checklist,
      items: items.sort((a, b) => a.sequence - b.sequence),
      draft,
      responses,
      defects,
    }
  }

  async startInspection(inspectionId: string, inspectorId: string) {
    const workspace = await this.getWorkspace(inspectionId, inspectorId)
    if (workspace.inspection.status === 'Completed') {
      throw new InspectionWorkflowError('This inspection is already completed.')
    }
    if (workspace.inspection.status === 'In Progress') {
      return workspace.inspection
    }

    return this.repository.saveInspection({
      ...workspace.inspection,
      status: 'In Progress',
      startedAt: workspace.inspection.startedAt ?? this.now(),
    })
  }

  async recordResponse(
    inspectionId: string,
    inspectorId: string,
    checklistItemId: string,
    result: DraftChecklistResponse['result'],
  ) {
    const workspace = await this.getWorkspace(inspectionId, inspectorId)
    this.assertEditable(workspace.inspection)
    if (!workspace.items.some((item) => item.id === checklistItemId)) {
      throw new InspectionWorkflowError('Checklist item not found.')
    }

    const now = this.now()
    const draft = workspace.draft ?? createEmptyDraft(inspectionId, now)
    const existing = draft.responses.find(
      (response) => response.checklistItemId === checklistItemId,
    )
    const nextResponse: DraftChecklistResponse = {
      checklistItemId,
      result,
      defect:
        result === 'Fail'
          ? existing?.result === 'Fail'
            ? existing.defect
            : {
                description: '',
                severity: null,
                evidenceReference: null,
              }
          : null,
    }
    draft.responses = draft.responses
      .filter((response) => response.checklistItemId !== checklistItemId)
      .concat(nextResponse)
    draft.updatedAt = now
    return this.repository.saveInspectionDraft(draft)
  }

  async updateDraftDefect(
    inspectionId: string,
    inspectorId: string,
    checklistItemId: string,
    patch: Partial<DraftDefect>,
  ) {
    const workspace = await this.getWorkspace(inspectionId, inspectorId)
    this.assertEditable(workspace.inspection)
    const draft = workspace.draft
    const response = draft?.responses.find(
      (item) => item.checklistItemId === checklistItemId,
    )

    if (!draft || !response || response.result !== 'Fail') {
      throw new InspectionWorkflowError(
        'Select Fail before recording defect details.',
      )
    }

    response.defect = {
      description: response.defect?.description ?? '',
      severity: response.defect?.severity ?? null,
      evidenceReference: response.defect?.evidenceReference ?? null,
      ...patch,
    }
    draft.updatedAt = this.now()
    return this.repository.saveInspectionDraft(draft)
  }

  async saveSignature(
    inspectionId: string,
    inspectorId: string,
    signature: SignatureData | null,
  ) {
    const workspace = await this.getWorkspace(inspectionId, inspectorId)
    this.assertEditable(workspace.inspection)
    const draft =
      workspace.draft ?? createEmptyDraft(inspectionId, this.now())
    draft.signature = signature
    draft.updatedAt = this.now()
    return this.repository.saveInspectionDraft(draft)
  }

  async getReviewSummary(inspectionId: string, inspectorId: string) {
    const workspace = await this.getWorkspace(inspectionId, inspectorId)
    const existingDefects = (await this.repository.getDefects()).filter(
      (defect) =>
        defect.equipmentId === workspace.equipment.id &&
        defect.status !== 'Resolved',
    )
    const draftSeverities =
      workspace.draft?.responses.flatMap((response) =>
        response.result === 'Fail' && response.defect?.severity
          ? [response.defect.severity]
          : [],
      ) ?? []

    return {
      workspace,
      resultingEquipmentStatus: deriveEquipmentStatusFromSeverities(
        existingDefects
          .map((defect) => defect.severity)
          .concat(draftSeverities),
      ),
    }
  }

  async submitInspection(
    inspectionId: string,
    inspectorId: string,
    connectivity: SimulatedConnectivityState = 'ONLINE',
  ): Promise<InspectionSubmissionResult> {
    const workspace = await this.getWorkspace(inspectionId, inspectorId)
    this.assertEditable(workspace.inspection)
    const validation = validateInspectionDraft(
      workspace.items,
      workspace.draft,
      true,
    )
    if (!validation.isSubmittable || !workspace.draft) {
      throw new InspectionValidationError(validation)
    }

    const submittedAt = this.now()
    const responseByItem = new Map(
      workspace.draft.responses.map((response) => [
        response.checklistItemId,
        response,
      ]),
    )
    const responses: ChecklistResponse[] = workspace.items.map((item) => {
      const draftResponse = responseByItem.get(item.id)!
      return {
        id: `RSP-${workspace.inspection.id}-${String(item.sequence).padStart(2, '0')}`,
        inspectionId: workspace.inspection.id,
        checklistItemId: item.id,
        result: draftResponse.result,
        ...(draftResponse.result === 'Fail'
          ? { notes: draftResponse.defect!.description.trim() }
          : {}),
      }
    })
    const defects: Defect[] = workspace.items.flatMap((item) => {
      const draftResponse = responseByItem.get(item.id)!
      if (draftResponse.result !== 'Fail') return []
      const defect = draftResponse.defect!
      return [
        {
          id: `DEF-${workspace.inspection.id}-${String(item.sequence).padStart(2, '0')}`,
          inspectionId: workspace.inspection.id,
          equipmentId: workspace.equipment.id,
          checklistResponseId: `RSP-${workspace.inspection.id}-${String(item.sequence).padStart(2, '0')}`,
          reportedByUserId: inspectorId,
          title: `${item.category} condition requires attention`,
          description: defect.description.trim(),
          severity: defect.severity!,
          evidenceReference: defect.evidenceReference!,
          status: 'Open',
          reportedAt: submittedAt,
          resolvedAt: null,
        },
      ]
    })
    const allDefects = (await this.repository.getDefects()).filter(
      (defect) => defect.equipmentId === workspace.equipment.id,
    )
    const equipment: Equipment = {
      ...workspace.equipment,
      status: deriveEquipmentStatus(allDefects.concat(defects)),
      lastInspectionAt: submittedAt,
    }
    const inspection: Inspection = {
      ...workspace.inspection,
      status: 'Completed',
      result: defects.length > 0 ? 'Fail' : 'Pass',
      completedAt: submittedAt,
      submittedAt,
      signature: workspace.draft.signature,
      syncStatus: connectivity === 'OFFLINE' ? 'PENDING_SYNC' : 'SYNCED',
      reviewStatus: 'Pending Review',
      reviewedAt: null,
      reviewedByUserId: null,
    }

    await this.repository.commitInspectionSubmission({
      inspection,
      responses,
      defects,
      equipment,
    })

    return { inspection, equipment, defects }
  }

  private assertEditable(inspection: Inspection) {
    if (inspection.status === 'Completed') {
      throw new InspectionWorkflowError('Completed inspections cannot be edited.')
    }
  }
}

export const inspectionService = new InspectionService(fieldSafeRepository)
