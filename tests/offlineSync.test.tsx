// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { ConnectivityProvider } from '../src/connectivity/ConnectivityProvider'
import { SimulatedConnectivityService } from '../src/connectivity/connectivityService'
import { ConnectivityControl } from '../src/components/inspection/ConnectivityControl'
import { ConnectivityNotice } from '../src/components/inspection/ConnectivityNotice'
import type { SignatureData } from '../src/domain/models'
import {
  BrowserFieldSafeRepository,
  type PersistedOperationalData,
} from '../src/repositories/browserFieldSafeRepository'
import { InspectionService } from '../src/services/inspectionService'
import { BrowserStorageAdapter } from '../src/storage/browserStorageAdapter'
import type { StorageDriver } from '../src/storage/storageAdapter'

const STORAGE_KEY = 'fieldsafe:test:offline-sync'
const NOW = '2026-08-14T12:00:00.000Z'
const signature: SignatureData = {
  strokes: [[{ x: 0.1, y: 0.5 }, { x: 0.5, y: 0.2 }]],
}

class MemoryStorage implements StorageDriver {
  private readonly data = new Map<string, string>()

  getItem(key: string) {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.data.set(key, value)
  }

  removeItem(key: string) {
    this.data.delete(key)
  }
}

function createFlow(storage = new MemoryStorage()) {
  const repository = new BrowserFieldSafeRepository(
    new BrowserStorageAdapter<PersistedOperationalData>(
      STORAGE_KEY,
      () => storage,
    ),
  )
  return {
    repository,
    inspection: new InspectionService(repository, () => NOW),
    connectivity: new SimulatedConnectivityService(
      repository,
      async () => undefined,
      0,
    ),
    storage,
  }
}

async function completeAllPass(
  inspection: InspectionService,
  inspectionId = 'ASG-001',
) {
  const workspace = await inspection.getWorkspace(
    inspectionId,
    'USR-INSP-001',
  )
  for (const item of workspace.items) {
    await inspection.recordResponse(
      inspectionId,
      'USR-INSP-001',
      item.id,
      'Pass',
    )
  }
  await inspection.saveSignature(
    inspectionId,
    'USR-INSP-001',
    signature,
  )
}

afterEach(cleanup)

describe('simulated offline inspection and synchronization', () => {
  it('toggles deterministic Inspector connectivity through the shared repository', async () => {
    const flow = createFlow()
    const user = userEvent.setup()
    render(
      <ConnectivityProvider service={flow.connectivity}>
        <ConnectivityControl />
        <ConnectivityNotice />
      </ConnectivityProvider>,
    )

    const onlineControl = await screen.findByRole('button', {
      name: /Simulated connectivity: Online/i,
    })
    await user.click(onlineControl)

    expect(
      await screen.findByRole('button', {
        name: /Simulated connectivity: Offline/i,
      }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        'Offline demo mode — inspections will be saved on this device.',
      ),
    ).toBeTruthy()
    expect(await flow.repository.getSimulatedConnectivity()).toBe('OFFLINE')
  })

  it('keeps draft work usable offline and preserves it across reconstruction', async () => {
    const flow = createFlow()
    await flow.connectivity.setState('OFFLINE')
    await flow.inspection.startInspection('ASG-001', 'USR-INSP-001')
    const item = (
      await flow.inspection.getWorkspace('ASG-001', 'USR-INSP-001')
    ).items[0]

    await flow.inspection.recordResponse(
      'ASG-001',
      'USR-INSP-001',
      item.id,
      'Pass',
    )

    const reconstructed = createFlow(flow.storage)
    expect(
      (await reconstructed.repository.getInspectionDraft('ASG-001'))
        ?.responses[0],
    ).toMatchObject({ checklistItemId: item.id, result: 'Pass' })
    expect(await reconstructed.connectivity.getState()).toBe('OFFLINE')
  })

  it('persists offline submission as PENDING_SYNC across refresh, then syncs when Online', async () => {
    const flow = createFlow()
    await flow.connectivity.setState('OFFLINE')
    await completeAllPass(flow.inspection)

    const submission = await flow.inspection.submitInspection(
      'ASG-001',
      'USR-INSP-001',
      await flow.connectivity.getState(),
    )
    expect(submission.inspection.syncStatus).toBe('PENDING_SYNC')

    const reconstructed = createFlow(flow.storage)
    expect(
      (await reconstructed.repository.getInspectionById('ASG-001'))
        ?.syncStatus,
    ).toBe('PENDING_SYNC')
    expect(await reconstructed.connectivity.resumePendingSynchronization()).toBe(
      0,
    )

    let syncingAnnounced = false
    const synchronizedCount = await reconstructed.connectivity.setState(
      'ONLINE',
      () => {
        syncingAnnounced = true
      },
    )

    expect(syncingAnnounced).toBe(true)
    expect(synchronizedCount).toBe(1)
    expect(
      (await reconstructed.repository.getInspectionById('ASG-001'))
        ?.syncStatus,
    ).toBe('SYNCED')
  })

  it('keeps a normal online submission SYNCED', async () => {
    const flow = createFlow()
    await completeAllPass(flow.inspection)

    const submission = await flow.inspection.submitInspection(
      'ASG-001',
      'USR-INSP-001',
    )

    expect(submission.inspection.syncStatus).toBe('SYNCED')
    expect(await flow.connectivity.getPendingSyncCount()).toBe(0)
  })

  it('Demo Reset removes pending synchronization state and restores Online', async () => {
    const flow = createFlow()
    await flow.connectivity.setState('OFFLINE')
    await completeAllPass(flow.inspection)
    await flow.inspection.submitInspection(
      'ASG-001',
      'USR-INSP-001',
      'OFFLINE',
    )
    expect(await flow.connectivity.getPendingSyncCount()).toBe(1)

    await flow.repository.resetDemoData()

    expect(await flow.connectivity.getPendingSyncCount()).toBe(0)
    expect(await flow.repository.getSimulatedConnectivity()).toBe('ONLINE')
    expect(
      (await flow.repository.getInspections()).every(
        (inspection) => inspection.syncStatus === 'SYNCED',
      ),
    ).toBe(true)
  })

  it('presents Syncing then Synced feedback when connectivity returns', async () => {
    const flow = createFlow()
    await flow.connectivity.setState('OFFLINE')
    await completeAllPass(flow.inspection)
    await flow.inspection.submitInspection(
      'ASG-001',
      'USR-INSP-001',
      'OFFLINE',
    )

    let releaseSync: (() => void) | undefined
    const delayedConnectivity = new SimulatedConnectivityService(
      flow.repository,
      () =>
        new Promise<void>((resolve) => {
          releaseSync = resolve
        }),
      1,
    )
    const user = userEvent.setup()
    render(
      <ConnectivityProvider service={delayedConnectivity}>
        <ConnectivityControl />
        <ConnectivityNotice />
      </ConnectivityProvider>,
    )

    await user.click(
      await screen.findByRole('button', {
        name: /Simulated connectivity: Offline/i,
      }),
    )
    expect(
      await screen.findByText('Syncing saved offline inspections…'),
    ).toBeTruthy()

    releaseSync?.()

    await waitFor(() =>
      expect(
        screen.getByText('Saved offline inspections are now synced.'),
      ).toBeTruthy(),
    )
    expect(
      (await flow.repository.getInspectionById('ASG-001'))?.syncStatus,
    ).toBe('SYNCED')
  })
})
