import base64
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

# Set env vars before importing app modules
os.environ.setdefault('TIKTOK_CLIENT_KEY', 'test-client-key')
os.environ.setdefault('TIKTOK_CLIENT_SECRET', 'test-client-secret')
os.environ.setdefault('OAUTH_REDIRECT_BASE_URL', 'http://localhost:5001')
os.environ.setdefault('TOKEN_ENCRYPTION_KEY', base64.b64encode(os.urandom(32)).decode())

from app import create_app, db
from app.models import Account, Post, Channel, User, Campaign
from app.services.tiktok import TikTokService


class TestTikTokService(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed test data
        company = User(id=1, name='Company', email='co@test.com', password='x', role='company')
        channel = Channel(id=2, name='tiktok')
        db.session.add_all([company, channel])
        db.session.flush()

        campaign = Campaign(id=1, name='Test Campaign', company_id=1)
        db.session.add(campaign)
        db.session.flush()

        account = Account(
            id=1, campaign_id=1, channel_id=2,
            platform_account_id='tt_placeholder', username='ttuser',
        )
        db.session.add(account)
        db.session.commit()

        self.service = TikTokService()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_get_oauth_url(self):
        url = self.service.get_oauth_url(1, 'tiktok')
        self.assertIn('client_key=test-client-key', url)
        self.assertIn('state=1', url)
        self.assertIn('video.list', url)

    @patch('app.services.tiktok.requests.get')
    @patch('app.services.tiktok.requests.post')
    def test_handle_oauth_callback(self, mock_post, mock_get):
        token_response = MagicMock(status_code=200, json=lambda: {
            'access_token': 'tt-access',
            'refresh_token': 'tt-refresh',
            'expires_in': 86400,
            'open_id': 'open123',
        })
        token_response.raise_for_status = MagicMock()
        mock_post.return_value = token_response

        user_response = MagicMock(status_code=200, json=lambda: {
            'data': {'user': {'display_name': 'TikTok User'}},
        })
        user_response.raise_for_status = MagicMock()
        mock_get.return_value = user_response

        result = self.service.handle_oauth_callback('tiktok', 'auth-code', state='1')

        self.assertEqual(result['account_id'], 1)
        self.assertEqual(result['platform_account_id'], 'open123')
        self.assertEqual(result['username'], 'TikTok User')

        account = Account.query.get(1)
        self.assertIsNotNone(account.access_token)
        self.assertIsNotNone(account.refresh_token)

    @patch('app.services.tiktok.requests.post')
    def test_fetch_posts(self, mock_post):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('test-token')
        account.token_expires_at = datetime(2099, 1, 1, tzinfo=timezone.utc)
        db.session.commit()

        video_response = MagicMock(status_code=200, json=lambda: {
            'data': {
                'videos': [{
                    'id': 'vid1',
                    'title': 'My TikTok',
                    'create_time': 1705312800,
                    'share_url': 'https://www.tiktok.com/@user/video/vid1',
                    'like_count': 500,
                    'comment_count': 30,
                    'view_count': 20000,
                    'share_count': 100,
                }],
                'has_more': False,
                'cursor': None,
            },
        })
        video_response.raise_for_status = MagicMock()
        mock_post.return_value = video_response

        posts = self.service.fetch_posts(1)

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]['platform_post_id'], 'vid1')
        self.assertEqual(posts[0]['likes'], 500)
        self.assertEqual(posts[0]['views'], 20000)
        self.assertEqual(posts[0]['shares'], 100)

        db_post = Post.query.filter_by(platform_post_id='vid1').first()
        self.assertIsNotNone(db_post)

    @patch('app.services.tiktok.requests.post')
    def test_fetch_posts_pagination(self, mock_post):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('test-token')
        account.token_expires_at = datetime(2099, 1, 1, tzinfo=timezone.utc)
        db.session.commit()

        page1 = MagicMock(status_code=200, json=lambda: {
            'data': {
                'videos': [{'id': f'vid{i}', 'title': f'Video {i}', 'create_time': 1705312800,
                            'share_url': f'https://tiktok.com/v/{i}',
                            'like_count': 0, 'comment_count': 0, 'view_count': 0, 'share_count': 0}
                           for i in range(20)],
                'has_more': True,
                'cursor': 'page2cursor',
            },
        })
        page1.raise_for_status = MagicMock()

        page2 = MagicMock(status_code=200, json=lambda: {
            'data': {
                'videos': [{'id': 'vid20', 'title': 'Video 20', 'create_time': 1705312800,
                            'share_url': 'https://tiktok.com/v/20',
                            'like_count': 0, 'comment_count': 0, 'view_count': 0, 'share_count': 0}],
                'has_more': False,
                'cursor': None,
            },
        })
        page2.raise_for_status = MagicMock()

        mock_post.side_effect = [page1, page2]

        posts = self.service.fetch_posts(1)
        self.assertEqual(len(posts), 21)
        self.assertEqual(mock_post.call_count, 2)

    @patch('app.services.tiktok.requests.post')
    def test_refresh_token_skips_when_fresh(self, mock_post):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('token')
        account.refresh_token = self.service.encryption.encrypt('refresh')
        account.token_expires_at = datetime(2099, 1, 1, tzinfo=timezone.utc)
        db.session.commit()

        result = self.service.refresh_token(1)
        self.assertTrue(result)
        mock_post.assert_not_called()

    @patch('app.services.tiktok.requests.post')
    def test_refresh_token_refreshes_when_expiring(self, mock_post):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('old-token')
        account.refresh_token = self.service.encryption.encrypt('old-refresh')
        account.token_expires_at = datetime.now(timezone.utc)  # expired
        db.session.commit()

        refresh_response = MagicMock(status_code=200, json=lambda: {
            'access_token': 'new-access',
            'refresh_token': 'new-refresh',
            'expires_in': 86400,
        })
        refresh_response.raise_for_status = MagicMock()
        mock_post.return_value = refresh_response

        result = self.service.refresh_token(1)
        self.assertTrue(result)
        mock_post.assert_called_once()


if __name__ == '__main__':
    unittest.main()
