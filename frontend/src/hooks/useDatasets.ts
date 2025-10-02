import { useState, useEffect } from 'react'
import { listDatasets } from '../api/training'

interface Dataset {
  name: string
  size: number
  created: number
  rows?: number
  source?: string
}

export function useDatasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDatasets = async () => {
    try {
      setLoading(true)
      const result = await listDatasets()
      setDatasets(result.datasets || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasets')
      console.error('Error loading datasets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDatasets()
  }, [])

  return { datasets, loading, error, refetch: loadDatasets }
}
