# Vynk Social — Docker Setup & Orchestration Guide

This guide provides end-to-end instructions for building, running, and managing the containerized Vynk Social stack using Docker and Docker Compose.

---

## 1. Architecture Overview

```
                      +------------------------------------------+
                      |         Host Machine / Public Ingress     |
                      |                  Port 80                 |
                      +--------------------+---------------------+
                                           |
                                           v
                             +---------------------------+
                             |       vynk_frontend       |
                             |      (Nginx 1.27 Alpine)  |
                             |  • Serves SPA bundle      |
                             |  • Gzip & Security Headers|
                             +-------------+-------------+
                                           |
                +--------------------------+--------------------------+
                | Proxy /api/ requests                                | Proxy /uploads/ requests
                v                                                     v
  +---------------------------+                         +---------------------------+
  |       vynk_backend        |                         |       vynk_backend        |
  |  (Node.js 20 Debian Slim) |                         |  (Static file server)     |
  |  • Express REST API       |                         |  • Multipart media files  |
  +-------------+-------------+                         +-------------+-------------+
                |                                                     |
                v                                                     v
  +---------------------------+                         +---------------------------+
  |    vynk_db_data Volume    |                         |  vynk_media_uploads Vol   |
  |    (/app/backend/data)    |                         |   (/app/backend/uploads)  |
  |  • vynk.db (WAL mode)     |                         |  • Images & Short Videos  |
  +---------------------------+                         +---------------------------+
```

---

## 2. Prerequisites

- **Docker Engine:** Version 24.0.0 or higher
- **Docker Compose:** Version 2.20.0 or higher
- **Disk Space:** At least 2 GB free disk space for container images and volumes

To verify your installation:

```bash
docker --version
docker compose version
```

---

## 3. Quick Start (Production Build)

### Step 1: Clone and Enter Directory
```bash
cd "Social Media App"
```

### Step 2: Configure Environment Variables
Copy the production environment template:

**Linux / macOS:**
```bash
cp production_environment.example .env
```

**Windows PowerShell:**
```powershell
Copy-Item production_environment.example .env
```

Open `.env` in an editor and generate a cryptographically strong `JWT_SECRET`:
```bash
# Generate 64-char hex key (Linux/macOS)
openssl rand -hex 32

# Or Windows PowerShell:
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```
Paste this into `JWT_SECRET` in `.env`.

### Step 3: Build and Start Containers
```bash
docker compose up -d --build
```

### Step 4: Verify Container Health
```bash
docker compose ps
```
Both containers will report `healthy`:
```
NAME            IMAGE                        STATUS                    PORTS
vynk_backend    vynk-social-backend:latest   Up (healthy)              0.0.0.0:5000->5000/tcp
vynk_frontend   vynk-social-frontend:latest  Up (healthy)              0.0.0.0:80->80/tcp
```

### Step 5: Access the Application
Open your web browser and navigate to:
- **Application Frontend:** `http://localhost` (or `http://localhost:80`)
- **Backend API Direct:** `http://localhost:5000/api/health`

---

## 4. Persistent Storage Management

Vynk Social mounts two named Docker volumes to prevent data loss on restarts:

1. **`vynk_db_data`** (`/app/backend/data`): Contains `vynk.db`, `vynk.db-wal`, and `vynk.db-shm`.
2. **`vynk_media_uploads`** (`/app/backend/uploads`): Stores uploaded user photos, avatars, and videos.

### Inspecting Volumes:
```bash
docker volume inspect vynk_db_data
docker volume inspect vynk_media_uploads
```

---

## 5. Routine Operations & Maintenance

### View Live Logs:
```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend
```

### Restarting Containers:
```bash
# Graceful stop and start (data preserved)
docker compose restart
```

### Stopping Containers:
```bash
# Stop containers without removing volumes
docker compose down

# WARNING: NEVER pass -v unless you intend to delete the database and uploads
# docker compose down -v  <-- WILL DELETE PERSISTENT DATA
```

### Running Commands Inside Container:
```bash
# Access backend shell
docker compose exec backend sh

# Run database integrity check inside container
docker compose exec backend node -e "
  const db = require('better-sqlite3')('/app/backend/data/vynk.db');
  console.log('Integrity check:', db.pragma('integrity_check', { simple: true }));
"
```
