# Requirements

## Product Overview

> A platform for companies to manage creators marketing campaigns across Instagram and TikTok — tracking performance and managing deliverables.

---

## User Roles

| Role                | Description                                               |
| ------------------- | --------------------------------------------------------- |
| **admin**           | Platform administrator. Full access to all data.          |
| **company/ client** | Brand / sponsor. Creates and manages their own campaigns. |

---

## Feature 1: Campaign Tracking

### Overview

> Admin/ Company users create campaigns, generate OAuth URLs to share with external creators, and automatically collect post performance data from authorised accounts.

### Flow

1. **Admin/ Company** creates a Campaign (name, start_date, end_date). If created by a Company, the campaign is automatically linked to that Company.
2. **Admin/ Company** opens the Campaign detail page and generates an Instagram or TikTok OAuth URL.
3. **Admin/ Company** shares the OAuth URL externally with a creator (e.g. via email or DM).
4. **Creator** (not a platform user) clicks the OAuth URL and completes the authorisation flow. The Account is then automatically created and linked to the Campaign.
5. **Collecting data** fetches post data and metrics automatically.
6. **Token refresh job** renews tokens before expiry.

### Data Collection

- Posts are fetched via Instagram Graph API and TikTok API v2
- Instagram requires Creator or Business account (personal accounts not supported)
- Metrics stored per post: likes, comments, views, shares
- Fetch frequency: configurable (e.g. every 1-6 hours)

### API Integration

#### Instagram (Graph API)

- OAuth via Facebook Login
- Long-lived token: **60 days** (must refresh before expiry)
- Endpoints: `/me/media`, `/media/{id}/insights`
- oEmbed: `GET https://graph.facebook.com/v18.0/instagram_oembed?url={post_url}`

#### TikTok (API v2)

- OAuth via TikTok Login
- Access token: **24 hours** / Refresh token: **365 days**
- Endpoints: `/v2/video/list/`, `/v2/video/query/`
- oEmbed: `GET https://www.tiktok.com/oembed?url={video_url}`

### Aggregation

Performance data can be aggregated at the following levels:

| Level        | Description                                      |
| ------------ | ------------------------------------------------ |
| **Post**     | Individual post metrics                          |
| **Account**  | All posts from a single Instagram/TikTok account |
| **Campaign** | All accounts/posts within a campaign             |
| **Company**  | All campaigns owned by a company                 |
| **Channel**  | Filtered by platform (Instagram or TikTok)       |

### Display

- Post content is displayed via oEmbed (no media storage)
- Performance metrics are displayed from stored data

---

## Feature 2: Campaign Management

### Overview

Company users can set daily/monthly posting targets per account and track whether creators are meeting those targets.

### Requirements

- Company sets **daily_target** and **monthly_target** (number of posts) on each account
- System counts posts fetched for the account within the current day/month and compares against targets
- Dashboard shows target achievement status per account (on track / behind)
- Company can view posting times for each account's posts

### Schema

See `daily_target` / `monthly_target` columns on the `accounts` table in [data-schema.md](plan/data-schema.md).

---

## Feature 3: Stripe Payment Integration

### Overview

> Two payment flows: (1) **Company Subscriptions** — companies pay a recurring fee to access the platform; (2) **Creator Payouts** — companies pay creators through the platform, powered by Stripe Connect.

---

### 3a. Company Subscriptions (Stripe Billing)

#### Plans

| Plan           | Creators  | Campaigns | Price (monthly) |
| -------------- | --------- | --------- | --------------- |
| **Starter**    | Up to 5   | Up to 3   | $49/mo          |
| **Pro**        | Up to 20  | Up to 10  | $149/mo         |
| **Enterprise** | Unlimited | Unlimited | Custom          |

Annual billing available at a 20% discount.

#### Flow

1. **Company registers** → a Stripe Customer is created immediately and `stripe_customer_id` stored on the `users` row.
2. **Company selects plan** (Settings page) → backend creates a Stripe Checkout Session (`mode: subscription`) and returns the URL.
3. **Company completes checkout** on Stripe-hosted page → redirected back to `/settings?checkout=success`.
4. **Webhook** (`customer.subscription.created`) → backend writes a row to `subscriptions` table with `status: active`.
5. **Enforcement** → middleware checks `subscription.status` on protected company routes; returns `402 Payment Required` if inactive.
6. **Customer Portal** → "Manage Billing" button creates a Stripe Billing Portal Session; company self-serves upgrades, downgrades, and cancellations.

#### Webhook Events (Subscriptions)

| Event                           | Action                                                  |
| ------------------------------- | ------------------------------------------------------- |
| `customer.subscription.created` | Insert/update `subscriptions` row, set `status: active` |
| `customer.subscription.updated` | Update plan / status                                    |
| `customer.subscription.deleted` | Set `status: cancelled`, restrict access                |
| `invoice.payment_succeeded`     | Record payment in `subscription_invoices`               |
| `invoice.payment_failed`        | Set `status: past_due`, email company                   |

---

### 3b. Creator Payouts (Stripe Connect)

Companies can pay creators directly through the platform. Each creator holds a Stripe Connect Express account.

#### Flow

1. **Creator onboarding** → "Connect Payout Account" button (Settings page) initiates Stripe Connect Express onboarding. `stripe_connect_account_id` stored on the creator's `users` row once onboarding completes.
2. **Webhook** (`account.updated` with `charges_enabled: true`) → mark creator as `payout_enabled: true`.
3. **Company creates a payout** (Payroll page) → selects campaign, creator, and amount. Backend creates a Stripe Transfer from the platform account to the creator's Connect account.
4. **Payout record** is written to `payouts` table with `status: pending`.
5. **Webhook** (`transfer.created`, `transfer.paid`) → update `payouts.status` accordingly.

#### Webhook Events (Connect)

| Event              | Action                                                        |
| ------------------ | ------------------------------------------------------------- |
| `account.updated`  | Check `charges_enabled`; set `payout_enabled` flag on creator |
| `transfer.created` | Update payout row `status: processing`                        |
| `transfer.paid`    | Update payout row `status: paid`                              |
| `transfer.failed`  | Update payout row `status: failed`; alert company             |

---

### Schema Additions

#### users (additions)

| Column                      | Type         | Notes                                                |
| --------------------------- | ------------ | ---------------------------------------------------- |
| `stripe_customer_id`        | VARCHAR(255) | Stripe Customer ID (company users)                   |
| `stripe_connect_account_id` | VARCHAR(255) | Stripe Connect Express account ID (creator users)    |
| `payout_enabled`            | BOOLEAN      | Default false. True once Connect onboarding complete |

#### subscriptions (new table)

| Column                 | Type                                        | Notes                |
| ---------------------- | ------------------------------------------- | -------------------- |
| id                     | BIGINT PK                                   | Auto increment       |
| company_id             | BIGINT FK                                   | References users(id) |
| stripe_subscription_id | VARCHAR(255)                                | NOT NULL, unique     |
| stripe_price_id        | VARCHAR(255)                                | Plan price ID        |
| plan                   | ENUM(starter, pro, enterprise)              |                      |
| status                 | ENUM(active, past_due, cancelled, trialing) |                      |
| current_period_start   | TIMESTAMP                                   |                      |
| current_period_end     | TIMESTAMP                                   |                      |
| created_at             | TIMESTAMP                                   |                      |
| updated_at             | TIMESTAMP                                   |                      |

#### payouts (new table)

| Column             | Type                                    | Notes                    |
| ------------------ | --------------------------------------- | ------------------------ |
| id                 | BIGINT PK                               | Auto increment           |
| campaign_id        | BIGINT FK                               | References campaigns(id) |
| creator_id         | BIGINT FK                               | References users(id)     |
| company_id         | BIGINT FK                               | References users(id)     |
| stripe_transfer_id | VARCHAR(255)                            | Unique                   |
| amount             | INT                                     | In cents                 |
| currency           | VARCHAR(10)                             | Default 'usd'            |
| status             | ENUM(pending, processing, paid, failed) |                          |
| created_at         | TIMESTAMP                               |                          |
| updated_at         | TIMESTAMP                               |                          |

---

### Implementation — Backend (Flask/Python)

- Install: `stripe` Python package
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` added to `.env` / Docker Compose
- New routes module: `/backend/app/routes/payments.py`
  - `POST /api/payments/create-checkout-session` — create Stripe Checkout Session for subscription
  - `POST /api/payments/create-portal-session` — create Billing Portal Session
  - `POST /api/payments/create-payout` — create Stripe Transfer to creator (company/admin only)
  - `POST /api/stripe/webhook` — receive and verify Stripe webhook events (unauthenticated, signature-verified)
- New service: `/backend/app/services/stripe_service.py` — wraps Stripe SDK calls
- Subscription enforcement middleware on company routes

### Implementation — Frontend (React)

- Install: `@stripe/stripe-js`, `@stripe/react-stripe-js`
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` added to frontend environment
- **Settings page** — "Billing" section: plan display, "Upgrade / Manage Billing" button, payment history
- **Payroll page** (existing `/payroll` placeholder) — table of payouts per campaign/creator, "Pay Creator" modal with amount input, payout status badges
- **Creator Settings** — "Connect Payout Account" button triggering Connect onboarding redirect

---

### Non-Functional Requirements

| Area               | Requirement                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Security**       | Webhook signature verified with `stripe.webhook.construct_event`. Secret key never exposed to frontend.        |
| **Idempotency**    | All Stripe API calls use idempotency keys. Webhook handlers are idempotent (check if event already processed). |
| **Test mode**      | All development uses Stripe test keys and test card numbers. Separate test/live key pairs per environment.     |
| **Error handling** | Failed payments trigger email notifications. Payout failures surface in the Payroll UI with reason.            |

---

## Non-Functional Requirements

| Area           | Requirement                                                       |
| -------------- | ----------------------------------------------------------------- |
| **Security**   | OAuth tokens encrypted at rest (AES-256). HTTPS only.             |
| **Auth**       | Role-based access control. Company sees only their own campaigns. |
| **Data sync**  | Scheduled jobs with configurable frequency. Retry on failure.     |
| **Token mgmt** | Auto-refresh before expiry. Alert on refresh failure.             |
| **Embedding**  | Use oEmbed APIs. Lazy-load embeds for performance.                |
