import { useState } from 'react'
import { searchHFDatasets, previewHFDataset, pullHFDataset } from '../api/datasets'

interface HFDataset {
  id: string
  name: string
  author: string
  downloads: number
  likes: number
  updated: string
  tags: string[]
}

interface PreviewData {
  samples: Record<string, unknown>[]
  dataset_id: string
}

interface HuggingFaceHubProps {
  onDatasetPulled: () => void
}

export default function HuggingFaceHub({ onDatasetPulled }: HuggingFaceHubProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [datasets, setDatasets] = useState<HFDataset[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [pulling, setPulling] = useState(false)

  const handleSearch = async () => {
    setSearching(true)
    try {
      const result = await searchHFDatasets(searchQuery)
      setDatasets(result.datasets || [])
    } catch (error) {
      console.error('Error searching datasets:', error)
      alert('Failed to search datasets. Make sure huggingface_hub is installed.')
    } finally {
      setSearching(false)
    }
  }

  const handlePreview = async (datasetId: string) => {
    setSelectedDataset(datasetId)
    try {
      const result = await previewHFDataset(datasetId)
      setPreviewData(result)
      setShowPreview(true)
    } catch (error) {
      console.error('Error previewing dataset:', error)
      alert('Failed to preview dataset')
    }
  }

  const handlePull = async (datasetId: string) => {
    setPulling(true)
    try {
      await pullHFDataset(datasetId)
      alert(`Successfully pulled ${datasetId}!`)
      setShowPreview(false)
      onDatasetPulled() // Refresh dataset list
    } catch (error) {
      console.error('Error pulling dataset:', error)
      alert('Failed to pull dataset. Make sure datasets library is installed.')
    } finally {
      setPulling(false)
    }
  }

  const loadPopular = async () => {
    setSearchQuery('')
    setSearching(true)
    try {
      const result = await searchHFDatasets('')
      setDatasets(result.datasets || [])
    } catch (error) {
      console.error('Error loading popular datasets:', error)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
          HuggingFace Hub
        </h2>
        <p className="text-gray-700 text-sm" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
          Browse and pull datasets from HuggingFace
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search datasets (e.g., alpaca, openassistant)..."
          className="flex-1 px-4 py-2 bg-white border-2 border-black text-black"
          style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="btn-primary"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        <button
          onClick={loadPopular}
          disabled={searching}
          className="btn-secondary"
        >
          Popular
        </button>
      </div>

      {/* Results */}
      {datasets.length > 0 ? (
        <div className="space-y-3">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="bg-white border-2 border-black p-4 hover:shadow-[4px_4px_0_rgba(0,0,0,0.15)] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-black" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                    {dataset.id}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                    {dataset.downloads?.toLocaleString() || 0} downloads • {dataset.likes || 0} likes
                  </p>
                  {dataset.tags && dataset.tags.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {dataset.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-[#f5f5f0] border border-black text-xs"
                          style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handlePreview(dataset.id)}
                    className="px-4 py-2 bg-white border-2 border-black hover:bg-gray-100"
                    style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handlePull(dataset.id)}
                    disabled={pulling}
                    className="btn-primary text-sm"
                  >
                    Pull
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[#f5f5f0] border-2 border-black">
          <p className="text-gray-600" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
            {searching ? 'Searching...' : 'Search for datasets or click "Popular" to browse'}
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-black max-w-4xl w-full max-h-[80vh] overflow-auto shadow-[8px_8px_0_rgba(0,0,0,0.3)]">
            <div className="sticky top-0 bg-white border-b-2 border-black p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-black" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                  Preview: {previewData.dataset_id}
                </h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-2xl font-bold text-black hover:bg-gray-100 px-3 py-1"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                Showing first {previewData.samples.length} samples:
              </p>

              {previewData.samples.map((sample, idx) => (
                <div key={idx} className="bg-[#f5f5f0] border-2 border-black p-4">
                  <p className="text-xs font-bold text-gray-600 mb-2" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                    Sample {idx + 1}
                  </p>
                  <pre className="text-xs text-black overflow-auto whitespace-pre-wrap" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                    {JSON.stringify(sample, null, 2)}
                  </pre>
                </div>
              ))}

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => handlePull(previewData.dataset_id)}
                  disabled={pulling}
                  className="btn-primary flex-1"
                >
                  {pulling ? 'Pulling...' : 'Pull Dataset'}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
