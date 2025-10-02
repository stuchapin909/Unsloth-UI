import { useState } from 'react'
import { useTrainingHistory, useTrainingRun } from '../hooks/useTrainingHistory'
import { formatDate, formatDuration, getStatusColor, getStatusSymbol } from '../utils/formatters'
import Card from './ui/Card'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'
import LoadingSpinner from './ui/LoadingSpinner'
import { fonts } from '../utils/theme'

export default function TrainingHistory() {
  const { runs, loading } = useTrainingHistory()
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const { runDetails } = useTrainingRun(selectedRunId)

  if (loading) {
    return <LoadingSpinner message="Loading training history..." />
  }

  if (runs.length === 0) {
    return (
      <EmptyState message="No training runs yet. Start your first training to see history here." />
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontFamily: fonts.primary, marginBottom: '20px' }}>Training History</h2>

      <div style={{ display: 'grid', gridTemplateColumns: runDetails ? '1fr 1fr' : '1fr', gap: '20px' }}>
        {/* Runs List */}
        <div>
          <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>All Runs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {runs.map((run) => (
              <Card
                key={run.id}
                padding="15px"
                onClick={() => setSelectedRunId(run.id)}
                selected={runDetails?.run.id === run.id}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      <span style={{ color: getStatusColor(run.status), marginRight: '8px' }}>
                        {getStatusSymbol(run.status)}
                      </span>
                      {run.model_name}
                    </div>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      Base: {run.base_model.split('/').pop()}
                    </div>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      Dataset: {run.dataset_name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.85em', color: '#666' }}>
                    <div>{formatDate(run.started_at)}</div>
                    <div>{formatDuration(run.started_at, run.completed_at)}</div>
                    {run.final_loss && (
                      <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
                        Loss: {run.final_loss.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
                {run.error_message && (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    background: '#f5f5f0',
                    fontSize: '0.85em',
                    color: '#666'
                  }}>
                    Error: {run.error_message}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Run Details */}
        {runDetails && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontFamily: fonts.primary, margin: 0 }}>Run Details</h3>
              <Button onClick={() => setSelectedRunId(null)} variant="secondary" style={{ padding: '5px 10px' }}>
                Close
              </Button>
            </div>

            <Card style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9em' }}>
                <div><strong>Model:</strong> {runDetails.run.model_name}</div>
                <div><strong>Status:</strong> {runDetails.run.status}</div>
                <div><strong>Base Model:</strong> {runDetails.run.base_model}</div>
                <div><strong>Dataset:</strong> {runDetails.run.dataset_name}</div>
                <div><strong>Started:</strong> {formatDate(runDetails.run.started_at)}</div>
                <div><strong>Completed:</strong> {formatDate(runDetails.run.completed_at)}</div>
                {runDetails.run.final_loss && (
                  <div><strong>Final Loss:</strong> {runDetails.run.final_loss.toFixed(4)}</div>
                )}
              </div>
            </Card>

            {/* Loss Chart */}
            {runDetails.metrics.length > 0 && (
              <Card>
                <h4 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>Training Loss</h4>
                <div style={{ position: 'relative', height: '300px' }}>
                  <svg width="100%" height="100%" style={{ border: '1px solid #ddd' }}>
                    {(() => {
                      const metrics = runDetails.metrics
                      const maxLoss = Math.max(...metrics.map(m => m.loss))
                      const minLoss = Math.min(...metrics.map(m => m.loss))
                      const maxStep = Math.max(...metrics.map(m => m.step))

                      const points = metrics.map((m) => {
                        const x = (m.step / maxStep) * 95 + 2.5
                        const y = 95 - ((m.loss - minLoss) / (maxLoss - minLoss || 1)) * 90
                        return `${x},${y}`
                      }).join(' ')

                      return (
                        <>
                          <polyline
                            points={points}
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth="2"
                          />
                          {metrics.map((m) => {
                            const x = (m.step / maxStep) * 95 + 2.5
                            const y = 95 - ((m.loss - minLoss) / (maxLoss - minLoss || 1)) * 90
                            return (
                              <circle
                                key={m.step}
                                cx={`${x}%`}
                                cy={`${y}%`}
                                r="3"
                                fill="#1a1a1a"
                              />
                            )
                          })}
                          <text x="2%" y="5%" fontSize="12" fill="#666">
                            {maxLoss.toFixed(4)}
                          </text>
                          <text x="2%" y="98%" fontSize="12" fill="#666">
                            {minLoss.toFixed(4)}
                          </text>
                          <text x="50%" y="98%" fontSize="12" fill="#666" textAnchor="middle">
                            Step {maxStep}
                          </text>
                        </>
                      )
                    })()}
                  </svg>
                </div>

                {/* Metrics Table */}
                <div style={{ marginTop: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.85em', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #1a1a1a' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Step</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Loss</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runDetails.metrics.slice().reverse().map((metric) => (
                        <tr key={metric.step} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px' }}>{metric.step}</td>
                          <td style={{ padding: '8px' }}>{metric.loss.toFixed(4)}</td>
                          <td style={{ padding: '8px' }}>{formatDate(metric.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
