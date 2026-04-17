# ✕○ Arena — Multiplayer Tic-Tac-Toe

A production-ready, real-time multiplayer Tic-Tac-Toe game with **server-authoritative architecture** powered by [Nakama](https://heroiclabs.com/nakama/).

## Architecture

```
┌─────────────────┐    WebSocket / REST    ┌────────────────────┐
│   React Client  │ ◄────────────────────► │   Nakama Server    │
│   (Vite + TS)   │                        │   (TS Runtime)     │
│   Port: 3000    │                        │   Port: 7350       │
└─────────────────┘                        └────────┬───────────┘
                                                    │
                                           ┌────────▼───────────┐
                                           │    PostgreSQL 16    │
                                           │    Port: 5432       │
                                           └────────────────────┘
```

### Design Decisions

- **Server-Authoritative**: All game logic (move validation, win detection, turn management) runs on the Nakama server. Clients only send intents; the server validates and broadcasts state.
- **Nakama TypeScript Runtime**: Game logic written in TypeScript, compiled to JS, loaded by Nakama's JS runtime.
- **Real-time via WebSocket**: Match state updates are pushed to clients instantly via Nakama's real-time multiplayer system.
- **Matchmaking**: Players find games via an RPC that searches for open matches or creates new ones.

## Project Structure

```
xo-arena/
├── client/                     # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Nakama client setup
│   │   ├── pages/              # Login, Lobby, Game, Leaderboard
│   │   └── types.ts            # Shared client types
│   ├── .env.example            # Environment variables template
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── server/                     # Nakama TypeScript runtime
│   ├── src/
│   │   ├── main.ts             # Entry point — registers RPCs, match handler, leaderboard
│   │   ├── match_handler.ts    # Server-authoritative match logic (init, join, loop, leave)
│   │   └── types.ts            # Shared server types & constants
│   ├── build/                  # Compiled JS (mounted into Nakama container)
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml          # Nakama + PostgreSQL
├── local.yml                   # Nakama runtime config
├── .gitignore
└── README.md
```

## Features

### Core
- [x] Server-authoritative game logic (all validation server-side)
- [x] Real-time multiplayer via WebSocket
- [x] Automatic matchmaking (find or create matches)
- [x] Player authentication (device-based)
- [x] Graceful disconnect handling

### Bonus
- [x] Concurrent game support (isolated match rooms)
- [x] Leaderboard system (wins, losses, streaks, global ranking)
- [x] Timer-based game mode (30s per turn, auto-forfeit on timeout)
- [x] Responsive mobile-first UI

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

## Quick Start

Everything runs with a single command:

```bash
docker compose up -d
```

This starts all 4 services automatically:
1. **PostgreSQL** — database
2. **server-build** — compiles the Nakama TypeScript runtime (runs once, then exits)
3. **Nakama** — game server (waits for DB + build to finish)
4. **Client** — React dev server

Once everything is up:
- Game: `http://localhost:3000`
- Nakama Console: `http://localhost:7351` (login: `admin` / `password`)

Open the game in two browser tabs with different nicknames to test multiplayer.

## Environment Variables (Client)

| Variable | Default | Description |
|---|---|---|
| `VITE_NAKAMA_HOST` | `127.0.0.1` | Nakama server host |
| `VITE_NAKAMA_PORT` | `7350` | Nakama HTTP/WS port |
| `VITE_NAKAMA_KEY` | `defaultkey` | Nakama server key |
| `VITE_NAKAMA_SSL` | `false` | Use SSL for Nakama connection |

## API / Server Configuration

| Service | Port | Description |
|---|---|---|
| Nakama HTTP/WS | 7350 | Client API + WebSocket |
| Nakama gRPC | 7349 | gRPC API |
| Nakama Console | 7351 | Admin dashboard |
| PostgreSQL | 5432 | Database |

### RPCs

| RPC | Payload | Description |
|---|---|---|
| `find_match` | `{ "mode": "classic" \| "timed" }` | Find or create a match |
| `get_player_stats` | `{ "userId"?: string }` | Get player win/loss stats |
| `get_leaderboard` | `{ "limit"?: number }` | Get top players |

## Testing Multiplayer

1. Run `docker compose up -d`
2. Wait ~30 seconds for all services to start
3. Open two browser tabs at `http://localhost:3000`
4. Enter different nicknames in each tab
5. Click "Play Now" in both — they'll be matched together
6. Play the game!

## Deployment

### Nakama Server
Deploy via Docker on any cloud provider (AWS EC2, GCP Compute, DigitalOcean Droplet, etc.):

```bash
docker compose -f docker-compose.yml up -d
```

Update `local.yml` for production settings (log level, token expiry, etc.).

### Frontend
Deploy to Vercel/Netlify:

```bash
cd client
npm run build
# Deploy the dist/ folder
```

Set the `VITE_NAKAMA_*` env vars to point to your deployed Nakama server.
