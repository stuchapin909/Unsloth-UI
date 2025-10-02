import type { CSSProperties, ReactNode } from 'react'
import { colors, shadows, borders } from '../../utils/theme'

interface CardProps {
  children: ReactNode
  padding?: string
  onClick?: () => void
  selected?: boolean
  style?: CSSProperties
}

export default function Card({ children, padding = '20px', onClick, selected, style }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding,
        background: selected ? colors.gray[100] : colors.white,
        border: borders.standard,
        boxShadow: shadows.md,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        ...style
      }}
    >
      {children}
    </div>
  )
}
