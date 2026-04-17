"""
SQLAlchemy models for the application.
"""
from . import db
from sqlalchemy.sql import func

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('admin', 'company', name='user_roles'), nullable=False)
    stripe_customer_id = db.Column(db.String(255), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    campaigns_owned = db.relationship('Campaign', backref='company', lazy=True)
    subscription = db.relationship('Subscription', backref='company_user', uselist=False, lazy=True)

class Channel(db.Model):
    __tablename__ = 'channels'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    # Relationships
    accounts = db.relationship('Account', backref='channel', lazy=True)

class Campaign(db.Model):
    __tablename__ = 'campaigns'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    company_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=True)
    cover_image_url = db.Column(db.Text, nullable=True)
    hashtags = db.Column(db.Text, nullable=True)
    brief_links = db.Column(db.JSON, nullable=True)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    accounts = db.relationship('Account', backref='campaign', lazy=True)

class Account(db.Model):
    __tablename__ = 'accounts'

    id = db.Column(db.BigInteger, primary_key=True)
    campaign_id = db.Column(db.BigInteger, db.ForeignKey('campaigns.id'), nullable=False)
    channel_id = db.Column(db.BigInteger, db.ForeignKey('channels.id'), nullable=False)
    platform_account_id = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(255))
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    token_expires_at = db.Column(db.DateTime)
    daily_target = db.Column(db.Integer, default=0)
    weekly_target = db.Column(db.Integer, default=0)
    monthly_target = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    posts = db.relationship('Post', backref='account', lazy=True)

class Post(db.Model):
    __tablename__ = 'posts'

    id = db.Column(db.BigInteger, primary_key=True)
    account_id = db.Column(db.BigInteger, db.ForeignKey('accounts.id'), nullable=False)
    platform_post_id = db.Column(db.String(255), nullable=False)
    post_url = db.Column(db.Text, nullable=False)
    caption = db.Column(db.Text)
    posted_at = db.Column(db.DateTime)
    likes = db.Column(db.Integer, default=0)
    comments = db.Column(db.Integer, default=0)
    views = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.BigInteger, primary_key=True)
    company_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), unique=True, nullable=False)
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)
    stripe_customer_id = db.Column(db.String(255), nullable=True)
    plan = db.Column(db.Enum('starter', 'pro', 'enterprise', name='subscription_plans'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='active')
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now())
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())
