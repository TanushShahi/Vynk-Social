# Vynk Social — Next-Generation Human Connection Platform
> **"Share moments, discover people through interests, and interact meaningfully instead of chasing likes."**

[![Tests](https://img.shields.io/badge/tests-103%20passed-success?style=flat-square)](backend/tests)
[![Node](https://img.shields.io/badge/node-v20%2B-blue?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.4-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-18.2-cyan?style=flat-square)](https://react.dev/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

---

## ✦ 1. Product Vision & Original Identity

**Vynk** is an original social networking platform built from the ground up with a futuristic cyber-luxe visual identity. Rather than duplicating traditional engagement traps and algorithmic echo chambers, Vynk transforms digital human connection:

- **Original Brand & Cyber-Luxe Aesthetic**: Dark aesthetic (`#080a14`), glowing cyan-to-violet gradients, glassmorphism, aerodynamic wing logo mark, and fluid micro-interactions.
- **Permanent UID System**: Every user receives a unique permanent identifier (e.g., `@vynk.t7x4k9`) with a glowing personalized QR Card for fast sharing and physical/digital connection.
- **"Mood Feed"**: Instead of an endless addictive scroll, users choose their active mindset (*Motivated*, *Travel*, *Tech*, *Creative*, *Chill*, *Adventure*, *Curious*, or *For You*) to dynamically tailor their feed.
- **"WAVES" Social Reaction Spectrum**: Replaces the generic "Like" with 7 meaningful human emotional reactions:
  - ❤️ **Loved it** (Heartfelt warmth & appreciation)
  - ✦ **Inspired me** (Sparks creative or life motivation — contributes to profile Inspired Score)
  - 😂 **Made me laugh** (Brightens the day)
  - 💡 **Learned something** (New insight or knowledge gained)
  - 🤝 **Relatable** (Shared human resonance)
  - 🔥 **Wow** (Awe & craftsmanship)
  - 🔮 **Curious** (Intriguing inquiry)
- **Moment Capsules**: Collaborative, time-locked shared albums where groups build collective memories with AI chronological narrative synthesis and year-in-review summaries.
- **Social Rooms & Live Polls**: Interest-based real-time community spaces with interactive polls and shared media walls.
- **Vynk Vibes**: Vertical short-form immersive video moments.
- **Mindful Social Health & Badges**: Screen-time balance tracking, reflective milestones, and community achievements (Mindful Pioneer, Connection Catalyst).
- **AI Content Assistant & Multimodal Moderation**: 8 distinct caption writing tones, hashtag generator, accessibility image understanding, and a 5-category safety policy pipeline with an appeal resolution workflow.

---

## ✦ 2. System Architecture

```
/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment, SQLite WAL database, Secrets
│   │   ├── controllers/     # Auth, User, Post, Waves, Comments, AI, Rooms, Capsules
│   │   ├── middleware/      # JWT Authentication, Rate Limiting, Security Headers
│   │   ├── routes/          # Express API route modules
│   │   ├── services/        # Recommendation Engine, AI Providers, Storage, Moderation
│   │   ├── utils/           # UID Generator, Constants, Helpers
│   │   ├── db/              # Seed data & automated migrations
│   │   ├── app.ts           # Express Application definition
│   │   └── server.ts        # Server entry point with WAL graceful shutdown
│   ├── tests/               # 8 automated test suites (103 / 103 tests passing)
│   ├── Dockerfile           # Multi-stage production container
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (PostCard, StoryTray, MoodFilterBar, Modals)
│   │   ├── context/         # AuthContext, MoodContext
│   │   ├── pages/           # FeedPage, ProfilePage, DiscoverPage, RoomsPage, MessagesPage
│   │   ├── services/        # Typed API client with dynamic VITE_API_URL routing
│   │   └── types/           # Shared UI contracts
│   ├── Dockerfile           # Multi-stage Nginx container
│   ├── nginx.conf           # Reverse proxy routing & gzip compression
│   ├── vercel.json          # Vercel SPA routing rewrites
│   └── vite.config.ts       # Vite configuration with dev proxy
├── database/
│   └── schema.sql           # ANSI SQL Schema (SQLite & PostgreSQL compatible)
├── shared/
│   └── types.ts             # Single source of truth TypeScript types
├── docker-compose.yml       # Multi-container orchestration topology
└── render.yaml              # Render Cloud Blueprint definition
```

---

## ✦ 3. Feature Matrix Across Phases 1–4

| Feature Category | Implementation Details |
|---|---|
| **Identity & Authentication** | Unique permanent UID (`vynk.<6_alphanumeric>`), bcrypt password hashing, stateless JWT session tokens, route guards, account privacy toggle, reciprocal blocking enforcement. |
| **User Discovery & Social Graph** | Exact & partial UID search, relational followers/following counts, follow request approval pipeline for private accounts, real-time activity notifications. |
| **Posts & Media Feed** | Multipart/form-data media uploads (30 MB max, MIME whitelisting, UUID naming), threaded comments & nested replies, author post deletion, "Hide from Feed" with instant undo. |
| **WAVES Reaction System** | 7 emotion dimensions, toggle behavior, live aggregation summaries, and user Inspired Score metrics. |
| **Intelligent Mood Feed** | 8 mood filters, transparent scoring algorithm, negative feedback penalties, and topic exclusion preferences. |
| **Moment Capsules & Recaps** | Collaborative capsules, memory additions, AI chronological narrative generation, and annual recaps requiring explicit confirmation. |
| **Social Rooms & Polls** | Topic-based community chat rooms, member roles, and interactive poll voting with single-vote enforcement. |
| **AI Content Assistant** | 8 writing tones (*Friendly*, *Witty*, *Poetic*, *Minimalist*, *Inspirational*, *Humorous*, *Analytical*, *Rebellious*), dynamic hashtags, and zero-config local semantic NLP fallback. |
| **Multimodal Moderation** | 5-category violation scoring (Harassment, Hate Speech, NSFW, Violence, Spam), borderline review queue, and user appeal pipeline. |
| **Creator AI Analytics** | Engagement breakdowns, peak activity times, and AI concept brainstorming derived strictly from live database records. |
| **Responsive UI** | Mobile bottom navigation, touch targets $\ge 44\text{px}$, tablet adaptive grids, and desktop 3-column cyber-luxe layout. |

---

## ✦ 4. Deployment Options

Vynk Social supports two deployment methodologies:

### Option A: No-Docker Cloud Deployment (Recommended)
Deploy without Docker Desktop on your workstation:
- **Backend on Render:** Native Node.js 20 Web Service with an attached Persistent Disk at `/var/data` for zero-loss SQLite storage and user media uploads.
- **Frontend on Vercel:** Static React Single Page Application deployed to Vercel's global Edge Network with client-side routing rewrites (`vercel.json`).
- *See the complete step-by-step instructions in [`no_docker_deployment_guide.md`](no_docker_deployment_guide.md).*

### Option B: Docker Compose Orchestration
Run the containerized stack on any VPS or local Linux server:
- Multi-stage Node.js 20 backend + Nginx 1.27 Alpine frontend.
- Persistent named volumes: `vynk_db_data` and `vynk_media_uploads`.
- Internal isolated bridge network with automated container health checks.
- *See the complete instructions in [`docker_setup_guide.md`](docker_setup_guide.md).*

---

## ✦ 5. Local Development Quick Start

### Prerequisites
- Node.js (v18.x or v20.x)
- npm (v9.x or v10.x)

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Run Automated Regression Suite
```bash
cd backend
npx tsx --test --test-concurrency=1 tests/phase1.test.ts tests/phase2.test.ts tests/phase3.test.ts tests/bug_fixes.test.ts tests/production_readiness.test.ts tests/phase4_ai.test.ts tests/e2e_interactive_audit.ts tests/persistence_verification.ts
```
*Executes all 103 integration tests across 8 test suites in ~12 seconds.*

### 3. Start Development Servers
**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```
*API runs at `http://localhost:5000` with auto-seeding on first boot.*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*Client runs at `http://localhost:5173` with Vite proxy forwarding `/api` and `/uploads` to port 5000.*

---

## ✦ 6. Testing Credentials & Seed Accounts

Use any of the fictional test accounts:
- **Tanush**: `tanush@vynk.social` / `password123` (UID: `@vynk.t7x4k9`)
- **Aarav Sharma**: `aarav@vynk.social` / `password123` (UID: `@vynk.a8k2m1`)
- **Riya Mehta**: `riya@vynk.social` / `password123` (UID: `@vynk.r3m9p2`)
- **Arjun Verma**: `arjun@vynk.social` / `password123` (UID: `@vynk.a1k8z7`)
- **Sneha Kapoor**: `sneha@vynk.social` / `password123` (UID: `@vynk.s6p4n9`)

*Or click the **Demo Users** button in the navigation header to switch accounts instantly.*

---

## ✦ 7. License

MIT License — see [LICENSE](LICENSE) for details.
