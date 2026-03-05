# Data Schema

## Overview

Platform for content creators to measure campaign performance and display portfolios across Instagram and TikTok.

### Key Decisions

- **Performance data**: Stored in our DB (fetched via scheduled jobs)
- **Media content**: Not stored — use oEmbed to embed posts from Instagram/TikTok
- **API auth**: OAuth 2.0 per platform; tokens stored encrypted in Accounts table

## Entity Relationships

```
User (creator) ──N:M──> Campaigns  (via campaign_creators)
User (company) ──1:N──> Campaigns
Campaign       ──1:N──> Accounts
Channel        ──1:N──> Accounts
Account        ──1:N──> Posts
Account        ──1:N──> Campaign Schedules
Campaign Schedule ──0:1──> Post  (linked when published)
```

## User Roles

| Role        | Description                          | Access                                        |
|-------------|--------------------------------------|-----------------------------------------------|
| **admin**   | Platform administrator               | All campaigns, accounts, posts                |
| **creator** | Content creator                      | Campaigns via `campaign_creators` join table  |
| **company** | Brand / sponsor                      | Campaigns where `company_id = user.id`        |

- Each Campaign has **multiple creators** and **one company**

## Tables

### users

| Column     | Type                               | Notes          |
|------------|-------------------------------------|---------------|
| id         | BIGINT PK                           | Auto increment |
| name       | VARCHAR(255)                        | NOT NULL       |
| email      | VARCHAR(255)                        | NOT NULL, unique |
| password   | VARCHAR(255)                        | NOT NULL       |
| role       | ENUM(admin, creator, company)       | NOT NULL       |
| created_at | TIMESTAMP                           |                |
| updated_at | TIMESTAMP                           |                |

### channels

| Column | Type         | Notes                    |
|--------|--------------|--------------------------|
| id     | BIGINT PK    | Auto increment           |
| name   | VARCHAR(50)  | NOT NULL, unique (instagram / tiktok) |

### campaigns

| Column     | Type         | Notes                        |
|------------|--------------|------------------------------|
| id         | BIGINT PK    | Auto increment               |
| name       | VARCHAR(255) | NOT NULL                     |
| company_id | BIGINT FK    | References users(id)         |
| start_date | DATE         |                              |
| end_date   | DATE         |                              |
| created_at | TIMESTAMP    |                              |
| updated_at | TIMESTAMP    |                              |

### campaign_creators (join table)

| Column      | Type      | Notes                      |
|-------------|-----------|----------------------------|
| id          | BIGINT PK | Auto increment             |
| campaign_id | BIGINT FK | References campaigns(id)   |
| creator_id  | BIGINT FK | References users(id)       |
| created_at  | TIMESTAMP |                            |

- Unique constraint on (campaign_id, creator_id)

### accounts

| Column              | Type         | Notes                      |
|---------------------|--------------|----------------------------|
| id                  | BIGINT PK    | Auto increment             |
| campaign_id         | BIGINT FK    | References campaigns(id)   |
| channel_id          | BIGINT FK    | References channels(id)    |
| platform_account_id | VARCHAR(255) | NOT NULL                   |
| username            | VARCHAR(255) |                            |
| access_token        | TEXT         | Encrypted                  |
| refresh_token       | TEXT         | Encrypted                  |
| token_expires_at    | TIMESTAMP    |                            |
| created_at          | TIMESTAMP    |                            |
| updated_at          | TIMESTAMP    |                            |

### campaign_schedules

| Column         | Type                              | Notes                      |
|----------------|-----------------------------------|----------------------------|
| id             | BIGINT PK                         | Auto increment             |
| account_id     | BIGINT FK                         | References accounts(id)    |
| scheduled_date | DATE                              | NOT NULL                   |
| status         | ENUM(pending, published, overdue) | Default: pending           |
| post_id        | BIGINT FK                         | References posts(id), nullable. Linked when post is matched. |
| created_at     | TIMESTAMP                         |                            |
| updated_at     | TIMESTAMP                         |                            |

### posts

| Column           | Type         | Notes                    |
|------------------|--------------|--------------------------|
| id               | BIGINT PK    | Auto increment           |
| account_id       | BIGINT FK    | References accounts(id)  |
| platform_post_id | VARCHAR(255) | NOT NULL                 |
| post_url         | TEXT         | NOT NULL (for oEmbed)    |
| caption          | TEXT         |                          |
| posted_at        | TIMESTAMP    |                          |
| likes            | INT          | Default 0                |
| comments         | INT          | Default 0                |
| views            | INT          | Default 0                |
| shares           | INT          | Default 0                |
| created_at       | TIMESTAMP    |                          |
| updated_at       | TIMESTAMP    |                          |

## Data Flow

1. **Admin** creates a Campaign (assigns creators + company)
2. **Admin** adds Accounts to the Campaign
3. **Creator** authenticates via OAuth (Instagram / TikTok)
4. **Scheduled job** fetches posts & metrics using stored tokens
5. **Token refresh job** renews tokens before expiry
6. **Frontend** displays posts via oEmbed (no media storage needed)

## API Integration

### Instagram (Graph API)

- OAuth via Facebook Login
- Long-lived token: **60 days** (must refresh before expiry)
- Endpoints: `/me/media`, `/media/{id}/insights`
- oEmbed: `GET https://graph.facebook.com/v18.0/instagram_oembed?url={post_url}`

### TikTok (Content API)

- OAuth via TikTok Login
- Access token: **24 hours** / Refresh token: **365 days**
- Endpoints: `/v2/video/list/`, `/v2/video/query/`
- oEmbed: `GET https://www.tiktok.com/oembed?url={video_url}`
