import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { Platform, Track } from '@/types'
import { getSpotifyTracks, createSpotifyPlaylist, addToSpotifyPlaylist, searchSpotify } from '@/lib/spotify'
import { getYouTubeTracks, createYouTubePlaylist, addToYouTubePlaylist, searchYouTube } from '@/lib/youtube'

export async function POST(req: NextRequest) {
  const { sourcePlatform, targetPlatform, playlistId, playlistName }
    : { sourcePlatform: Platform; targetPlatform: Platform; playlistId: string; playlistName: string }
    = await req.json()

  const session = await getServerSession(authOptions)
  const token = session?.accessToken ?? ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) =>
        controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

      try {
        // 1. Fetch source tracks
        send('progress', { stage: 'fetching', message: 'Fetching source playlist…', percent: 5 })
        const tracks: Track[] = sourcePlatform === 'spotify'
          ? await getSpotifyTracks(playlistId, token)
          : await getYouTubeTracks(playlistId, token)

        send('progress', { stage: 'fetching', message: `Found ${tracks.length} tracks. Creating playlist…`, percent: 20, total: tracks.length })

        // 2. Create target playlist
        const newName = `${playlistName} (via Playlist Porter)`
        const newDesc = `Transferred from ${sourcePlatform === 'spotify' ? 'Spotify' : 'YouTube Music'} by Playlist Porter`
        const targetId = targetPlatform === 'spotify'
          ? await createSpotifyPlaylist(newName, newDesc, token)
          : await createYouTubePlaylist(newName, newDesc, token)

        send('progress', { stage: 'matching', message: 'Matching tracks…', percent: 25, total: tracks.length })

        // 3. Match each track
        const spotifyUris: string[] = []
        let matched = 0, unmatched = 0

        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i]
          const percent = 25 + Math.round(((i + 1) / tracks.length) * 65)

          if (targetPlatform === 'spotify') {
            const uri = await searchSpotify(track, token)
            if (uri) { spotifyUris.push(uri); matched++ } else { unmatched++ }
          } else {
            const videoId = await searchYouTube(track, token)
            if (videoId) {
              await addToYouTubePlaylist(targetId, videoId, token)
              matched++
            } else { unmatched++ }
          }

          send('progress', { stage: 'matching', percent, matched, unmatched, total: tracks.length, current: track.title })
        }

        // 4. Bulk-write for Spotify
        if (targetPlatform === 'spotify' && spotifyUris.length > 0) {
          send('progress', { stage: 'writing', message: 'Writing to Spotify…', percent: 92 })
          await addToSpotifyPlaylist(targetId, spotifyUris, token)
        }

        send('done', { matched, unmatched, total: tracks.length, targetPlaylistId: targetId, percent: 100 })
      } catch (err: any) {
        send('error', { message: err.message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
