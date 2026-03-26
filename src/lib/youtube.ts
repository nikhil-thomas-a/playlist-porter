/**
 * YouTube Music integration via Google OAuth + YouTube Data API v3
 *
 * YouTube Music does not have an official API. We use:
 * - Google OAuth scopes: youtube.readonly + youtube.force-ssl
 * - YouTube Data API v3 for playlist read/write
 * - YouTube Data API v3 for search (to match tracks by title/artist)
 *
 * Limitations:
 * - Cannot reliably read "liked songs" from YouTube Music
 * - Search matching is less accurate than ISRC (YouTube doesn't expose ISRC)
 * - Rate limit: 10,000 units/day on free tier
 */

import { Playlist, Track } from '@/types'

const YT_API = 'https://www.googleapis.com/youtube/v3'

async function ytFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${YT_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube API error ${res.status}: ${err}`)
  }
  return res.json()
}

export async function getYouTubePlaylists(token: string): Promise<Playlist[]> {
  const playlists: Playlist[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    const data = await ytFetch(`/playlists?${params}`, token)

    playlists.push(
      ...data.items.map((p: any) => ({
        id: p.id,
        name: p.snippet.title,
        description: p.snippet.description,
        image: p.snippet.thumbnails?.high?.url ?? p.snippet.thumbnails?.default?.url,
        trackCount: p.contentDetails.itemCount,
        platform: 'youtube' as const,
        owner: p.snippet.channelTitle,
      }))
    )

    pageToken = data.nextPageToken
  } while (pageToken)

  return playlists
}

export async function getYouTubePlaylistTracks(playlistId: string, token: string): Promise<Track[]> {
  const tracks: Track[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    const data = await ytFetch(`/playlistItems?${params}`, token)

    for (const item of data.items) {
      const snippet = item.snippet
      if (snippet.title === 'Deleted video' || snippet.title === 'Private video') continue

      // YouTube Music titles often follow "Song Title - Artist" or "Artist - Topic" format
      const rawTitle = snippet.title
      const channelTitle = snippet.videoOwnerChannelTitle ?? ''
      // Strip " - Topic" suffix common on auto-generated music channels
      const artist = channelTitle.replace(/ - Topic$/, '')

      tracks.push({
        id: snippet.resourceId.videoId,
        title: rawTitle,
        artist,
        album: '',
        image: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url,
      })
    }

    pageToken = data.nextPageToken
  } while (pageToken)

  return tracks
}

export async function createYouTubePlaylist(
  name: string,
  description: string,
  token: string
): Promise<string> {
  const data = await ytFetch('/playlists?part=snippet,status', token, {
    method: 'POST',
    body: JSON.stringify({
      snippet: { title: name, description },
      status: { privacyStatus: 'private' },
    }),
  })
  return data.id
}

export async function addVideoToYouTubePlaylist(
  playlistId: string,
  videoId: string,
  token: string
): Promise<void> {
  await ytFetch('/playlistItems?part=snippet', token, {
    method: 'POST',
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: { kind: 'youtube#video', videoId },
      },
    }),
  })
}

export async function searchYouTubeTrack(
  track: Track,
  token: string
): Promise<string | null> {
  const query = encodeURIComponent(`${track.title} ${track.artist} official audio`)
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    videoCategoryId: '10', // Music category
    maxResults: '5',
  })

  const data = await ytFetch(`/search?${params}`, token)
  if (!data.items || data.items.length === 0) return null

  // Pick the best match: prefer results where title contains the track name
  const titleLower = track.title.toLowerCase()
  const artistLower = track.artist.toLowerCase()

  const best = data.items.find((item: any) => {
    const t = item.snippet.title.toLowerCase()
    return t.includes(titleLower) || t.includes(artistLower)
  })

  return (best ?? data.items[0])?.id?.videoId ?? null
}
