export type Platform = 'spotify' | 'youtube' | 'apple'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration_ms?: number
  image?: string
  isrc?: string // International Standard Recording Code — used for cross-platform matching
}

export interface Playlist {
  id: string
  name: string
  description?: string
  image?: string
  trackCount: number
  platform: Platform
  tracks?: Track[]
  owner?: string
}

export interface TransferJob {
  id: string
  sourcePlatform: Platform
  targetPlatform: Platform
  sourcePlaylist: Playlist
  status: 'idle' | 'fetching' | 'matching' | 'writing' | 'done' | 'error'
  progress: number // 0–100
  matched: number
  unmatched: number
  total: number
  targetPlaylistId?: string
  error?: string
  createdAt: string
}

export interface PlatformConnection {
  platform: Platform
  connected: boolean
  displayName?: string
  avatar?: string
  accessToken?: string
}
