const API_BASE = 'http://localhost:8000/api'

export interface TrainingConfig {
  model_name: string
  dataset_path: string
  max_seq_length: number
  learning_rate: number
  num_epochs: number
  batch_size: number
  gradient_accumulation_steps: number
  lora_r: number
  lora_alpha: number
  output_dir: string
}

export async function startTraining(config: TrainingConfig) {
  const response = await fetch(`${API_BASE}/training/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  })
  return response.json()
}

export async function getTrainingStatus() {
  const response = await fetch(`${API_BASE}/training/status`)
  return response.json()
}

export async function stopTraining() {
  const response = await fetch(`${API_BASE}/training/stop`, {
    method: 'POST'
  })
  return response.json()
}

export async function uploadDataset(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body: formData
  })
  return response.json()
}

export async function listDatasets() {
  const response = await fetch(`${API_BASE}/datasets/list`)
  return response.json()
}

export async function listModels() {
  const response = await fetch(`${API_BASE}/models/list`)
  return response.json()
}

export async function getTrainingHistory() {
  const response = await fetch(`${API_BASE}/training/history`)
  if (!response.ok) throw new Error('Failed to fetch training history')
  return response.json()
}

export async function getTrainingRun(runId: number) {
  const response = await fetch(`${API_BASE}/training/history/${runId}`)
  if (!response.ok) throw new Error('Failed to fetch training run')
  return response.json()
}
