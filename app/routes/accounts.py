import json
import os
import threading

from flask import Blueprint, request, jsonify, redirect, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from .. import db
from ..models import Account, Campaign, Channel, Post
from . import roles_required

accounts_bp = Blueprint('accounts', __name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


# a shared helper that formats an account into JSON. Used by every endpoint so the response format is consistent
def _account_to_dict(a):
    return {
        "id": a.id,
        "campaign_id": a.campaign_id,
        "channel_id": a.channel_id,
        "channel_name": a.channel.name if a.channel else None,
        "campaign_name": a.campaign.name if a.campaign else None,
        "platform_account_id": a.platform_account_id,
        "username": a.username,
        "token_expires_at": str(a.token_expires_at) if a.token_expires_at else None,
        "daily_target": a.daily_target,
        "weekly_target": a.weekly_target,
        "monthly_target": a.monthly_target,
        "created_at": str(a.created_at) if a.created_at else None,
        "updated_at": str(a.updated_at) if a.updated_at else None,
    }


# a shared helper that checks if a user is allowed to see a campaign. Avoids duplicating the same role-check logic across multiple endpoints
def _can_access_campaign(campaign, user_id, role):
    """Check if the current user is allowed to view this campaign."""
    if role == 'admin':
        return True
    if role == 'company':
        return campaign.company_id == user_id
    return False


# ── OAuth URL generation (Admin/Company generates URL for external sharing) ──

@accounts_bp.route('/campaigns/<int:campaign_id>/oauth-url', methods=['GET'])
@roles_required('admin', 'company')
def generate_oauth_url(campaign_id):
    """Admin/Company generates an OAuth URL to share with external creators."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    campaign = Campaign.query.get_or_404(campaign_id)

    if role == 'company' and campaign.company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    channel_id = request.args.get('channel_id')
    if not channel_id:
        return jsonify({"error": "channel_id is required"}), 400

    # Validate channel exists
    channel = Channel.query.get_or_404(int(channel_id))

    # Encode state for OAuth callback
    state = json.dumps({
        'campaign_id': campaign_id,
        'channel_id': int(channel_id),
    })

    from ..services import get_platform_service
    service = get_platform_service(channel.name)
    url = service.get_oauth_url(state, channel.name)
    return jsonify({"oauth_url": url}), 200


# ── OAuth callback (creates the Account) ───────────────────────────────────

@accounts_bp.route('/oauth/callback/<channel>', methods=['GET'])
def oauth_callback(channel):
    code = request.args.get('code')
    if not code:
        return redirect(f"{FRONTEND_URL}/oauth/error")

    state = request.args.get('state')
    from ..services import get_platform_service
    try:
        service = get_platform_service(channel)
        service.handle_oauth_callback(channel, code, state=state)
        return redirect(f"{FRONTEND_URL}/oauth/success")
    except Exception:
        return redirect(f"{FRONTEND_URL}/oauth/error")


# ── Campaign-nested account routes ──────────────────────────────────────────

@accounts_bp.route('/campaigns/<int:campaign_id>/accounts', methods=['GET'])
@jwt_required()
def list_campaign_accounts(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if not _can_access_campaign(campaign, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    accounts = Account.query.filter_by(campaign_id=campaign_id).all()
    return jsonify([_account_to_dict(a) for a in accounts]), 200


# ── Top-level account routes ────────────────────────────────────────────────

@accounts_bp.route('/accounts', methods=['GET'])
@roles_required('admin', 'company')
def list_accounts():
    """Return all accounts visible to the current user."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    if role == 'admin':
        query = Account.query
    else:  # company — only accounts in their campaigns
        query = (
            Account.query
            .join(Campaign, Account.campaign_id == Campaign.id)
            .filter(Campaign.company_id == user_id)
        )

    platform_filter = request.args.get('platform', '').strip()
    if platform_filter:
        query = query.join(Channel, Account.channel_id == Channel.id).filter(Channel.name == platform_filter)

    campaign_filter = request.args.get('campaign_id', '').strip()
    if campaign_filter:
        query = query.filter(Account.campaign_id == int(campaign_filter))

    accounts = query.order_by(Account.created_at.desc()).all()
    return jsonify([_account_to_dict(a) for a in accounts]), 200


@accounts_bp.route('/accounts/<int:account_id>', methods=['PUT'])
@roles_required('admin', 'company')
def update_account(account_id):
    """Update account targets (daily_target, monthly_target)."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    account = Account.query.get_or_404(account_id)

    if role == 'company':
        campaign = Campaign.query.get(account.campaign_id)
        if campaign.company_id != user_id:
            return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json() or {}

    if 'daily_target' in data:
        account.daily_target = int(data['daily_target']) if data['daily_target'] is not None else 0
    if 'weekly_target' in data:
        account.weekly_target = int(data['weekly_target']) if data['weekly_target'] is not None else 0
    if 'monthly_target' in data:
        account.monthly_target = int(data['monthly_target']) if data['monthly_target'] is not None else 0

    db.session.commit()
    return jsonify(_account_to_dict(account)), 200


@accounts_bp.route('/accounts/<int:account_id>', methods=['DELETE'])
@roles_required('admin', 'company')
def delete_account(account_id):
    """Delete an account and all its posts."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    account = Account.query.get_or_404(account_id)

    if role == 'company':
        campaign = Campaign.query.get(account.campaign_id)
        if campaign.company_id != user_id:
            return jsonify({"error": "Access forbidden"}), 403

    Post.query.filter_by(account_id=account_id).delete()
    db.session.delete(account)
    db.session.commit()
    return jsonify({"message": "Account deleted"}), 200


@accounts_bp.route('/accounts/<int:account_id>/fetch-posts', methods=['POST'])
@roles_required('admin', 'company')
def trigger_fetch_posts(account_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    account = Account.query.get_or_404(account_id)

    if claims['role'] == 'company':
        campaign = Campaign.query.get(account.campaign_id)
        if campaign.company_id != user_id:
            return jsonify({"error": "Access forbidden"}), 403

    if not account.access_token:
        return jsonify({"error": "Account not authorized. Complete OAuth first."}), 400

    from ..services import get_platform_service
    channel = account.channel
    service = get_platform_service(channel.name)

    app = current_app._get_current_object()

    def run():
        with app.app_context():
            try:
                service.fetch_posts(account_id)
            except Exception as e:
                app.logger.error("Background fetch failed for account %s: %s", account_id, e)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    return jsonify({"message": "Sync started"}), 202
