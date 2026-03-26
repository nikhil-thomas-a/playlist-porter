'use client'
import { signIn, signOut } from 'next-auth/react'
import { Platform } from '@/types'

interface Props {
  platform: Platform
  connected: boolean
  displayName?: string
  avatar?: string
  onAppleConnect?: () => void
  onAppleDisconnect?: () => void
}

const PLATFORM_META = {
  spotify: {
    name: 'Spotify',
    color: 'var(--spotify)',
    bg: 'var(--spotify-bg)',
    provider: 'spotify',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  youtube: {
    name: 'YouTube Music',
    color: 'var(--youtube)',
    bg: 'var(--youtube-bg)',
    provider: 'google',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  apple: {
    name: 'Apple Music',
    color: 'var(--apple)',
    bg: 'var(--apple-bg)',
    provider: null, // handled via MusicKit JS
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.076-.537c-.542-.19-1.1-.192-1.72-.236-.258-.017-.741-.03-1.222-.03H5.298c-.48 0-.964.013-1.222.03-.618.044-1.178.046-1.72.236a5.018 5.018 0 0 0-1.076.537C.162 1.624-.583 2.624-.9 3.934A9.23 9.23 0 0 0-1.14 6.124c-.013.426-.013.872-.013 1.324v9.104c0 .452 0 .898.013 1.324a9.23 9.23 0 0 0 .24 2.19c.317 1.31 1.062 2.31 2.18 3.043a5.022 5.022 0 0 0 1.076.537c.542.19 1.1.192 1.72.236.258.017.741.03 1.222.03h12.836c.48 0 .964-.013 1.222-.03.618-.044 1.178-.046 1.72-.236a5.018 5.018 0 0 0 1.076-.537c1.118-.733 1.863-1.733 2.18-3.043a9.23 9.23 0 0 0 .24-2.19c.013-.426.013-.872.013-1.324V7.448c0-.452 0-.898-.013-1.324zM12.26 4.512l.613-.002.47.004c1.12.016 2.15.37 3.02 1.024a5.013 5.013 0 0 1 1.898 2.97 5.15 5.15 0 0 1 .063.535l-1.84.003a3.17 3.17 0 0 0-.037-.317 3.166 3.166 0 0 0-1.183-1.855 3.165 3.165 0 0 0-1.918-.64l-.35.003-.736-.001V4.512zm-2.498 11.453c0 2.072-1.672 3.753-3.734 3.753-2.063 0-3.735-1.68-3.735-3.753 0-2.073 1.672-3.754 3.735-3.754 2.062 0 3.734 1.681 3.734 3.754zm-3.734-1.84a1.84 1.84 0 1 0 0 3.68 1.84 1.84 0 0 0 0-3.68zm9.738 5.48h-1.872v-7.38h1.872v7.38zm3.38 0h-1.872V9.37h1.872v10.235z"/>
      </svg>
    ),
  },
} as const

export default function PlatformCard({
  platform,
  connected,
  displayName,
  onAppleConnect,
  onAppleDisconnect,
}: Props) {
  const meta = PLATFORM_META[platform]

  const handleConnect = () => {
    if (platform === 'apple') {
      onAppleConnect?.()
    } else {
      signIn(meta.provider!)
    }
  }

  const handleDisconnect = () => {
    if (platform === 'apple') {
      onAppleDisconnect?.()
    } else {
      signOut()
    }
  }

  return (
    <div
      style={{
        border: `1px solid ${connected ? meta.color + '44' : 'var(--border)'}`,
        background: connected ? meta.bg : 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Color accent bar */}
      {connected && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: meta.color,
        }} />
      )}

      {/* Icon */}
      <div style={{ color: connected ? meta.color : 'var(--text-dim)', flexShrink: 0 }}>
        {meta.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.02em' }}>
          {meta.name}
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: connected ? 'var(--text-secondary)' : 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
          marginTop: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {connected ? (displayName ?? 'Connected') : 'Not connected'}
        </div>
      </div>

      {/* Button */}
      <button
        onClick={connected ? handleDisconnect : handleConnect}
        style={{
          background: connected ? 'transparent' : meta.color,
          color: connected ? 'var(--text-secondary)' : '#000',
          border: connected ? '1px solid var(--border)' : 'none',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 14px',
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'var(--font-display)',
          cursor: 'pointer',
          letterSpacing: '0.04em',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  )
}
