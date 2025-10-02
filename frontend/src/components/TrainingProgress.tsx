import { useState, useEffect } from 'react'
import { getTrainingStatus, stopTraining } from '../api/training'

interface TrainingProgressProps {
  isTraining: boolean
}

export default function TrainingProgress({ isTraining }: TrainingProgressProps) {
  const [status, setStatus] = useState<{
    running: boolean;
    progress: number;
    current_step: number;
    total_steps: number;
    loss: number | null;
    message: string;
  }>({
    running: false,
    progress: 0,
    current_step: 0,
    total_steps: 0,
    loss: null,
    message: 'No training in progress'
  })
  const [logs] = useState<Array<{ timestamp: string; message: string }>>([])

  useEffect(() => {
    if (isTraining) {
      const interval = setInterval(fetchStatus, 1000)
      return () => clearInterval(interval)
    }
  }, [isTraining])

  const fetchStatus = async () => {
    try {
      const result = await getTrainingStatus()
      setStatus(result)

      // Connect to WebSocket for logs (simplified)
      // In production, you'd establish a WebSocket connection
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }

  const handleStop = async () => {
    if (confirm('Are you sure you want to stop training?')) {
      try {
        await stopTraining()
      } catch (error) {
        console.error('Error stopping training:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Training Progress</h2>
        <p className="text-[#666666] text-sm">
          Monitor your model training in real-time
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-[#ffffff] p-6 space-y-4 border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {status.running ? (
              <div className="w-3 h-3 bg-[#1a1a1a]"></div>
            ) : (
              <div className="w-3 h-3 bg-[#666666]"></div>
            )}
            <span className="text-[#1a1a1a] font-medium">
              {status.running ? 'Training in Progress' : 'Training Stopped'}
            </span>
          </div>

          {status.running && (
            <button
              onClick={handleStop}
              className="btn-danger flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Stop Training
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm text-[#666666] mb-2">
            <span>{status.message}</span>
            <span>{Math.round(status.progress * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-[#f5f5f0] border-2 border-[#1a1a1a] overflow-hidden">
            <div
              className="h-full bg-[#1a1a1a] transition-all duration-500"
              style={{ width: `${status.progress * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Training Metrics */}
        {status.total_steps > 0 && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-[#1a1a1a]">
            <div>
              <p className="text-[#666666] text-sm">Current Step</p>
              <p className="text-[#1a1a1a] text-2xl font-bold">
                {status.current_step}
              </p>
            </div>
            <div>
              <p className="text-[#666666] text-sm">Total Steps</p>
              <p className="text-[#1a1a1a] text-2xl font-bold">
                {status.total_steps}
              </p>
            </div>
            {status.loss && (
              <div>
                <p className="text-[#666666] text-sm">Loss</p>
                <p className="text-[#1a1a1a] text-2xl font-bold">
                  {typeof status.loss === 'number' ? status.loss.toFixed(4) : status.loss}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-[#f5f5f0] border-2 border-[#1a1a1a] p-4 h-96 overflow-y-auto font-mono text-sm scrollbar-thin shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div key={index} className="text-[#333333] mb-1">
              <span className="text-[#666666]">[{log.timestamp}]</span>{' '}
              {log.message}
            </div>
          ))
        ) : (
          <div className="text-[#666666] text-center mt-8">
            {status.running
              ? 'Waiting for logs...'
              : 'No logs available. Start a training session to see logs here.'}
          </div>
        )}
      </div>

      {/* Info Box */}
      {!status.running && (
        <div className="bg-[#f5f5f0] border-2 border-[#1a1a1a] p-4 shadow-[3px_3px_0_rgba(0,0,0,0.1)]">
          <div className="flex">
            <svg className="w-5 h-5 text-[#1a1a1a] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-[#1a1a1a] font-medium mb-1">Training Tips</h3>
              <ul className="text-[#333333] text-sm space-y-1">
                <li>• Training loss should converge to around 0.5 for good results</li>
                <li>• Use 1-3 epochs to prevent overfitting</li>
                <li>• Monitor GPU memory usage during training</li>
                <li>• Trained models will be saved to the work/models directory</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
