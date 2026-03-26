import type { Metadata } from 'next'
import { Syne, DM_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400','600','700','800'] })
const dmMono = DM_Mono({ subsets: ['latin'], variable: '--font-dm-mono', weight: ['300','400','500'] })

export const metadata: Metadata = {
  title: 'Playlist Porter — Move your music anywhere',
  description: 'Transfer playlists between Spotify and YouTube Music in seconds.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
