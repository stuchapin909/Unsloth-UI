import { useState } from 'react'
import { useModels } from '../hooks/useModels'
import Card from './ui/Card'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'
import { fonts } from '../utils/theme'

const EXAMPLE_PROMPTS = [
  "Write a short poem about AI.",
  "Explain quantum computing in simple terms.",
  "What is the capital of France?",
  "def fibonacci(n):",
  "Once upon a time,"
]

export default function ModelTesting() {
  const { models } = useModels()
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [prompt, setPrompt] = useState<string>('')
  const [maxTokens, setMaxTokens] = useState<number>(100)
  const [temperature, setTemperature] = useState<number>(0.7)
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  // Set first model as default when models load
  if (models.length > 0 && !selectedModel) {
    setSelectedModel(models[0].name)
  }

  const runInference = async () => {
    if (!selectedModel || !prompt.trim()) {
      setError('Please select a model and enter a prompt')
      return
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      const response = await fetch(`http://localhost:8000/api/models/${selectedModel}/inference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          max_tokens: maxTokens,
          temperature: temperature
        })
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.result)
      } else {
        setError(data.error || 'Inference failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run inference')
    } finally {
      setLoading(false)
    }
  }

  if (models.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <h2 style={{ fontFamily: fonts.primary, marginBottom: '20px' }}>Model Testing</h2>
        <EmptyState message="No trained models available. Train a model first to test it here." />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontFamily: fonts.primary, marginBottom: '20px' }}>Model Testing</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Input Panel */}
        <div>
          <Card style={{ marginBottom: '20px' }}>
            <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>Configuration</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontFamily: fonts.primary,
                  border: '2px solid #1a1a1a',
                  boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.1)',
                  background: '#ffffff'
                }}
              >
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} {model.base_model && `(${model.base_model.split('/').pop()})`}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min="10"
                max="500"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Temperature: {temperature.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </Card>

          <Card>
            <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>Prompt</h3>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '10px',
                fontFamily: fonts.primary,
                border: '2px solid #1a1a1a',
                boxShadow: '2px 2px 0 rgba(0, 0, 0, 0.1)',
                resize: 'vertical',
                background: '#ffffff'
              }}
            />

            <div style={{ marginTop: '15px' }}>
              <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '8px' }}>
                Quick examples:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {EXAMPLE_PROMPTS.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.8em',
                      background: '#f5f5f0',
                      border: '1px solid #1a1a1a',
                      cursor: 'pointer',
                      fontFamily: fonts.primary
                    }}
                  >
                    {example.length > 30 ? example.substring(0, 30) + '...' : example}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={runInference}
              disabled={loading || !prompt.trim()}
              fullWidth
              style={{ marginTop: '15px' }}
            >
              {loading ? 'Generating...' : 'Run Inference'}
            </Button>
          </Card>
        </div>

        {/* Output Panel */}
        <div>
          <Card>
            <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>Output</h3>

            {error && (
              <div style={{
                padding: '15px',
                background: '#f5f5f0',
                border: '2px solid #1a1a1a',
                marginBottom: '15px',
                color: '#666'
              }}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {loading && (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{ fontSize: '2em', marginBottom: '10px' }}>⟳</div>
                <div>Running inference...</div>
                <div style={{ fontSize: '0.85em', marginTop: '5px' }}>
                  This may take a minute while the model loads
                </div>
              </div>
            )}

            {result && !loading && (
              <div>
                <div style={{
                  padding: '15px',
                  background: '#f5f5f0',
                  border: '2px solid #1a1a1a',
                  minHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: fonts.primary,
                  lineHeight: '1.6'
                }}>
                  {result}
                </div>

                <Button
                  onClick={() => navigator.clipboard.writeText(result)}
                  variant="secondary"
                  style={{ marginTop: '10px', padding: '8px 15px' }}
                >
                  Copy to Clipboard
                </Button>
              </div>
            )}

            {!result && !loading && !error && (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: '#666',
                fontSize: '0.9em'
              }}>
                Enter a prompt and click "Run Inference" to see results here
              </div>
            )}
          </Card>

          <Card style={{ marginTop: '20px', fontSize: '0.85em', color: '#666', background: '#f5f5f0' }}>
            <strong>Note:</strong> Inference runs inside the Docker container. Make sure the container is running before testing.
            The first inference may take longer as the model needs to be loaded into memory.
          </Card>
        </div>
      </div>
    </div>
  )
}
