# Vynk Social — Production Deployment Guide

This guide describes how to deploy Vynk Social to a production cloud server (AWS, DigitalOcean, Hetzner, Linode, GCP) with HTTPS, automatic renewal, persistent data volumes, and security hardening.

---

## 1. Pre-Deployment Readiness Checklist

Before going live, confirm that:
- [x] All automated tests pass (99/99 automated tests passed).
- [x] Frontend builds cleanly with zero TypeScript errors (`tsc && vite build`).
- [x] Backend compiles to production JavaScript (`tsc`).
- [x] Dual health check endpoints (`/health` and `/api/health`) return HTTP 200 with `database: connected`.
- [x] SQLite WAL mode and foreign key constraints are enabled.
- [x] Production security headers (`X-Content-Type-Options`, `X-Frame-Options`, `HSTS`) are active.
- [x] Rate limiting is enabled on `/api/auth` and global `/api`.
- [x] File upload size limits (30MB) and MIME whitelisting are enforced.
- [x] A cryptographically random `JWT_SECRET` has been generated for production.

---

## 2. Server Requirements & Operating System

- **Recommended OS:** Ubuntu 22.04 LTS or 24.04 LTS
- **Minimum Specs:** 2 vCPUs, 2 GB RAM, 25 GB SSD storage
- **Recommended Specs:** 2–4 vCPUs, 4 GB RAM, 50 GB NVMe SSD storage

---

## 3. Step-by-Step Server Setup (Ubuntu Linux)

### Step 3.1: System Updates & Essential Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban
```

### Step 3.2: Configure Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### Step 3.3: Install Docker & Docker Compose
```bash
# Add Docker's official GPG key & repository
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker on system boot
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. Deploying the Application

### Step 4.1: Clone the Repository
```bash
cd /opt
sudo git clone https://github.com/your-org/vynk-social.git vynk
cd /opt/vynk
```

### Step 4.2: Configure Production Environment
```bash
sudo cp production_environment.example .env
sudo nano .env
```

Ensure the following variables are set:
```ini
NODE_ENV=production
CLIENT_URL=https://vynk.yourdomain.com
CORS_ORIGIN=https://vynk.yourdomain.com
JWT_SECRET=your_generated_64_char_hex_secret
STORAGE_PROVIDER=local
AI_PROVIDER=local_semantic
```

### Step 4.3: Build & Launch Containers
```bash
sudo docker compose up -d --build
```

Verify healthy status:
```bash
sudo docker compose ps
```

---

## 5. Setting up SSL / HTTPS with Let's Encrypt (Certbot)

To terminate SSL publicly, configure Nginx on the host as a reverse proxy:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/vynk.conf`:
```nginx
server {
    server_name vynk.yourdomain.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 35M;
    }
}
```

Enable the configuration and obtain the SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/vynk.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d vynk.yourdomain.com
```

Certbot will automatically install SSL certificates and set up automatic renewal via systemd timer.

---

## 6. Scaling & Architecture Evolution Path

### 6.1 Understanding SQLite Single-Writer Concurrency
- SQLite is an **in-process, file-backed database**. It delivers high read performance ($> 50,000$ read QPS) and handles transactional writes via WAL mode.
- **Architectural Rule:** Do **NOT** run multiple backend container replicas pointing to the same SQLite file over a network filesystem (e.g., NFS, CIFS), as file locking across network boundaries can lead to corruption. Run a single backend container instance per SQLite database.
- For 99% of social apps starting out ($< 50,000$ active users), a single container running SQLite WAL on fast NVMe storage easily handles the full workload.

### 6.2 When Scaling Beyond a Single Node:
When user traffic requires multi-container horizontal autoscaling across multiple virtual machines or Kubernetes pods:
1. **Database Migration to PostgreSQL:**
   - Vynk's database schema ([`database/schema.sql`](file:///c:/Users/Tanush%20Shahi/OneDrive/Desktop/Social%20Media%20App/database/schema.sql)) is already ANSI-SQL compliant.
   - Set `DATABASE_URL=postgresql://user:password@pg-host:5432/vynk` and switch query executor from `better-sqlite3` to `pg` or `prisma/knex`.
2. **Object Storage Migration for Media:**
   - Move from local container volume `/uploads` to S3 / Cloudflare R2 / Google Cloud Storage.
   - Configure AWS S3 presigned URLs in [`backend/src/services/storageService.ts`](file:///c:/Users/Tanush%20Shahi/OneDrive/Desktop/Social%20Media%20App/backend/src/services/storageService.ts).
   - Set `STORAGE_PROVIDER=s3`.
