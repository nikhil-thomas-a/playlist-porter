'use client'
import { TransferJob } from '@/types'

const STAGE_LABELS: Record<string, string> = {
  idle: 'Ready',
  fetching: 'Fetching tracks',
  matching: 'Matching tracks',
  writing: 'Writing playlist',
  done: 'Complete',
  error: 'Error',
}

interface Props {
  job: TransferJob
}

export default function TransferProgress({ job }: Props) {
  const isError = job.status === 'error'
  const isDone = job.status === 'done'
  const isActive = !isError && !isDone && job.status !== 'idle'

  const matchRate = job.total > 0
    ? Math.round((job.matched / job.total) * 100)
    : 0

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isError ? '#ff444444' : isDone ? '#1db95444' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Status dot */}
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isError ? '#ff4444' : isDone ? 'var(--spotify)' : 'var(--accent)',
          boxShadow: isActive ? `0 0 8px var(--accent)` : 'none',
          flexShrink: 0,
          ...(isActive ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
        }} />

        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            {STAGE_LABELS[job.status] ?? job.status}
          </div>
          <div style={{
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            marginTop: '2px',
          }}>
            {job.sourcePlaylist.name} → {job.targetPlatform}
          </div>
        </div>

        {/* Percent badge */}
        <div style={{
          marginLeft: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: isDone ? 'var(--spotify)' : isError ? '#ff4444' : 'var(--accent)',
          fontWeight: 500,
        }}>
          {job.progress}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '4px',
        background: 'var(--surface-2)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${job.progress}%`,
          background: isError
            ? '#ff4444'
            : isDone
            ? 'linear-gradient(90deg, var(--spotify), #1ed760)'
            : 'linear-gradient(90deg, var(--accent), #f5d76e)',
          borderRadius: '2px',
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Stats row */}
      {job.total > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}>
          {[
            { label: 'Total', value: job.total, color: 'var(--text)' },
            { label: 'Matched', value: job.matched, color: 'var(--spotify)' },
            { label: 'Not found', value: job.unmatched, color: job.unmatched > 0 ? '#ff9944' : 'var(--text-dim)' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: stat.color,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: 'var(--text-dim)',
                fontFamily: 'var(--font-mono)',
                marginTop: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Match rate */}
      {isDone && job.total > 0 && (
        <div style={{
          background: matchRate >= 90 ? 'var(--spotify-bg)' : matchRate >= 70 ? '#2b1e00' : '#2b0d0d',
          border: `1px solid ${matchRate >= 90 ? 'var(--spotify)' : matchRate >= 70 ? '#f59e0b' : '#ff4444'}44`,
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          color: matchRate >= 90 ? 'var(--spotify)' : matchRate >= 70 ? '#f59e0b' : '#ff9944',
        }}>
          {matchRate >= 90
            ? `✓ Excellent match rate: ${matchRate}% of tracks transferred`
            : matchRate >= 70
            ? `⚠ Good match rate: ${matchRate}% transferred. ${job.unmatched} tracks not found (likely region-locked or unavailable)`
            : `✗ Low match rate: ${matchRate}% transferred. ${job.unmatched} tracks could not be found on target platform`
          }
        </div>
      )}

      {/* Error */}
      {isError && job.error && (
        <div style={{
          background: '#2b0d0d',
          border: '1px solid #ff444444',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          color: '#ff8888',
        }}>
          Error: {job.error}
        </div>
      )}
    </div>
  )
}
