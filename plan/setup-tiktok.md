# TikTok API Setup Guide

## 1. Create Developer Account

1. Go to [developers.tiktok.com](https://developers.tiktok.com/)
2. Click **Sign Up** and enter your email address
3. Click **Send PIN to email**, check your inbox for the OTP
4. Enter the code to complete registration

## 2. Create an App

1. Go to **Manage Apps** → **Connect an app**
2. Fill in:
   - **App icon**: upload your app icon (required)
   - **App name**: your application name
   - **Category**: select the appropriate category (e.g., "Social media management")
   - **Description**: brief description of your app's purpose
   - **Terms of Service URL**: your Terms of Service page URL
   - **Privacy Policy URL**: your Privacy Policy page URL
   - **Platforms**: select **Web** and enter your website URL

## 3. Add Required Scopes

Go to your app page → **Scopes** → **Add scopes** and select:

| Scope | Purpose |
|---|---|
| `user.info.profile` | Profile info (display_name, profile_web_link, bio_description, is_verified) |
| `video.list` | Read user's public video posts + engagement metrics |

## 4. Configure OAuth

### App Credentials

Note **Client Key** and **Client Secret** from your app's Credentials section.

### Redirect URI

Go to app settings, add redirect URI:
```
https://<domain>/oauth/callback/tiktok
```
- Up to 10 redirect URIs allowed
- No query parameters allowed in the redirect URI

## 5. Prepare Test Account

1. Any TikTok account can be used for testing (no need to switch to Business/Creator like Instagram)
2. In **Dev mode**, add test users via the Developer Portal so they can authorize

## 6. Set Up `.env`

```
TIKTOK_CLIENT_KEY=<Client Key>
TIKTOK_CLIENT_SECRET=<Client Secret>
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

Update `.env` `OAUTH_REDIRECT_BASE_URL` and TikTok Developer Portal redirect URI with the ngrok URL.

## 8. Test OAuth Flow

Open in browser:
```
https://www.tiktok.com/v2/auth/authorize/?client_key=<CLIENT_KEY>&scope=user.info.profile,video.list&response_type=code&redirect_uri=<NGROK_URL>/oauth/callback/tiktok&state=<URL_ENCODED_JSON>
```

Expected success response:
```json
{"message": "OAuth connected", "data": {"account_id": 1, "username": "...", ...}}
```

## 9. Token Lifetimes

| Token | Lifetime | Refresh Strategy |
|---|---|---|
| Access token | 24 hours | Auto-refresh when < 1 hour remaining |
| Refresh token | 365 days | User must re-authorize after expiry |

## Notes

- **Dev mode**: Only the developer and added test users can authorize. Fine for early customers — add them as test users.
- **Production**: Requires App Review — submit a demo video, privacy policy URL, and description of data usage.
- **HTTPS required**: TikTok requires HTTPS for redirect URIs. Use ngrok for local dev.
- **ngrok free plan**: URL changes on each restart — update `.env` and TikTok Developer Portal accordingly.
