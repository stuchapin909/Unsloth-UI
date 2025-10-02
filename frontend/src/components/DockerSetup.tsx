import { useEffect, useState } from 'react'
import { checkDockerStatus, listDockerContainers, startDockerContainer, stopDockerContainer } from '../api/docker'

interface DockerSetupProps {
  onReady: () => void
}

interface Container {
  id: string
  name: string
  status: string
  created: string
  image: string
}

export default function DockerSetup({ onReady }: DockerSetupProps) {
  const [status, setStatus] = useState<any>(null)
  const [containers, setContainers] = useState<Container[]>([])
  const [checking, setChecking] = useState(true)
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null)

  const checkStatus = async () => {
    setChecking(true)
    try {
      const [dockerStatus, containerList] = await Promise.all([
        checkDockerStatus(),
        listDockerContainers()
      ])

      setStatus(dockerStatus)
      setContainers(containerList.containers || [])

      // Auto-select running container
      if (dockerStatus.container_running && dockerStatus.container_name) {
        setSelectedContainer(dockerStatus.container_name)
      }

      // If container is running, notify parent
      if (dockerStatus.container_running) {
        onReady()
      }
    } catch (error) {
      console.error('Error checking Docker status:', error)
      setStatus({
        docker_installed: false,
        image_pulled: false,
        container_running: false,
        message: 'Failed to check Docker status'
      })
    } finally {
      setChecking(false)
    }
  }

  const handleStartContainer = async (containerName?: string) => {
    try {
      await startDockerContainer()
      // Refresh status after starting
      setTimeout(checkStatus, 2000)
    } catch (error) {
      console.error('Error starting container:', error)
    }
  }

  const handleStopContainer = async () => {
    try {
      await stopDockerContainer()
      // Refresh status after stopping
      setTimeout(checkStatus, 2000)
    } catch (error) {
      console.error('Error stopping container:', error)
    }
  }

  useEffect(() => {
    checkStatus()
    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  if (checking && !status) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Detecting Docker...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Docker Status Card */}
      <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
        <h2 className="text-2xl font-bold text-white mb-4">🐳 Docker Status</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {status?.docker_installed ? (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="text-sm font-medium text-gray-400">Docker</span>
            </div>
            <p className={`text-lg font-semibold ${status?.docker_installed ? 'text-green-400' : 'text-red-400'}`}>
              {status?.docker_installed ? 'Installed' : 'Not Found'}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {status?.image_pulled ? (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span className="text-sm font-medium text-gray-400">Image</span>
            </div>
            <p className={`text-lg font-semibold ${status?.image_pulled ? 'text-green-400' : 'text-yellow-400'}`}>
              {status?.image_pulled ? 'Ready' : 'Not Pulled'}
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              {status?.container_running ? (
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              ) : (
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              )}
              <span className="text-sm font-medium text-gray-400">Container</span>
            </div>
            <p className={`text-lg font-semibold ${status?.container_running ? 'text-green-400' : 'text-gray-400'}`}>
              {status?.container_running ? 'Running' : 'Stopped'}
            </p>
          </div>
        </div>

        {status?.message && (
          <p className="text-gray-300 text-sm bg-slate-800/30 rounded p-3">{status.message}</p>
        )}
      </div>

      {/* Containers List */}
      <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Available Containers</h2>
          <button
            onClick={() => handleStartContainer()}
            className="btn-primary text-sm"
            disabled={!status?.docker_installed || !status?.image_pulled}
          >
            + Create New Container
          </button>
        </div>

        {containers.length > 0 ? (
          <div className="space-y-2">
            {containers.map((container) => (
              <div
                key={container.id}
                className={`bg-slate-800/50 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                  selectedContainer === container.name
                    ? 'border-purple-500'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onClick={() => setSelectedContainer(container.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      container.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
                    }`}></div>
                    <div>
                      <h3 className="text-white font-medium">{container.name}</h3>
                      <p className="text-gray-400 text-sm">ID: {container.id} • Status: {container.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {container.status === 'running' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStopContainer()
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartContainer(container.name)
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No containers found. Create a new one to get started!</p>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      {(!status?.docker_installed || !status?.image_pulled) && (
        <div className="bg-slate-700/50 rounded-lg p-6 border border-yellow-500/50">
          <h2 className="text-xl font-bold text-white mb-4">📋 Setup Instructions</h2>

          {!status?.docker_installed && (
            <div className="mb-4">
              <h3 className="text-white font-medium mb-2">1. Install Docker Desktop</h3>
              <a
                href="https://www.docker.com/products/docker-desktop/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block text-sm"
              >
                Download Docker Desktop
              </a>
            </div>
          )}

          {status?.docker_installed && !status?.image_pulled && (
            <div>
              <h3 className="text-white font-medium mb-2">2. Pull Unsloth Image</h3>
              <p className="text-gray-300 text-sm mb-2">Run this command in your terminal:</p>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <code className="text-purple-400 text-sm">docker pull unsloth/unsloth</code>
              </div>
              <p className="text-gray-400 text-xs mt-2">This is a 30GB download and may take 10-30 minutes</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
