import { useState, useRef, useEffect } from 'react'
import { uploadDataset, listDatasets } from '../api/training'
import HuggingFaceHub from './HuggingFaceHub'

interface Dataset {
  name: string
  size: number
  created: number
  rows?: number
  source?: string
}

type TabType = 'local' | 'huggingface'

export default function DatasetUpload() {
  const [activeTab, setActiveTab] = useState<TabType>('local')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleFileUpload(files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await uploadDataset(file)
      setUploadedFile(result.filename)
      await loadDatasets()
      setTimeout(() => setUploadedFile(null), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload dataset')
    } finally {
      setUploading(false)
    }
  }

  const loadDatasets = async () => {
    try {
      const result = await listDatasets()
      setDatasets(result.datasets || [])
    } catch (error) {
      console.error('Error loading datasets:', error)
    }
  }

  useEffect(() => {
    loadDatasets()
  }, [])

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-2 border-b-2 border-black">
        <button
          onClick={() => setActiveTab('local')}
          className={`px-6 py-3 font-medium transition-all border-2 border-b-0 border-black ${
            activeTab === 'local'
              ? 'bg-white text-black -mb-[2px]'
              : 'bg-[#f5f5f0] text-gray-600 hover:bg-gray-100'
          }`}
          style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
        >
          Local Upload
        </button>
        <button
          onClick={() => setActiveTab('huggingface')}
          className={`px-6 py-3 font-medium transition-all border-2 border-b-0 border-black ${
            activeTab === 'huggingface'
              ? 'bg-white text-black -mb-[2px]'
              : 'bg-[#f5f5f0] text-gray-600 hover:bg-gray-100'
          }`}
          style={{ fontFamily: 'Georgia, Times New Roman, serif' }}
        >
          HuggingFace Hub
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'local' ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
              Upload Dataset
            </h2>
            <p className="text-[#666666] text-sm" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
              Upload your training dataset in JSON, JSONL, or CSV format
            </p>
          </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-[#1a1a1a] bg-[#f5f5f0] shadow-[5px_5px_0_rgba(0,0,0,0.15)]'
            : 'border-[#1a1a1a] hover:border-[#333333] hover:bg-[#ffffff]'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.jsonl,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="w-12 h-12 border-4 border-[#1a1a1a] border-t-transparent animate-spin mx-auto"></div>
            <p className="text-[#1a1a1a] font-medium">Uploading...</p>
          </div>
        ) : uploadedFile ? (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-[#ffffff] border-2 border-[#1a1a1a] flex items-center justify-center mx-auto shadow-[3px_3px_0_rgba(0,0,0,0.1)]">
              <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[#1a1a1a] font-medium">Uploaded: {uploadedFile}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-[#ffffff] border-2 border-[#1a1a1a] flex items-center justify-center mx-auto shadow-[4px_4px_0_rgba(0,0,0,0.15)] transform hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-[#1a1a1a] font-semibold text-xl">
                Drop your dataset here
              </p>
              <p className="text-[#666666] text-sm mt-2">
                or click to browse files
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f5f0] border border-[#1a1a1a]">
              <svg className="w-4 h-4 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[#333333] text-xs font-medium">
                Supports: .json, .jsonl, .csv
              </span>
            </div>
          </div>
        )}
      </div>
        </div>
      ) : (
        <HuggingFaceHub onDatasetPulled={loadDatasets} />
      )}

      {/* My Datasets - Shared List */}
      {datasets.length > 0 && (
        <div className="border-t-2 border-black pt-6">
          <h3 className="text-lg font-semibold text-[#1a1a1a] mb-3" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
            My Datasets ({datasets.length})
          </h3>
          <div className="space-y-2">
            {datasets.map((dataset, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-[#ffffff] hover:bg-[#f5f5f0] p-4 border-2 border-[#1a1a1a] hover:shadow-[3px_3px_0_rgba(0,0,0,0.1)] transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#ffffff] border-2 border-[#1a1a1a] flex items-center justify-center shadow-[2px_2px_0_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-6 h-6 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[#1a1a1a] font-semibold group-hover:text-[#333333] transition-colors" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                      {dataset.name}
                    </p>
                    <p className="text-[#666666] text-sm flex items-center gap-2" style={{ fontFamily: 'Georgia, Times New Roman, serif' }}>
                      {(dataset.size / 1024).toFixed(2)} KB
                      {dataset.rows && <span>• {dataset.rows.toLocaleString()} rows</span>}
                      {dataset.source && <span>• {dataset.source}</span>}
                    </p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
