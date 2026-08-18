import type { SimulatedConnectivityState } from '../domain/models'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'
import {
  InspectorNotificationService,
} from '../services/inspectorNotificationService'

type Delay = (milliseconds: number) => Promise<void>

const wait: Delay = (milliseconds) =>
  new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))

export class SimulatedConnectivityService {
  private activeSynchronization: Promise<number> | null = null
  private readonly notifications: Pick<
    InspectorNotificationService,
    'recordOfflineSyncCompleted'
  >

  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly delay: Delay = wait,
    private readonly syncDelayMilliseconds = 600,
    notifications?: Pick<
      InspectorNotificationService,
      'recordOfflineSyncCompleted'
    >,
  ) {
    this.notifications =
      notifications ?? new InspectorNotificationService(repository)
  }

  getState() {
    return this.repository.getSimulatedConnectivity()
  }

  async getPendingSyncCount() {
    const inspections = await this.repository.getInspections()
    return inspections.filter(
      (inspection) =>
        inspection.status === 'Completed' &&
        inspection.syncStatus === 'PENDING_SYNC',
    ).length
  }

  async setState(
    state: SimulatedConnectivityState,
    onSyncing?: () => void,
  ) {
    await this.repository.saveSimulatedConnectivity(state)
    return state === 'ONLINE'
      ? this.synchronizePendingInspections(onSyncing)
      : 0
  }

  async resumePendingSynchronization(onSyncing?: () => void) {
    return (await this.getState()) === 'ONLINE'
      ? this.synchronizePendingInspections(onSyncing)
      : 0
  }

  private async synchronizePendingInspections(onSyncing?: () => void) {
    if (this.activeSynchronization) return this.activeSynchronization

    this.activeSynchronization = this.performPendingSynchronization(onSyncing)
    try {
      return await this.activeSynchronization
    } finally {
      this.activeSynchronization = null
    }
  }

  private async performPendingSynchronization(onSyncing?: () => void) {
    const pendingCount = await this.getPendingSyncCount()

    if (pendingCount === 0) return 0

    onSyncing?.()
    await this.delay(this.syncDelayMilliseconds)
    const synchronized = await this.repository.markPendingInspectionsSynced()
    if (synchronized.length > 0) {
      await this.notifications.recordOfflineSyncCompleted(synchronized)
    }
    return synchronized.length
  }
}

export const simulatedConnectivityService = new SimulatedConnectivityService(
  fieldSafeRepository,
)
