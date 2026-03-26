/**
 * Apple Music integration
 *
 * Apple Music requires TWO tokens:
 * 1. Developer Token (JWT signed with your Apple Music key) — server-side, long-lived
 * 2. Music User Token — obtained client-side via MusicKit JS after user authorizes
 *
 * This file handles:
 * - Server-side developer token generation
 * - Apple Music API calls using both tokens
 *
 * See: https://developer.apple.com/documentation/applemusicapi
 */

import { Playlist, Track } from '@/types'
import { SignJWT, importPKCS8 } from 'jose'

const APPLE_API = 'https://api.music.apple.com/v1'

// Generate a short-lived (6 month max) Apple Music developer token
export async function generateAppleDeveloperToken(): Promise<string> {
  const privateKeyPem = process.env.APPLE_MUSIC_PRIVATE_KEY!
  const keyId = process.env.APPLE_MUSIC_KEY_ID!
  const teamId = process.env.APPLE_MUSIC_TEAM_ID!

  const privateKey = await importPKCS8(privateKeyPem, 'ES256')

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime('180d')
    .sign(privateKey)

  return token
}

async function appleFetch(
  path: string,
  developerToken: string,
  userToken: string,
  options?: RequestInit
) {
  const res = await fetch(`${APPLE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${developerToken}`,
      'Music-User-Token': userToken,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apple Music API error ${res.status}: ${err}`)
  }
  return res.json()
}

export async function getApplePlaylists(
  developerToken: string,
  userToken: string
): Promise<Playlist[]> {
  const playlists: Playlist[] = []
  let url: string | null = '/me/library/playlists?limit=100'

  while (url) {
    const path = url.startsWith('/') ? url : url.replace(APPLE_API, '')
    const data = await appleFetch(path, developerToken, userToken)

    playlists.push(
      ...data.data.map((p: any) => ({
        id: p.id,
        name: p.attributes.name,
        description: p.attributes.description?.standard,
        image: p.attributes.artwork
          ? p.attributes.artwork.url
              .replace('{w}', '300')
              .replace('{h}', '300')
          : undefined,
        trackCount: p.attributes.trackCount ?? 0,
        platform: 'apple' as const,
      }))
    )

    url = data.next ?? null
  }

  return playlists
}

export async function getApplePlaylistTracks(
  playlistId: string,
  developerToken: string,
  userToken: string
): Promise<Track[]> {
  const tracks: Track[] = []
  let url: string | null = `/me/library/playlists/${playlistId}/tracks?limit=100`

  while (url) {
    const path = url.startsWith('/') ? url : url.replace(APPLE_API, '')
    const data = await appleFetch(path, developerToken, userToken)

    for (const item of data.data) {
      const attr = item.attributes
      tracks.push({
        id: item.id,
        title: attr.name,
        artist: attr.artistName,
        album: attr.albumName,
        duration_ms: attr.durationInMillis,
        image: attr.artwork
          ? attr.artwork.url.replace('{w}', '300').replace('{h}', '300')
          : undefined,
        isrc: attr.isrc,
      })
    }

    url = data.next ?? null
  }

  return tracks
}

export async function createApplePlaylist(
  name: string,
  description: string,
  developerToken: string,
  userToken: string
): Promise<string> {
  const data = await appleFetch('/me/library/playlists', developerToken, userToken, {
    method: 'POST',
    body: JSON.stringify({
      attributes: { name, description },
    }),
  })
  return data.data[0].id
}

export async function addTracksToApplePlaylist(
  playlistId: string,
  trackIds: string[], // Apple Music catalog IDs
  developerToken: string,
  userToken: string
): Promise<void> {
  // Apple allows adding tracks in batches
  for (let i = 0; i < trackIds.length; i += 100) {
    const chunk = trackIds.slice(i, i + 100)
    await appleFetch(
      `/me/library/playlists/${playlistId}/tracks`,
      developerToken,
      userToken,
      {
        method: 'POST',
        body: JSON.stringify({
          data: chunk.map(id => ({ id, type: 'songs' })),
        }),
      }
    )
  }
}

export async function searchAppleTrack(
  track: Track,
  developerToken: string,
  userToken: string
): Promise<string | null> {
  // First try ISRC (most accurate)
  if (track.isrc) {
    try {
      const data = await appleFetch(
        `/catalog/us/songs?filter[isrc]=${track.isrc}&limit=1`,
        developerToken,
        userToken
      )
      if (data.data?.length > 0) return data.data[0].id
    } catch {}
  }

  // Fallback: text search
  const query = encodeURIComponent(`${track.title} ${track.artist}`)
  const data = await appleFetch(
    `/catalog/us/search?types=songs&term=${query}&limit=5`,
    developerToken,
    userToken
  )

  const songs = data.results?.songs?.data
  if (!songs || songs.length === 0) return null

  // Prefer exact title match
  const titleLower = track.title.toLowerCase()
  const exact = songs.find((s: any) =>
    s.attributes.name.toLowerCase() === titleLower
  )
  return (exact ?? songs[0]).id
}
