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
    <div className="min-h-screen bg-[#f5f5f0]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8 pb-6 border-b-4 border-black">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img src="/Slothbuckler.png" alt="Slothbuckler Logo" className="w-16 h-16 border-2 border-black" />
            <h1 className="text-5xl font-bold text-black" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
              Slothbuckler
            </h1>
          </div>
          <p className="text-gray-700 text-lg" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
            Fine-tune LLMs 2x faster with 70% less VRAM
          </p>
        </header>

        {/* Main Content */}
        <div className="mt-8">
          {/* Tabs */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setActiveTab('docker')}
                className={`flex-1 py-3 px-4 font-medium transition-all border-2 border-black ${
                  activeTab === 'docker'
                    ? 'bg-black text-white shadow-[3px_3px_0_rgba(0,0,0,0.2)]'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
                style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
              >
                Docker
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 px-4 font-medium transition-all border-2 border-black ${
                  activeTab === 'settings'
                    ? 'bg-black text-white shadow-[3px_3px_0_rgba(0,0,0,0.2)]'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
                style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
              >
                Settings
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                disabled={!dockerReady}
                className={`flex-1 py-3 px-4 font-medium transition-all border-2 border-black ${
                  activeTab === 'upload'
                    ? 'bg-black text-white shadow-[3px_3px_0_rgba(0,0,0,0.2)]'
                    : dockerReady
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
              >
                Dataset
              </button>
              <button
                onClick={() => setActiveTab('train')}
                disabled={!dockerReady}
                className={`flex-1 py-3 px-4 font-medium transition-all border-2 border-black ${
                  activeTab === 'train'
                    ? 'bg-black text-white shadow-[3px_3px_0_rgba(0,0,0,0.2)]'
                    : dockerReady
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
              >
                Training
              </button>
              <button
                onClick={() => setActiveTab('progress')}
                disabled={!dockerReady}
                className={`flex-1 py-3 px-4 font-medium transition-all border-2 border-black ${
                  activeTab === 'progress'
                    ? 'bg-black text-white shadow-[3px_3px_0_rgba(0,0,0,0.2)]'
                    : dockerReady
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
              >
                Progress
              </button>
            </div>

          {/* Tab Content */}
          <div className="bg-white border-2 border-black p-6 shadow-[5px_5px_0_rgba(0,0,0,0.2)]">
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
        <footer className="text-center mt-12 text-gray-600 text-sm border-t-2 border-black pt-6" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
          <p>Slothbuckler • Built with Unsloth • FastAPI • React • TypeScript</p>
        </footer>
      </div>
    </div>
  )
}

export default App
