import type {
  Inspection,
  InspectorNotification,
} from '../domain/models'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'

function syncNotificationId(inspections: Inspection[]) {
  return `NTF-SYNC-${inspections
    .map((inspection) => inspection.id)
    .sort()
    .join('-')}`
}

export class InspectorNotificationService {
  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async getNotifications(userId: string) {
    const [notifications, inspections] = await Promise.all([
      this.repository.getInspectorNotifications(userId),
      this.repository.getInspections(),
    ])

    return notifications
      .map((notification) => {
        if (
          notification.type !== 'NEW_ASSIGNMENT' ||
          !notification.inspectionId
        ) {
          return notification
        }
        const inspection = inspections.find(
          (item) => item.id === notification.inspectionId,
        )
        if (!inspection) return notification
        const targetRoute =
          inspection.status === 'Completed'
            ? `/inspector/inspection/${inspection.id}/result`
            : inspection.status === 'In Progress'
              ? `/inspector/inspection/${inspection.id}`
              : `/inspector/scan?inspection=${inspection.id}`
        return { ...notification, targetRoute }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async markRead(notificationId: string, userId: string) {
    return this.repository.markInspectorNotificationRead(
      notificationId,
      userId,
      this.now(),
    )
  }

  async markAllRead(userId: string) {
    return this.repository.markAllInspectorNotificationsRead(userId, this.now())
  }

  async recordOfflineSyncCompleted(inspections: Inspection[]) {
    const synchronized = inspections.filter(
      (inspection) =>
        inspection.status === 'Completed' && inspection.syncStatus === 'SYNCED',
    )
    const byInspector = synchronized.reduce(
      (groups, inspection) => {
        const current = groups.get(inspection.inspectorId) ?? []
        current.push(inspection)
        groups.set(inspection.inspectorId, current)
        return groups
      },
      new Map<string, Inspection[]>(),
    )
    const created: InspectorNotification[] = []

    for (const [userId, userInspections] of byInspector) {
      const id = syncNotificationId(userInspections)
      const existing = (await this.repository.getInspectorNotifications(userId)).find(
        (notification) => notification.id === id,
      )
      if (existing) {
        created.push(existing)
        continue
      }

      const count = userInspections.length
      created.push(
        await this.repository.saveInspectorNotification({
          id,
          userId,
          type: 'OFFLINE_SYNC_COMPLETED',
          title: `${count} inspection${count === 1 ? '' : 's'} synced`,
          message: 'Your offline inspections are now up to date.',
          createdAt: this.now(),
          readAt: null,
          targetRoute: '/inspector/history',
          inspectionId: null,
        }),
      )
    }

    return created
  }
}

export const inspectorNotificationService = new InspectorNotificationService(
  fieldSafeRepository,
)
