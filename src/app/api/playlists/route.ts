import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getSpotifyPlaylists } from '@/lib/spotify'
import { getYouTubePlaylists } from '@/lib/youtube'

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get('platform')
  if (!platform) return NextResponse.json({ error: 'platform required' }, { status: 400 })

  const session = await getServerSession(authOptions)
  if (!session?.accessToken) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const playlists = platform === 'spotify'
      ? await getSpotifyPlaylists(session.accessToken)
      : platform === 'youtube'
      ? await getYouTubePlaylists(session.accessToken)
      : null

    if (!playlists) return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    return NextResponse.json({ playlists })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
