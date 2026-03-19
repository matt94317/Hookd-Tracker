# Hookd-Tracker

This is a Content Creator Campaign Management platform. It could track, analyze real time content statists, manage campaign, content creations and search, match with different available campaigns.

## Docker Commands

### Start / Stop

```bash
# Build images + create containers + start containers
docker-compose up --build

# Build images + create containers + start containers (detached / background)
docker-compose up --build -d

# Stop containers + remove containers (volumes persist, DB data kept)
docker-compose down

# Stop containers + remove containers + remove volumes (DB data deleted)
docker-compose down -v
```

### View Logs

```bash
# Stream logs from all containers
docker-compose logs -f

# Stream logs from a specific container
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Access Containers

```bash
# Open a shell inside the backend container
docker-compose exec backend bash

# Open a shell inside the frontend container
docker-compose exec frontend bash

# Connect to PostgreSQL inside the db container
docker-compose exec db psql -U hookd -d hookd_tracker
```

### Database Migrations

```bash
# Run migrations inside the backend container
docker-compose exec backend flask db upgrade

# Generate a new migration file inside the backend container
docker-compose exec backend flask db migrate -m "description"

# Show migration history inside the backend container
docker-compose exec backend flask db history
```

### Rebuild Images

```bash
# Rebuild image for a specific service
docker-compose build backend
docker-compose build frontend

# Rebuild all images from scratch (no cache)
docker-compose build --no-cache
```

### Full Rebuild (reset DB + schema)

```bash
# Stop containers and delete all data (volumes)
docker compose down -v

# Remove old migration files
rm -rf backend/migrations/versions/*.py

# Build and start all containers
docker compose up -d --build

# Generate new migration from current models
docker compose exec backend flask db migrate -m "initial schema"

# Apply migration to database
docker compose exec backend flask db upgrade

# Populate with seed data
docker compose exec backend python seed.py
```

### Connect ngrok (for OAuth callbacks)

```bash
# Expose backend to the internet
ngrok http 5001

# Update .env with the ngrok URL
# OAUTH_REDIRECT_BASE_URL=https://xxxx.ngrok-free.app

# Restart backend to pick up new env
docker compose up -d backend

# Register the callback URL in Meta/TikTok Developer Console
# https://xxxx.ngrok-free.app/oauth/callback/instagram
# https://xxxx.ngrok-free.app/oauth/callback/tiktok
```

### Ports

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5001 |
| Database | localhost:5432        |

## Mock / Seed Data

Run the seed script to populate the database with test accounts, campaigns, and posts:

```bash
docker-compose exec backend python seed.py
```

The script is idempotent — safe to run multiple times (skips existing records).

### Test Credentials

| Role    | Email               | Password  |
| ------- | ------------------- | --------- |
| Company | company@test.com    | Test1234! |

### What Gets Created

**Company — Acme Brands**
- Campaign: Summer Launch 2026 (Jun 1 – Aug 31, 2026)
- Campaign: Back to School 2026 (Aug 15 – Sep 15, 2026)
- Instagram account (`@alexcreator_ig`) linked to each campaign
- TikTok account (`@alexcreator_tt`) linked to each campaign
- 15 mock posts per account (60 posts total) with randomized engagement metrics
