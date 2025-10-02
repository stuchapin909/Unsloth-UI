interface DockerStatusProps {
  status: {
    installed: boolean
    running: boolean
    container_id: string | null
    message: string
  }
  onStartDocker: () => void
  isStarting?: boolean
  pullProgress?: {
    status: string
    progress: number
    message: string
  } | null
}

export default function DockerStatus({ status, onStartDocker, isStarting = false, pullProgress = null }: DockerStatusProps) {
  return (
    <div className="bg-[#ffffff] p-6 shadow-[4px_4px_0_rgba(0,0,0,0.1)] border-2 border-[#1a1a1a]">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-4 h-4 ${
            status.running ? 'bg-[#1a1a1a]' : 'bg-[#666666]'
          }`}></div>
          <div>
            <h3 className="text-lg font-semibold text-[#1a1a1a]">
              Docker Status
            </h3>
            <p className="text-sm text-[#666666]">{status.message}</p>
            {status.container_id && (
              <p className="text-xs text-[#666666] mt-1">
                Container ID: {status.container_id}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {!status.running && status.installed && (
            <button
              onClick={onStartDocker}
              disabled={isStarting}
              className="btn-primary flex items-center gap-2"
            >
              {isStarting ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#ffffff] border-t-transparent animate-spin"></div>
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Container
                </>
              )}
            </button>
          )}
          {isStarting && !pullProgress && (
            <p className="text-xs text-[#666666]">
              First time? Downloading 7GB image (10-15 min)...
            </p>
          )}
        </div>

        {status.running && (
          <div className="flex items-center space-x-2 text-[#1a1a1a]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Ready</span>
          </div>
        )}

        {!status.installed && (
          <div className="text-[#1a1a1a] text-sm">
            Docker not installed
          </div>
        )}
      </div>

      {/* Progress Bar for Docker Pull */}
      {pullProgress && pullProgress.status === 'pulling' && (
        <div className="mt-4 p-4 bg-[#f5f5f0] border-2 border-[#1a1a1a] shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#1a1a1a] font-medium">
              {pullProgress.message}
            </span>
            <span className="text-sm text-[#1a1a1a] font-semibold">
              {Math.round(pullProgress.progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#ffffff] border-2 border-[#1a1a1a] overflow-hidden">
            <div
              className="h-full bg-[#1a1a1a] transition-all duration-500"
              style={{ width: `${pullProgress.progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-[#666666] mt-2">
            This is a one-time download. Future starts will be instant.
          </p>
        </div>
      )}

      {/* Info Banner for when Docker is installed but not running */}
      {status.installed && !status.running && !isStarting && (
        <div className="mt-4 p-4 bg-[#f5f5f0] border-2 border-[#1a1a1a] shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#1a1a1a] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-[#1a1a1a] font-semibold mb-2">What happens when you click "Start Container"?</h4>
              <ol className="text-[#333333] text-sm space-y-2 list-decimal list-inside">
                <li><strong>First time:</strong> Downloads the Unsloth Docker image (~7GB, takes 10-15 minutes)</li>
                <li><strong>Creates a container</strong> with GPU support, Python, and all training dependencies</li>
                <li><strong>Starts the environment</strong> where your models will be trained</li>
                <li><strong>Mounts your work folder</strong> so datasets and models persist</li>
              </ol>
              <p className="text-[#666666] text-xs mt-3">
                Subsequent starts are instant since the image is cached
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Docker Installation Guide */}
      {!status.installed && (
        <div className="mt-6 p-6 bg-[#f5f5f0] border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-[#1a1a1a] flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-[#1a1a1a] font-semibold text-lg mb-2">Docker Desktop Required</h4>
              <p className="text-[#333333] text-sm mb-4">
                Slothbuckler requires Docker to run the training environment with all dependencies pre-configured.
              </p>

              <div className="bg-[#ffffff] border-2 border-[#1a1a1a] p-4 mb-4">
                <p className="text-[#1a1a1a] font-medium mb-2">Why Docker?</p>
                <ul className="text-[#333333] text-sm space-y-1">
                  <li>• Pre-configured GPU drivers (CUDA)</li>
                  <li>• All dependencies included (~7GB)</li>
                  <li>• Works consistently across all systems</li>
                  <li>• Isolated environment prevents conflicts</li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-[#1a1a1a] font-medium">Installation Steps:</p>
                <ol className="text-[#333333] text-sm space-y-2 list-decimal list-inside">
                  <li>Download Docker Desktop from{' '}
                    <a
                      href="https://www.docker.com/products/docker-desktop/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1a1a1a] hover:text-[#333333] underline"
                    >
                      docker.com
                    </a>
                  </li>
                  <li>Install Docker Desktop (follow the installer)</li>
                  <li>Restart your computer if prompted</li>
                  <li>Start Docker Desktop application</li>
                  <li>Return here and click "Start Container"</li>
                </ol>
              </div>

              <div className="mt-4 p-3 bg-[#ffffff] border-2 border-[#1a1a1a]">
                <p className="text-[#333333] text-sm">
                  <strong>Advanced users:</strong> You can also install Unsloth locally without Docker,
                  but this requires manual CUDA setup and dependency management.
                  See the <a href="https://docs.unsloth.ai" target="_blank" className="underline text-[#1a1a1a]">Unsloth docs</a> for details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
