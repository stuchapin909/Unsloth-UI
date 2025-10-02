import { useEffect, useState, useCallback } from 'react'
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

interface DockerStatus {
  docker_installed: boolean
  image_pulled: boolean
  container_running: boolean
  container_id: string | null
  container_name: string | null
  message: string
}

export default function DockerSetup({ onReady }: DockerSetupProps) {
  const [status, setStatus] = useState<DockerStatus | null>(null)
  const [containers, setContainers] = useState<Container[]>([])
  const [checking, setChecking] = useState(true)
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
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
        container_id: null,
        container_name: null,
        message: 'Failed to check Docker status'
      })
    } finally {
      setChecking(false)
    }
  }, [onReady])

  const handleStartContainer = async () => {
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
  }, [checkStatus])

  if (checking && !status) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-[#1a1a1a] border-t-transparent animate-spin mx-auto mb-4"></div>
        <p className="text-[#1a1a1a] text-lg">Detecting Docker...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Docker Status Card */}
      <div className="bg-[#ffffff] p-6 border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Docker Status</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#f5f5f0] p-4 border-2 border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-2">
              {status?.docker_installed ? (
                <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="text-sm font-medium text-[#666666]">Docker</span>
            </div>
            <p className="text-lg font-semibold text-[#1a1a1a]">
              {status?.docker_installed ? 'Installed' : 'Not Found'}
            </p>
          </div>

          <div className="bg-[#f5f5f0] p-4 border-2 border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-2">
              {status?.image_pulled ? (
                <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <span className="text-sm font-medium text-[#666666]">Image</span>
            </div>
            <p className="text-lg font-semibold text-[#1a1a1a]">
              {status?.image_pulled ? 'Ready' : 'Not Pulled'}
            </p>
          </div>

          <div className="bg-[#f5f5f0] p-4 border-2 border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-2">
              {status?.container_running ? (
                <div className="w-3 h-3 bg-[#1a1a1a]"></div>
              ) : (
                <div className="w-3 h-3 bg-[#666666]"></div>
              )}
              <span className="text-sm font-medium text-[#666666]">Container</span>
            </div>
            <p className="text-lg font-semibold text-[#1a1a1a]">
              {status?.container_running ? 'Running' : 'Stopped'}
            </p>
          </div>
        </div>

        {status?.message && (
          <p className="text-[#333333] text-sm bg-[#f5f5f0] border border-[#1a1a1a] p-3">{status.message}</p>
        )}
      </div>

      {/* Containers List */}
      <div className="bg-[#ffffff] p-6 border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-[#1a1a1a]">Available Containers</h2>
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
                className={`bg-[#f5f5f0] p-4 border-2 transition-all cursor-pointer ${
                  selectedContainer === container.name
                    ? 'border-[#1a1a1a] shadow-[3px_3px_0_rgba(0,0,0,0.15)]'
                    : 'border-[#1a1a1a] hover:border-[#333333]'
                }`}
                onClick={() => setSelectedContainer(container.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 ${
                      container.status === 'running' ? 'bg-[#1a1a1a]' : 'bg-[#666666]'
                    }`}></div>
                    <div>
                      <h3 className="text-[#1a1a1a] font-medium">{container.name}</h3>
                      <p className="text-[#666666] text-sm">ID: {container.id} • Status: {container.status}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {container.status === 'running' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStopContainer()
                        }}
                        className="px-4 py-2 bg-[#ffffff] hover:bg-[#f5f5f0] text-[#1a1a1a] border-2 border-[#1a1a1a] text-sm shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartContainer()
                        }}
                        className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#333333] text-[#ffffff] border-2 border-[#1a1a1a] text-sm shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
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
          <div className="text-center py-8 text-[#666666]">
            <p>No containers found. Create a new one to get started!</p>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      {(!status?.docker_installed || !status?.image_pulled) && (
        <div className="bg-[#ffffff] p-6 border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
          <h2 className="text-xl font-bold text-[#1a1a1a] mb-4">Setup Instructions</h2>

          {!status?.docker_installed && (
            <div className="mb-4">
              <h3 className="text-[#1a1a1a] font-medium mb-2">1. Install Docker Desktop</h3>
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
              <h3 className="text-[#1a1a1a] font-medium mb-2">2. Pull Unsloth Image</h3>
              <p className="text-[#333333] text-sm mb-2">Run this command in your terminal:</p>
              <div className="bg-[#f5f5f0] p-3 border-2 border-[#1a1a1a]">
                <code className="text-[#1a1a1a] text-sm">docker pull unsloth/unsloth</code>
              </div>
              <p className="text-[#666666] text-xs mt-2">This is a 30GB download and may take 10-30 minutes</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
