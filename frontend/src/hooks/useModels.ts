import { useState, useEffect } from 'react'
import { listModels } from '../api/training'

interface Model {
  name: string
  size: number
  created: number
  base_model?: string
  training_run_id?: number
  metadata?: Record<string, unknown>
}

export function useModels() {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadModels = async () => {
    try {
      setLoading(true)
      const response = await listModels()
      setModels(response.models || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
      console.error('Failed to load models:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
  }, [])

  return { models, loading, error, refetch: loadModels }
}
