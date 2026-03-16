# Instagram (Meta Graph API) Setup Guide

## 1. Create Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Log in with a Facebook account and register as a developer

## 2. Create an App

1. My Apps → Create App
2. Select "No use case"
3. Enter app name and contact email → Create
4. App Dashboard → Use Cases → Add Use Cases
5. Filter: "Content Management"
6. Select "Manage messages and content on Instagram"

## 3. Add Required Permissions

Go to your app page → **API setup with Facebook login** → **Go to permissions and features** and select:

| Permission | Purpose |
|---|---|
| `instagram_basic` | Profile info |
| `instagram_manage_insights` | Post impressions/reach (**must add manually**) |
| `pages_show_list` | List Facebook Pages |
| `pages_read_engagement` | Read Page content |
| `business_management` | Pages info |

## 4. Configure OAuth

### App Settings → Basic

Fill in:
- **App icon**: upload your app icon (required)
- **App name**: your application name
- **Category**: select the appropriate category (e.g., "Social media management")
- **Terms of Service URL**: your Terms of Service page URL
- **Privacy Policy URL**: your Privacy Policy page URL

Note **App ID** and **App Secret**.

### Redirect URI

Go to Business Facebook Login → Settings, add redirect URI to **Valid OAuth Redirect URIs**:
```
https://<domain>/oauth/callback/instagram
```

## 5. Prepare Test Account

1. Switch Instagram account to **Business** or **Creator** account
2. Create a **Facebook Page**
3. Link Instagram account to the Facebook Page (from either Instagram or Facebook Page settings)
4. In **Dev mode**, add test users via App Roles so they can authorize

## 6. Set Up `.env`

```
INSTAGRAM_APP_ID=<App ID>
INSTAGRAM_APP_SECRET=<App Secret>
OAUTH_REDIRECT_BASE_URL=https://<domain>
TOKEN_ENCRYPTION_KEY=<base64-encoded 32-byte key>
```

Generate encryption key:
```bash
python3 -c "import os, base64; print(base64.b64encode(os.urandom(32)).decode())"
```

## 7. Local Testing with ngrok

```bash
# Start backend
docker-compose up --build

# In another terminal, start ngrok
ngrok http 5001
```

Update `.env` `OAUTH_REDIRECT_BASE_URL` and Meta dashboard redirect URI with the ngrok URL.

## 8. Test OAuth Flow

Open in browser:
```
https://www.facebook.com/v19.0/dialog/oauth?client_id=<APP_ID>&redirect_uri=<NGROK_URL>/oauth/callback/instagram&scope=instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management&response_type=code&state=<URL_ENCODED_JSON>
```

When prompted to select Pages, **check the Facebook Page linked to your Instagram account**.

Expected success response:
```json
{"message": "OAuth connected", "data": {"account_id": 1, "username": "...", ...}}
```

## 9. Token Lifetimes

| Token | Lifetime | Refresh Strategy |
|---|---|---|
| Access token (short-lived) | 1 hour | Exchange for long-lived token |
| Access token (long-lived) | 60 days | Auto-refresh before expiry |

## Notes

- **Dev mode**: Only users added to App Roles can OAuth. Fine for early customers — add them as Testers.
- **Production**: Requires App Review — submit a description and screencast video for each permission.
- **HTTPS required**: Meta requires HTTPS for redirect URIs. Use ngrok for local dev.
- **ngrok free plan**: URL changes on each restart — update `.env` and Meta dashboard accordingly.
