import base64
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

# Set env vars before importing app modules
os.environ.setdefault('INSTAGRAM_APP_ID', 'test-app-id')
os.environ.setdefault('INSTAGRAM_APP_SECRET', 'test-app-secret')
os.environ.setdefault('TIKTOK_CLIENT_KEY', 'test-client-key')
os.environ.setdefault('TIKTOK_CLIENT_SECRET', 'test-client-secret')
os.environ.setdefault('OAUTH_REDIRECT_BASE_URL', 'http://localhost:5001')
os.environ.setdefault('TOKEN_ENCRYPTION_KEY', base64.b64encode(os.urandom(32)).decode())

from app import create_app, db
from app.models import Account, Post, Channel, User, Campaign, CampaignCreator
from app.services.encryption import TokenEncryption


class JobTestBase(unittest.TestCase):
    """Base class for job tests with common setup/teardown."""

    def setUp(self):
        self.app = create_app({
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
            'TESTING': True,
            'SCHEDULER_DISABLED': True,
        })
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        self.encryption = TokenEncryption()

        # Seed test data
        company = User(id=1, name='Company', email='co@test.com', password='x', role='company')
        creator = User(id=2, name='Creator', email='cr@test.com', password='x', role='creator')
        ig_channel = Channel(id=1, name='instagram')
        tk_channel = Channel(id=2, name='tiktok')
        db.session.add_all([company, creator, ig_channel, tk_channel])
        db.session.flush()

        campaign = Campaign(id=1, name='Test Campaign', company_id=1)
        db.session.add(campaign)
        db.session.flush()

        cc = CampaignCreator(id=1, campaign_id=1, creator_id=2)
        db.session.add(cc)
        db.session.flush()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()


# ── sync_posts tests ───────────────────────────────────────────────────────

class TestSyncPostsJob(JobTestBase):

    @patch('app.services.instagram.InstagramService.fetch_posts')
    def test_sync_fetches_authorized_accounts(self, mock_fetch):
        mock_fetch.return_value = [{'platform_post_id': 'p1'}]

        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=1,
            platform_account_id='ig123', username='testuser',
            access_token=self.encryption.encrypt('token'),
            token_expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
        )
        db.session.add(account)
        db.session.commit()

        from app.jobs.sync_posts import sync_all_posts
        sync_all_posts()

        mock_fetch.assert_called_once_with(1)

    @patch('app.services.instagram.InstagramService.fetch_posts')
    def test_sync_skips_unauthorized_accounts(self, mock_fetch):
        # Account without access_token
        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=1,
            platform_account_id='ig123', username='testuser',
        )
        db.session.add(account)
        db.session.commit()

        from app.jobs.sync_posts import sync_all_posts
        sync_all_posts()

        mock_fetch.assert_not_called()

    @patch('app.services.instagram.InstagramService.fetch_posts')
    def test_sync_continues_on_error(self, mock_fetch):
        mock_fetch.side_effect = Exception("API error")

        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=1,
            platform_account_id='ig123', username='testuser',
            access_token=self.encryption.encrypt('token'),
            token_expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
        )
        db.session.add(account)
        db.session.commit()

        from app.jobs.sync_posts import sync_all_posts
        # Should not raise
        sync_all_posts()


# ── refresh_tokens tests ───────────────────────────────────────────────────

class TestRefreshTokensJob(JobTestBase):

    @patch('app.services.instagram.InstagramService.refresh_token')
    def test_refresh_expiring_token(self, mock_refresh):
        mock_refresh.return_value = True

        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=1,
            platform_account_id='ig123', username='testuser',
            access_token=self.encryption.encrypt('token'),
            token_expires_at=datetime.now(timezone.utc) + timedelta(days=3),  # within 7-day threshold
        )
        db.session.add(account)
        db.session.commit()

        from app.jobs.refresh_tokens import refresh_all_tokens
        refresh_all_tokens()

        mock_refresh.assert_called_once_with(1)

    @patch('app.services.instagram.InstagramService.refresh_token')
    def test_refresh_skips_fresh_token(self, mock_refresh):
        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=1,
            platform_account_id='ig123', username='testuser',
            access_token=self.encryption.encrypt('token'),
            token_expires_at=datetime.now(timezone.utc) + timedelta(days=30),  # well within expiry
        )
        db.session.add(account)
        db.session.commit()

        from app.jobs.refresh_tokens import refresh_all_tokens
        refresh_all_tokens()

        mock_refresh.assert_not_called()

    @patch('app.services.tiktok.TikTokService.refresh_token')
    def test_refresh_tiktok_uses_shorter_threshold(self, mock_refresh):
        mock_refresh.return_value = True

        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=2,  # tiktok
            platform_account_id='tk123', username='testuser',
            access_token=self.encryption.encrypt('token'),
            refresh_token=self.encryption.encrypt('refresh'),
            token_expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),  # within 1h threshold
        )
        db.session.add(account)
        db.session.commit()

        from app.jobs.refresh_tokens import refresh_all_tokens
        refresh_all_tokens()

        mock_refresh.assert_called_once_with(1)

    @patch('app.services.instagram.InstagramService.refresh_token')
    def test_refresh_logs_failure(self, mock_refresh):
        mock_refresh.return_value = False

        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=1,
            platform_account_id='ig123', username='testuser',
            access_token=self.encryption.encrypt('token'),
            token_expires_at=datetime.now(timezone.utc),  # expired
        )
        db.session.add(account)
        db.session.commit()

        from app.jobs.refresh_tokens import refresh_all_tokens
        # Should not raise, just log
        refresh_all_tokens()

        mock_refresh.assert_called_once()


# ── check_targets tests ───────────────────────────────────────────────────

class TestCheckTargetsJob(JobTestBase):

    def _create_account_with_targets(self, daily=0, monthly=0):
        account = Account(
            id=1, campaign_id=1, creator_id=2, channel_id=1,
            platform_account_id='ig123', username='testuser',
            access_token=self.encryption.encrypt('token'),
            token_expires_at=datetime(2099, 1, 1, tzinfo=timezone.utc),
            daily_target=daily,
            monthly_target=monthly,
        )
        db.session.add(account)
        db.session.commit()
        return account

    def test_behind_daily_target(self):
        self._create_account_with_targets(daily=3, monthly=0)

        # Add 1 post today (target is 3)
        post = Post(
            id=1, account_id=1, platform_post_id='p1',
            post_url='https://example.com',
            posted_at=datetime.now(timezone.utc),
            likes=0, comments=0, views=0, shares=0,
        )
        db.session.add(post)
        db.session.commit()

        from app.jobs.check_targets import check_all_targets
        # Should log warning, not raise
        check_all_targets()

    def test_on_track(self):
        self._create_account_with_targets(daily=1, monthly=1)

        post = Post(
            id=1, account_id=1, platform_post_id='p1',
            post_url='https://example.com',
            posted_at=datetime.now(timezone.utc),
            likes=0, comments=0, views=0, shares=0,
        )
        db.session.add(post)
        db.session.commit()

        from app.jobs.check_targets import check_all_targets
        check_all_targets()

    def test_skips_accounts_with_no_targets(self):
        self._create_account_with_targets(daily=0, monthly=0)

        from app.jobs.check_targets import check_all_targets
        # Should run without issue, skip this account
        check_all_targets()

    def test_behind_monthly_target(self):
        self._create_account_with_targets(daily=0, monthly=10)

        # Add 2 posts this month (target is 10)
        for i in range(2):
            post = Post(
                id=100 + i, account_id=1, platform_post_id=f'p{i}',
                post_url='https://example.com',
                posted_at=datetime.now(timezone.utc),
                likes=0, comments=0, views=0, shares=0,
            )
            db.session.add(post)
        db.session.commit()

        from app.jobs.check_targets import check_all_targets
        check_all_targets()


if __name__ == '__main__':
    unittest.main()
