import type { CSSProperties, ReactNode } from 'react'
import { colors, shadows, borders, fonts } from '../../utils/theme'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
  style?: CSSProperties
}

export default function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  fullWidth,
  style
}: ButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '12px 20px',
        width: fullWidth ? '100%' : 'auto',
        background: disabled ? colors.gray[400] : isPrimary ? colors.black : colors.white,
        color: isPrimary ? colors.offWhite : colors.black,
        border: borders.standard,
        boxShadow: shadows.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: fonts.primary,
        fontSize: '1em',
        fontWeight: 'bold',
        transition: 'all 0.2s',
        ...style
      }}
    >
      {children}
    </button>
  )
}
