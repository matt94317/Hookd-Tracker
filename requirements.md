# Requirements

## Product Overview

> A platform for companies to manage creators marketing campaigns across Instagram and TikTok — tracking performance, managing deliverables, and analysing top creators.

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

> Company/ Admin users able to create campaigns, assign creators, link social accounts, and automatically collect post performance data.

### Flow

1. **Admin/ Company** creates a Campaign (name, schedule, dates)
2. **Admin/ Company** adds Creator users to the Campaign
3. **Admin/ Company** adds Accounts (Instagram / TikTok) from the linked Creators
4. **Creator** receives an authorisation request and completes OAuth 2.0 to grant access
5. **Collecting data** fetches post data and metrics automatically
6. **Token refresh job** renews tokens before expiry

### Data Collection

- Posts are fetched via Instagram Graph API and TikTok Content API
- Metrics stored per post: likes, comments, views, shares
- Fetch frequency: configurable (e.g. every 1-6 hours)

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

Company users can view whether creator hit weekly or daily target and able to see posting time.

### Requirements

- Company creates **individual schedule entries** per account with a target date
- Each schedule entry represents one expected post
- When a post is fetched and matched, the schedule entry is linked to the post and marked as published
- Dashboard shows calendar/timeline view of all schedules across accounts
- Overdue detection: scheduled job marks entries as overdue when `scheduled_date` has passed with no linked post

### Schema

See `campaign_schedules` table in [data-schema.md](plan/data-schema.md).

---

## Feature 3: Performer Analysis

### Overview

Company users can view overall performance and analyse, compare across creators within their campaigns.

### Requirements

- Company able to view overall performance for one campaign
- Rank creators by key metrics: total views, total likes, engagement rate, number of posts
- Filter by campaign, channel, or date range
- View per-creator breakdown: which posts performed best, average metrics
- Engagement rate formula: `(likes + comments) / views`

### Views

| View                    | Description                                   |
| ----------------------- | --------------------------------------------- |
| **Overall Campaign**    | View performance of campaign                  |
| **Creator leaderboard** | Ranked list of creators by selected metric    |
| **Campaign comparison** | Compare creator performance within a campaign |

---

## Non-Functional Requirements

| Area           | Requirement                                                       |
| -------------- | ----------------------------------------------------------------- |
| **Security**   | OAuth tokens encrypted at rest (AES-256). HTTPS only.             |
| **Auth**       | Role-based access control. Company sees only their own campaigns. |
| **Data sync**  | Scheduled jobs with configurable frequency. Retry on failure.     |
| **Token mgmt** | Auto-refresh before expiry. Alert on refresh failure.             |
| **Embedding**  | Use oEmbed APIs. Lazy-load embeds for performance.                |
