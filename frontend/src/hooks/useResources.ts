import { useState, useEffect } from 'react'

interface ResourceUsage {
  cpu: {
    percent: number
    count: number
  }
  memory: {
    total_gb: number
    used_gb: number
    available_gb: number
    percent: number
  }
  disk: {
    total_gb: number
    used_gb: number
    free_gb: number
    percent: number
  }
  gpu: {
    available: boolean
    name?: string
    temperature_c?: number
    utilization_percent?: number
    memory_total_mb?: number
    memory_used_mb?: number
  }
}

export function useResources(intervalMs: number = 2000) {
  const [resources, setResources] = useState<ResourceUsage | null>(null)
  const [history, setHistory] = useState<ResourceUsage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/system/resources')
        if (!response.ok) throw new Error('Failed to fetch resources')
        const data = await response.json()
        setResources(data)
        setError(null)

        // Keep last 30 data points for graphs
        setHistory(prev => [...prev.slice(-29), data])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    fetchResources()
    const interval = setInterval(fetchResources, intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])

  return { resources, history, error }
}
