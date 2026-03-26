'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Platform, Playlist, TransferJob } from '@/types'
import PlatformCard from '@/components/PlatformCard'
import PlaylistSelector from '@/components/PlaylistSelector'
import TransferProgress from '@/components/TransferProgress'
import TransferArrow from '@/components/TransferArrow'

declare global {
  interface Window {
    MusicKit: any
  }
}

const ALL_PLATFORMS: Platform[] = ['spotify', 'youtube', 'apple']

const PLATFORM_NAMES: Record<Platform, string> = {
  spotify: 'Spotify',
  youtube: 'YouTube Music',
  apple: 'Apple Music',
}

const PLATFORM_COLORS: Record<Platform, string> = {
  spotify: 'var(--spotify)',
  youtube: 'var(--youtube)',
  apple: 'var(--apple)',
}

export default function HomePage() {
  const { data: session } = useSession()

  // Connections
  const [appleConnected, setAppleConnected] = useState(false)
  const [appleUserToken, setAppleUserToken] = useState<string | null>(null)
  const [appleName, setAppleName] = useState<string>()

  // Transfer state
  const [sourcePlatform, setSourcePlatform] = useState<Platform | null>(null)
  const [targetPlatform, setTargetPlatform] = useState<Platform | null>(null)
  const [sourcePlaylists, setSourcePlaylists] = useState<Playlist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [transferJob, setTransferJob] = useState<TransferJob | null>(null)
  const [transferring, setTransferring] = useState(false)

  // ── MusicKit JS (Apple Music) ──────────────────────────────────────────────
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
    script.async = true
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const connectApple = useCallback(async () => {
    try {
      const res = await fetch('/api/apple/developer-token')
      const { token: devToken } = await res.json()

      await window.MusicKit.configure({
        developerToken: devToken,
        app: { name: 'Playlist Porter', build: '1.0' },
      })

      const music = window.MusicKit.getInstance()
      const userToken = await music.authorize()
      setAppleUserToken(userToken)
      setAppleConnected(true)

      // Try to get user name
      try {
        const profile = await music.api.music('/v1/me/account')
        setAppleName(profile?.data?.attributes?.name)
      } catch {}
    } catch (err) {
      console.error('Apple Music auth failed', err)
    }
  }, [])

  const disconnectApple = useCallback(async () => {
    try {
      const music = window.MusicKit.getInstance()
      await music.unauthorize()
    } catch {}
    setAppleConnected(false)
    setAppleUserToken(null)
    setAppleName(undefined)
  }, [])

  // ── Determine connected state ─────────────────────────────────────────────
  const sessionPlatform = session?.provider === 'google' ? 'youtube' : session?.provider as Platform | undefined
  const isConnected = (p: Platform) => {
    if (p === 'apple') return appleConnected
    return sessionPlatform === p
  }
  const getDisplayName = (p: Platform) => {
    if (p === 'apple') return appleName
    if (sessionPlatform === p) return session?.user?.name ?? undefined
    return undefined
  }

  // ── Load playlists when source selected ───────────────────────────────────
  useEffect(() => {
    if (!sourcePlatform) return
    if (!isConnected(sourcePlatform)) return

    setLoadingPlaylists(true)
    setSourcePlaylists([])
    setSelectedPlaylist(null)

    const params = new URLSearchParams({ platform: sourcePlatform })
    if (sourcePlatform === 'apple' && appleUserToken) {
      params.set('appleUserToken', appleUserToken)
    }

    fetch(`/api/playlists?${params}`)
      .then(r => r.json())
      .then(data => setSourcePlaylists(data.playlists ?? []))
      .catch(console.error)
      .finally(() => setLoadingPlaylists(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcePlatform])

  // ── Start transfer ─────────────────────────────────────────────────────────
  const startTransfer = async () => {
    if (!sourcePlatform || !targetPlatform || !selectedPlaylist) return

    const job: TransferJob = {
      id: Date.now().toString(),
      sourcePlatform,
      targetPlatform,
      sourcePlaylist: selectedPlaylist,
      status: 'fetching',
      progress: 0,
      matched: 0,
      unmatched: 0,
      total: 0,
      createdAt: new Date().toISOString(),
    }
    setTransferJob(job)
    setTransferring(true)

    const body = {
      sourcePlatform,
      targetPlatform,
      playlistId: selectedPlaylist.id,
      playlistName: selectedPlaylist.name,
      appleUserToken: appleUserToken ?? undefined,
    }

    const res = await fetch('/api/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.body) return

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''

      for (const chunk of lines) {
        const eventLine = chunk.split('\n').find(l => l.startsWith('event:'))
        const dataLine = chunk.split('\n').find(l => l.startsWith('data:'))
        if (!dataLine) continue

        const eventType = eventLine?.replace('event: ', '').trim()
        const data = JSON.parse(dataLine.replace('data: ', ''))

        setTransferJob(prev => {
          if (!prev) return prev
          if (eventType === 'done') {
            return { ...prev, status: 'done', progress: 100, ...data }
          }
          if (eventType === 'error') {
            return { ...prev, status: 'error', error: data.message }
          }
          return {
            ...prev,
            status: data.stage ?? prev.status,
            progress: data.percent ?? prev.progress,
            matched: data.matched ?? prev.matched,
            unmatched: data.unmatched ?? prev.unmatched,
            total: data.total ?? prev.total,
          }
        })
      }
    }

    setTransferring(false)
  }

  const canTransfer = sourcePlatform && targetPlatform
    && sourcePlatform !== targetPlatform
    && selectedPlaylist
    && isConnected(sourcePlatform)
    && isConnected(targetPlatform)
    && !transferring

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>

      {/* Background gradient blobs */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #1db95412 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          right: '-10%',
          width: '700px',
          height: '700px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #e8c54710 0%, transparent 70%)',
        }} />
      </div>

      <div style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '48px 24px 80px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── HERO ── */}
        <header style={{ marginBottom: '64px', animation: 'fadeUp 0.6s ease both' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)22',
            borderRadius: '999px',
            padding: '4px 14px',
            marginBottom: '24px',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent)',
            }} />
            <span style={{
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Open Source · Free to Use
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: '16px',
          }}>
            Move your music,{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent), #f5a623)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              anywhere.
            </span>
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            lineHeight: 1.7,
          }}>
            Transfer playlists between Spotify, YouTube Music, and Apple Music.
            No account required on our end — your tokens stay in your browser.
          </p>

          {/* Platform badges */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '28px', flexWrap: 'wrap' }}>
            {(['spotify', 'youtube', 'apple'] as Platform[]).map(p => (
              <div key={p} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '5px 12px',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}>
                <div style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: PLATFORM_COLORS[p],
                }} />
                {PLATFORM_NAMES[p]}
              </div>
            ))}
          </div>
        </header>

        {/* ── STEP 1: CONNECT ── */}
        <section style={{ marginBottom: '48px', animation: 'fadeUp 0.6s ease 0.1s both' }}>
          <SectionLabel number="01" label="Connect your accounts" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ALL_PLATFORMS.map(p => (
              <PlatformCard
                key={p}
                platform={p}
                connected={isConnected(p)}
                displayName={getDisplayName(p)}
                onAppleConnect={connectApple}
                onAppleDisconnect={disconnectApple}
              />
            ))}
          </div>
          <p style={{
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            marginTop: '12px',
            lineHeight: 1.6,
          }}>
            ℹ You need to connect both source and destination platforms to transfer.
            Tokens are never stored on our server.
          </p>
        </section>

        {/* ── STEP 2: PICK DIRECTION ── */}
        <section style={{ marginBottom: '48px', animation: 'fadeUp 0.6s ease 0.2s both' }}>
          <SectionLabel number="02" label="Choose direction" />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {/* Source picker */}
            <PlatformPicker
              label="From"
              value={sourcePlatform}
              onChange={v => {
                setSourcePlatform(v)
                setSelectedPlaylist(null)
                if (v === targetPlatform) setTargetPlatform(null)
              }}
              exclude={targetPlatform ? [targetPlatform] : []}
              connectedOnly
              isConnected={isConnected}
            />

            <TransferArrow active={transferring} />

            {/* Target picker */}
            <PlatformPicker
              label="To"
              value={targetPlatform}
              onChange={setTargetPlatform}
              exclude={sourcePlatform ? [sourcePlatform] : []}
              connectedOnly
              isConnected={isConnected}
            />
          </div>
        </section>

        {/* ── STEP 3: PICK PLAYLIST ── */}
        {sourcePlatform && isConnected(sourcePlatform) && (
          <section style={{ marginBottom: '48px', animation: 'fadeUp 0.5s ease both' }}>
            <SectionLabel number="03" label="Select a playlist" />
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px',
            }}>
              <PlaylistSelector
                playlists={sourcePlaylists}
                platform={sourcePlatform}
                selected={selectedPlaylist}
                onSelect={setSelectedPlaylist}
                loading={loadingPlaylists}
              />
            </div>
          </section>
        )}

        {/* ── STEP 4: TRANSFER ── */}
        {selectedPlaylist && targetPlatform && (
          <section style={{ marginBottom: '48px', animation: 'fadeUp 0.5s ease both' }}>
            <SectionLabel number="04" label="Transfer" />

            {/* Summary card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '20px 24px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  Ready to transfer
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
                  {selectedPlaylist.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  {selectedPlaylist.trackCount} tracks ·{' '}
                  <span style={{ color: PLATFORM_COLORS[sourcePlatform!] }}>{PLATFORM_NAMES[sourcePlatform!]}</span>
                  {' → '}
                  <span style={{ color: PLATFORM_COLORS[targetPlatform] }}>{PLATFORM_NAMES[targetPlatform]}</span>
                </div>
              </div>

              <button
                onClick={startTransfer}
                disabled={!canTransfer}
                style={{
                  background: canTransfer ? 'var(--accent)' : 'var(--surface-2)',
                  color: canTransfer ? '#000' : 'var(--text-dim)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 28px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  cursor: canTransfer ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.02em',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {transferring ? (
                  <>
                    <span style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid #00000040',
                      borderTopColor: '#000',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Transferring…
                  </>
                ) : '→ Start Transfer'}
              </button>
            </div>

            {/* Progress */}
            {transferJob && <TransferProgress job={transferJob} />}
          </section>
        )}

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          color: 'var(--text-dim)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
        }}>
          <span>Playlist Porter — MIT License</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-dim)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.7rem',
        color: 'var(--accent)',
        letterSpacing: '0.1em',
        background: 'var(--accent-dim)',
        padding: '2px 8px',
        borderRadius: '4px',
      }}>
        {number}
      </span>
      <span style={{
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        {label}
      </span>
    </div>
  )
}

function PlatformPicker({
  label,
  value,
  onChange,
  exclude,
  connectedOnly,
  isConnected,
}: {
  label: string
  value: Platform | null
  onChange: (p: Platform) => void
  exclude: Platform[]
  connectedOnly?: boolean
  isConnected: (p: Platform) => boolean
}) {
  const options = ALL_PLATFORMS.filter(p => !exclude.includes(p))

  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: '0.68rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {options.map(p => {
          const connected = isConnected(p)
          const isSelected = value === p
          const disabled = connectedOnly && !connected

          return (
            <button
              key={p}
              onClick={() => !disabled && onChange(p)}
              disabled={disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: isSelected ? `${PLATFORM_COLORS[p]}18` : 'var(--surface)',
                border: `1px solid ${isSelected ? PLATFORM_COLORS[p] + '66' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: connected ? PLATFORM_COLORS[p] : 'var(--text-dim)',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: '0.85rem',
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? PLATFORM_COLORS[p] : 'var(--text)',
              }}>
                {PLATFORM_NAMES[p]}
              </span>
              {!connected && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-dim)',
                }}>
                  not connected
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
