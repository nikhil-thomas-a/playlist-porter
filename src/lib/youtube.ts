import { Playlist, Track } from '@/types'

const BASE = 'https://www.googleapis.com/youtube/v3'

async function req(path: string, token: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) throw new Error(`YouTube ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function getYouTubePlaylists(token: string): Promise<Playlist[]> {
  const results: Playlist[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ part: 'snippet,contentDetails', mine: 'true', maxResults: '50', ...(pageToken ? { pageToken } : {}) })
    const data = await req(`/playlists?${params}`, token)
    results.push(...data.items.map((p: any) => ({
      id: p.id, name: p.snippet.title, description: p.snippet.description,
      image: p.snippet.thumbnails?.high?.url ?? p.snippet.thumbnails?.default?.url,
      trackCount: p.contentDetails.itemCount, platform: 'youtube' as const,
      owner: p.snippet.channelTitle,
    })))
    pageToken = data.nextPageToken
  } while (pageToken)
  return results
}

export async function getYouTubeTracks(playlistId: string, token: string): Promise<Track[]> {
  const results: Track[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({ part: 'snippet', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) })
    const data = await req(`/playlistItems?${params}`, token)
    for (const item of data.items) {
      const s = item.snippet
      if (s.title === 'Deleted video' || s.title === 'Private video') continue
      results.push({
        id: s.resourceId.videoId, title: s.title,
        artist: (s.videoOwnerChannelTitle ?? '').replace(/ - Topic$/, ''),
        album: '', image: s.thumbnails?.high?.url ?? s.thumbnails?.default?.url,
      })
    }
    pageToken = data.nextPageToken
  } while (pageToken)
  return results
}

export async function createYouTubePlaylist(name: string, description: string, token: string): Promise<string> {
  const data = await req('/playlists?part=snippet,status', token, {
    method: 'POST',
    body: JSON.stringify({ snippet: { title: name, description }, status: { privacyStatus: 'private' } }),
  })
  return data.id
}

export async function addToYouTubePlaylist(playlistId: string, videoId: string, token: string) {
  await req('/playlistItems?part=snippet', token, {
    method: 'POST',
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } }),
  })
}

export async function searchYouTube(track: Track, token: string): Promise<string | null> {
  const params = new URLSearchParams({
    part: 'snippet', q: `${track.title} ${track.artist} official audio`,
    type: 'video', videoCategoryId: '10', maxResults: '5',
  })
  const data = await req(`/search?${params}`, token)
  if (!data.items?.length) return null
  const titleLower = track.title.toLowerCase()
  const best = data.items.find((i: any) => i.snippet.title.toLowerCase().includes(titleLower))
  return (best ?? data.items[0])?.id?.videoId ?? null
}
