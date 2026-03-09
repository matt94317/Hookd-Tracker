class PlatformService:
    """Interface for platform integrations (Instagram/TikTok)."""
    
    def get_oauth_url(self, account_id, channel) -> str:
        raise NotImplementedError

    def handle_oauth_callback(self, channel, code):
        raise NotImplementedError

    def fetch_posts(self, account_id) -> list[dict]:
        raise NotImplementedError

    def refresh_token(self, account_id) -> bool:
        raise NotImplementedError