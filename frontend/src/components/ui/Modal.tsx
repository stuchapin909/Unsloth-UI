import type { ReactNode } from 'react'
import { colors, shadows, borders, fonts } from '../../utils/theme'
import Button from './Button'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '800px' }: ModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: colors.white,
          border: borders.standard,
          boxShadow: shadows.lg,
          maxWidth,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          fontFamily: fonts.primary
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: borders.standard,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h3 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0 }}>
            {title}
          </h3>
          <Button onClick={onClose} variant="secondary" style={{ padding: '8px 15px' }}>
            Close
          </Button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
