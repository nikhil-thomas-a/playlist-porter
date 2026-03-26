'use client'

interface Props {
  active?: boolean
}

export default function TransferArrow({ active }: Props) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      padding: '0 8px',
    }}>
      {/* Animated dots */}
      {active ? (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--accent)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      ) : (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M4 14h20M16 7l7 7-7 7"
            stroke="var(--text-dim)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {active && (
        <span style={{
          fontSize: '0.62rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          live
        </span>
      )}
    </div>
  )
}
