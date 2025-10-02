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
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`w-4 h-4 rounded-full ${
            status.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Docker Status
            </h3>
            <p className="text-sm text-gray-400">{status.message}</p>
            {status.container_id && (
              <p className="text-xs text-gray-500 mt-1">
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
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
            <p className="text-xs text-yellow-400 animate-pulse">
              ⏳ First time? Downloading 7GB image (10-15 min)...
            </p>
          )}
        </div>

        {status.running && (
          <div className="flex items-center space-x-2 text-green-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Ready</span>
          </div>
        )}

        {!status.installed && (
          <div className="text-red-400 text-sm">
            Docker not installed
          </div>
        )}
      </div>

      {/* Progress Bar for Docker Pull */}
      {pullProgress && pullProgress.status === 'pulling' && (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-purple-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white font-medium">
              {pullProgress.message}
            </span>
            <span className="text-sm text-purple-400 font-semibold">
              {Math.round(pullProgress.progress)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${pullProgress.progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ⏱️ This is a one-time download. Future starts will be instant.
          </p>
        </div>
      )}

      {/* Info Banner for when Docker is installed but not running */}
      {status.installed && !status.running && !isStarting && (
        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-blue-400 font-semibold mb-2">What happens when you click "Start Container"?</h4>
              <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                <li><strong>First time:</strong> Downloads the Unsloth Docker image (~7GB, takes 10-15 minutes)</li>
                <li><strong>Creates a container</strong> with GPU support, Python, and all training dependencies</li>
                <li><strong>Starts the environment</strong> where your models will be trained</li>
                <li><strong>Mounts your work folder</strong> so datasets and models persist</li>
              </ol>
              <p className="text-gray-400 text-xs mt-3">
                💡 Subsequent starts are instant since the image is cached
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Docker Installation Guide */}
      {!status.installed && (
        <div className="mt-6 p-6 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-red-400 font-semibold text-lg mb-2">Docker Desktop Required</h4>
              <p className="text-gray-300 text-sm mb-4">
                Slothbuckler requires Docker to run the training environment with all dependencies pre-configured.
              </p>

              <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                <p className="text-white font-medium mb-2">Why Docker?</p>
                <ul className="text-gray-300 text-sm space-y-1">
                  <li>✅ Pre-configured GPU drivers (CUDA)</li>
                  <li>✅ All dependencies included (~7GB)</li>
                  <li>✅ Works consistently across all systems</li>
                  <li>✅ Isolated environment prevents conflicts</li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-white font-medium">Installation Steps:</p>
                <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                  <li>Download Docker Desktop from{' '}
                    <a
                      href="https://www.docker.com/products/docker-desktop/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 underline"
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

              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
                <p className="text-blue-300 text-sm">
                  💡 <strong>Advanced users:</strong> You can also install Unsloth locally without Docker,
                  but this requires manual CUDA setup and dependency management.
                  See the <a href="https://docs.unsloth.ai" target="_blank" className="underline">Unsloth docs</a> for details.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
