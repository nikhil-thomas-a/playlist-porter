# 🎵 Playlist Porter

> Transfer playlists between Spotify and YouTube Music — instantly, privately, and for free.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## ✨ Features

- **Spotify ↔ YouTube Music** — transfer in either direction
- **Smart track matching** — uses ISRC codes for exact matching, falls back to title + artist search
- **Live progress** — real-time match count as the transfer runs (Server-Sent Events)
- **Privacy-first** — tokens are never stored on the server; everything stays in your browser session
- **One-click Vercel deploy**

---

## 📸 How It Works

```
Connect Spotify → Connect YouTube Music → Pick a playlist → Hit Transfer

For each track:
  1. Search by ISRC (exact match, ~99% accuracy)
  2. Fall back to "track + artist" search (~85%)
  3. Fall back to loose search (~70%)

Create new playlist on target → Add all matched tracks
```

---

## 🚀 Running Locally (Step by Step)

### Prerequisites

- [Node.js 18+](https://nodejs.org) installed on your machine
- A free Spotify account
- A Google account (for YouTube Music)

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/nikhil-thomas-a/playlist-porter.git
cd playlist-porter
```

---

### Step 2 — Install dependencies

```bash
npm install
```

---

### Step 3 — Set up Spotify API credentials

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in and click **"Create app"**
3. Fill in:
   - **App name:** Playlist Porter (or anything you like)
   - **App description:** Playlist transfer tool
   - **Redirect URI:** `http://localhost:3000/api/auth/callback/spotify`
   - **Which API/SDKs:** check **Web API**
4. Click **Save**
5. On your app page, click **Settings** — you'll see your **Client ID** and **Client Secret**

---

### Step 4 — Set up Google / YouTube Music API credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project** → give it a name → **Create**
3. In the sidebar go to **APIs & Services → Library**
4. Search for **YouTube Data API v3** → click it → click **Enable**
5. In the sidebar go to **APIs & Services → OAuth consent screen**
   - Choose **External** → **Create**
   - Fill in **App name** (e.g. "Playlist Porter") and your email → **Save and Continue** through all steps
   - On the **Test users** step, add your own Google email → **Save and Continue**
6. In the sidebar go to **APIs & Services → Credentials**
   - Click **+ Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Under **Authorised redirect URIs** click **Add URI** and enter: `http://localhost:3000/api/auth/callback/google`
   - Click **Create**
7. A popup shows your **Client ID** and **Client Secret** — copy both

---

### Step 5 — Create your environment file

In the project root, create a file called `.env.local` and paste in:

```env
SPOTIFY_CLIENT_ID=paste_your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=paste_your_spotify_client_secret_here

GOOGLE_CLIENT_ID=paste_your_google_client_id_here
GOOGLE_CLIENT_SECRET=paste_your_google_client_secret_here

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any_long_random_string_here
```

> **NEXTAUTH_SECRET** can be anything — just make it long and random. For example: `my-super-secret-playlist-porter-key-2024`

---

### Step 6 — Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Done!

---

## ☁️ Deploying to Vercel (Free Hosting)

1. Push this repo to your GitHub (you've already done this)
2. Go to [vercel.com](https://vercel.com) → **Add New → Project**
3. Import your `playlist-porter` repo
4. Before clicking Deploy, open **Environment Variables** and add all 6 variables from your `.env.local`
5. Set `NEXTAUTH_URL` to your Vercel URL (e.g. `https://playlist-porter-xyz.vercel.app`) — you can update this after first deploy
6. Click **Deploy**

**After deploying**, update your OAuth redirect URIs:

- **Spotify** → Developer Dashboard → your app → Edit Settings → add `https://YOUR-VERCEL-URL/api/auth/callback/spotify`
- **Google** → Cloud Console → Credentials → your OAuth client → add `https://YOUR-VERCEL-URL/api/auth/callback/google`

Then go back to Vercel → your project → **Settings → Environment Variables** → update `NEXTAUTH_URL` to your real Vercel URL → **Redeploy**.

---

## ⚠️ Known Limitations

| Limitation | Reason |
|---|---|
| Only one platform connected at a time per sign-in | NextAuth uses a single session; connect one, then switch accounts to connect the other |
| YouTube transfers are slower | YouTube API requires adding tracks one by one; Spotify supports batch writes of 100 |
| YouTube quota: 10,000 units/day | Each track search costs 100 units on the free tier — large playlists may hit the daily limit |
| YouTube "Liked Songs" not readable | YouTube Music's liked songs are private and not exposed via the Data API |
| Podcasts and episodes are skipped | Cross-platform podcast support is out of scope |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # OAuth for Spotify + Google
│   │   ├── playlists/            # Fetch playlists from either platform
│   │   └── transfer/             # Core transfer engine (SSE streaming)
│   ├── globals.css               # Design system
│   ├── layout.tsx
│   ├── page.tsx                  # All UI in one file
│   └── providers.tsx
├── lib/
│   ├── spotify.ts                # Spotify Web API
│   └── youtube.ts                # YouTube Data API v3
└── types/
    ├── index.ts                  # Shared types
    └── next-auth.d.ts
```

---

<<<<<<< HEAD
=======
## ⚡ Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/nikhil-thomas-a/playlist-porter)

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

>>>>>>> 6ffa8b4c925264130d5777023fe04e8c1cb3aae7
## 🗺 Roadmap

- [ ] Manual search fallback for unmatched tracks
- [ ] Transfer history
- [ ] Export playlist as CSV / JSON
- [ ] Batch transfer multiple playlists

---

## 📄 License

MIT — free to use, modify, and distribute.
