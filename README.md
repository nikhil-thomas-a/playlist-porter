# 🎵 Playlist Porter

> Transfer playlists between Spotify, YouTube Music, and Apple Music — instantly, privately, and for free.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

---

## ✨ Features

- **3 platforms supported** — Spotify, YouTube Music, Apple Music
- **Smart track matching** — ISRC codes (where available) for exact matching, with fuzzy title/artist fallback
- **Live progress streaming** — Server-Sent Events give you real-time match counts as the transfer runs
- **Privacy-first** — OAuth tokens are never persisted on the server; your credentials stay with you
- **One-click Vercel deploy** — No infrastructure required

---

## 🧠 How It Works

```
User connects Source ──► Playlist Porter fetches tracks
                                   │
                                   ▼
              For each track: search by ISRC → title/artist fallback
                                   │
                                   ▼
              Create new playlist on Target platform
                                   │
                                   ▼
              Bulk-add matched tracks (Spotify/Apple) or one-by-one (YouTube)
```

### Track Matching Strategy

| Priority | Method | Accuracy |
|---|---|---|
| 1st | ISRC lookup (exact) | ~99% |
| 2nd | `track:"X" artist:"Y"` quoted search | ~85% |
| 3rd | Loose `title artist` search | ~70% |

ISRC (International Standard Recording Code) is a unique identifier embedded in most streaming track metadata. When it's available, it's used first — this gives near-perfect matching across platforms. If unavailable (e.g. YouTube Music tracks), the app falls back to structured and then loose text search.

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Auth | [NextAuth.js](https://next-auth.js.org) (Spotify + Google OAuth) |
| Apple Music | [MusicKit JS](https://developer.apple.com/documentation/musickitjs) (client-side) + Apple Music API (server-side) |
| Styling | CSS Variables + custom design system (no Tailwind) |
| Progress streaming | [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) via Next.js Route Handlers |
| Deployment | [Vercel](https://vercel.com) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Accounts and API credentials for the platforms you want to use (see below)

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/playlist-porter.git
cd playlist-porter
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the values (see **API Setup** section below).

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 API Setup

### Spotify

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create an app
3. Add `http://localhost:3000/api/auth/callback/spotify` to Redirect URIs
4. Copy **Client ID** and **Client Secret** → `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`

### YouTube Music (via Google OAuth)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **YouTube Data API v3**
3. Create OAuth 2.0 credentials (Web application)
4. Add `http://localhost:3000/api/auth/callback/google` to Authorised redirect URIs
5. Copy **Client ID** and **Client Secret** → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

> **Note:** YouTube Data API v3 has a quota of 10,000 units/day on the free tier. Each search costs 100 units, so large playlists may exhaust the daily quota. Request a quota increase from Google Cloud Console if needed.

### Apple Music

Apple Music requires an [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year).

1. In your Apple Developer account, go to **Certificates, Identifiers & Profiles**
2. Create a **MusicKit** key under **Keys**
3. Download the `.p8` private key file (you can only download it once)
4. Note your **Key ID** and **Team ID**
5. Add to `.env.local`:

```env
APPLE_MUSIC_KEY_ID=YOUR_KEY_ID
APPLE_MUSIC_TEAM_ID=YOUR_TEAM_ID
APPLE_MUSIC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENTS_HERE\n-----END PRIVATE KEY-----"
```

Replace actual newlines in the key with `\n` when pasting into the env file.

### NextAuth Secret

```bash
openssl rand -base64 32
```

Paste the output as `NEXTAUTH_SECRET`.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # OAuth handlers (Spotify, Google)
│   │   ├── apple/developer-token/ # Apple Music JWT generation
│   │   ├── playlists/            # Fetch playlists from any platform
│   │   └── transfer/             # Core transfer engine (SSE streaming)
│   ├── globals.css               # Design system & CSS variables
│   ├── layout.tsx
│   ├── page.tsx                  # Main UI
│   └── providers.tsx
├── components/
│   ├── PlatformCard.tsx          # Connect/disconnect UI per platform
│   ├── PlaylistSelector.tsx      # Searchable playlist list
│   ├── TransferArrow.tsx         # Animated direction indicator
│   └── TransferProgress.tsx      # Live progress + stats
├── lib/
│   ├── spotify.ts                # Spotify Web API calls
│   ├── youtube.ts                # YouTube Data API v3 calls
│   └── apple.ts                  # Apple Music API + JWT signing
└── types/
    ├── index.ts                  # Shared types (Track, Playlist, etc.)
    └── next-auth.d.ts            # Session type augmentation
```

---

## ⚡ Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/playlist-porter)

1. Click the button above
2. Add all environment variables from `.env.example`
3. Update redirect URIs in Spotify/Google dashboards to your Vercel URL
4. Set `NEXTAUTH_URL` to your Vercel deployment URL

---

## ⚠️ Known Limitations

| Limitation | Reason |
|---|---|
| YouTube Music "Liked Songs" cannot be read | No official YouTube Music API; liked songs are private |
| YouTube transfers are slower | YouTube Data API requires adding tracks one-by-one; Spotify/Apple support batch writes |
| Apple Music requires paid dev account | MusicKit key generation requires Apple Developer Program ($99/yr) |
| YouTube quota limits | 10,000 units/day free tier; each track search = 100 units |
| Podcast/episode tracks are skipped | Cross-platform podcast support is out of scope |

---

## 🗺 Roadmap

- [ ] Retry logic for unmatched tracks (manual search fallback)
- [ ] Transfer history / past jobs
- [ ] JioSaavn support (read-only via unofficial API)
- [ ] Batch transfer multiple playlists
- [ ] Dark/light mode toggle
- [ ] Export playlist as CSV / JSON

---

## 📄 License

MIT — do whatever you want with it. Attribution appreciated but not required.

---

## 🙏 Acknowledgements

- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [Apple Music API](https://developer.apple.com/documentation/applemusicapi)
- [MusicKit JS](https://developer.apple.com/documentation/musickitjs)
- [NextAuth.js](https://next-auth.js.org)
