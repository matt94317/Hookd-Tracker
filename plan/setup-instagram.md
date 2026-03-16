# Instagram (Meta Graph API) Setup Guide

## 1. Create Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Log in with a Facebook account and register as a developer

## 2. Create a Meta App

1. My Apps → Create App
2. Select "No use case"
3. Enter app name and contact email → Create

## 3. Add Instagram Use Case

1. App Dashboard → Use Cases → Add Use Cases
2. Filter: "Content Management"
3. Select "Manage messages and content on Instagram"
4. Go to **"API setup with Facebook login"**
5. Click "Add required content permissions"

## 4. Add Required Permissions

Go to "Permissions and Features" and add:

| Permission | Purpose |
|---|---|
| `instagram_basic` | Profile info |
| `instagram_manage_insights` | Post impressions/reach (**must add manually**) |
| `pages_show_list` | List Facebook Pages |
| `pages_read_engagement` | Read Page content |
| `business_management` | Pages info |

## 5. Configure OAuth

### App Settings → Basic

- Note **App ID** and **App Secret**
- Add domain to **App Domains**

### Business Facebook Login → Settings

- Add redirect URI to **Valid OAuth Redirect URIs**:
  ```
  https://<domain>/oauth/callback/instagram
  ```

## 6. Prepare Test Instagram Account

1. Switch Instagram account to **Business** or **Creator** account
2. Create a **Facebook Page**
3. Link Instagram account to the Facebook Page (from either Instagram or Facebook Page settings)

## 7. Set Up `.env`

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

## 8. Local Testing with ngrok

```bash
# Start backend
docker-compose up --build

# In another terminal, start ngrok
ngrok http 5001
```

Update `.env` `OAUTH_REDIRECT_BASE_URL` and Meta dashboard redirect URI with the ngrok URL.

## 9. Test OAuth Flow

Open in browser:
```
https://www.facebook.com/v19.0/dialog/oauth?client_id=<APP_ID>&redirect_uri=<NGROK_URL>/oauth/callback/instagram&scope=instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management&response_type=code&state=<URL_ENCODED_JSON>
```

When prompted to select Pages, **check the Facebook Page linked to your Instagram account**.

Expected success response:
```json
{"message": "OAuth connected", "data": {"account_id": 1, "username": "...", ...}}
```

## Notes

- **Dev mode**: Only users added to App Roles can OAuth. Fine for early customers — add them as Testers.
- **Production**: Requires App Review for each permission (submit description + screencast video).
- **HTTPS required**: Meta requires HTTPS for redirect URIs. Use ngrok for local dev.
- **ngrok free plan**: URL changes on each restart — update `.env` and Meta dashboard accordingly.
