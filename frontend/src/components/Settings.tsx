import { useState, useEffect } from 'react'

export default function Settings() {
  const [hfToken, setHfToken] = useState('')
  const [savedToken, setSavedToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadToken()
  }, [])

  const loadToken = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/settings/hf-token')
      const data = await response.json()
      if (data.token) {
        setSavedToken(data.token)
        setHfToken(data.token)
      }
    } catch (error) {
      console.error('Error loading token:', error)
    }
  }

  const saveToken = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('http://localhost:8000/api/settings/hf-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: hfToken }),
      })

      if (response.ok) {
        setSavedToken(hfToken)
        setMessage({ type: 'success', text: 'Token saved successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to save token' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving token' })
    } finally {
      setSaving(false)
    }
  }

  const clearToken = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch('http://localhost:8000/api/settings/hf-token', {
        method: 'DELETE',
      })

      if (response.ok) {
        setHfToken('')
        setSavedToken('')
        setMessage({ type: 'success', text: 'Token cleared successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to clear token' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error clearing token' })
    } finally {
      setSaving(false)
    }
  }

  const maskToken = (token: string) => {
    if (!token) return ''
    if (token.length <= 8) return '•'.repeat(token.length)
    return token.substring(0, 4) + '•'.repeat(token.length - 8) + token.substring(token.length - 4)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">⚙️ Settings</h2>
        <p className="text-gray-400">Configure your Hugging Face integration and other preferences</p>
      </div>

      {/* Hugging Face Token Section */}
      <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">🤗 Hugging Face Access Token</h3>
            <p className="text-gray-300 text-sm mb-4">
              Connect your Hugging Face account to browse and download models and datasets directly from the Hub.
            </p>

            {savedToken && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-400 text-sm font-medium">Token saved: {maskToken(savedToken)}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="hf-token" className="block text-sm font-medium text-gray-300 mb-2">
                  Access Token
                </label>
                <input
                  id="hf-token"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_••••••••••••••••••••••••••••••••"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-gray-400 text-xs mt-2">
                  Get your token from{' '}
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    huggingface.co/settings/tokens
                  </a>
                </p>
              </div>

              {message && (
                <div className={`rounded-lg p-3 ${
                  message.type === 'success'
                    ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                    : 'bg-red-900/20 border border-red-500/30 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={saveToken}
                  disabled={saving || !hfToken}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Token'}
                </button>
                {savedToken && (
                  <button
                    onClick={clearToken}
                    disabled={saving}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    Clear Token
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">Why do I need a Hugging Face token?</p>
            <p className="text-blue-200/80">
              A token allows you to browse thousands of pre-trained models and datasets, download them directly into your environment,
              and upload your fine-tuned models back to the Hub. It's free to create an account and generate a token!
            </p>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
        <h4 className="text-white font-medium mb-2">✨ What you can do with your token:</h4>
        <ul className="text-gray-300 text-sm space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-purple-400">→</span>
            Browse and select from thousands of pre-trained models
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">→</span>
            Download datasets directly from Hugging Face
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">→</span>
            Upload your fine-tuned models to share with the community
          </li>
        </ul>
      </div>
    </div>
  )
}
