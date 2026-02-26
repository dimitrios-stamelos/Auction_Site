# Auction App

Full-stack auction marketplace built as a production-style monorepo with:
- a React frontend,
- a Node/Express API,
- a PostgreSQL database via Prisma,
- and a Python recommendation microservice (matrix factorization).

## What This Project Demonstrates

- Role-based product design (`VISITOR`, `BIDDER`, `SELLER`, `ADMIN`)
- End-to-end auction lifecycle (create, edit/delete constraints, bidding, closing)
- Auth + authorization with JWT middleware
- Multi-service architecture (Node API + Python ML service)
- Practical backend resilience (recommendation fallback if ML service is unavailable)
- Admin moderation workflows (user approvals and controls)
- Data export features (`JSON` and eBay-style `XML`)

## Architecture

```text
Frontend (React/Vite, :5173)
        |
        v
Backend API (Express/Prisma, :5050) -----> Recommendation Service (FastAPI, :8090)
        |
        v
PostgreSQL (:5432)
```

## Tech Stack

- Frontend: React 19, React Router, MUI, Axios, Vite
- Backend: Node.js, Express, Prisma ORM, JWT, Multer
- Database: PostgreSQL
- ML Service: FastAPI + NumPy matrix factorization recommender
- Dev Tooling: Docker Compose, Concurrently, Nodemon

## Local Setup

### 1. Prerequisites

- Node.js 20+
- npm 10+
- Python 3.12+ (recommended for the recommender service)
- Docker Desktop (for PostgreSQL)

### 2. Clone and install dependencies

```bash
git clone <your-repo-url>
cd Auction-App

npm install
npm install --prefix backend
npm install --prefix frontend
npm install --prefix recommendations
```

### 3. Start PostgreSQL

```bash
docker compose up -d db
```

Optional database UI:

```bash
docker compose up -d adminer
```

Adminer runs on `http://localhost:8080`.

### 4. Configure backend environment

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:secret@localhost:5432/auctiondb?schema=public"
JWT_SECRET="change_me_in_production"
FRONTEND_URL="http://localhost:5173"
PORT=5050

# Optional:
# RECOMMENDER_URL="http://localhost:8090"
# ADMIN_USERNAME="admin"
# ADMIN_EMAIL="admin@example.com"
# ADMIN_PASSWORD="admin123"
```

### 5. Run the full app

From the repo root:

```bash
npm run dev
```

This starts:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5050`
- Recommender API: `http://127.0.0.1:8090`

Notes:
- On first startup, the recommender service creates a Python virtual environment and installs dependencies automatically.
- Backend dev startup runs `prisma db push` and seeding logic.

### 6. Sign in / test flow

- Default seeded admin (if no admin exists yet):
  - email: `admin@example.com`
  - password: `admin123`
- Register a new user from the UI and approve it from the admin panel.

## Key API Surfaces

- Auth: `/auth/register`, `/auth/login`
- Auctions: `/auctions`, `/auctions/:id`, `/auctions/:id/bids`, `/auctions/recommendations`
- Admin: `/admin/users`, `/admin/users/:id/approve`
- Messaging/Chat: `/messages/*`, `/chats/*`
- Exports: `/export/auctions.json`, `/export/auctions.xml` (admin-only)

## Recommendation Service

The recommender service lives in `recommendations/` and exposes:
- `GET /health`
- `POST /recommendations`
- `POST /interactions`
- `POST /train`
- `GET /popular`

The Node backend:
- sends bid interactions to the recommender,
- fetches personalized recommendations,
- falls back to popularity heuristics if the service is unavailable.

## Project Structure

```text
Auction-App/
├── frontend/          # React client
├── backend/           # Express API + Prisma
├── recommendations/   # FastAPI recommender
└── docker-compose.yml # Postgres + Adminer
```

## Roadmap

- Add automated tests (unit/integration/e2e)
- Add CI pipeline (lint + test + type checks)
- Add Dockerfiles for backend/frontend/recommender for one-command deployment
- Add observability (structured logs, traces, health dashboards)

