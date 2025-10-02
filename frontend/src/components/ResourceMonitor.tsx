import { useResources } from '../hooks/useResources'
import Card from './ui/Card'
import { fonts } from '../utils/theme'

function ProgressBar({ percent, label, color = '#1a1a1a' }: { percent: number; label: string; color?: string }) {
  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9em' }}>
        <span>{label}</span>
        <span style={{ fontWeight: 'bold' }}>{percent.toFixed(1)}%</span>
      </div>
      <div style={{
        width: '100%',
        height: '20px',
        background: '#f5f5f0',
        border: '2px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: color,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  )
}

function MiniChart({ data, max = 100 }: { data: number[]; max?: number }) {
  if (data.length < 2) return null

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - (value / max) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width="100%" height="60" style={{ marginTop: '10px' }}>
      <polyline
        points={points}
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2"
      />
      <line x1="0" y1="100%" x2="100%" y2="100%" stroke="#ddd" strokeWidth="1" />
      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#ddd" strokeWidth="1" strokeDasharray="2,2" />
    </svg>
  )
}

export default function ResourceMonitor() {
  const { resources, history, error } = useResources()

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Card style={{ color: '#666' }}>
          Error: {error}
        </Card>
      </div>
    )
  }

  if (!resources) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading resource data...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ fontFamily: fonts.primary, marginBottom: '20px' }}>System Resources</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* CPU */}
        <Card>
          <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>
            CPU ({resources.cpu.count} cores)
          </h3>
          <ProgressBar percent={resources.cpu.percent} label="Usage" color="#1a1a1a" />
          <MiniChart data={history.map(h => h.cpu.percent)} />
        </Card>

        {/* Memory */}
        <Card>
          <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>
            Memory
          </h3>
          <ProgressBar percent={resources.memory.percent} label="Usage" color="#333" />
          <div style={{ fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
            {resources.memory.used_gb.toFixed(1)} GB / {resources.memory.total_gb.toFixed(1)} GB
          </div>
          <MiniChart data={history.map(h => h.memory.percent)} />
        </Card>

        {/* Disk */}
        <Card>
          <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>
            Disk (Work Directory)
          </h3>
          <ProgressBar percent={resources.disk.percent} label="Usage" color="#555" />
          <div style={{ fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
            {resources.disk.free_gb.toFixed(1)} GB free / {resources.disk.total_gb.toFixed(1)} GB total
          </div>
        </Card>

        {/* GPU */}
        {resources.gpu.available ? (
          <Card style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontFamily: fonts.primary, marginBottom: '15px' }}>
              GPU: {resources.gpu.name}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                  Utilization
                </div>
                <ProgressBar percent={resources.gpu.utilization_percent || 0} label="" color="#1a1a1a" />
                <MiniChart data={history.map(h => h.gpu.utilization_percent || 0)} />
              </div>

              <div>
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                  Memory
                </div>
                <ProgressBar
                  percent={((resources.gpu.memory_used_mb || 0) / (resources.gpu.memory_total_mb || 1)) * 100}
                  label=""
                  color="#333"
                />
                <div style={{ fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
                  {(resources.gpu.memory_used_mb || 0).toFixed(0)} MB / {(resources.gpu.memory_total_mb || 0).toFixed(0)} MB
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                  Temperature
                </div>
                <ProgressBar percent={(resources.gpu.temperature_c || 0) / 100 * 100} label="" color="#555" />
                <div style={{ fontSize: '0.85em', color: '#666', marginTop: '10px' }}>
                  {resources.gpu.temperature_c}°C
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ textAlign: 'center', color: '#666' }}>
            <p>No GPU detected or Docker container not running</p>
          </Card>
        )}
      </div>

      <Card style={{ marginTop: '20px', fontSize: '0.85em', color: '#666', background: '#f5f5f0' }}>
        <strong>Note:</strong> Resource monitoring updates every 2 seconds. GPU metrics require a running Docker container with GPU access.
      </Card>
    </div>
  )
}
