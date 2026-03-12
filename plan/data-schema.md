# Data Schema

## Overview

Platform for content creators to measure campaign performance and display portfolios across Instagram and TikTok.

## Key Decisions

- **Performance data**: Stored in our DB (fetched via scheduled jobs)
- **Media content**: Not stored — use oEmbed to embed posts from Instagram/TikTok
- **API auth**: OAuth 2.0 per platform; tokens stored encrypted in Accounts table

## Entity Relationships

```
User (creator) ──N:M──> Campaigns  (via campaign_creators)
User (company) ──1:N──> Campaigns
Campaign       ──1:N──> Accounts
Channel        ──1:N──> Accounts
User (creator) ──1:N──> Accounts
Account        ──1:N──> Posts
```

## User Roles

| Role        | Description                          | Access                                        |
|-------------|--------------------------------------|-----------------------------------------------|
| **admin**   | Platform administrator               | All campaigns, accounts, posts                |
| **creator** | Content creator                      | Campaigns via `campaign_creators` join table  |
| **company** | Brand / sponsor                      | Campaigns where `company_id = user.id`        |

- Each Campaign has **multiple creators** and **at most one company** (NULL when created by Admin)

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
| creator_id          | BIGINT FK    | References users(id)       |
| channel_id          | BIGINT FK    | References channels(id)    |
| platform_account_id | VARCHAR(255) | NOT NULL                   |
| username            | VARCHAR(255) |                            |
| access_token        | TEXT         | Encrypted                  |
| refresh_token       | TEXT         | Encrypted                  |
| token_expires_at    | TIMESTAMP    |                            |
| daily_target        | INT          | Default 0. Expected posts per day. |
| monthly_target      | INT          | Default 0. Expected posts per month. |
| created_at          | TIMESTAMP    |                            |
| updated_at          | TIMESTAMP    |                            |

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
