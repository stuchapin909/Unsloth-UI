import { useState, useEffect } from 'react'
import { getTrainingHistory, getTrainingRun } from '../api/training'

interface TrainingRun {
  id: number
  model_name: string
  base_model: string
  dataset_name: string
  status: string
  started_at: string
  completed_at: string | null
  final_loss: number | null
  error_message: string | null
}

interface TrainingMetric {
  step: number
  loss: number
  learning_rate: number | null
  timestamp: string
}

interface RunDetails {
  run: TrainingRun
  metrics: TrainingMetric[]
}

export function useTrainingHistory() {
  const [runs, setRuns] = useState<TrainingRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await getTrainingHistory()
      setRuns(response.runs || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load training history')
      console.error('Failed to load training history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  return { runs, loading, error, refetch: loadHistory }
}

export function useTrainingRun(runId: number | null) {
  const [runDetails, setRunDetails] = useState<RunDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRun = async (id: number) => {
    try {
      setLoading(true)
      const details = await getTrainingRun(id)
      setRunDetails(details)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load run details')
      console.error('Failed to load run details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (runId) {
      loadRun(runId)
    } else {
      setRunDetails(null)
    }
  }, [runId])

  return { runDetails, loading, error }
}
