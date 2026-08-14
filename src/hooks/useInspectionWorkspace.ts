import { useCallback, useEffect, useState } from 'react'
import {
  inspectionService,
  type InspectionWorkspace,
} from '../services/inspectionService'

export function useInspectionWorkspace(
  inspectionId: string | undefined,
  inspectorId: string | undefined,
) {
  const [workspace, setWorkspace] = useState<InspectionWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async (silent = false) => {
    if (!inspectionId || !inspectorId) {
      setError('Inspection not found.')
      setLoading(false)
      return null
    }

    if (!silent) setLoading(true)
    try {
      const nextWorkspace = await inspectionService.getWorkspace(
        inspectionId,
        inspectorId,
      )
      setWorkspace(nextWorkspace)
      setError('')
      return nextWorkspace
    } catch (loadError) {
      setWorkspace(null)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this inspection.',
      )
      return null
    } finally {
      if (!silent) setLoading(false)
    }
  }, [inspectionId, inspectorId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { workspace, loading, error, reload }
}
