import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SimulatedConnectivityState } from '../domain/models'
import {
  simulatedConnectivityService,
  type SimulatedConnectivityService,
} from './connectivityService'
import {
  ConnectivityContext,
  type ConnectivityContextValue,
  type SyncActivity,
} from './connectivityContext'

interface ConnectivityProviderProps {
  children: ReactNode
  service?: SimulatedConnectivityService
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to update simulated connectivity.'
}

export function ConnectivityProvider({
  children,
  service = simulatedConnectivityService,
}: ConnectivityProviderProps) {
  const [status, setStatus] =
    useState<ConnectivityContextValue['status']>('loading')
  const [connectivity, setConnectivityState] =
    useState<SimulatedConnectivityState>('ONLINE')
  const [syncActivity, setSyncActivity] = useState<SyncActivity>('IDLE')
  const [error, setError] = useState('')

  const runPendingSynchronization = useCallback(async () => {
    const synchronizedCount = await service.resumePendingSynchronization(() =>
      setSyncActivity('SYNCING'),
    )
    setSyncActivity(synchronizedCount > 0 ? 'SYNCED' : 'IDLE')
  }, [service])

  const refreshConnectivity = useCallback(async () => {
    try {
      const persistedState = await service.getState()
      setConnectivityState(persistedState)
      setSyncActivity('IDLE')
      setError('')
      setStatus('ready')
      if (persistedState === 'ONLINE') await runPendingSynchronization()
    } catch (loadError) {
      setError(errorMessage(loadError))
      setStatus('ready')
    }
  }, [runPendingSynchronization, service])

  useEffect(() => {
    void refreshConnectivity()
  }, [refreshConnectivity])

  const setConnectivity = useCallback(
    async (nextState: SimulatedConnectivityState) => {
      const previousState = connectivity
      setConnectivityState(nextState)
      setSyncActivity('IDLE')
      setError('')

      try {
        const synchronizedCount = await service.setState(nextState, () =>
          setSyncActivity('SYNCING'),
        )
        setSyncActivity(synchronizedCount > 0 ? 'SYNCED' : 'IDLE')
      } catch (updateError) {
        setConnectivityState(previousState)
        setSyncActivity('IDLE')
        setError(errorMessage(updateError))
      }
    },
    [connectivity, service],
  )

  const value = useMemo<ConnectivityContextValue>(
    () => ({
      status,
      connectivity,
      syncActivity,
      error,
      setConnectivity,
      refreshConnectivity,
    }),
    [
      connectivity,
      error,
      refreshConnectivity,
      setConnectivity,
      status,
      syncActivity,
    ],
  )

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  )
}
