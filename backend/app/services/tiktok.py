import os
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from urllib.parse import urlencode

import requests

from .platform import PlatformService
from .encryption import TokenEncryption
from .. import db
from ..models import Account, Channel, Post

logger = logging.getLogger(__name__)

TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize/'
TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2'


class TikTokService(PlatformService):

    def __init__(self):
        self.client_key = os.environ['TIKTOK_CLIENT_KEY']
        self.client_secret = os.environ['TIKTOK_CLIENT_SECRET']
        self.redirect_base = os.environ.get('OAUTH_REDIRECT_BASE_URL', 'http://localhost:5001')
        self.encryption = TokenEncryption()

    @property
    def redirect_uri(self) -> str:
        return f"{self.redirect_base}/oauth/callback/tiktok"

    # ── OAuth ────────────────────────────────────────────────────────────────

    def get_oauth_url(self, state: str, channel: str) -> str:
        params = {
            'client_key': self.client_key,
            'scope': 'user.info.profile,video.list',
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'state': state,
        }
        return f"{TIKTOK_AUTH_BASE}?{urlencode(params)}"

    def handle_oauth_callback(self, channel: str, code: str, state: str = None) -> Dict[str, Any]:
        # Step 1: Exchange code for tokens
        resp = requests.post(f"{TIKTOK_API_BASE}/oauth/token/", json={
            'client_key': self.client_key,
            'client_secret': self.client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': self.redirect_uri,
        })
        resp.raise_for_status()
        token_data = resp.json()

        access_token = token_data['access_token']
        refresh_token = token_data['refresh_token']
        expires_in = token_data.get('expires_in', 86400)  # 24 hours
        open_id = token_data.get('open_id', '')

        # Step 2: Fetch user info
        display_name = None
        try:
            user_resp = requests.get(
                f"{TIKTOK_API_BASE}/user/info/",
                params={'fields': 'display_name'},
                headers={'Authorization': f'Bearer {access_token}'},
            )
            user_resp.raise_for_status()
            user_data = user_resp.json().get('data', {}).get('user', {})
            display_name = user_data.get('display_name')
        except Exception:
            logger.warning("Failed to fetch TikTok user info, continuing without display_name")

        # Step 3: Parse state and create Account
        import json
        if not state:
            raise ValueError("Missing state in OAuth callback")
        state_data = json.loads(state)
        campaign_id = state_data['campaign_id']
        creator_id = state_data['creator_id']
        channel_id = state_data['channel_id']

        account = Account(
            campaign_id=campaign_id,
            creator_id=creator_id,
            channel_id=channel_id,
            platform_account_id=open_id,
            username=display_name,
            access_token=self.encryption.encrypt(access_token),
            refresh_token=self.encryption.encrypt(refresh_token),
            token_expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
        )
        db.session.add(account)
        db.session.commit()

        return {
            'account_id': account.id,
            'platform_account_id': open_id,
            'username': display_name,
            'expires_at': str(account.token_expires_at),
        }

    # ── Post fetching ────────────────────────────────────────────────────────

    def fetch_posts(self, account_id: int) -> List[Dict[str, Any]]:
        account = Account.query.get(account_id)
        if not account or not account.access_token:
            raise ValueError(f"Account {account_id} not found or not authorized")

        self.refresh_token(account_id)

        token = self.encryption.decrypt(account.access_token)

        video_items = []
        cursor = None
        has_more = True

        while has_more and len(video_items) < 200:
            body = {'max_count': 20}
            if cursor:
                body['cursor'] = cursor

            resp = requests.post(
                f"{TIKTOK_API_BASE}/video/list/",
                params={'fields': 'id,title,create_time,share_url,like_count,comment_count,view_count,share_count'},
                json=body,
                headers={'Authorization': f'Bearer {token}'},
            )
            if resp.status_code == 429:
                logger.warning("TikTok API rate limit reached for account %s", account_id)
                break
            resp.raise_for_status()

            data = resp.json().get('data', {})
            videos = data.get('videos', [])
            video_items.extend(videos)

            has_more = data.get('has_more', False)
            cursor = data.get('cursor')

        # Upsert posts
        result = []
        for item in video_items:
            post = Post.query.filter_by(
                account_id=account_id,
                platform_post_id=str(item['id']),
            ).first()

            post_data = {
                'platform_post_id': str(item['id']),
                'post_url': item.get('share_url', ''),
                'caption': item.get('title'),
                'posted_at': datetime.fromtimestamp(item['create_time'], tz=timezone.utc) if item.get('create_time') else None,
                'likes': item.get('like_count', 0),
                'comments': item.get('comment_count', 0),
                'views': item.get('view_count', 0),
                'shares': item.get('share_count', 0),
            }

            if post:
                for key, value in post_data.items():
                    setattr(post, key, value)
            else:
                post = Post(account_id=account_id, **post_data)
                db.session.add(post)

            result.append(post_data)

        db.session.commit()
        return result

    # ── Token refresh ────────────────────────────────────────────────────────

    def refresh_token(self, account_id: int) -> bool:
        account = Account.query.get(account_id)
        if not account or not account.access_token:
            return False

        # Skip if token has more than 1 hour remaining
        if account.token_expires_at:
            expires = account.token_expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            remaining = expires - datetime.now(timezone.utc)
            if remaining > timedelta(hours=1):
                return True

        if not account.refresh_token:
            logger.error("No refresh token available for TikTok account %s", account_id)
            return False

        try:
            current_refresh = self.encryption.decrypt(account.refresh_token)
            resp = requests.post(f"{TIKTOK_API_BASE}/oauth/token/", json={
                'client_key': self.client_key,
                'client_secret': self.client_secret,
                'grant_type': 'refresh_token',
                'refresh_token': current_refresh,
            })
            resp.raise_for_status()
            token_data = resp.json()

            account.access_token = self.encryption.encrypt(token_data['access_token'])
            account.refresh_token = self.encryption.encrypt(token_data['refresh_token'])
            account.token_expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=token_data.get('expires_in', 86400)
            )
            db.session.commit()
            return True
        except Exception:
            logger.error("Failed to refresh TikTok token for account %s", account_id, exc_info=True)
            return False
