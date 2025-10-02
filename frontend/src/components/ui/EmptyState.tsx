import type { ReactNode } from 'react'
import Card from './Card'
import { colors } from '../../utils/theme'

interface EmptyStateProps {
  message: string | ReactNode
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <Card padding="40px" style={{ textAlign: 'center' }}>
      <p style={{ color: colors.gray[500], margin: 0 }}>
        {message}
      </p>
    </Card>
  )
}
