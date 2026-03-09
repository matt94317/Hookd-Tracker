from abc import ABC, abstractmethod
from typing import List, Dict, Any

class PlatformService(ABC):
    """
    Interface for platform integrations (Instagram, TikTok).
    """
    
    @abstractmethod
    def get_oauth_url(self, account_id: int, channel: str) -> str:
        """Generate the OAuth authorization URL."""
        pass

    @abstractmethod
    def handle_oauth_callback(self, channel: str, code: str) -> Dict[str, Any]:
        """Exchange code for access tokens."""
        pass

    @abstractmethod
    def fetch_posts(self, account_id: int) -> List[Dict[str, Any]]:
        """Fetch recent posts for the account."""
        pass

    @abstractmethod
    def refresh_token(self, account_id: int) -> bool:
        """Refresh the access token if expired."""
        pass