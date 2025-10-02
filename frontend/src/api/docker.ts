const API_BASE = 'http://localhost:8000/api'

export async function checkDockerStatus() {
  const response = await fetch(`${API_BASE}/docker/status`)
  return response.json()
}

export async function listDockerContainers() {
  const response = await fetch(`${API_BASE}/docker/containers`)
  return response.json()
}

export async function startDockerContainer() {
  console.log('API: Starting Docker container fetch to', `${API_BASE}/docker/start`)
  try {
    const response = await fetch(`${API_BASE}/docker/start`, {
      method: 'POST'
    })
    console.log('API: Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API: Error response:', errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('API: Response data:', data)
    return data
  } catch (error) {
    console.error('API: Exception during fetch:', error)
    throw error
  }
}

export async function stopDockerContainer() {
  const response = await fetch(`${API_BASE}/docker/stop`, {
    method: 'POST'
  })
  return response.json()
}

export async function getDockerPullProgress() {
  const response = await fetch(`${API_BASE}/docker/pull-progress`)
  return response.json()
}

export async function getAvailableModels() {
  const response = await fetch(`${API_BASE}/docker/models`)
  return response.json()
}
