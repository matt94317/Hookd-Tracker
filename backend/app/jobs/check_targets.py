"""Target achievement check — compares actual post counts against targets."""

import logging
from datetime import datetime, timezone

from .. import db
from ..models import Account, Post

logger = logging.getLogger(__name__)


def check_all_targets():
    """Count posts per account for the current day/month and compare
    against daily_target / monthly_target on each account.

    Results are logged. Accounts that are behind target are logged
    at WARNING level so they can be surfaced in monitoring.
    """
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    accounts = (
        Account.query
        .filter(Account.access_token.isnot(None))
        .all()
    )

    logger.info("check_all_targets: evaluating %d authorized accounts", len(accounts))

    for account in accounts:
        daily_target = account.daily_target or 0
        monthly_target = account.monthly_target or 0

        # Skip accounts with no targets set
        if daily_target == 0 and monthly_target == 0:
            continue

        daily_count = Post.query.filter(
            Post.account_id == account.id,
            Post.posted_at >= today_start,
        ).count()

        monthly_count = Post.query.filter(
            Post.account_id == account.id,
            Post.posted_at >= month_start,
        ).count()

        if daily_target > 0 and daily_count < daily_target:
            logger.warning(
                "check_all_targets: account %d BEHIND daily target — %d/%d posts",
                account.id, daily_count, daily_target,
            )

        if monthly_target > 0 and monthly_count < monthly_target:
            logger.warning(
                "check_all_targets: account %d BEHIND monthly target — %d/%d posts",
                account.id, monthly_count, monthly_target,
            )

        if (daily_target == 0 or daily_count >= daily_target) and \
           (monthly_target == 0 or monthly_count >= monthly_target):
            logger.info(
                "check_all_targets: account %d ON TRACK — daily %d/%d, monthly %d/%d",
                account.id, daily_count, daily_target, monthly_count, monthly_target,
            )

    logger.info("check_all_targets: done")
