"""
Shared interface between Person A (API Integration) and Person B (App Development).
Person A implements these methods; Person B calls them from API routes.
"""


class PlatformService:
    def get_oauth_url(self, account_id: int, channel: str) -> str:
        """Generate OAuth authorization URL for a given platform."""
        raise NotImplementedError

    def handle_oauth_callback(self, channel: str, code: str) -> dict:
        """Exchange OAuth callback code for tokens."""
        raise NotImplementedError

    def fetch_posts(self, account_id: int) -> list[dict]:
        """Fetch posts from the platform for a given account."""
        raise NotImplementedError

    def refresh_token(self, account_id: int) -> bool:
        """Refresh an expired or expiring token. Returns True on success."""
        raise NotImplementedError
