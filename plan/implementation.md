# Implementation Plan

## Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Frontend  | React.js                        |
| Backend   | Python Flask                    |
| Database  | PostgreSQL                      |
| Server    | AWS EC2                         |
| CI/CD     | GitHub Actions                  |
| Container | Docker / Docker Compose (local) |

## Team Split

| Person | Role            | Scope                                                     |
| ------ | --------------- | --------------------------------------------------------- |
| **A**  | API Integration | OAuth flows, Instagram/TikTok API clients, scheduled jobs |
| **B**  | App Development | DB schema, REST API, frontend, infrastructure             |

### Interface Contract

Both developers agree on these shared boundaries upfront before starting work:

1. **Database schema** -- Person B creates migrations; Person A follows the schema
2. **Internal service interface** -- a shared Python module (`app/services/platform.py`) that Person A implements:

```python
# Person A implements these; Person B calls them from API routes
class PlatformService:
    def get_oauth_url(account_id, channel) -> str
    def handle_oauth_callback(channel, code) -> tokens
    def fetch_posts(account_id) -> list[dict]
    def refresh_token(account_id) -> bool
```

3. **API response format** -- agreed JSON structure for posts data

This allows both to work independently. Person B builds routes/UI using mock data, Person A implements the real platform integrations behind the same interface.

---

## Phase 1: Local Development

**Goal: Fully working app running locally via Docker Compose.**

### Sprint 0: Project Setup (Both, 1 day)

Work together to establish the foundation.

- [x] Initialize Git repo and branching strategy (`main`, `dev`, feature branches)
- [x] Set up project structure:

```
hookd/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routes/          # Flask blueprints
│   │   ├── services/        # Business logic
│   │   │   └── platform.py  # Shared interface (OAuth, fetch)
│   │   └── jobs/            # Scheduled tasks
│   ├── migrations/          # Alembic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # Flask + React + PostgreSQL
└── plan/
```

- [ ] Set up Docker Compose (PostgreSQL + Flask + React)
- [ ] Define and agree on the `PlatformService` interface
- [x] Create DB migrations (all tables from data-schema.md)

---

### Sprint 1: Core Backend + OAuth (2 weeks)

#### Person A: API Integration

- [ ] **Instagram OAuth flow**
  - Build OAuth URL generation
  - Handle callback, exchange code for tokens
  - Store encrypted tokens in `accounts` table
  - Implement token refresh logic
- [ ] **TikTok OAuth flow**
  - Same as above for TikTok
- [ ] **Post fetching -- Instagram**
  - Fetch posts via Graph API (`/me/media`)
  - Map response to `posts` table schema
  - Handle pagination
- [ ] **Post fetching -- TikTok**
  - Fetch videos via TikTok API v2 (`/v2/video/list/`)
  - Map response to `posts` table schema
  - Handle pagination
- [ ] Unit tests with mocked API responses

#### Person B: App Backend + Auth

- [ ] **User authentication**
  - Login / registration endpoints
  - JWT-based session management
  - Role-based access control middleware (admin / company / creator)
- [ ] **Campaign CRUD API**
  - `POST /campaigns` -- create (admin / company)
  - `GET /campaigns` -- list (filtered by role)
  - `GET /campaigns/:id` -- detail
  - `PUT /campaigns/:id` -- update
  - `DELETE /campaigns/:id` -- delete
- [ ] **Campaign Creators API**
  - `POST /campaigns/:id/creators` -- add creators
  - `DELETE /campaigns/:id/creators/:creator_id` -- remove
- [ ] **Account API**
  - `POST /campaigns/:id/accounts` -- add account
  - `GET /campaigns/:id/accounts` -- list
  - `GET /accounts/:id/oauth-url` -- calls Person A's `get_oauth_url()`
  - `GET /oauth/callback/:channel` -- calls Person A's `handle_oauth_callback()`
- [ ] **Posts API**
  - `GET /accounts/:id/posts` -- list posts
  - `GET /campaigns/:id/posts` -- all posts in campaign

---

### Sprint 2: Scheduled Jobs + Frontend (2 weeks)

#### Person A: Scheduled Jobs

- [ ] **Post sync job**
  - Periodic job to fetch new posts for all authorized accounts
  - Upsert posts (avoid duplicates via `platform_post_id`)
  - Update metrics on existing posts
- [ ] **Token refresh job**
  - Check `token_expires_at` for upcoming expirations
  - Auto-refresh tokens
  - Log/alert on refresh failure
- [ ] **Target achievement check**
  - Count posts per account for the current day/month
  - Compare against `daily_target` / `monthly_target` on the account
- [ ] Set up APScheduler or Celery Beat for job scheduling
- [ ] Integration tests with sandbox/test accounts

#### Person B: Frontend

- [ ] **Auth pages** -- Login, Registration
- [ ] **Dashboard** -- Campaign list, summary stats
- [ ] **Campaign detail page**
  - Creator list
  - Account list with OAuth status
  - Target achievement status (daily/monthly)
  - Posts list with oEmbed
- [ ] **Campaign management**
  - Create/edit campaign form
  - Add/remove creators
  - Add/remove accounts
  - Set daily/monthly targets per account
- [ ] **Performance views**
  - Post-level metrics
  - Aggregation by account / creator / campaign / channel
  - Creator leaderboard (ranked by selected metric)
  - Creator detail view (per-creator breakdown)
  - Campaign comparison (compare creators within a campaign)

---

### Sprint 3: Integration + Polish (1 week)

- [ ] Connect Person A's real implementations to Person B's routes (replace mocks)
- [ ] End-to-end testing with real OAuth + API calls
- [ ] Error handling and edge cases
- [ ] Local demo walkthrough

---

## Phase 2: AWS Deployment

Goal: Deploy to AWS EC2 with CI/CD via GitHub Actions.

### Sprint 4: Infrastructure (1 week)

#### Person A: CI/CD Pipeline

- [ ] **GitHub Actions workflow** (`.github/workflows/deploy.yml`)
  - Trigger on push to `main`
  - Run tests (backend + frontend)
  - Build Docker images
  - Push to Amazon ECR
  - SSH deploy to EC2 (or use docker-compose pull + restart)
- [ ] **Environment management**
  - Secrets in GitHub Actions (DB credentials, API keys, OAuth secrets)
  - `.env` template for production config

#### Person B: AWS Setup

- [ ] **EC2 instance**
  - Provision instance (Ubuntu)
  - Install Docker + Docker Compose
  - Configure security groups (80/443, SSH)
- [ ] **PostgreSQL**
  - Option: RDS instance or PostgreSQL in Docker on EC2
  - Set up production database + run migrations
- [ ] **Networking**
  - Domain setup (Route 53 or external DNS)
  - Nginx reverse proxy for Flask + React
  - SSL certificate (Let's Encrypt)
- [ ] **Environment variables**
  - Production `.env` on EC2
  - Encrypted token storage key

### Sprint 5: Production Hardening (1 week)

- [ ] Health check endpoints
- [ ] Logging (CloudWatch or file-based)
- [ ] Backup strategy for PostgreSQL
- [ ] OAuth redirect URIs updated for production domain
- [ ] Rate limiting on API endpoints
- [ ] Final end-to-end test on production
- [ ] Monitoring and alerting (uptime, job failures, token refresh failures)

---

## Timeline Summary

| Sprint   | Duration | Focus                     |
| -------- | -------- | ------------------------- |
| Sprint 0 | 1 day    | Project setup (together)  |
| Sprint 1 | 2 weeks  | Core backend + OAuth      |
| Sprint 2 | 2 weeks  | Scheduled jobs + Frontend |
| Sprint 3 | 1 week   | Integration + Polish      |
| Sprint 4 | 1 week   | AWS infra + CI/CD         |
| Sprint 5 | 1 week   | Production hardening      |
