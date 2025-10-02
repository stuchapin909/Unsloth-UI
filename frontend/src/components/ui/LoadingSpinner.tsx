import { colors } from '../../utils/theme'

interface LoadingSpinnerProps {
  message?: string
}

export default function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: colors.gray[500] }}>
      <div
        style={{
          width: '40px',
          height: '40px',
          border: `4px solid ${colors.black}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 15px'
        }}
      />
      <p>{message}</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
