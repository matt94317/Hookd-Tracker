# Implementation Plan

## Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Frontend  | React.js                        |
| Backend   | Python Flask                    |
| Database  | PostgreSQL                      |
| Payments  | Stripe (Billing + Connect)      |
| Server    | AWS EC2                         |
| CI/CD     | GitHub Actions                  |
| Container | Docker / Docker Compose (local) |

---

## Completed (as of Apr 16, 2026)

- [x] Git repo, branching strategy, project structure
- [x] Docker Compose (PostgreSQL + Flask + React)
- [x] DB migrations (all base tables from data-schema.md)
- [x] `PlatformService` interface defined
- [x] User authentication (login/register, JWT, RBAC middleware)
- [x] Campaign CRUD API (`POST`, `GET`, `PUT`, `DELETE /campaigns`)
- [x] Campaign Creators API (add/remove creators)
- [x] Unit tests with mocked API responses
- [x] Post sync job, token refresh job, target achievement check (logic only — scheduler not wired)
- [x] Auth pages (Login, Registration)
- [x] Dashboard (campaign list, summary stats)
- [x] Campaign detail page (creators, accounts, targets, posts)
- [x] Campaign management (create/edit, add/remove creators & accounts, targets)
- [x] Performance views (metrics, aggregation, leaderboard, creator detail, campaign comparison)

---

## Remaining Work

---

### Week 1: Apr 16–22 — Instagram & TikTok OAuth

- [ ] **Instagram OAuth flow**
  - `get_oauth_url(account_id, "instagram")` — generate Facebook Login URL with correct scopes
  - `handle_oauth_callback("instagram", code)` — exchange code for long-lived token (60-day)
  - Store AES-256 encrypted token in `accounts.access_token`; set `token_expires_at`
  - `refresh_token(account_id)` — refresh before `token_expires_at`
- [ ] **TikTok OAuth flow**
  - `get_oauth_url(account_id, "tiktok")` — generate TikTok Login URL
  - `handle_oauth_callback("tiktok", code)` — exchange code for access + refresh tokens (24h / 365d)
  - Store encrypted tokens; set `token_expires_at`
  - `refresh_token(account_id)` — use refresh token when access token nears expiry
- [ ] **Account API routes**
  - `POST /campaigns/:id/accounts` — add account to campaign
  - `GET /campaigns/:id/accounts` — list accounts with OAuth status
  - `GET /accounts/:id/oauth-url` — calls `PlatformService.get_oauth_url()`
  - `GET /oauth/callback/:channel` — calls `PlatformService.handle_oauth_callback()`

---

### Week 2: Apr 23–29 — Post Fetching + Job Scheduler

- [ ] **Instagram post fetching**
  - Fetch posts via `/me/media` (Graph API)
  - Fetch insights via `/media/{id}/insights` (likes, comments, views, shares)
  - Map to `posts` table schema; handle pagination
- [ ] **TikTok post fetching**
  - Fetch videos via `/v2/video/list/` and `/v2/video/query/`
  - Map to `posts` table schema; handle pagination
- [ ] **Posts API routes**
  - `GET /accounts/:id/posts` — list posts for an account
  - `GET /campaigns/:id/posts` — all posts across campaign accounts
- [ ] **Wire up APScheduler or Celery Beat**
  - Schedule post sync job (configurable interval, e.g. every 1–6 hours)
  - Schedule token refresh job (daily check)
  - Schedule target achievement check
  - Add scheduler startup to Flask `create_app()`
- [ ] **Integration tests**
  - OAuth callback → token stored → posts fetched → posts returned by API
  - Test with Instagram test user and TikTok sandbox account

---

### Week 3: Apr 30–May 6 — Stripe Backend + DB Migrations

- [ ] **DB migrations**
  - Add to `users`: `stripe_customer_id VARCHAR(255)`, `stripe_connect_account_id VARCHAR(255)`, `payout_enabled BOOLEAN DEFAULT false`
  - Add to `users`: `invite_token VARCHAR(255)`, `invited_by_company_id BIGINT FK` (for creator invite flow)
  - Add to `posts`: `status ENUM(draft, in_review, approved, published) DEFAULT approved`, `submitted_caption TEXT`, `submitted_media_url VARCHAR(500)`, `rejection_reason TEXT`
  - Create `subscriptions` table (id, company_id FK, stripe_subscription_id, stripe_price_id, plan ENUM, status ENUM, period timestamps, created_at, updated_at)
  - Create `payouts` table (id, campaign_id FK, creator_id FK, company_id FK, stripe_transfer_id, amount INT cents, currency, status ENUM, created_at, updated_at)
  - Create `messages` table (id, sender_id FK → users, recipient_id FK → users, campaign_id FK, body TEXT, read BOOLEAN DEFAULT false, created_at TIMESTAMP)
  - Create `notifications` table (id, user_id FK, type VARCHAR(50), message TEXT, read BOOLEAN DEFAULT false, reference_id BIGINT, reference_type VARCHAR(50), created_at TIMESTAMP)
- [ ] **Stripe backend setup**
  - Add `stripe` to `requirements.txt`
  - Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` to `.env` and `docker-compose.yml`
  - Create `backend/app/services/stripe_service.py`:
    - `create_customer(user)` — called on company registration
    - `create_checkout_session(customer_id, price_id)` — subscription flow
    - `create_portal_session(customer_id)` — billing self-service
    - `create_transfer(connect_account_id, amount, currency)` — creator payout
  - Create `backend/app/routes/payments.py` blueprint:
    - `POST /api/payments/create-checkout-session`
    - `POST /api/payments/create-portal-session`
    - `POST /api/payments/create-payout`
    - `POST /api/stripe/webhook` (unauthenticated, signature-verified)
  - Webhook handlers (idempotent):
    - `customer.subscription.created/updated/deleted` → upsert `subscriptions` row
    - `invoice.payment_succeeded/failed` → update subscription status
    - `account.updated` (charges_enabled) → set `payout_enabled: true` on creator
    - `transfer.created/paid/failed` → update `payouts.status`
  - Subscription enforcement middleware on company routes (return `402` if no active subscription)

---

### Week 4: May 7–13 — Stripe Frontend

- [ ] **Install Stripe frontend packages**
  - `npm install @stripe/stripe-js @stripe/react-stripe-js`
  - Add `REACT_APP_STRIPE_PUBLISHABLE_KEY` to frontend `.env`
- [ ] **Settings page — Billing section**
  - Display current plan name, status, and renewal date
  - "Upgrade / Manage Billing" button → `/api/payments/create-checkout-session` or `/api/payments/create-portal-session`
  - Redirect to Stripe-hosted checkout or portal URL
  - Handle return to `/settings?checkout=success`
  - Payment history table (invoices from subscription)
- [ ] **Payroll page** (replace existing placeholder)
  - Table of payouts per campaign/creator (amount, status badge, date)
  - "Pay Creator" modal: campaign select, creator select, amount input → `POST /api/payments/create-payout`
  - Payout status badges: pending / processing / paid / failed
- [ ] **Creator payout onboarding**
  - "Connect Payout Account" button in Creator Settings
  - Redirect to Stripe Connect Express onboarding URL (returned from backend)
  - Show `payout_enabled` status after onboarding completes

---

### Week 5: May 14–20 — Creator Invite & Account System

- [ ] **Backend — creator invite flow**
  - `POST /companies/:id/invite` — generate `invite_token`, store on `users` row (or create pending user row), send invite email with link
  - `GET /auth/invite/:token` — validate token, return campaign/company context for signup form
  - `POST /auth/register/creator` — creator registers via invite token; sets `role: creator`, links to company via `invited_by_company_id`
  - Extend JWT claims to include `role: creator`; update RBAC middleware to allow creator-specific routes
- [ ] **Backend — creator management routes**
  - `GET /companies/:id/creators` — list all creators across all campaigns for a company (name, platforms, active campaign, contract status)
  - `DELETE /campaigns/:id/creators/:creator_id` — remove creator from campaign
- [ ] **Frontend — Creator Management page** (`/creators`)
  - Table of all creators: name, connected platforms, active campaign, contract status
  - "Invite Creator" modal: email input → `POST /companies/:id/invite`
  - Link through to creator detail / campaign assignment
- [ ] **Frontend — Creator signup via invite link**
  - Route `/join/:token` — reads token, pre-fills company/campaign context, registration form
  - On success: redirect creator to their portal dashboard

---

### Week 6: May 21–27 — Content Review Dashboard + Post Submission

- [ ] **Backend — post submission routes**
  - `POST /posts/submit` — creator submits a post (caption, media URL, platform, account_id); sets `status: in_review`
  - `PATCH /posts/:id/status` — manager approves (`status: approved`) or rejects (`status: rejected`, requires `rejection_reason`); triggers notification to creator
  - `GET /posts/review` — manager feed of all `in_review` posts; filterable by creator, platform, campaign, status
- [ ] **Backend — notifications**
  - `POST /notifications` (internal helper) — create notification on post approval/rejection/payment events
  - `GET /notifications` — list unread notifications for authenticated user
  - `PATCH /notifications/:id/read` — mark as read
- [ ] **Frontend — Content Review Dashboard** (`/review`)
  - Unified feed of submitted posts: creator name, platform, campaign, submitted content preview
  - Filter bar: by creator, platform, campaign, status
  - Approve / Reject actions inline; rejection opens reason input modal
- [ ] **Frontend — Creator Post Submission** (`/submit`)
  - Form: caption, media upload, platform select, campaign/account select
  - Submit triggers `POST /posts/submit`; shows status tracker: Draft → In Review → Approved → Published
  - List of past submissions with current status and any rejection feedback

---

### Week 7: May 28–Jun 3 — Creator Portal (Campaign & Payroll Views)

- [ ] **Backend — creator portal routes**
  - `GET /creator/campaigns` — list campaigns the authenticated creator is enrolled in (brief, guidelines, deadlines)
  - `GET /creator/campaigns/:id/progress` — creator's post count vs. deliverable target for the campaign
  - `GET /creator/payroll` — earnings per campaign, payout status per milestone (pending/approved/paid)
- [ ] **Frontend — Creator Portal**
  - `/portal/campaigns` — campaign cards showing brief, guidelines, deadlines, progress bar (X of Y posts approved)
  - `/portal/payroll` — earnings table per campaign: amount, milestone, status badge (Pending / Approved / Paid)
  - `/portal/submit` — post submission page (from Week 6)
  - Shared creator nav/layout separate from manager nav

---

### Week 8: Jun 4–10 — Messaging & Notifications

- [ ] **Backend — messaging routes**
  - `GET /messages/:campaign_id/:other_user_id` — fetch conversation thread between two users in a campaign
  - `POST /messages` — send a message (body, campaign_id, recipient_id); creates notification for recipient
  - `GET /messages/conversations` — list all conversations for authenticated user (last message preview, unread count)
- [ ] **Frontend — Messaging UI**
  - `/messages` — conversation list sidebar + message thread view
  - Accessible from both manager and creator nav
  - Unread badge on nav icon
- [ ] **Frontend — Notification system**
  - Notification bell in nav bar with unread count
  - Dropdown showing recent notifications (post approved, rejected, payment processed, new message)
  - Mark as read on open; link to relevant page

---

### Week 9: Jun 11–17 — Integration, E2E Testing & Polish

- [ ] **Remove all mock data** — wire real `PlatformService` implementations into API routes
- [ ] **End-to-end testing**
  - Full OAuth flow: generate URL → creator authorises → token stored → posts fetched → appears in UI
  - Stripe subscription: checkout → webhook → enforcement active
  - Creator payout: Connect onboarding → transfer → status update in Payroll page
  - Creator invite → signup → post submission → manager review → approve/reject → creator notified
  - Messaging: manager sends → creator receives notification → replies → thread visible to both
- [ ] **Error handling & edge cases**
  - OAuth token expired / refresh failed — surface error in UI
  - API rate limits — back-off and retry logic
  - Stripe webhook retries — idempotency checks
  - Invalid/missing posts — graceful empty states in UI
- [ ] **Local demo walkthrough** — full run-through with test accounts

---

### Week 10: Jun 18–24 — AWS Infrastructure + CI/CD

- [ ] **EC2 instance**
  - Provision Ubuntu instance (t3.small or t3.medium)
  - Install Docker + Docker Compose
  - Configure security groups: port 80, 443 (HTTP/HTTPS), 22 (SSH)
- [ ] **PostgreSQL**
  - Set up RDS instance (or PostgreSQL container on EC2)
  - Run Alembic migrations on production DB
- [ ] **Networking**
  - Domain setup (Route 53 or external DNS)
  - Nginx reverse proxy: React (port 80/443) → Flask (port 5000)
  - SSL certificate via Let's Encrypt (certbot)
- [ ] **Environment variables**
  - Create production `.env` on EC2 with real keys
  - Set `ENCRYPTION_KEY` for encrypted token storage
- [ ] **GitHub Actions workflow** (`.github/workflows/deploy.yml`)
  - Trigger on push to `main`
  - Run backend tests (`pytest`) and frontend build (`npm run build`)
  - Build Docker images and push to Amazon ECR
  - SSH deploy to EC2 (docker-compose pull + restart)
- [ ] **Secrets management**
  - Store DB credentials, API keys, OAuth secrets, Stripe keys in GitHub Actions secrets
  - Create `.env.production` template (no real values committed)

---

### Week 11: Jun 25–Jul 1 — Production Hardening

- [ ] **Health check endpoint** — `GET /api/health` (returns 200 + DB connectivity check); add to Nginx and deploy workflow
- [ ] **Logging** — structured JSON logging in Flask; route to CloudWatch Logs or file; log scheduled job events
- [ ] **Backup strategy** — daily `pg_dump` to S3 with 30-day retention; test restore
- [ ] **OAuth redirect URIs** — update Instagram and TikTok app settings with production callback URLs; test flows
- [ ] **Rate limiting** — add `flask-limiter` to API endpoints (auth routes, OAuth callback)
- [ ] **Monitoring & alerting**
  - Uptime check (UptimeRobot or CloudWatch alarm on health endpoint)
  - Alert on scheduled job failures (token refresh, post sync errors)
  - Alert on Stripe webhook failures
- [ ] **Final end-to-end test on production** — full flow with real accounts; Stripe test-mode smoke test

---

## Schedule Summary

| Week | Dates          | Focus                                          |
| ---- | -------------- | ---------------------------------------------- |
| 1    | Apr 16–22      | Instagram + TikTok OAuth flows; Account API    |
| 2    | Apr 23–29      | Post fetching; Posts API; APScheduler; tests   |
| 3    | Apr 30–May 6   | Stripe backend + DB migrations                 |
| 4    | May 7–13       | Stripe frontend (Billing, Payroll, Onboarding) |
| 5    | May 14–20      | Creator invite & account system                |
| 6    | May 21–27      | Content review dashboard + post submission     |
| 7    | May 28–Jun 3   | Creator portal (campaign & payroll views)      |
| 8    | Jun 4–10       | Messaging & notifications                      |
| 9    | Jun 11–17      | Integration, E2E testing, error handling       |
| 10   | Jun 18–24      | AWS infrastructure + CI/CD                     |
| 11   | Jun 25–Jul 1   | Production hardening + monitoring              |

**Target ship date: Jul 1, 2026**
