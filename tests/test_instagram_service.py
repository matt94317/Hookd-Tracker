import base64
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

# Set env vars before importing app modules
os.environ.setdefault('INSTAGRAM_APP_ID', 'test-app-id')
os.environ.setdefault('INSTAGRAM_APP_SECRET', 'test-app-secret')
os.environ.setdefault('OAUTH_REDIRECT_BASE_URL', 'http://localhost:5001')
os.environ.setdefault('TOKEN_ENCRYPTION_KEY', base64.b64encode(os.urandom(32)).decode())

from app import create_app, db
from app.models import Account, Post, Channel, User, Campaign
from app.services.instagram import InstagramService


class TestInstagramService(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app.config['TESTING'] = True
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

        # Seed test data
        company = User(id=1, name='Company', email='co@test.com', password='x', role='company')
        channel = Channel(id=1, name='instagram')
        db.session.add_all([company, channel])
        db.session.flush()

        campaign = Campaign(id=1, name='Test Campaign', company_id=1)
        db.session.add(campaign)
        db.session.flush()

        account = Account(
            id=1, campaign_id=1, channel_id=1,
            platform_account_id='ig_placeholder', username='testuser',
        )
        db.session.add(account)
        db.session.commit()

        self.service = InstagramService()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_get_oauth_url(self):
        url = self.service.get_oauth_url(1, 'instagram')
        self.assertIn('client_id=test-app-id', url)
        self.assertIn('redirect_uri=', url)
        self.assertIn('state=1', url)
        self.assertIn('instagram_basic', url)

    @patch('app.services.instagram.requests.get')
    def test_handle_oauth_callback(self, mock_get):
        responses = [
            # Short-lived token exchange
            MagicMock(status_code=200, json=lambda: {'access_token': 'short-token'}),
            # Long-lived token exchange
            MagicMock(status_code=200, json=lambda: {'access_token': 'long-lived-token'}),
            # Pages API
            MagicMock(status_code=200, json=lambda: {'data': [{'id': 'page123'}]}),
            # Page -> IG Business Account
            MagicMock(status_code=200, json=lambda: {'instagram_business_account': {'id': 'ig456'}}),
            # IG username
            MagicMock(status_code=200, json=lambda: {'username': 'realuser'}),
        ]
        for r in responses:
            r.raise_for_status = MagicMock()
        mock_get.side_effect = responses

        result = self.service.handle_oauth_callback('instagram', 'auth-code', state='1')

        self.assertEqual(result['account_id'], 1)
        self.assertEqual(result['platform_account_id'], 'ig456')
        self.assertEqual(result['username'], 'realuser')

        account = Account.query.get(1)
        self.assertIsNotNone(account.access_token)
        self.assertEqual(account.platform_account_id, 'ig456')

    @patch('app.services.instagram.requests.get')
    def test_fetch_posts(self, mock_get):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('test-token')
        account.token_expires_at = datetime(2099, 1, 1, tzinfo=timezone.utc)
        db.session.commit()

        media_response = MagicMock(status_code=200, json=lambda: {
            'data': [{
                'id': 'media1',
                'caption': 'Test post',
                'timestamp': '2024-01-15T10:00:00+0000',
                'permalink': 'https://www.instagram.com/p/abc123/',
                'like_count': 100,
                'comments_count': 10,
                'media_type': 'IMAGE',
            }],
            'paging': {},
        })
        media_response.raise_for_status = MagicMock()

        insights_response = MagicMock(status_code=200, json=lambda: {
            'data': [{'values': [{'value': 5000}]}],
        })

        mock_get.side_effect = [media_response, insights_response]

        posts = self.service.fetch_posts(1)

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]['platform_post_id'], 'media1')
        self.assertEqual(posts[0]['likes'], 100)
        self.assertEqual(posts[0]['views'], 5000)

        db_post = Post.query.filter_by(platform_post_id='media1').first()
        self.assertIsNotNone(db_post)
        self.assertEqual(db_post.likes, 100)

    @patch('app.services.instagram.requests.get')
    def test_fetch_posts_upsert(self, mock_get):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('test-token')
        account.token_expires_at = datetime(2099, 1, 1, tzinfo=timezone.utc)

        existing = Post(
            account_id=1, platform_post_id='media1',
            post_url='https://instagram.com/p/abc/', likes=50, comments=5, views=1000, shares=0,
        )
        db.session.add(existing)
        db.session.commit()

        media_response = MagicMock(status_code=200, json=lambda: {
            'data': [{
                'id': 'media1',
                'caption': 'Updated caption',
                'timestamp': '2024-01-15T10:00:00+0000',
                'permalink': 'https://www.instagram.com/p/abc123/',
                'like_count': 200,
                'comments_count': 20,
                'media_type': 'IMAGE',
            }],
            'paging': {},
        })
        media_response.raise_for_status = MagicMock()

        insights_response = MagicMock(status_code=200, json=lambda: {
            'data': [{'values': [{'value': 10000}]}],
        })

        mock_get.side_effect = [media_response, insights_response]

        self.service.fetch_posts(1)

        db_post = Post.query.filter_by(platform_post_id='media1').first()
        self.assertEqual(db_post.likes, 200)
        self.assertEqual(db_post.views, 10000)
        self.assertEqual(Post.query.count(), 1)

    @patch('app.services.instagram.requests.get')
    def test_refresh_token_skips_when_fresh(self, mock_get):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('token')
        account.token_expires_at = datetime(2099, 1, 1, tzinfo=timezone.utc)
        db.session.commit()

        result = self.service.refresh_token(1)
        self.assertTrue(result)
        mock_get.assert_not_called()

    @patch('app.services.instagram.requests.get')
    def test_refresh_token_refreshes_when_expiring(self, mock_get):
        account = Account.query.get(1)
        account.access_token = self.service.encryption.encrypt('old-token')
        account.token_expires_at = datetime.now(timezone.utc)  # expired
        db.session.commit()

        refresh_response = MagicMock(status_code=200, json=lambda: {'access_token': 'new-token'})
        refresh_response.raise_for_status = MagicMock()
        mock_get.return_value = refresh_response

        result = self.service.refresh_token(1)
        self.assertTrue(result)
        mock_get.assert_called_once()


if __name__ == '__main__':
    unittest.main()
