# Deployment Guide

## Architecture
```
┌──────────────────┐       HTTPS/WSS        ┌──────────────────────┐
│   React Client   │ ◄────────────────────►  │   Nakama Server      │
│   Vercel (free)  │                         │   Fly.io (free)      │
│                  │                         │   + Fly Postgres     │
└──────────────────┘                         └──────────────────────┘
```

## Part A: Deploy Nakama Backend on Fly.io

### 1. Install Fly CLI
```bash
# macOS
brew install flyctl

# or
curl -L https://fly.io/install.sh | sh
```

### 2. Sign up & Login
```bash
fly auth signup
# or if you already have an account:
fly auth login
```

### 3. Launch the app
```bash
cd /path/to/xo-arena
fly launch --name xo-arena-nakama --region sin --no-deploy
```
When prompted:
- Would you like to set up a Postgresql database? → **Yes**
- Select configuration → **Development (free)**

### 4. Set the database connection for Nakama
Fly creates a Postgres cluster. Get the connection details:
```bash
fly postgres connect -a xo-arena-nakama-db
```

Then set the Nakama startup command as a secret:
```bash
fly secrets set DATABASE_ADDR="user:password@xo-arena-nakama-db.flycast:5432/nakama"
```

### 5. Update fly.toml entrypoint
The Dockerfile's default entrypoint is Nakama. We need to pass the DB address.
Create a startup script:

```bash
# This is handled by the Dockerfile CMD — see below
```

### 6. Deploy
```bash
fly deploy
```

### 7. Verify
```bash
fly logs
# Should see "XO Arena server module loaded"
```

Your Nakama server will be at: `https://xo-arena-nakama.fly.dev`
- API/WebSocket: `https://xo-arena-nakama.fly.dev` (port 7350 mapped to 443)

---

## Part B: Deploy Frontend on Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
cd client
vercel --prod
```

When prompted:
- Set up and deploy? → **Y**
- Which scope? → Your account
- Link to existing project? → **N**
- Project name? → **xo-arena**
- Directory? → **./client**
- Override settings? → **N**

### 4. Set Environment Variables
Go to https://vercel.com → your project → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `VITE_NAKAMA_HOST` | `xo-arena-nakama.fly.dev` |
| `VITE_NAKAMA_PORT` | `443` |
| `VITE_NAKAMA_KEY` | `defaultkey` |
| `VITE_NAKAMA_SSL` | `true` |

Then redeploy:
```bash
vercel --prod
```

### 5. Your game is live!
- Frontend: `https://xo-arena.vercel.app`
- Backend: `https://xo-arena-nakama.fly.dev`

---

## Alternative: Quick Deploy with Docker on any VPS

If you have a VPS (DigitalOcean, AWS EC2, etc.):

```bash
# SSH into your server
ssh user@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone and run
git clone https://github.com/Shashwatsingh22/xo-arena.git
cd xo-arena
docker compose -f docker-compose.prod.yml up -d
```

Then deploy frontend to Vercel with `VITE_NAKAMA_HOST=your-server-ip`.
