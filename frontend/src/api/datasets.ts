const API_BASE = 'http://localhost:8000'

export async function searchHFDatasets(query: string = '', limit: number = 20) {
  const params = new URLSearchParams({ query, limit: limit.toString() })
  const response = await fetch(`${API_BASE}/api/datasets/hf/search?${params}`)
  return response.json()
}

export async function previewHFDataset(datasetId: string, limit: number = 5) {
  const response = await fetch(`${API_BASE}/api/datasets/hf/preview/${encodeURIComponent(datasetId)}?limit=${limit}`)
  return response.json()
}

export async function pullHFDataset(datasetId: string, split: string = 'train') {
  const response = await fetch(`${API_BASE}/api/datasets/hf/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dataset_id: datasetId,
      split,
    }),
  })
  return response.json()
}
