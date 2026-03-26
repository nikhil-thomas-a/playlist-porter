import { Playlist, Track } from '@/types'

const BASE = 'https://api.spotify.com/v1'

async function req(path: string, token: string, opts?: RequestInit) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) throw new Error(`Spotify ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function getSpotifyPlaylists(token: string): Promise<Playlist[]> {
  const results: Playlist[] = []
  let url: string | null = `${BASE}/me/playlists?limit=50`
  while (url) {
    const data = await req(url, token)
    results.push(...data.items.map((p: any) => ({
      id: p.id, name: p.name, description: p.description,
      image: p.images?.[0]?.url, trackCount: p.tracks.total,
      platform: 'spotify' as const, owner: p.owner?.display_name,
    })))
    url = data.next
  }
  return results
}

export async function getSpotifyTracks(playlistId: string, token: string): Promise<Track[]> {
  const results: Track[] = []
  let url: string | null = `${BASE}/playlists/${playlistId}/tracks?limit=100&fields=next,items(track(id,name,artists,album(name,images),duration_ms,external_ids))`
  while (url) {
    const data = await req(url, token)
    for (const { track: t } of data.items) {
      if (!t || t.type === 'episode') continue
      results.push({
        id: t.id, title: t.name,
        artist: t.artists.map((a: any) => a.name).join(', '),
        album: t.album?.name ?? '', duration_ms: t.duration_ms,
        image: t.album?.images?.[0]?.url, isrc: t.external_ids?.isrc,
      })
    }
    url = data.next
  }
  return results
}

export async function createSpotifyPlaylist(name: string, description: string, token: string): Promise<string> {
  const me = await req('/me', token)
  const pl = await req(`/users/${me.id}/playlists`, token, {
    method: 'POST',
    body: JSON.stringify({ name, description, public: false }),
  })
  return pl.id
}

export async function addToSpotifyPlaylist(playlistId: string, uris: string[], token: string) {
  for (let i = 0; i < uris.length; i += 100) {
    await req(`/playlists/${playlistId}/tracks`, token, {
      method: 'POST',
      body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
    })
  }
}

export async function searchSpotify(track: Track, token: string): Promise<string | null> {
  if (track.isrc) {
    try {
      const d = await req(`/search?type=track&q=isrc:${track.isrc}&limit=1`, token)
      if (d.tracks.items.length > 0) return `spotify:track:${d.tracks.items[0].id}`
    } catch {}
  }
  const q = encodeURIComponent(`track:"${track.title}" artist:"${track.artist}"`)
  const d = await req(`/search?type=track&q=${q}&limit=1`, token)
  if (d.tracks.items.length > 0) return `spotify:track:${d.tracks.items[0].id}`
  const d2 = await req(`/search?type=track&q=${encodeURIComponent(`${track.title} ${track.artist}`)}&limit=1`, token)
  return d2.tracks.items.length > 0 ? `spotify:track:${d2.tracks.items[0].id}` : null
}
