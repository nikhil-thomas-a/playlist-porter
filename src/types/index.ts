export type Platform = 'spotify' | 'youtube'

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration_ms?: number
  image?: string
  isrc?: string // Used for accurate cross-platform matching on Spotify
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
