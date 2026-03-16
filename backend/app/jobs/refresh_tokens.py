"""Token refresh job — renews tokens before expiry."""

import logging
from datetime import datetime, timedelta, timezone

from .. import db
from ..models import Account, Channel
from ..services import get_platform_service

logger = logging.getLogger(__name__)

# Accounts with tokens expiring within this window will be refreshed
INSTAGRAM_REFRESH_THRESHOLD = timedelta(days=7)
TIKTOK_REFRESH_THRESHOLD = timedelta(hours=1)


def refresh_all_tokens():
    """Check token_expires_at for upcoming expirations and auto-refresh.

    Thresholds are per-platform:
    - Instagram long-lived token: refresh when < 7 days remaining
    - TikTok access token: refresh when < 1 hour remaining
    """
    accounts = (
        Account.query
        .filter(Account.access_token.isnot(None))
        .filter(Account.token_expires_at.isnot(None))
        .all()
    )

    logger.info("refresh_all_tokens: checking %d authorized accounts", len(accounts))

    refreshed = 0
    failed = 0

    for account in accounts:
        channel = Channel.query.get(account.channel_id)
        if not channel:
            continue

        threshold = (
            INSTAGRAM_REFRESH_THRESHOLD if channel.name == 'instagram'
            else TIKTOK_REFRESH_THRESHOLD
        )

        expires = account.token_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)

        remaining = expires - datetime.now(timezone.utc)
        if remaining > threshold:
            continue

        try:
            service = get_platform_service(channel.name)
            success = service.refresh_token(account.id)
            if success:
                refreshed += 1
                logger.info("refresh_all_tokens: refreshed token for account %d (%s)",
                            account.id, channel.name)
            else:
                failed += 1
                logger.error("refresh_all_tokens: refresh returned False for account %d (%s)",
                             account.id, channel.name)
        except Exception:
            failed += 1
            logger.error("refresh_all_tokens: failed to refresh token for account %d (%s)",
                         account.id, channel.name, exc_info=True)

    logger.info("refresh_all_tokens: done — refreshed=%d, failed=%d", refreshed, failed)

    if failed > 0:
        logger.warning("refresh_all_tokens: %d token refresh(es) failed — manual intervention may be needed", failed)
