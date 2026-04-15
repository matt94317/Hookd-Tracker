"""Scheduled jobs configuration for Flask-APScheduler."""

import os


def init_scheduler(app):
    """Register APScheduler with the Flask app and add all jobs.

    Job intervals are configurable via environment variables (in hours).
    Defaults: post sync = 3h, token refresh = 1h, target check = 6h.
    """
    from flask_apscheduler import APScheduler

    scheduler = APScheduler()

    # Interval configuration (hours)
    sync_hours = int(os.environ.get('JOB_SYNC_POSTS_HOURS', '3'))
    refresh_hours = int(os.environ.get('JOB_REFRESH_TOKENS_HOURS', '1'))
    target_hours = int(os.environ.get('JOB_CHECK_TARGETS_HOURS', '6'))

    app.config['SCHEDULER_API_ENABLED'] = False
    app.config['JOBS'] = [
        {
            'id': 'sync_posts',
            'func': 'app.jobs.sync_posts:sync_all_posts',
            'trigger': 'interval',
            'hours': sync_hours,
        },
        {
            'id': 'refresh_tokens',
            'func': 'app.jobs.refresh_tokens:refresh_all_tokens',
            'trigger': 'interval',
            'hours': refresh_hours,
        },
        {
            'id': 'check_targets',
            'func': 'app.jobs.check_targets:check_all_targets',
            'trigger': 'interval',
            'hours': target_hours,
        },
    ]

    scheduler.init_app(app)
    scheduler.start()

    return scheduler
