import { useConnectivity } from '../../connectivity/useConnectivity'
import { ConnectivityIndicator } from '../common/ConnectivityIndicator'

export function ConnectivityControl() {
  const { connectivity, setConnectivity, status, syncActivity } =
    useConnectivity()
  const offline = connectivity === 'OFFLINE'
  const nextState = offline ? 'ONLINE' : 'OFFLINE'
  const disabled = status === 'loading' || syncActivity === 'SYNCING'

  return (
    <button
      type="button"
      className="rounded-full transition-colors hover:bg-white/10 disabled:cursor-wait disabled:opacity-70"
      onClick={() => void setConnectivity(nextState)}
      disabled={disabled}
      aria-label={
        status === 'loading'
          ? 'Loading simulated connectivity'
          : `Simulated connectivity: ${offline ? 'Offline' : 'Online'}. Switch to ${offline ? 'Online' : 'Offline'}`
      }
      aria-pressed={offline}
      title="Toggle simulated connectivity"
    >
      <ConnectivityIndicator
        state={
          status === 'loading' ? 'unknown' : offline ? 'offline' : 'online'
        }
        inverted
      />
    </button>
  )
}
