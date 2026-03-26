import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { Platform, Track } from '@/types'

// Spotify
import {
  getSpotifyPlaylistTracks,
  createSpotifyPlaylist,
  addTracksToSpotifyPlaylist,
  searchSpotifyTrack,
} from '@/lib/spotify'

// YouTube
import {
  getYouTubePlaylistTracks,
  createYouTubePlaylist,
  addVideoToYouTubePlaylist,
  searchYouTubeTrack,
} from '@/lib/youtube'

// Apple
import {
  getApplePlaylistTracks,
  createApplePlaylist,
  addTracksToApplePlaylist,
  searchAppleTrack,
  generateAppleDeveloperToken,
} from '@/lib/apple'

export interface TransferRequest {
  sourcePlatform: Platform
  targetPlatform: Platform
  playlistId: string
  playlistName: string
  sourceAccessToken?: string   // override; otherwise uses session
  targetAccessToken?: string   // for cross-session transfers
  appleUserToken?: string      // required if source or target is apple
}

export async function POST(req: NextRequest) {
  const body: TransferRequest = await req.json()
  const {
    sourcePlatform,
    targetPlatform,
    playlistId,
    playlistName,
    appleUserToken,
  } = body

  const session = await getServerSession(authOptions)
  const sessionToken = session?.accessToken ?? ''

  // We stream progress using Server-Sent Events via ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: object) {
        controller.enqueue(
          new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        const appleDevToken = (sourcePlatform === 'apple' || targetPlatform === 'apple')
          ? await generateAppleDeveloperToken()
          : ''

        // ── STEP 1: Fetch source tracks ──────────────────────────────────────
        send('progress', { stage: 'fetching', message: 'Fetching source playlist tracks…', percent: 5 })

        let sourceTracks: Track[] = []
        if (sourcePlatform === 'spotify') {
          sourceTracks = await getSpotifyPlaylistTracks(playlistId, sessionToken)
        } else if (sourcePlatform === 'youtube') {
          sourceTracks = await getYouTubePlaylistTracks(playlistId, sessionToken)
        } else if (sourcePlatform === 'apple') {
          if (!appleUserToken) throw new Error('Apple Music user token required')
          sourceTracks = await getApplePlaylistTracks(playlistId, appleDevToken, appleUserToken)
        }

        send('progress', {
          stage: 'fetching',
          message: `Found ${sourceTracks.length} tracks. Creating destination playlist…`,
          percent: 20,
          total: sourceTracks.length,
        })

        // ── STEP 2: Create target playlist ───────────────────────────────────
        const newPlaylistName = `${playlistName} (via Playlist Porter)`
        const newPlaylistDescription = `Transferred from ${sourcePlatform} by Playlist Porter`

        let targetPlaylistId = ''
        if (targetPlatform === 'spotify') {
          targetPlaylistId = await createSpotifyPlaylist(newPlaylistName, newPlaylistDescription, sessionToken)
        } else if (targetPlatform === 'youtube') {
          targetPlaylistId = await createYouTubePlaylist(newPlaylistName, newPlaylistDescription, sessionToken)
        } else if (targetPlatform === 'apple') {
          if (!appleUserToken) throw new Error('Apple Music user token required')
          targetPlaylistId = await createApplePlaylist(newPlaylistName, newPlaylistDescription, appleDevToken, appleUserToken)
        }

        send('progress', { stage: 'matching', message: 'Matching tracks…', percent: 25, total: sourceTracks.length })

        // ── STEP 3: Match & add tracks ───────────────────────────────────────
        const spotifyUris: string[] = []
        const appleIds: string[] = []
        let matched = 0
        let unmatched = 0

        for (let i = 0; i < sourceTracks.length; i++) {
          const track = sourceTracks[i]
          const percent = 25 + Math.round(((i + 1) / sourceTracks.length) * 65)

          if (targetPlatform === 'spotify') {
            const uri = await searchSpotifyTrack(track, sessionToken)
            if (uri) {
              spotifyUris.push(uri)
              matched++
            } else {
              unmatched++
            }
          } else if (targetPlatform === 'youtube') {
            const videoId = await searchYouTubeTrack(track, sessionToken)
            if (videoId) {
              // Add one at a time for YouTube to avoid rate limits
              await addVideoToYouTubePlaylist(targetPlaylistId, videoId, sessionToken)
              matched++
            } else {
              unmatched++
            }
          } else if (targetPlatform === 'apple') {
            if (!appleUserToken) throw new Error('Apple Music user token required')
            const id = await searchAppleTrack(track, appleDevToken, appleUserToken)
            if (id) {
              appleIds.push(id)
              matched++
            } else {
              unmatched++
            }
          }

          send('progress', {
            stage: 'matching',
            message: `Matched ${matched} / ${i + 1} tracks…`,
            percent,
            matched,
            unmatched,
            total: sourceTracks.length,
            current: track.title,
          })
        }

        // ── STEP 4: Bulk-write for Spotify and Apple ─────────────────────────
        if (targetPlatform === 'spotify' && spotifyUris.length > 0) {
          send('progress', { stage: 'writing', message: 'Adding tracks to Spotify playlist…', percent: 92 })
          await addTracksToSpotifyPlaylist(targetPlaylistId, spotifyUris, sessionToken)
        }

        if (targetPlatform === 'apple' && appleIds.length > 0) {
          send('progress', { stage: 'writing', message: 'Adding tracks to Apple Music playlist…', percent: 92 })
          if (!appleUserToken) throw new Error('Apple Music user token required')
          await addTracksToApplePlaylist(targetPlaylistId, appleIds, appleDevToken, appleUserToken)
        }

        // ── DONE ─────────────────────────────────────────────────────────────
        send('done', {
          matched,
          unmatched,
          total: sourceTracks.length,
          targetPlaylistId,
          percent: 100,
        })
      } catch (err: any) {
        console.error('[transfer]', err)
        send('error', { message: err.message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
