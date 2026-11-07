# Vynk Social — No-Docker Production Deployment Guide
## Full-Stack Deployment: Render (Backend) + Vercel (Frontend) + SQLite (Persistent Storage)

This guide provides step-by-step instructions for deploying Vynk Social to the web **without Docker Desktop or any container runtime on your Windows PC**.

---

## Architecture Summary

```
   [User Browser / Mobile Device]
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌─────────────────┐ ┌──────────────────────────────────────────────┐
│  Vercel Edge    │ │  Render Cloud Web Service (Node.js 20)       │
│  (Frontend)     │ │  (Backend REST API + Local Semantic AI v4)   │
│                 │ │                                              │
│ • Vite React SPA│ │ • Express API listening on port 10000        │
│ • vercel.json   │ │ • Security Headers, Rate Limiting, CORS      │
│ • HTTPS Enabled │ │ • Native better-sqlite3 engine               │
└────────┬────────┘ └──────────────────────┬───────────────────────┘
         │                                 │
         │ Cross-Origin HTTPS Requests     ▼
         └─────────────────────────► ┌───────────────────────────┐
                                     │  Render Persistent Disk   │
                                     │  Mounted at: /var/data    │
                                     │                           │
                                     │  • /var/data/vynk.db (WAL)│
                                     │  • /var/data/uploads/     │
                                     └───────────────────────────┘
```

---

## Part 1: GitHub Repository Setup

Deploying to Render and Vercel requires your project to be pushed to a GitHub repository.

### Step 1.1: Verify Git Status and Exclusions
Make sure sensitive files, build artifacts, and local WAL locks are not tracked. Check your `.gitignore`:

```bash
# In your Windows PowerShell terminal:
cd "c:\Users\Tanush Shahi\OneDrive\Desktop\Social Media App"
git status
```

Confirm that `.gitignore` includes:
```gitignore
node_modules/
dist/
frontend/dist/
backend/dist/
.env
.env.local
backend/data/*.db-wal
backend/data/*.db-shm
backend/uploads/*
!.gitkeep
```

### Step 1.2: Commit and Push
```powershell
git add .
git commit -m "chore: prepare Vynk Social for Render and Vercel deployment"

# If you haven't linked to GitHub yet:
# 1. Create a new private or public repository on https://github.com/new
# 2. Add remote and push:
# git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/vynk-social.git
# git branch -M main
# git push -u origin main
```

---

## Part 2: Backend Deployment on Render

Render will host the Node.js Express backend and provide a **Persistent Disk** for SQLite and uploaded media.

### Option A: Dashboard Setup (Recommended)

1. Navigate to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your **GitHub repository** (`vynk-social`).
3. Configure the service parameters:
   - **Name:** `vynk-backend`
   - **Region:** `Oregon (US West)` or `Frankfurt (EU Central)`
   - **Branch:** `main`
   - **Root Directory:** `backend` *(CRITICAL: Type `backend` so Render builds from the backend folder)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Starter` ($7/month) — *Required for Persistent Disks*.
4. **Attach Persistent Disk:**
   - Scroll down to the **Disks** section.
   - Click **Add Disk**.
   - **Name:** `vynk-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB` (or larger if expecting heavy video uploads)
5. **Set Environment Variables:**
   Under the **Environment Variables** tab, add:

   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production security & optimizations |
   | `PORT` | `10000` | Render standard port |
   | `DB_PATH` | `/var/data/vynk.db` | Points to SQLite database on persistent disk |
   | `UPLOAD_DIR` | `/var/data/uploads` | Stores uploaded images/videos on persistent disk |
   | `JWT_SECRET` | *(Click "Generate" or paste 64-char hex)* | Generates cryptographic signing key |
   | `JWT_EXPIRES_IN` | `7d` | Token session validity |
   | `CLIENT_URL` | `https://vynk.vercel.app` | Replace with your actual Vercel domain |
   | `CORS_ORIGIN` | `https://vynk.vercel.app` | Permitted frontend origins |
   | `STORAGE_PROVIDER` | `local` | Uses the attached persistent disk |
   | `AI_PROVIDER` | `local_semantic` | Built-in zero-config local semantic NLP engine |
   | `AI_MODEL` | `vynk-semantic-nlp-v4` | Active AI model name |

6. Click **Create Web Service**.
7. Once deployed, note your service URL (e.g., `https://vynk-backend.onrender.com`).
8. Verify health: Open `https://vynk-backend.onrender.com/health` in your browser. You should see:
   ```json
   {
     "status": "ok",
     "platform": "Vynk Social",
     "version": "4.2.0",
     "database": "connected"
   }
   ```

### Option B: Render Blueprint (`render.yaml`)
If preferred, Render can automatically parse the [`render.yaml`](file:///c:/Users/Tanush%20Shahi/OneDrive/Desktop/Social%20Media%20App/render.yaml) file included in the repository by selecting **New +** → **Blueprint**.

---

## Part 3: Frontend Deployment on Vercel

Vercel will host the React Single Page Application (SPA) on its global Edge Network.

### Step-by-Step Vercel Deployment:

1. Navigate to [vercel.com](https://vercel.com/) and click **Add New...** → **Project**.
2. Select your GitHub repository (`vynk-social`).
3. In the **Configure Project** screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `frontend`.
   - **Build Command:** `npm run build` *(runs `tsc && vite build`)*
   - **Output Directory:** `dist`
4. **Environment Variables:**
   Add the following environment variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://vynk-backend.onrender.com` *(use your actual Render backend URL without trailing slash)*
5. Click **Deploy**.
6. Vercel will build the frontend in ~25 seconds and assign a production domain (e.g., `https://vynk-social.vercel.app`).
7. **Update Render CORS:** Once you have your exact Vercel URL, go back to Render and ensure `CLIENT_URL` and `CORS_ORIGIN` match your Vercel domain.

---

## Part 4: Persistent Storage & SQLite Safety on Cloud Hosts

### How SQLite Persistence Works on Render:
1. When you attach a Render Disk at `/var/data`, Render mounts an isolated, persistent block volume formatted with ext4.
2. In `backend/src/config/db.ts`, setting `DB_PATH=/var/data/vynk.db` causes the database and its WAL file (`vynk.db-wal`) to be created directly on this persistent disk.
3. When Render restarts your backend service or deploys code updates, the container root filesystem is refreshed, but `/var/data` remains untouched and re-attaches immediately.
4. **Uploaded Photos & Videos:** Stored at `/var/data/uploads`, persisting indefinitely across all deployments.

### Initial Seed Data:
If `/var/data/vynk.db` is empty upon first boot, `server.ts` automatically runs `runSeed()` to initialize the database schema and default exploration content.

---

## Part 5: Technical Evaluation — SQLite vs PostgreSQL

> [!NOTE] Preserving SQLite Without Forced Migration
> Per your instructions, **SQLite has been 100% preserved**. There is no immediate technical requirement to migrate to PostgreSQL.

### When SQLite is Best:
- Up to 50,000 daily active users with a single backend service.
- Zero server maintenance, zero database connection pooling overhead.
- In-memory speed ($< 1\text{ms}$ query latency) via WAL mode.

### When PostgreSQL Would Be Recommended (Future Milestone):
- If user traffic grows to the point where multiple Render backend instances (horizontal autoscaling) are required. SQLite cannot safely share a single file across multiple containers over a network.
- If you wish to use Render's 100% Free tier (since Render's Free tier does not support persistent disks, whereas Supabase or Neon offer free managed PostgreSQL).
- *No migration will take place without your explicit prior review and consent.*

---

## Part 6: Post-Deployment Smoke Test Checklist

Once both Render and Vercel deployments report active:

- [ ] **1. Health Check:** Visit `https://your-backend.onrender.com/health` $\rightarrow$ Confirm HTTP 200 and `"database": "connected"`.
- [ ] **2. Frontend Load:** Visit `https://your-app.vercel.app` $\rightarrow$ Confirm landing page and feeds render without white screen.
- [ ] **3. Registration:** Create a new test account $\rightarrow$ Confirm redirect to feed and session persistence on page refresh.
- [ ] **4. Create Moment Post:** Post a text update with a mood chip $\rightarrow$ Confirm post appears immediately in feed.
- [ ] **5. Photo Upload:** Upload a photo with a caption $\rightarrow$ Confirm photo persists and renders cleanly.
- [ ] **6. WAVES Reaction:** Click a reaction emoji on any post $\rightarrow$ Confirm counter updates in real time.
- [ ] **7. Restart Resilience:** Trigger a manual restart on Render $\rightarrow$ Re-open Vercel app $\rightarrow$ Confirm all posts and accounts remain intact.
