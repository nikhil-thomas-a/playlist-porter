'use client'
import { useState } from 'react'
import Image from 'next/image'
import { Playlist, Platform } from '@/types'

const PLATFORM_COLORS = {
  spotify: 'var(--spotify)',
  youtube: 'var(--youtube)',
  apple: 'var(--apple)',
}

const PLATFORM_NAMES = {
  spotify: 'Spotify',
  youtube: 'YouTube Music',
  apple: 'Apple Music',
}

interface Props {
  playlists: Playlist[]
  platform: Platform
  selected: Playlist | null
  onSelect: (playlist: Playlist) => void
  loading?: boolean
}

export default function PlaylistSelector({ playlists, platform, selected, onSelect, loading }: Props) {
  const [search, setSearch] = useState('')

  const filtered = playlists.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: '64px',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (playlists.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: 'var(--text-dim)',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-mono)',
      }}>
        No playlists found on {PLATFORM_NAMES[platform]}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search */}
      <input
        type="text"
        placeholder="Search playlists…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          color: 'var(--text)',
          fontFamily: 'var(--font-display)',
          fontSize: '0.875rem',
          outline: 'none',
          width: '100%',
        }}
      />

      {/* List */}
      <div style={{
        maxHeight: '360px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        paddingRight: '4px',
      }}>
        {filtered.map(playlist => {
          const isSelected = selected?.id === playlist.id
          return (
            <button
              key={playlist.id}
              onClick={() => onSelect(playlist)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: isSelected ? `${PLATFORM_COLORS[platform]}18` : 'var(--surface)',
                border: `1px solid ${isSelected ? PLATFORM_COLORS[platform] + '55' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
            >
              {/* Artwork */}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0,
                background: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {playlist.image ? (
                  <Image
                    src={playlist.image}
                    alt={playlist.name}
                    width={44}
                    height={44}
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                ) : (
                  <div style={{ fontSize: '18px' }}>♪</div>
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: isSelected ? PLATFORM_COLORS[platform] : 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {playlist.name}
                </div>
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}>
                  {playlist.trackCount} tracks
                  {playlist.owner && ` · ${playlist.owner}`}
                </div>
              </div>

              {/* Check */}
              {isSelected && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: PLATFORM_COLORS[platform],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          )
        })}

        {filtered.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            color: 'var(--text-dim)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
          }}>
            No results for "{search}"
          </div>
        )}
      </div>
    </div>
  )
}
