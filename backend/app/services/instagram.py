import os
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from urllib.parse import urlencode

import requests

from .platform import PlatformService
from .encryption import TokenEncryption
from .. import db
from ..models import Account, Post

logger = logging.getLogger(__name__)

GRAPH_API_BASE = 'https://graph.facebook.com/v19.0'


class InstagramService(PlatformService):

    def __init__(self):
        self.app_id = os.environ['INSTAGRAM_APP_ID']
        self.app_secret = os.environ['INSTAGRAM_APP_SECRET']
        self.redirect_base = os.environ.get('OAUTH_REDIRECT_BASE_URL', 'http://localhost:5001')
        self.encryption = TokenEncryption()

    @property
    def redirect_uri(self) -> str:
        return f"{self.redirect_base}/oauth/callback/instagram"

    # ── OAuth ────────────────────────────────────────────────────────────────

    def get_oauth_url(self, account_id: int, channel: str) -> str:
        params = {
            'client_id': self.app_id,
            'redirect_uri': self.redirect_uri,
            'scope': 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement',
            'response_type': 'code',
            'state': str(account_id),
        }
        return f"https://www.facebook.com/v19.0/dialog/oauth?{urlencode(params)}"

    def handle_oauth_callback(self, channel: str, code: str, state: str = None) -> Dict[str, Any]:
        # Step 1: Exchange code for short-lived token
        resp = requests.get(f"{GRAPH_API_BASE}/oauth/access_token", params={
            'client_id': self.app_id,
            'client_secret': self.app_secret,
            'redirect_uri': self.redirect_uri,
            'code': code,
        })
        resp.raise_for_status()
        short_lived_token = resp.json()['access_token']

        # Step 2: Exchange for long-lived token (60 days)
        resp = requests.get(f"{GRAPH_API_BASE}/oauth/access_token", params={
            'grant_type': 'fb_exchange_token',
            'client_id': self.app_id,
            'client_secret': self.app_secret,
            'fb_exchange_token': short_lived_token,
        })
        resp.raise_for_status()
        long_lived_token = resp.json()['access_token']

        # Step 3: Get Instagram Business Account ID via Pages API
        resp = requests.get(f"{GRAPH_API_BASE}/me/accounts", params={
            'access_token': long_lived_token,
        })
        resp.raise_for_status()
        pages = resp.json().get('data', [])
        if not pages:
            raise ValueError("No Facebook Pages found. User must have a Page linked to an Instagram Business/Creator account.")

        ig_user_id = None
        ig_username = None
        for page in pages:
            page_resp = requests.get(
                f"{GRAPH_API_BASE}/{page['id']}",
                params={
                    'fields': 'instagram_business_account',
                    'access_token': long_lived_token,
                },
            )
            page_resp.raise_for_status()
            ig_account = page_resp.json().get('instagram_business_account')
            if ig_account:
                ig_user_id = ig_account['id']
                # Fetch username
                user_resp = requests.get(
                    f"{GRAPH_API_BASE}/{ig_user_id}",
                    params={'fields': 'username', 'access_token': long_lived_token},
                )
                user_resp.raise_for_status()
                ig_username = user_resp.json().get('username')
                break

        if not ig_user_id:
            raise ValueError("No Instagram Business/Creator account found linked to any Facebook Page.")

        # Step 4: Update Account row
        account_id = int(state) if state else None
        if not account_id:
            raise ValueError("Missing account_id in OAuth state parameter")

        account = Account.query.get(account_id)
        if not account:
            raise ValueError(f"Account {account_id} not found")

        account.access_token = self.encryption.encrypt(long_lived_token)
        account.platform_account_id = ig_user_id
        account.username = ig_username
        account.token_expires_at = datetime.now(timezone.utc) + timedelta(days=60)
        db.session.commit()

        return {
            'account_id': account_id,
            'platform_account_id': ig_user_id,
            'username': ig_username,
            'expires_at': str(account.token_expires_at),
        }

    # ── Post fetching ────────────────────────────────────────────────────────

    def fetch_posts(self, account_id: int) -> List[Dict[str, Any]]:
        account = Account.query.get(account_id)
        if not account or not account.access_token:
            raise ValueError(f"Account {account_id} not found or not authorized")

        self.refresh_token(account_id)

        token = self.encryption.decrypt(account.access_token)
        ig_user_id = account.platform_account_id

        # Fetch media list
        media_items = []
        url = f"{GRAPH_API_BASE}/{ig_user_id}/media"
        params = {
            'fields': 'id,caption,timestamp,permalink,like_count,comments_count,media_type',
            'access_token': token,
            'limit': 50,
        }

        while url:
            resp = requests.get(url, params=params)
            if resp.status_code == 429:
                logger.warning("Instagram API rate limit reached for account %s", account_id)
                break
            resp.raise_for_status()
            data = resp.json()
            media_items.extend(data.get('data', []))

            # Pagination
            url = data.get('paging', {}).get('next')
            params = {}  # next URL already contains params

            if len(media_items) >= 200:
                break

        # Upsert posts
        result = []
        for item in media_items:
            views = self._fetch_impressions(item['id'], token, item.get('media_type'))

            post = Post.query.filter_by(
                account_id=account_id,
                platform_post_id=item['id'],
            ).first()

            post_data = {
                'platform_post_id': item['id'],
                'post_url': item.get('permalink', ''),
                'caption': item.get('caption'),
                'posted_at': datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00')) if item.get('timestamp') else None,
                'likes': item.get('like_count', 0),
                'comments': item.get('comments_count', 0),
                'views': views,
                'shares': 0,  # Instagram does not expose share counts
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

    def _fetch_impressions(self, media_id: str, token: str, media_type: str = None) -> int:
        try:
            metric = 'impressions'
            if media_type in ('VIDEO', 'REEL'):
                metric = 'plays'

            resp = requests.get(
                f"{GRAPH_API_BASE}/{media_id}/insights",
                params={'metric': metric, 'access_token': token},
            )
            if resp.status_code != 200:
                return 0
            data = resp.json().get('data', [])
            if data:
                return data[0].get('values', [{}])[0].get('value', 0)
        except Exception:
            logger.warning("Failed to fetch insights for media %s", media_id)
        return 0

    # ── Token refresh ────────────────────────────────────────────────────────

    def refresh_token(self, account_id: int) -> bool:
        account = Account.query.get(account_id)
        if not account or not account.access_token:
            return False

        # Skip if token has more than 7 days remaining
        if account.token_expires_at:
            expires = account.token_expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            remaining = expires - datetime.now(timezone.utc)
            if remaining > timedelta(days=7):
                return True

        try:
            current_token = self.encryption.decrypt(account.access_token)
            resp = requests.get(f"{GRAPH_API_BASE}/oauth/access_token", params={
                'grant_type': 'fb_exchange_token',
                'client_id': self.app_id,
                'client_secret': self.app_secret,
                'fb_exchange_token': current_token,
            })
            resp.raise_for_status()

            new_token = resp.json()['access_token']
            account.access_token = self.encryption.encrypt(new_token)
            account.token_expires_at = datetime.now(timezone.utc) + timedelta(days=60)
            db.session.commit()
            return True
        except Exception:
            logger.error("Failed to refresh Instagram token for account %s", account_id, exc_info=True)
            return False
