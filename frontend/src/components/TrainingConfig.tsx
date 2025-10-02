import { useState, useEffect } from 'react'
import { startTraining, listDatasets } from '../api/training'
import { getAvailableModels } from '../api/docker'

interface TrainingConfigProps {
  onTrainingStart: () => void
}

const DEFAULT_MODELS = [
  'unsloth/llama-3.1-8b-bnb-4bit',
  'unsloth/mistral-7b-v0.3-bnb-4bit',
  'unsloth/Qwen2.5-7B-bnb-4bit',
  'unsloth/gemma-2-9b-bnb-4bit',
  'unsloth/Phi-3.5-mini-instruct',
]

export default function TrainingConfig({ onTrainingStart }: TrainingConfigProps) {
  const [datasets, setDatasets] = useState<any[]>([])
  const [availableModels, setAvailableModels] = useState<string[]>(DEFAULT_MODELS)
  const [config, setConfig] = useState({
    model_name: DEFAULT_MODELS[0],
    dataset_path: '',
    max_seq_length: 2048,
    learning_rate: 0.0002,
    num_epochs: 1,
    batch_size: 2,
    gradient_accumulation_steps: 4,
    lora_r: 16,
    lora_alpha: 16,
    output_dir: ''
  })
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    loadDatasets()
    loadModels()
  }, [])

  const loadDatasets = async () => {
    try {
      const result = await listDatasets()
      setDatasets(result.datasets || [])
    } catch (error) {
      console.error('Error loading datasets:', error)
    }
  }

  const loadModels = async () => {
    try {
      const result = await getAvailableModels()
      if (result.models && result.models.length > 0) {
        setAvailableModels(result.models)
        // Update config if current model isn't in the new list
        if (!result.models.includes(config.model_name)) {
          setConfig({ ...config, model_name: result.models[0] })
        }
      }
    } catch (error) {
      console.error('Error loading models:', error)
      // Keep using default models on error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!config.dataset_path) {
      alert('Please select a dataset')
      return
    }

    if (!config.output_dir) {
      alert('Please specify an output directory name')
      return
    }

    setStarting(true)
    try {
      const fullOutputDir = `../work/models/${config.output_dir}`
      await startTraining({ ...config, output_dir: fullOutputDir })
      onTrainingStart()
    } catch (error) {
      console.error('Error starting training:', error)
      alert('Failed to start training')
    } finally {
      setStarting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Configure Training</h2>
        <p className="text-gray-400 text-sm">
          Set up your model training parameters
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Model
        </label>
        <select
          value={config.model_name}
          onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
          className="input-field"
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* Dataset Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Dataset
        </label>
        <select
          value={config.dataset_path}
          onChange={(e) => setConfig({ ...config, dataset_path: e.target.value })}
          className="input-field"
        >
          <option value="">Select a dataset...</option>
          {datasets.map((dataset, index) => (
            <option key={index} value={`../work/datasets/${dataset.name}`}>
              {dataset.name}
            </option>
          ))}
        </select>
      </div>

      {/* Output Directory */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Output Model Name
        </label>
        <input
          type="text"
          value={config.output_dir}
          onChange={(e) => setConfig({ ...config, output_dir: e.target.value })}
          placeholder="my-finetuned-model"
          className="input-field"
        />
      </div>

      {/* Training Parameters Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Sequence Length
          </label>
          <input
            type="number"
            value={config.max_seq_length}
            onChange={(e) => setConfig({ ...config, max_seq_length: parseInt(e.target.value) })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Learning Rate
          </label>
          <input
            type="number"
            step="0.0001"
            value={config.learning_rate}
            onChange={(e) => setConfig({ ...config, learning_rate: parseFloat(e.target.value) })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Epochs
          </label>
          <input
            type="number"
            value={config.num_epochs}
            onChange={(e) => setConfig({ ...config, num_epochs: parseInt(e.target.value) })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Batch Size
          </label>
          <input
            type="number"
            value={config.batch_size}
            onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value) })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            LoRA Rank (r)
          </label>
          <input
            type="number"
            value={config.lora_r}
            onChange={(e) => setConfig({ ...config, lora_r: parseInt(e.target.value) })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            LoRA Alpha
          </label>
          <input
            type="number"
            value={config.lora_alpha}
            onChange={(e) => setConfig({ ...config, lora_alpha: parseInt(e.target.value) })}
            className="input-field"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={starting || !config.dataset_path || !config.output_dir}
        className="btn-primary w-full py-4 text-lg relative overflow-hidden group"
      >
        {starting ? (
          <span className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Starting Training...
          </span>
        ) : (
          <>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Training
            </span>
          </>
        )}
      </button>
    </form>
  )
}
