from .platform import PlatformService


def get_platform_service(channel_name: str) -> PlatformService:
    if channel_name == 'instagram':
        from .instagram import InstagramService
        return InstagramService()
    elif channel_name == 'tiktok':
        from .tiktok import TikTokService
        return TikTokService()
    else:
        raise ValueError(f"Unsupported channel: {channel_name}")
