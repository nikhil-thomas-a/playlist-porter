import { Playlist, Track } from '@/types'

const SPOTIFY_API = 'https://api.spotify.com/v1'

async function spotifyFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Spotify API error ${res.status}: ${err}`)
  }
  return res.json()
}

export async function getSpotifyPlaylists(token: string): Promise<Playlist[]> {
  const playlists: Playlist[] = []
  let url: string | null = '/me/playlists?limit=50'

  while (url) {
    // If it's a relative path use spotifyFetch, otherwise full URL
    const data = url.startsWith('/')
      ? await spotifyFetch(url, token)
      : await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())

    playlists.push(
      ...data.items.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.images?.[0]?.url,
        trackCount: p.tracks.total,
        platform: 'spotify' as const,
        owner: p.owner?.display_name,
      }))
    )
    url = data.next
      ? data.next.replace(SPOTIFY_API, '')
      : null
  }

  return playlists
}

export async function getSpotifyPlaylistTracks(playlistId: string, token: string): Promise<Track[]> {
  const tracks: Track[] = []
  let url: string | null = `/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(id,name,artists,album(name,images),duration_ms,external_ids))`

  while (url) {
    const data = url.startsWith('/')
      ? await spotifyFetch(url, token)
      : await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())

    for (const item of data.items) {
      if (!item.track || item.track.type === 'episode') continue
      tracks.push({
        id: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map((a: any) => a.name).join(', '),
        album: item.track.album?.name ?? '',
        duration_ms: item.track.duration_ms,
        image: item.track.album?.images?.[0]?.url,
        isrc: item.track.external_ids?.isrc,
      })
    }
    url = data.next ? data.next.replace(SPOTIFY_API, '') : null
  }

  return tracks
}

export async function createSpotifyPlaylist(
  name: string,
  description: string,
  token: string
): Promise<string> {
  const profile = await spotifyFetch('/me', token)
  const playlist = await spotifyFetch(`/users/${profile.id}/playlists`, token, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  })
  return playlist.id
}

export async function addTracksToSpotifyPlaylist(
  playlistId: string,
  trackUris: string[],
  token: string
): Promise<void> {
  // Spotify allows max 100 tracks per request
  for (let i = 0; i < trackUris.length; i += 100) {
    const chunk = trackUris.slice(i, i + 100)
    await spotifyFetch(`/playlists/${playlistId}/tracks`, token, {
      method: 'POST',
      body: JSON.stringify({ uris: chunk }),
    })
  }
}

export async function searchSpotifyTrack(
  track: Track,
  token: string
): Promise<string | null> {
  // First try ISRC match (most accurate)
  if (track.isrc) {
    try {
      const data = await spotifyFetch(
        `/search?type=track&q=isrc:${track.isrc}&limit=1`,
        token
      )
      if (data.tracks.items.length > 0) {
        return `spotify:track:${data.tracks.items[0].id}`
      }
    } catch {}
  }

  // Fallback: title + artist search
  const query = encodeURIComponent(`track:"${track.title}" artist:"${track.artist}"`)
  const data = await spotifyFetch(`/search?type=track&q=${query}&limit=1`, token)
  if (data.tracks.items.length > 0) {
    return `spotify:track:${data.tracks.items[0].id}`
  }

  // Last resort: loose search
  const looseQuery = encodeURIComponent(`${track.title} ${track.artist}`)
  const looseData = await spotifyFetch(`/search?type=track&q=${looseQuery}&limit=1`, token)
  return looseData.tracks.items.length > 0
    ? `spotify:track:${looseData.tracks.items[0].id}`
    : null
}
