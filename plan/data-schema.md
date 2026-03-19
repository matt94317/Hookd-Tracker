# Data Schema

## Overview

Platform for content creators to measure campaign performance and display portfolios across Instagram and TikTok.

## Key Decisions

- **Performance data**: Stored in our DB (fetched via scheduled jobs)
- **Media content**: Not stored — use oEmbed to embed posts from Instagram/TikTok
- **API auth**: OAuth 2.0 per platform; tokens stored encrypted in Accounts table

## Entity Relationships

```
User (company) ──1:N──> Campaigns
Campaign       ──1:N──> Accounts
Channel        ──1:N──> Accounts
Account        ──1:N──> Posts
User (company) ──1:1──> Subscription
User (company) ──1:N──> Payouts
Campaign       ──1:N──> Payouts
```

## User Roles

| Role        | Description            | Access                                       |
| ----------- | ---------------------- | -------------------------------------------- |
| **admin**   | Platform administrator | All campaigns, accounts, posts               |
| **company** | Brand / sponsor        | Campaigns where `company_id = user.id`       |

- Each Campaign has **at most one company** (NULL when created by Admin)
- Accounts are linked to Campaigns via OAuth (creators are external, not platform users)

## Tables

### users

| Column                      | Type                          | Notes                                              |
| --------------------------- | ----------------------------- | -------------------------------------------------- |
| id                          | BIGINT PK                     | Auto increment                                     |
| name                        | VARCHAR(255)                  | NOT NULL                                           |
| email                       | VARCHAR(255)                  | NOT NULL, unique                                   |
| password                    | VARCHAR(255)                  | NOT NULL                                           |
| role                        | ENUM(admin, company)          | NOT NULL                                           |
| stripe_customer_id          | VARCHAR(255)                  | Stripe Customer ID (company users only)            |
| created_at                  | TIMESTAMP                     |                                                    |
| updated_at                  | TIMESTAMP                     |                                                    |

### channels

| Column | Type        | Notes                                 |
| ------ | ----------- | ------------------------------------- |
| id     | BIGINT PK   | Auto increment                        |
| name   | VARCHAR(50) | NOT NULL, unique (instagram / tiktok) |

### campaigns

| Column     | Type         | Notes                |
| ---------- | ------------ | -------------------- |
| id         | BIGINT PK    | Auto increment       |
| name       | VARCHAR(255) | NOT NULL             |
| company_id | BIGINT FK    | References users(id) |
| start_date | DATE         |                      |
| end_date   | DATE         |                      |
| created_at | TIMESTAMP    |                      |
| updated_at | TIMESTAMP    |                      |

### accounts

| Column              | Type         | Notes                                |
| ------------------- | ------------ | ------------------------------------ |
| id                  | BIGINT PK    | Auto increment                       |
| campaign_id         | BIGINT FK    | References campaigns(id)             |
| channel_id          | BIGINT FK    | References channels(id)              |
| platform_account_id | VARCHAR(255) | NOT NULL                             |
| username            | VARCHAR(255) |                                      |
| access_token        | TEXT         | Encrypted                            |
| refresh_token       | TEXT         | Encrypted                            |
| token_expires_at    | TIMESTAMP    |                                      |
| daily_target        | INT          | Default 0. Expected posts per day.   |
| monthly_target      | INT          | Default 0. Expected posts per month. |
| created_at          | TIMESTAMP    |                                      |
| updated_at          | TIMESTAMP    |                                      |

### posts

| Column           | Type         | Notes                   |
| ---------------- | ------------ | ----------------------- |
| id               | BIGINT PK    | Auto increment          |
| account_id       | BIGINT FK    | References accounts(id) |
| platform_post_id | VARCHAR(255) | NOT NULL                |
| post_url         | TEXT         | NOT NULL (for oEmbed)   |
| caption          | TEXT         |                         |
| posted_at        | TIMESTAMP    |                         |
| likes            | INT          | Default 0               |
| comments         | INT          | Default 0               |
| views            | INT          | Default 0               |
| shares           | INT          | Default 0               |
| created_at       | TIMESTAMP    |                         |
| updated_at       | TIMESTAMP    |                         |

### subscriptions

| Column                  | Type                                          | Notes                        |
| ----------------------- | --------------------------------------------- | ---------------------------- |
| id                      | BIGINT PK                                     | Auto increment               |
| company_id              | BIGINT FK                                     | References users(id)         |
| stripe_subscription_id  | VARCHAR(255)                                  | NOT NULL, unique             |
| stripe_price_id         | VARCHAR(255)                                  | Stripe Price ID for the plan |
| plan                    | ENUM(starter, pro, enterprise)                | NOT NULL                     |
| status                  | ENUM(active, past_due, cancelled, trialing)   | NOT NULL                     |
| current_period_start    | TIMESTAMP                                     |                              |
| current_period_end      | TIMESTAMP                                     |                              |
| created_at              | TIMESTAMP                                     |                              |
| updated_at              | TIMESTAMP                                     |                              |

### payouts

| Column              | Type                                    | Notes                          |
| ------------------- | --------------------------------------- | ------------------------------ |
| id                  | BIGINT PK                               | Auto increment                 |
| campaign_id         | BIGINT FK                               | References campaigns(id)       |
| creator_id          | BIGINT FK                               | References users(id)           |
| company_id          | BIGINT FK                               | References users(id)           |
| stripe_transfer_id  | VARCHAR(255)                            | Unique. Stripe Transfer ID     |
| amount              | INT                                     | In cents (e.g. 5000 = $50.00)  |
| currency            | VARCHAR(10)                             | Default 'usd'                  |
| status              | ENUM(pending, processing, paid, failed) | NOT NULL                       |
| created_at          | TIMESTAMP                               |                                |
| updated_at          | TIMESTAMP                               |                                |


