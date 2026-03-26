'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Platform, Playlist, TransferJob } from '@/types'
import Image from 'next/image'

// ─── Platform config ─────────────────────────────────────────────────────────

const PLATFORMS: Record<Platform, { name: string; color: string; bg: string; provider: string; icon: JSX.Element }> = {
  spotify: {
    name: 'Spotify', color: '#1db954', bg: '#0d2b18', provider: 'spotify',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>,
  },
  youtube: {
    name: 'YouTube Music', color: '#ff4444', bg: '#2b0d0d', provider: 'google',
    icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  },
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid #e8c54722', borderRadius: '4px', padding: '2px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
      {children}
    </span>
  )
}

function StepLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
      <Tag>{n}</Tag>
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>{label}</span>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', ...style }}>
      {children}
    </div>
  )
}

function Btn({ onClick, disabled, children, variant = 'primary' }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; variant?: 'primary' | 'ghost'
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: variant === 'primary' ? (disabled ? 'var(--surface-2)' : 'var(--accent)') : 'transparent',
      color: variant === 'primary' ? (disabled ? 'var(--text-dim)' : '#000') : 'var(--text-secondary)',
      border: variant === 'ghost' ? '1px solid var(--border)' : 'none',
      borderRadius: 'var(--radius-sm)', padding: variant === 'primary' ? '10px 22px' : '8px 14px',
      fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-display)',
      cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.02em', transition: 'all 0.15s ease',
      display: 'inline-flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' as const,
    }}>
      {children}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session } = useSession()

  // Which platform the current session belongs to
  const sessionPlatform: Platform | null =
    session?.provider === 'google' ? 'youtube' :
    session?.provider === 'spotify' ? 'spotify' : null

  // Two independent connection slots
  const [slots, setSlots] = useState<Partial<Record<Platform, string>>>({}) // platform → displayName
  const [source, setSource] = useState<Platform | null>(null)
  const [target, setTarget] = useState<Platform | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loadingPL, setLoadingPL] = useState(false)
  const [selected, setSelected] = useState<Playlist | null>(null)
  const [search, setSearch] = useState('')
  const [job, setJob] = useState<TransferJob | null>(null)
  const [running, setRunning] = useState(false)

  // Sync session into slots
  useEffect(() => {
    if (sessionPlatform && session?.user?.name) {
      setSlots(prev => ({ ...prev, [sessionPlatform]: session.user!.name! }))
    }
  }, [sessionPlatform, session])

  // Fetch playlists when source is set and connected
  useEffect(() => {
    if (!source || !slots[source]) return
    if (sessionPlatform !== source) return
    setLoadingPL(true); setPlaylists([]); setSelected(null)
    fetch(`/api/playlists?platform=${source}`)
      .then(r => r.json()).then(d => setPlaylists(d.playlists ?? []))
      .catch(console.error).finally(() => setLoadingPL(false))
  }, [source, slots, sessionPlatform])

  // ── Transfer ────────────────────────────────────────────────────────────────
  async function startTransfer() {
    if (!source || !target || !selected) return
    const j: TransferJob = {
      id: Date.now().toString(), sourcePlatform: source, targetPlatform: target,
      sourcePlaylist: selected, status: 'fetching', progress: 0,
      matched: 0, unmatched: 0, total: 0, createdAt: new Date().toISOString(),
    }
    setJob(j); setRunning(true)

    const res = await fetch('/api/transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourcePlatform: source, targetPlatform: target, playlistId: selected.id, playlistName: selected.name }),
    })

    const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = ''
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      buf += dec.decode(value, { stream: true })
      const chunks = buf.split('\n\n'); buf = chunks.pop() ?? ''
      for (const chunk of chunks) {
        const evLine = chunk.split('\n').find(l => l.startsWith('event:'))
        const dataLine = chunk.split('\n').find(l => l.startsWith('data:'))
        if (!dataLine) continue
        const ev = evLine?.replace('event: ', '').trim()
        const data = JSON.parse(dataLine.replace('data: ', ''))
        setJob(prev => !prev ? prev : ev === 'done'
          ? { ...prev, status: 'done', progress: 100, ...data }
          : ev === 'error' ? { ...prev, status: 'error', error: data.message }
          : { ...prev, status: data.stage ?? prev.status, progress: data.percent ?? prev.progress, matched: data.matched ?? prev.matched, unmatched: data.unmatched ?? prev.unmatched, total: data.total ?? prev.total })
      }
    }
    setRunning(false)
  }

  const connectedPlatforms = Object.keys(slots) as Platform[]
  const canTransfer = source && target && source !== target && selected && slots[source] && slots[target] && !running

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      {/* Blobs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #1db95410 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, #e8c54708 0%, transparent 70%)' }} />
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 20px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── Hero ── */}
        <header className="anim-up" style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Open Source · Free</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 14 }}>
            Move your music,{' '}
            <span style={{ background: 'linear-gradient(135deg, #e8c547, #f5a623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>anywhere.</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.75 }}>
            Transfer playlists between Spotify and YouTube Music. No data stored — your tokens live only in your browser session.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
            {(['spotify', 'youtube'] as Platform[]).map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: PLATFORMS[p].color }} />
                {PLATFORMS[p].name}
              </div>
            ))}
          </div>
        </header>

        {/* ── Step 1: Connect ── */}
        <section className="anim-up-2" style={{ marginBottom: 40 }}>
          <StepLabel n="01" label="Connect your accounts" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['spotify', 'youtube'] as Platform[]).map(p => {
              const connected = !!slots[p]
              const meta = PLATFORMS[p]
              const isCurrentSession = sessionPlatform === p
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 14, background: connected ? meta.bg : 'var(--surface)', border: `1px solid ${connected ? meta.color + '44' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '16px 20px', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
                  {connected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: meta.color }} />}
                  <span style={{ color: connected ? meta.color : 'var(--text-dim)' }}>{meta.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{meta.name}</div>
                    <div style={{ fontSize: '0.72rem', color: connected ? 'var(--text-secondary)' : 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {connected ? (slots[p] ?? 'Connected') : 'Not connected'}
                    </div>
                  </div>
                  {connected
                    ? <Btn variant="ghost" onClick={() => { setSlots(prev => { const n = { ...prev }; delete n[p]; return n }); if (isCurrentSession) signOut() }}>Disconnect</Btn>
                    : <Btn onClick={() => signIn(meta.provider)} variant="primary">{`Connect`}</Btn>
                  }
                </div>
              )
            })}
          </div>
          <p style={{ marginTop: 10, fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
            ℹ You can only be signed in to one platform at a time. To connect both, connect one → switch account → connect the other. Both connections persist in this session.
          </p>
        </section>

        {/* ── Step 2: Direction ── */}
        <section className="anim-up-3" style={{ marginBottom: 40 }}>
          <StepLabel n="02" label="Choose direction" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
            <PlatformPicker label="From" value={source} onChange={v => { setSource(v); setSelected(null); if (v === target) setTarget(null) }} exclude={target ? [target] : []} connectedSlots={slots} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {running
                ? [0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />)
                : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M13 6l6 6-6 6" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              }
            </div>
            <PlatformPicker label="To" value={target} onChange={setTarget} exclude={source ? [source] : []} connectedSlots={slots} />
          </div>
        </section>

        {/* ── Step 3: Select playlist ── */}
        {source && slots[source] && sessionPlatform === source && (
          <section style={{ marginBottom: 40, animation: 'fadeUp 0.45s ease both' }}>
            <StepLabel n="03" label="Select a playlist" />
            <Card>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playlists…" style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 13px', color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: '0.85rem', outline: 'none', marginBottom: 12 }} />
              <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {loadingPL
                  ? [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 58, animationDelay: `${i * 0.08}s` }} />)
                  : playlists.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(pl => {
                      const isSel = selected?.id === pl.id
                      const c = PLATFORMS[source].color
                      return (
                        <button key={pl.id} onClick={() => setSelected(pl)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: isSel ? c + '18' : 'transparent', border: `1px solid ${isSel ? c + '55' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', width: '100%' }}>
                          <div style={{ width: 42, height: 42, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                            {pl.image ? <Image src={pl.image} alt={pl.name} width={42} height={42} style={{ objectFit: 'cover' }} unoptimized /> : '♪'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSel ? c : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{pl.trackCount} tracks{pl.owner ? ` · ${pl.owner}` : ''}</div>
                          </div>
                          {isSel && <div style={{ width: 18, height: 18, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                        </button>
                      )
                    })
                }
              </div>
            </Card>
          </section>
        )}

        {/* ── Step 4: Transfer ── */}
        {selected && target && (
          <section style={{ marginBottom: 40, animation: 'fadeUp 0.45s ease both' }}>
            <StepLabel n="04" label="Transfer" />
            <Card style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>Ready to transfer</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                  {selected.trackCount} tracks · <span style={{ color: PLATFORMS[source!].color }}>{PLATFORMS[source!].name}</span> → <span style={{ color: PLATFORMS[target].color }}>{PLATFORMS[target].name}</span>
                </div>
              </div>
              <Btn onClick={startTransfer} disabled={!canTransfer}>
                {running
                  ? <><span style={{ width: 13, height: 13, border: '2px solid #00000040', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Transferring…</>
                  : '→ Start Transfer'
                }
              </Btn>
            </Card>

            {job && <ProgressCard job={job} />}
          </section>
        )}

        {/* ── Footer ── */}
        <footer style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, color: 'var(--text-dim)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
          <span>Playlist Porter · MIT License</span>
          <a href="https://github.com/nikhil-thomas-a/playlist-porter" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
            View on GitHub
          </a>
        </footer>
      </div>
    </div>
  )
}

// ─── Platform picker ──────────────────────────────────────────────────────────

function PlatformPicker({ label, value, onChange, exclude, connectedSlots }: {
  label: string; value: Platform | null; onChange: (p: Platform) => void
  exclude: Platform[]; connectedSlots: Partial<Record<Platform, string>>
}) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(['spotify', 'youtube'] as Platform[]).filter(p => !exclude.includes(p)).map(p => {
          const connected = !!connectedSlots[p]
          const isSel = value === p
          const c = PLATFORMS[p].color
          return (
            <button key={p} onClick={() => connected && onChange(p)} disabled={!connected} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: isSel ? c + '18' : 'var(--surface)', border: `1px solid ${isSel ? c + '66' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', cursor: connected ? 'pointer' : 'not-allowed', opacity: connected ? 1 : 0.35, width: '100%', textAlign: 'left', transition: 'all 0.12s' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? c : 'var(--text-dim)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: isSel ? 700 : 500, color: isSel ? c : 'var(--text)', flex: 1 }}>{PLATFORMS[p].name}</span>
              {!connected && <span style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>not connected</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Progress card ────────────────────────────────────────────────────────────

function ProgressCard({ job }: { job: TransferJob }) {
  const isDone = job.status === 'done'
  const isErr = job.status === 'error'
  const isActive = !isDone && !isErr && job.status !== 'idle'
  const matchRate = job.total > 0 ? Math.round((job.matched / job.total) * 100) : 0

  const stages: Record<string, string> = { fetching: 'Fetching tracks', matching: 'Matching tracks', writing: 'Writing playlist', done: 'Complete ✓', error: 'Error' }

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${isErr ? '#ff444433' : isDone ? '#1db95433' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: isErr ? '#ff4444' : isDone ? '#1db954' : 'var(--accent)', flexShrink: 0, ...(isActive ? { animation: 'pulse 1.4s ease-in-out infinite' } : {}) }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{stages[job.status] ?? job.status}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{job.sourcePlaylist.name}</div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: isDone ? '#1db954' : isErr ? '#ff4444' : 'var(--accent)' }}>{job.progress}%</span>
      </div>

      <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${job.progress}%`, background: isErr ? '#ff4444' : isDone ? 'linear-gradient(90deg,#1db954,#1ed760)' : 'linear-gradient(90deg,var(--accent),#f5d76e)', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>

      {job.total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[{ label: 'Total', val: job.total, c: 'var(--text)' }, { label: 'Matched', val: job.matched, c: '#1db954' }, { label: 'Not found', val: job.unmatched, c: job.unmatched > 0 ? '#f59e0b' : 'var(--text-dim)' }].map(s => (
            <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {isDone && (
        <div style={{ background: matchRate >= 90 ? '#0d2b18' : '#2b1500', border: `1px solid ${matchRate >= 90 ? '#1db95444' : '#f59e0b44'}`, borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: matchRate >= 90 ? '#1db954' : '#f59e0b' }}>
          {matchRate >= 90 ? `✓ ${matchRate}% match rate — great transfer!` : `⚠ ${matchRate}% match rate — ${job.unmatched} tracks not found (likely region-locked or unavailable on target platform)`}
        </div>
      )}

      {isErr && <div style={{ background: '#2b0d0d', border: '1px solid #ff444433', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#ff8888' }}>Error: {job.error}</div>}
    </div>
  )
}
