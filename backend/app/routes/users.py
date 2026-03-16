import re
import secrets

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity
from werkzeug.security import generate_password_hash

from .. import db
from ..models import Account, Campaign, CampaignCreator, Channel, Post, User
from . import roles_required

users_bp = Blueprint('users', __name__)


def _parse_social_url(url):
    """Return (platform_name, username) parsed from a social media URL."""
    if not url:
        return None, None
    # TikTok: tiktok.com/@username
    m = re.search(r'tiktok\.com/@([^/?&#\s]+)', url, re.IGNORECASE)
    if m:
        return 'tiktok', m.group(1)
    # Instagram: instagram.com/username
    m = re.search(r'instagram\.com/([^/?&#\s]+)', url, re.IGNORECASE)
    if m:
        username = m.group(1)
        if username.lower() not in ('p', 'reel', 'explore', 'accounts', 'tv'):
            return 'instagram', username
    return None, None


def _creator_to_dict(u):
    """Return a creator with their social account + campaign info."""
    accounts = []
    for acc in u.accounts:
        accounts.append({
            "id": acc.id,
            "username": acc.username or acc.platform_account_id,
            "channel": acc.channel.name if acc.channel else None,
            "channel_id": acc.channel_id,
            "campaign_id": acc.campaign_id,
            "campaign_name": acc.campaign.name if acc.campaign else None,
        })
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "accounts": accounts,
    }


@users_bp.route('/creators', methods=['GET'])
@roles_required('admin', 'company')
def list_creators():
    """Return all creators visible to the current user, with account info."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']
    name_filter = request.args.get('name', '').strip()

    if role == 'admin':
        query = User.query.filter_by(role='creator')
    else:  # company — only creators linked to their campaigns
        query = (
            User.query
            .filter_by(role='creator')
            .join(CampaignCreator, User.id == CampaignCreator.creator_id)
            .join(Campaign, CampaignCreator.campaign_id == Campaign.id)
            .filter(Campaign.company_id == user_id)
            .distinct()
        )

    if name_filter:
        query = query.filter(User.name.ilike(f'%{name_filter}%'))

    creators = query.order_by(User.name).all()
    return jsonify([_creator_to_dict(u) for u in creators]), 200


@users_bp.route('/creators', methods=['POST'])
@roles_required('admin', 'company')
def create_creator():
    """
    Create a new tracked creator. Body:
      name        (required)  display name
      social_url  (optional)  e.g. https://tiktok.com/@handle
      campaign_id (optional)  assign to a campaign
    """
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({"error": "name is required"}), 400

    social_url = (data.get('social_url') or '').strip()
    campaign_id = data.get('campaign_id')

    platform_name, username = _parse_social_url(social_url)

    # Auto-generate a unique internal email so the User row can be created
    base = username or re.sub(r'[^a-z0-9]', '', name.lower()) or 'creator'
    email = f"{base}.{secrets.token_hex(4)}@tracked.hookd"

    creator = User(
        name=name,
        email=email,
        password=generate_password_hash(secrets.token_hex(16)),
        role='creator',
    )
    db.session.add(creator)
    db.session.flush()  # populate creator.id

    if campaign_id:
        campaign = Campaign.query.get(int(campaign_id))
        if not campaign:
            db.session.rollback()
            return jsonify({"error": "Campaign not found"}), 404
        if role == 'company' and campaign.company_id != user_id:
            db.session.rollback()
            return jsonify({"error": "Access forbidden"}), 403

        entry = CampaignCreator(campaign_id=campaign.id, creator_id=creator.id)
        db.session.add(entry)

        if platform_name and username:
            channel = Channel.query.filter_by(name=platform_name).first()
            if channel:
                account = Account(
                    campaign_id=campaign.id,
                    creator_id=creator.id,
                    channel_id=channel.id,
                    platform_account_id=username,
                    username=username,
                )
                db.session.add(account)

    db.session.commit()
    return jsonify(_creator_to_dict(creator)), 201


@users_bp.route('/creators/<int:creator_id>', methods=['PUT'])
@roles_required('admin', 'company')
def update_creator(creator_id):
    """Update a creator's display name."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    creator = User.query.filter_by(id=creator_id, role='creator').first_or_404()

    if role == 'company':
        linked = (
            CampaignCreator.query
            .join(Campaign, CampaignCreator.campaign_id == Campaign.id)
            .filter(
                CampaignCreator.creator_id == creator_id,
                Campaign.company_id == user_id,
            )
            .first()
        )
        if not linked:
            return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json() or {}
    if data.get('name', '').strip():
        creator.name = data['name'].strip()

    db.session.commit()
    return jsonify(_creator_to_dict(creator)), 200


@users_bp.route('/creators/<int:creator_id>', methods=['DELETE'])
@roles_required('admin', 'company')
def delete_creator(creator_id):
    """Delete a creator and all their associated data."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    creator = User.query.filter_by(id=creator_id, role='creator').first_or_404()

    if role == 'company':
        linked = (
            CampaignCreator.query
            .join(Campaign, CampaignCreator.campaign_id == Campaign.id)
            .filter(
                CampaignCreator.creator_id == creator_id,
                Campaign.company_id == user_id,
            )
            .first()
        )
        if not linked:
            return jsonify({"error": "Access forbidden"}), 403

    # Cascade: delete posts → accounts → campaign links → user
    for acc in creator.accounts:
        Post.query.filter_by(account_id=acc.id).delete()
    Account.query.filter_by(creator_id=creator_id).delete()
    CampaignCreator.query.filter_by(creator_id=creator_id).delete()
    db.session.delete(creator)
    db.session.commit()
    return jsonify({"message": "Creator deleted"}), 200
