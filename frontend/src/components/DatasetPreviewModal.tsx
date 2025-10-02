import Modal from './ui/Modal'

interface DatasetPreview {
  valid: boolean
  errors: string[]
  warnings: string[]
  stats: {
    row_count: number
    avg_text_length: number
    min_text_length: number
    max_text_length: number
    text_field: string
  }
  preview: Record<string, unknown>[]
}

interface DatasetPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  datasetName: string
  previewData: DatasetPreview | null
  loading: boolean
}

export default function DatasetPreviewModal({
  isOpen,
  onClose,
  datasetName,
  previewData,
  loading
}: DatasetPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dataset Preview: ${datasetName}`}>
      {loading ? (
        <p>Loading preview...</p>
      ) : previewData ? (
        <>
          {/* Validation Status */}
          <div style={{
            padding: '15px',
            background: previewData.valid ? '#f5f5f0' : '#ffe0e0',
            border: '2px solid #1a1a1a',
            marginBottom: '20px'
          }}>
            <strong>{previewData.valid ? '✓ Valid Dataset' : '✗ Invalid Dataset'}</strong>
            {previewData.errors.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong>Errors:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {previewData.errors.map((err, i) => (
                    <li key={i} style={{ color: '#666' }}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {previewData.warnings.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <strong>Warnings:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {previewData.warnings.map((warn, i) => (
                    <li key={i} style={{ color: '#666' }}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Statistics */}
          {previewData.stats && (
            <div style={{
              padding: '15px',
              background: '#f5f5f0',
              border: '2px solid #1a1a1a',
              marginBottom: '20px'
            }}>
              <strong>Statistics</strong>
              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em' }}>
                <div><strong>Rows:</strong> {previewData.stats.row_count.toLocaleString()}</div>
                <div><strong>Text Field:</strong> {previewData.stats.text_field}</div>
                <div><strong>Avg Length:</strong> {previewData.stats.avg_text_length.toFixed(0)} chars</div>
                <div><strong>Min Length:</strong> {previewData.stats.min_text_length} chars</div>
                <div><strong>Max Length:</strong> {previewData.stats.max_text_length} chars</div>
              </div>
            </div>
          )}

          {/* Sample Data */}
          {previewData.preview && previewData.preview.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: '10px' }}>
                Sample Data (first {previewData.preview.length} rows)
              </strong>
              <div style={{
                maxHeight: '400px',
                overflow: 'auto',
                border: '2px solid #1a1a1a',
                background: '#ffffff'
              }}>
                {previewData.preview.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '15px',
                      borderBottom: i < previewData.preview.length - 1 ? '1px solid #ddd' : 'none'
                    }}
                  >
                    <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>
                      Row {i + 1}
                    </div>
                    <pre style={{
                      fontSize: '0.85em',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                      margin: 0
                    }}>
                      {JSON.stringify(row, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </Modal>
  )
}
