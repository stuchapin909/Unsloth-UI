/**
 * Utility functions for formatting data
 */

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleString()
}

export function formatDuration(start: string, end: string | null): string {
  if (!end) return 'Running...'
  const duration = new Date(end).getTime() - new Date(start).getTime()
  const minutes = Math.floor(duration / 60000)
  const seconds = Math.floor((duration % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#1a1a1a'
    case 'running': return '#666'
    case 'failed': return '#888'
    default: return '#aaa'
  }
}

export function getStatusSymbol(status: string): string {
  switch (status) {
    case 'completed': return '✓'
    case 'running': return '⟳'
    case 'failed': return '✗'
    default: return '?'
  }
}
