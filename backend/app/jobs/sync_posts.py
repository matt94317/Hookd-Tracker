"""Post sync job — fetches new posts for all authorized accounts."""

import logging

from .. import db
from ..models import Account, Channel
from ..services import get_platform_service

logger = logging.getLogger(__name__)


def sync_all_posts():
    """Periodic job to fetch new posts for every authorized account.

    Posts are upserted by platform_post_id (handled inside each
    PlatformService.fetch_posts implementation), so duplicates are
    avoided and existing metrics are updated automatically.
    """
    accounts = (
        Account.query
        .filter(Account.access_token.isnot(None))
        .all()
    )

    logger.info("sync_all_posts: processing %d authorized accounts", len(accounts))

    for account in accounts:
        channel = Channel.query.get(account.channel_id)
        if not channel:
            logger.warning("sync_all_posts: channel %d not found for account %d, skipping",
                           account.channel_id, account.id)
            continue

        try:
            service = get_platform_service(channel.name)
            posts = service.fetch_posts(account.id)
            logger.info("sync_all_posts: fetched %d posts for account %d (%s)",
                        len(posts), account.id, channel.name)
        except Exception:
            logger.error("sync_all_posts: failed to fetch posts for account %d (%s)",
                         account.id, channel.name, exc_info=True)

    logger.info("sync_all_posts: done")
