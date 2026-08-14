import type { SimulatedConnectivityState } from '../domain/models'
import { fieldSafeRepository } from '../repositories'
import type { FieldSafeRepository } from '../repositories/fieldSafeRepository'

type Delay = (milliseconds: number) => Promise<void>

const wait: Delay = (milliseconds) =>
  new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))

export class SimulatedConnectivityService {
  private activeSynchronization: Promise<number> | null = null

  constructor(
    private readonly repository: FieldSafeRepository,
    private readonly delay: Delay = wait,
    private readonly syncDelayMilliseconds = 600,
  ) {}

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
    return (await this.repository.markPendingInspectionsSynced()).length
  }
}

export const simulatedConnectivityService = new SimulatedConnectivityService(
  fieldSafeRepository,
)
