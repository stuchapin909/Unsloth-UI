import { useState, useRef } from 'react'
import { uploadDataset, listDatasets } from '../api/training'

export default function DatasetUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [datasets, setDatasets] = useState<any[]>([])
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

  useState(() => {
    loadDatasets()
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Upload Dataset</h2>
        <p className="text-gray-400 text-sm">
          Upload your training dataset in JSON, JSONL, or CSV format
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer transform ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10 scale-[1.02] shadow-lg shadow-purple-500/20'
            : 'border-slate-600 hover:border-purple-400 hover:bg-slate-700/30'
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
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white font-medium">Uploading...</p>
          </div>
        ) : uploadedFile ? (
          <div className="space-y-3">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400 font-medium">Uploaded: {uploadedFile}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg transform hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-xl">
                Drop your dataset here
              </p>
              <p className="text-gray-400 text-sm mt-2">
                or click to browse files
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-300 text-xs font-medium">
                Supports: .json, .jsonl, .csv
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Datasets List */}
      {datasets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Uploaded Datasets
          </h3>
          <div className="space-y-2">
            {datasets.map((dataset, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-slate-700/50 hover:bg-slate-700 rounded-lg p-4 border border-slate-600/50 hover:border-purple-500/50 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold group-hover:text-purple-300 transition-colors">{dataset.name}</p>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      {(dataset.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
