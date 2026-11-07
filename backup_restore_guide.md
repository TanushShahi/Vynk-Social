# Vynk Social — Database & Media Backup and Disaster Recovery Guide

This guide details the procedures for backing up and restoring the Vynk Social SQLite database and persistent media uploads without downtime or data corruption.

---

## 1. Important SQLite Concurrency Rules

Vynk Social runs SQLite in **Write-Ahead Logging (WAL)** mode. In this mode:
- Live transactions are written to `vynk.db-wal` while queries read from `vynk.db` and the WAL index `vynk.db-shm`.
- **Never simply copy `vynk.db` alone** while the server is active, because uncheckpointed transactions in `vynk.db-wal` will be missed, resulting in data inconsistency.
- Use one of the three verified backup methods below.

---

## 2. Safe Live Database Backup Methods

### Method A: Docker Container Live Backup (Recommended for Production)
Execute SQLite's native online backup API from inside the running container:

**Linux / macOS:**
```bash
# Timestamped backup filename
BACKUP_FILE="vynk_backup_$(date +%Y%m%d_%H%M%S).db"

# Execute hot backup inside container
docker compose exec -T backend node -e "
  const Database = require('better-sqlite3');
  const db = new Database('/app/backend/data/vynk.db');
  db.backup('/app/backend/data/live_backup.db').then(() => {
    console.log('Online backup completed safely.');
    process.exit(0);
  });
"

# Copy the backup file to host
docker cp vynk_backend:/app/backend/data/live_backup.db ./backups/$BACKUP_FILE

# Remove temporary container backup
docker compose exec -T backend rm /app/backend/data/live_backup.db
```

**Windows PowerShell:**
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "vynk_backup_$timestamp.db"

# Create local backups folder if needed
if (!(Test-Path -Path "./backups")) { New-Item -ItemType Directory -Path "./backups" }

# Trigger hot backup inside container
docker compose exec -T backend node -e "const Database = require('better-sqlite3'); const db = new Database('/app/backend/data/vynk.db'); db.backup('/app/backend/data/live_backup.db').then(() => process.exit(0));"

# Copy backup out of container
docker cp vynk_backend:/app/backend/data/live_backup.db "./backups/$backupFile"

# Clean temporary file
docker compose exec -T backend rm /app/backend/data/live_backup.db

Write-Host "Backup saved to ./backups/$backupFile"
```

---

### Method B: Native Host Backup (Non-Docker / Local Development)
Using the built-in backup script:

**Windows PowerShell:**
```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\nodejs;$env:Path"
cd "Social Media App\backend"
node -e "
  const Database = require('better-sqlite3');
  const db = new Database('./data/vynk.db');
  db.backup('./data/vynk_backup.db').then(() => {
    console.log('Host backup created at ./data/vynk_backup.db');
  });
"
```

---

## 3. Media Uploads Backup

User images, avatars, and videos reside in the `/app/backend/uploads` directory (mounted to volume `vynk_media_uploads`).

### Linux Backup:
```bash
# Archive all uploads
docker run --rm \
  -v vynk_media_uploads:/uploads:ro \
  -v $(pwd)/backups:/backup \
  alpine tar -czf /backup/vynk_uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /uploads .
```

### Windows PowerShell Backup:
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker cp vynk_backend:/app/backend/uploads "./backups/uploads_$timestamp"
Write-Host "Media directory saved to ./backups/uploads_$timestamp"
```

---

## 4. Disaster Recovery & Restoration Procedure

Follow these steps to restore from a backup file:

### Step 1: Stop Active Containers
```bash
docker compose stop backend
```

### Step 2: Restore the Database File

**Linux:**
```bash
# Copy backup into container data path
docker cp ./backups/vynk_backup_YYYYMMDD_HHMMSS.db vynk_backend:/app/backend/data/vynk.db

# Clear any stale WAL files
docker compose run --rm backend sh -c "rm -f /app/backend/data/vynk.db-wal /app/backend/data/vynk.db-shm"
```

**Windows PowerShell:**
```powershell
# Copy backup file
docker cp "./backups/vynk_backup_20261107_120000.db" vynk_backend:/app/backend/data/vynk.db

# Clear any stale WAL logs
docker compose run --rm backend sh -c "rm -f /app/backend/data/vynk.db-wal /app/backend/data/vynk.db-shm"
```

### Step 3: Restore Media Uploads (If Recovering From Complete Loss)

**Linux:**
```bash
docker run --rm \
  -v vynk_media_uploads:/uploads \
  -v $(pwd)/backups:/backup \
  alpine tar -xzf /backup/vynk_uploads_YYYYMMDD_HHMMSS.tar.gz -C /uploads
```

**Windows PowerShell:**
```powershell
docker cp "./backups/uploads_20261107_120000/." vynk_backend:/app/backend/uploads/
```

### Step 4: Restart Backend & Verify Health
```bash
docker compose start backend
docker compose ps
```

Verify database integrity:
```bash
docker compose exec backend node -e "
  const db = require('better-sqlite3')('/app/backend/data/vynk.db');
  const res = db.pragma('integrity_check', { simple: true });
  console.log('Database integrity check:', res);
  if (res !== 'ok') process.exit(1);
"
```
