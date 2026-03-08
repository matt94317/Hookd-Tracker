from datetime import datetime
from enum import Enum
from sqlalchemy import func
from .extensions import db

# -- Enums --

class UserRole(str, Enum):
    ADMIN = 'admin'
    CREATOR = 'creator'
    COMPANY = 'company'

class ScheduleStatus(str, Enum):
    PENDING = 'pending'
    PUBLISHED = 'published'
    OVERDUE = 'overdue'

# -- Models --

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    # Campaigns owned by this user (if role is company)
    campaigns_owned = db.relationship('Campaign', back_populates='company', foreign_keys='Campaign.company_id')
    # Campaigns this user is assigned to (if role is creator)
    campaign_assignments = db.relationship('CampaignCreator', back_populates='creator')


class Channel(db.Model):
    __tablename__ = 'channels'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)  # instagram / tiktok

    accounts = db.relationship('Account', back_populates='channel')


class Campaign(db.Model):
    __tablename__ = 'campaigns'

    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    company_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = db.relationship('User', back_populates='campaigns_owned', foreign_keys=[company_id])
    creator_assignments = db.relationship('CampaignCreator', back_populates='campaign', cascade="all, delete-orphan")
    accounts = db.relationship('Account', back_populates='campaign')


class CampaignCreator(db.Model):
    __tablename__ = 'campaign_creators'
    __table_args__ = (
        db.UniqueConstraint('campaign_id', 'creator_id', name='uq_campaign_creator'),
    )

    id = db.Column(db.BigInteger, primary_key=True)
    campaign_id = db.Column(db.BigInteger, db.ForeignKey('campaigns.id'), nullable=False)
    creator_id = db.Column(db.BigInteger, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', back_populates='creator_assignments')
    creator = db.relationship('User', back_populates='campaign_assignments')


class Account(db.Model):
    __tablename__ = 'accounts'

    id = db.Column(db.BigInteger, primary_key=True)
    campaign_id = db.Column(db.BigInteger, db.ForeignKey('campaigns.id'), nullable=False)
    channel_id = db.Column(db.BigInteger, db.ForeignKey('channels.id'), nullable=False)
    platform_account_id = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(255), nullable=True)
    
    # Tokens are stored as Text here; application logic should handle encryption/decryption
    access_token = db.Column(db.Text, nullable=True)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expires_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', back_populates='accounts')
    channel = db.relationship('Channel', back_populates='accounts')
    posts = db.relationship('Post', back_populates='account')
    schedules = db.relationship('CampaignSchedule', back_populates='account')


class Post(db.Model):
    __tablename__ = 'posts'

    id = db.Column(db.BigInteger, primary_key=True)
    account_id = db.Column(db.BigInteger, db.ForeignKey('accounts.id'), nullable=False)
    platform_post_id = db.Column(db.String(255), nullable=False)
    post_url = db.Column(db.Text, nullable=False)
    caption = db.Column(db.Text, nullable=True)
    posted_at = db.Column(db.DateTime, nullable=True)
    
    # Metrics
    likes = db.Column(db.Integer, default=0)
    comments = db.Column(db.Integer, default=0)
    views = db.Column(db.Integer, default=0)
    shares = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    account = db.relationship('Account', back_populates='posts')
    schedule = db.relationship('CampaignSchedule', back_populates='post', uselist=False)


class CampaignSchedule(db.Model):
    __tablename__ = 'campaign_schedules'

    id = db.Column(db.BigInteger, primary_key=True)
    account_id = db.Column(db.BigInteger, db.ForeignKey('accounts.id'), nullable=False)
    scheduled_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.Enum(ScheduleStatus), default=ScheduleStatus.PENDING)
    post_id = db.Column(db.BigInteger, db.ForeignKey('posts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    account = db.relationship('Account', back_populates='schedules')
    post = db.relationship('Post', back_populates='schedule')