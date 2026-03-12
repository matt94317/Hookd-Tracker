# Requirements

## Product Overview

> A platform for companies to manage creators marketing campaigns across Instagram and TikTok — tracking performance and managing deliverables.

---

## User Roles

| Role                | Description                                                               |
| ------------------- | ------------------------------------------------------------------------- |
| **admin**           | Platform administrator. Full access to all data.                          |
| **company/ client** | Brand / sponsor. Creates and manages their own campaigns.                 |
| **creator**         | Content creator. Views their own campaigns and authorises account access. |

---

## Feature 1: Campaign Tracking

### Overview

> Company/ Admin users able to create campaigns, assign companies (admin only), assign creators, link social accounts (limited to accounts owned by creators assigned to the campaign), and automatically collect post performance data.

### Flow

1. **Admin/ Company** creates a Campaign (name, start_date, end_date). If created by a Company, the campaign is automatically linked to that Company.
2. **Admin/ Company** adds Creator users to the Campaign
3. **Admin/ Company** adds Accounts (Instagram / TikTok) from the assigned Creators only
4. **Creator** receives an authorisation request and completes OAuth 2.0 to grant access
5. **Collecting data** fetches post data and metrics automatically
6. **Token refresh job** renews tokens before expiry

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
| **Creator**  | All accounts/posts belonging to a creator        |
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

## Non-Functional Requirements

| Area           | Requirement                                                       |
| -------------- | ----------------------------------------------------------------- |
| **Security**   | OAuth tokens encrypted at rest (AES-256). HTTPS only.             |
| **Auth**       | Role-based access control. Company sees only their own campaigns. |
| **Data sync**  | Scheduled jobs with configurable frequency. Retry on failure.     |
| **Token mgmt** | Auto-refresh before expiry. Alert on refresh failure.             |
| **Embedding**  | Use oEmbed APIs. Lazy-load embeds for performance.                |
