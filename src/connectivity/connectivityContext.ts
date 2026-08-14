import { createContext } from 'react'
import type { SimulatedConnectivityState } from '../domain/models'

export type ConnectivityLoadStatus = 'loading' | 'ready'
export type SyncActivity = 'IDLE' | 'SYNCING' | 'SYNCED'

export interface ConnectivityContextValue {
  status: ConnectivityLoadStatus
  connectivity: SimulatedConnectivityState
  syncActivity: SyncActivity
  error: string
  setConnectivity(state: SimulatedConnectivityState): Promise<void>
  refreshConnectivity(): Promise<void>
}

export const ConnectivityContext =
  createContext<ConnectivityContextValue | null>(null)
