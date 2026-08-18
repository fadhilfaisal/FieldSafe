import { createSupervisorReviewNotification } from '../domain/notifications'
import { getHighestDefectSeverity } from '../domain/safety'
import type { SupervisorNotification } from '../domain/models'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'

const BASELINE_NOTIFICATION_LIMIT = 2

export class SupervisorNotificationService {
  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getNotifications(userId: string): Promise<SupervisorNotification[]> {
    await this.ensureDeterministicBaseline(userId)
    return (await this.repository.getNotifications(userId))
      .filter(
        (notification): notification is SupervisorNotification =>
          notification.type === 'FAILED_INSPECTION_REVIEW',
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async markRead(notificationId: string, userId: string) {
    return this.repository.markNotificationRead(
      notificationId,
      userId,
      this.now(),
    )
  }

  async markAllRead(userId: string) {
    return this.repository.markAllNotificationsRead(userId, this.now())
  }

  private async ensureDeterministicBaseline(userId: string) {
    const [users, inspections, equipment, checklists, defects, existing] =
      await Promise.all([
        this.repository.getUsers(),
        this.repository.getInspections(),
        this.repository.getEquipment(),
        this.repository.getChecklists(),
        this.repository.getDefects(),
        this.repository.getNotifications(userId),
      ])
    const supervisor = users.find(
      (user) =>
        user.id === userId && user.role === 'Supervisor' && user.isActive,
    )
    if (!supervisor) return

    const candidates = inspections
      .filter(
        (inspection) =>
          inspection.status === 'Completed' &&
          inspection.result === 'Fail' &&
          inspection.reviewStatus === 'Pending Review',
      )
      .sort((a, b) =>
        (b.submittedAt ?? b.completedAt ?? '').localeCompare(
          a.submittedAt ?? a.completedAt ?? '',
        ),
      )
      .slice(0, BASELINE_NOTIFICATION_LIMIT)

    for (const inspection of candidates) {
      const assignedEquipment = equipment.find(
        (item) => item.id === inspection.equipmentId,
      )
      const checklist = checklists.find(
        (item) => item.id === inspection.checklistId,
      )
      if (!assignedEquipment || !checklist) continue
      const notification = createSupervisorReviewNotification({
        supervisorId: userId,
        inspection,
        equipment: assignedEquipment,
        checklist,
        highestSeverity: getHighestDefectSeverity(
          defects
            .filter((defect) => defect.inspectionId === inspection.id)
            .map((defect) => defect.severity),
        ),
      })
      if (!existing.some((item) => item.id === notification.id)) {
        await this.repository.saveNotification(notification)
      }
    }
  }
}

export const supervisorNotificationService =
  new SupervisorNotificationService(fieldSafeRepository)
