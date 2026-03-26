import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getSpotifyPlaylists } from '@/lib/spotify'
import { getYouTubePlaylists } from '@/lib/youtube'
import { getApplePlaylists, generateAppleDeveloperToken } from '@/lib/apple'
import { Platform } from '@/types'

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform') as Platform | null
  const appleUserToken = req.nextUrl.searchParams.get('appleUserToken')

  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  }

  try {
    if (platform === 'apple') {
      if (!appleUserToken) {
        return NextResponse.json({ error: 'appleUserToken is required for Apple Music' }, { status: 400 })
      }
      const devToken = await generateAppleDeveloperToken()
      const playlists = await getApplePlaylists(devToken, appleUserToken)
      return NextResponse.json({ playlists })
    }

    const session = await getServerSession(authOptions)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let playlists
    if (platform === 'spotify') {
      playlists = await getSpotifyPlaylists(session.accessToken)
    } else if (platform === 'youtube') {
      playlists = await getYouTubePlaylists(session.accessToken)
    } else {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    return NextResponse.json({ playlists })
  } catch (err: any) {
    console.error('[playlists]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
