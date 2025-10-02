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
    } catch {
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
    } catch {
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
        <h2 className="text-3xl font-bold text-[#1a1a1a] mb-2">Settings</h2>
        <p className="text-[#666666]">Configure your Hugging Face integration and other preferences</p>
      </div>

      {/* Hugging Face Token Section */}
      <div className="bg-[#ffffff] p-6 border-2 border-[#1a1a1a] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-[#1a1a1a]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Hugging Face Access Token</h3>
            <p className="text-[#333333] text-sm mb-4">
              Connect your Hugging Face account to browse and download models and datasets directly from the Hub.
            </p>

            {savedToken && (
              <div className="bg-[#f5f5f0] border-2 border-[#1a1a1a] p-3 mb-4 shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#1a1a1a] text-sm font-medium">Token saved: {maskToken(savedToken)}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="hf-token" className="block text-sm font-medium text-[#333333] mb-2">
                  Access Token
                </label>
                <input
                  id="hf-token"
                  type="password"
                  value={hfToken}
                  onChange={(e) => setHfToken(e.target.value)}
                  placeholder="hf_••••••••••••••••••••••••••••••••"
                  className="w-full bg-[#ffffff] border-2 border-[#1a1a1a] px-4 py-3 text-[#1a1a1a] placeholder-[#666666] focus:outline-none focus:shadow-[3px_3px_0_rgba(0,0,0,0.2)]"
                />
                <p className="text-[#666666] text-xs mt-2">
                  Get your token from{' '}
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1a1a1a] hover:text-[#333333] underline"
                  >
                    huggingface.co/settings/tokens
                  </a>
                </p>
              </div>

              {message && (
                <div className={`p-3 border-2 ${
                  message.type === 'success'
                    ? 'bg-[#f5f5f0] border-[#1a1a1a] text-[#1a1a1a]'
                    : 'bg-[#f5f5f0] border-[#1a1a1a] text-[#1a1a1a]'
                }`}>
                  <div className="flex items-center gap-2">
                    {message.type === 'success' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {message.text}
                  </div>
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
                    className="px-6 py-3 bg-[#ffffff] hover:bg-[#f5f5f0] disabled:opacity-50 disabled:cursor-not-allowed text-[#1a1a1a] border-2 border-[#1a1a1a] font-medium transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.1)]"
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
      <div className="bg-[#f5f5f0] border-2 border-[#1a1a1a] p-4 shadow-[3px_3px_0_rgba(0,0,0,0.1)]">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-[#1a1a1a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-[#1a1a1a]">
            <p className="font-medium mb-1">Why do I need a Hugging Face token?</p>
            <p className="text-[#333333]">
              A token allows you to browse thousands of pre-trained models and datasets, download them directly into your environment,
              and upload your fine-tuned models back to the Hub. It's free to create an account and generate a token!
            </p>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-[#ffffff] p-4 border-2 border-[#1a1a1a] shadow-[3px_3px_0_rgba(0,0,0,0.1)]">
        <h4 className="text-[#1a1a1a] font-medium mb-2">What you can do with your token:</h4>
        <ul className="text-[#333333] text-sm space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-[#1a1a1a]">→</span>
            Browse and select from thousands of pre-trained models
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[#1a1a1a]">→</span>
            Download datasets directly from Hugging Face
          </li>
          <li className="flex items-center gap-2">
            <span className="text-[#1a1a1a]">→</span>
            Upload your fine-tuned models to share with the community
          </li>
        </ul>
      </div>
    </div>
  )
}
