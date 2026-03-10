# DORO Music Scheduler Agent

> **Automatic music scheduling agent for DORO restaurant.**
> Changes playlists by time of day and day of week via the Spotify API.

---

## IMPORTANT: Legal & Compliance Notice

**This is a PRIVATE / INTERNAL TESTING tool only.**

Spotify personal/premium accounts are **NOT licensed for commercial public playback** (restaurants, bars, cafes). Using this in a real restaurant violates Spotify's Terms of Service and potentially music licensing laws.

### Compliant alternatives for business use:
- **Soundtrack Your Brand** (soundtrack.com) — Spotify-powered, licensed for businesses (~$35/mo)
- **Rockbot** — licensed background music with scheduling
- **Cloud Cover Music** — commercial music streaming for businesses
- **Self-licensed** — license via ACUM (Israel) + your own music library

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           PLAYBACK MACHINE (Restaurant)      │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ Spotify   │◄───│ DORO Music Scheduler │   │
│  │ Desktop   │    │                      │   │
│  │ App       │    │ • Schedule Engine     │   │
│  └──────────┘    │ • Playback Controller │   │
│                   │ • Health Server :8888 │   │
│                   │ • Agent Loop (60s)    │   │
│                   └──────────────────────┘   │
└─────────────────────────────────────────────┘
         ▲
         │ HTTP (LAN or tunnel)
         │
┌────────┴─────────┐
│  REMOTE ADMIN     │
│  (your laptop)    │
│                   │
│  curl /health     │
│  curl /override   │
│  edit schedule    │
│  via SSH/ngrok    │
└───────────────────┘
```

### How it works:
1. Agent wakes up every 60 seconds
2. Evaluates current time + day against schedule rules
3. Checks manual override (if set)
4. Gets Spotify playback state and device list
5. If the correct playlist is already playing → does nothing
6. If a switch is needed → calls Spotify API to change playlist
7. Logs every decision to `logs/agent.log`

---

## Quick Start (Windows PC — Playback Machine)

### Prerequisites
- **Node.js 20+** — download from https://nodejs.org (LTS installer, includes npm)
- **Git** — download from https://git-scm.com/download/win
- **Spotify Premium account** — must be logged in and the Spotify desktop app open
- **Spotify Developer App** — create at https://developer.spotify.com/dashboard

### Step 1: Create Spotify Developer App

1. Go to https://developer.spotify.com/dashboard
2. Click "Create App"
3. Name: "DORO Music Scheduler" (or anything)
4. Redirect URI: `http://localhost:8888/callback`
5. Select "Web API"
6. Save the **Client ID** and **Client Secret**

### Step 2: Install & Configure

Open **PowerShell** or **Command Prompt**:

```powershell
cd music-scheduler
npm install

# Create .env file
copy .env.example .env
# Edit .env with your Spotify credentials — use Notepad:
notepad .env
```

Fill in your `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in the `.env` file.

### Step 3: Authorize Spotify

```powershell
npm run auth
```

This prints a URL — open it in your browser on the same PC. Log in with the Spotify Premium account, accept permissions. Tokens are saved to `tokens.json` automatically.

### Step 4: Configure Your Playlists

Open `src\config\schedule.json` in Notepad or VS Code:

```powershell
notepad src\config\schedule.json
```

- Replace all `REPLACE_WITH_*` values with real Spotify playlist URIs
- A playlist URI looks like: `spotify:playlist:37i9dQZF1DXcBWIGoYBM5M`
- You can find the URI in Spotify: right-click playlist → Share → Copy Spotify URI

### Step 5: Run

```powershell
# Normal mode
npm run dev

# Dry-run mode (logs decisions but doesn't change playback)
npm run dry-run

# Production (build + run)
npm run build
npm start
```

### Step 6: Keep Running Automatically on Windows

There are two recommended approaches:

#### Option A: pm2 (Recommended — simplest)

```powershell
# Install pm2 globally
npm install -g pm2 pm2-windows-startup

# Build the project first
npm run build

# Start with pm2
pm2 start dist\index.js --name doro-music

# Make it survive reboots
pm2-startup install
pm2 save
```

Useful pm2 commands:
```powershell
pm2 status              # Check if running
pm2 logs doro-music     # View live logs
pm2 restart doro-music  # Restart
pm2 stop doro-music     # Stop
```

#### Option B: Windows Task Scheduler (No extra tools)

1. Open **Task Scheduler** (search "Task Scheduler" in Start)
2. Click **Create Task** (not "Create Basic Task")
3. **General** tab:
   - Name: `DORO Music Scheduler`
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"
4. **Triggers** tab → New:
   - Begin the task: "At startup"
   - Delay task for: 30 seconds (gives Spotify time to start)
5. **Actions** tab → New:
   - Action: Start a program
   - Program/script: `node`
   - Add arguments: `dist\index.js`
   - Start in: `C:\path\to\music-scheduler` (your actual path)
6. **Settings** tab:
   - Check "If the task fails, restart every: 1 minute"
   - Attempt to restart up to: 999 times
   - Uncheck "Stop the task if it runs longer than"
7. Click OK, enter your Windows password when prompted

#### Option C: NSSM (Run as a true Windows Service)

```powershell
# Download NSSM from https://nssm.cc/download
# Extract and add to PATH, then:

nssm install DoroMusic "C:\Program Files\nodejs\node.exe" "C:\path\to\music-scheduler\dist\index.js"
nssm set DoroMusic AppDirectory "C:\path\to\music-scheduler"
nssm set DoroMusic AppEnvironmentExtra "SPOTIFY_CLIENT_ID=your_id" "SPOTIFY_CLIENT_SECRET=your_secret"
nssm start DoroMusic
```

### Step 7: Make Spotify Auto-Start

1. Press `Win + R`, type `shell:startup`, hit Enter
2. This opens the Startup folder
3. Right-click → New → Shortcut
4. Location: `"C:\Users\YourUser\AppData\Roaming\Spotify\Spotify.exe"`
5. Name it "Spotify"

Now Spotify opens automatically when the PC logs in.

### Step 8: Prevent PC from Sleeping

The PC must stay awake for the agent to work:

```powershell
# Open Power Settings (run as admin)
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
```

Or: Settings → System → Power & sleep → Set "Sleep" to **Never** (when plugged in)

---

## Remote Control

### HTTP API (from any device on the same network)

```bash
# Check health
curl http://RESTAURANT_IP:8888/health

# View current state
curl http://RESTAURANT_IP:8888/state

# View schedule
curl http://RESTAURANT_IP:8888/schedule

# Preview what would play now
curl http://RESTAURANT_IP:8888/next

# Set manual override (play a specific playlist for 120 minutes)
curl -X POST http://RESTAURANT_IP:8888/override \
  -H 'Content-Type: application/json' \
  -d '{"playlistUri":"spotify:playlist:ABC123","durationMinutes":120,"setBy":"yarin"}'

# Clear manual override (return to schedule)
curl -X DELETE http://RESTAURANT_IP:8888/override
```

### Remote access (from outside the restaurant)

Option A: **Tailscale** (recommended — free, zero-config VPN, works great on Windows)
```powershell
# Install Tailscale on the restaurant PC: https://tailscale.com/download/windows
# Install on your laptop too, then access via Tailscale IP:
curl http://100.x.x.x:8888/health
```

Option B: **ngrok** (quick & dirty, no install on remote side)
```powershell
# On the restaurant PC:
# Download from https://ngrok.com/download, then:
ngrok http 8888
# This gives you a public URL you can use from anywhere
```

Option C: **SSH tunnel** (if OpenSSH server is enabled on the PC)
```bash
# From your laptop:
ssh -L 8888:localhost:8888 user@restaurant-ip
```

---

## Playlist Management

### How to identify playlists

| Method | Example | Where to use |
|--------|---------|-------------|
| **Spotify URI** | `spotify:playlist:37i9dQZF1DXcBWIGoYBM5M` | In `schedule.json` — this is the primary format |
| **Playlist ID** | `37i9dQZF1DXcBWIGoYBM5M` | The ID portion after `spotify:playlist:` |
| **URL** | `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M` | For reference only — convert to URI |

### How to get a playlist URI
1. Open Spotify
2. Right-click the playlist
3. Share → Copy Spotify URI
4. If you only see "Copy link", the URI is: `spotify:playlist:` + the ID from the URL

### Best practices
- Create your own playlists for each mood (you control the content)
- Name them clearly: "DORO - Calm Morning", "DORO - Sunset Chill", etc.
- Keep a backup document mapping mood labels to playlist URIs
- Set playlists to "Collaborative" if you want staff to add songs

---

## Schedule Config Reference

```jsonc
{
  "timezone": "Asia/Jerusalem",          // IANA timezone
  "fallbackPlaylistUri": "spotify:...",  // When no rule matches
  "preferredDeviceName": "DORO-...",     // Partial match, case-insensitive
  "pollIntervalSeconds": 60,             // How often to check (seconds)
  "dryRun": false,                       // true = log only, no changes
  "rules": [
    {
      "id": "unique_rule_id",            // For logging
      "mood": "calm_morning",            // Human label
      "days": [0, 1, 2, 3, 4],          // 0=Sun, 1=Mon, ..., 6=Sat
      "startTime": "08:00",             // 24h format
      "endTime": "12:00",               // 24h format
      "playlistUri": "spotify:...",     // Spotify playlist URI
      "priority": 10,                    // Higher wins on overlap
      "enabled": true                    // false to disable without deleting
    }
  ]
}
```

---

## Failure Scenarios & Protections

| Scenario | Behavior |
|----------|----------|
| **Spotify app not running** | Agent logs warning, retries next tick |
| **No devices found** | Agent logs error, retries next tick |
| **Device goes offline** | Agent logs warning, resumes when device returns |
| **Token expired** | Auto-refreshes using refresh token |
| **Refresh token revoked** | Agent logs fatal error, requires re-auth (`npm run auth`) |
| **Network down** | API calls fail, agent logs error, retries next tick |
| **No matching rule** | Falls back to `fallbackPlaylistUri` |
| **Machine reboots** | pm2/Task Scheduler restarts agent; Spotify must auto-start too (see Step 7) |
| **Config file invalid** | Agent refuses to start with validation error |
| **API rate limit** | 1 call/minute is well within Spotify's limits |
| **Overlapping rules** | Highest priority wins |
| **Override active** | Schedule is bypassed until override expires or is cleared |

---

## Future Improvements

- **Web UI** — simple dashboard to view schedule, set overrides, see logs
- **SQLite state** — persist decisions and history for analytics
- **Holiday calendar** — auto-apply special schedules for Israeli holidays
- **Volume scheduling** — adjust volume by time of day
- **Multi-zone** — control different areas with different music
- **Slack/Telegram bot** — override via chat message
- **Config hot-reload** — watch `schedule.json` for changes without restart
- **Remote config sync** — pull schedule from a cloud endpoint
- **Spotify playlist rotation** — shuffle between multiple playlists per mood
- **Fade transitions** — lower volume, switch, raise volume

---

## Project Structure

```
music-scheduler/
├── src/
│   ├── config/
│   │   ├── types.ts          # Type definitions
│   │   ├── loader.ts         # Config loading and validation
│   │   └── schedule.json     # Schedule rules (edit this!)
│   ├── spotify/
│   │   ├── auth-setup.ts     # One-time OAuth setup
│   │   └── client.ts         # Spotify API client
│   ├── scheduler/
│   │   ├── engine.ts         # Schedule evaluation logic
│   │   └── controller.ts     # Playback decision engine
│   ├── server/
│   │   └── health.ts         # HTTP health & control server
│   ├── utils/
│   │   └── logger.ts         # Winston logger setup
│   └── index.ts              # Main entry point
├── logs/                      # Auto-created log files
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```
