import { useState, useEffect } from 'react'
import DockerSetup from './components/DockerSetup'
import Settings from './components/Settings'
import DatasetUpload from './components/DatasetUpload'
import TrainingConfig from './components/TrainingConfig'
import TrainingProgress from './components/TrainingProgress'
import { checkDockerStatus } from './api/docker'

function App() {
  const [activeTab, setActiveTab] = useState<'docker' | 'settings' | 'upload' | 'train' | 'progress'>('docker')
  const [isTraining, setIsTraining] = useState(false)
  const [dockerReady, setDockerReady] = useState(false)

  useEffect(() => {
    checkIfReady()
  }, [])

  const checkIfReady = async () => {
    try {
      const status = await checkDockerStatus()
      if (status.container_running) {
        setDockerReady(true)
      }
    } catch (error) {
      console.error('Error checking Docker status:', error)
    }
  }

  const handleDockerReady = () => {
    setDockerReady(true)
    // Don't auto-switch tabs, let user navigate manually
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src="/Slothbuckler.png" alt="Slothbuckler Logo" className="w-16 h-16" />
            <h1 className="text-5xl font-bold text-white">
              Slothbuckler
            </h1>
          </div>
          <p className="text-gray-300 text-lg">
            Fine-tune LLMs 2x faster with 70% less VRAM
          </p>
        </header>

        {/* Main Content */}
        <div className="mt-8">
          {/* Tabs */}
            <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg mb-6">
              <button
                onClick={() => setActiveTab('docker')}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'docker'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                🐳 Docker
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                ⚙️ Settings
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                disabled={!dockerReady}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : dockerReady
                    ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                📁 Dataset
              </button>
              <button
                onClick={() => setActiveTab('train')}
                disabled={!dockerReady}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'train'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : dockerReady
                    ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                🎯 Training
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                disabled={!dockerReady}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                  activeTab === 'progress'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : dockerReady
                    ? 'text-gray-400 hover:text-white hover:bg-slate-700'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                📊 Progress
              </button>
            </div>

          {/* Tab Content */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 shadow-2xl">
            {activeTab === 'docker' && <DockerSetup onReady={handleDockerReady} />}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'upload' && <DatasetUpload />}
            {activeTab === 'train' && (
              <TrainingConfig
                onTrainingStart={() => {
                  setIsTraining(true)
                  setActiveTab('progress')
                }}
              />
            )}
            {activeTab === 'progress' && (
              <TrainingProgress isTraining={isTraining} />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Slothbuckler • Built with Unsloth • FastAPI • React • TypeScript</p>
        </footer>
      </div>
    </div>
  )
}

export default App
