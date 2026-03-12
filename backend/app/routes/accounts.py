from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from .. import db
from ..models import Account, Campaign, CampaignCreator, Channel, User
from . import roles_required

accounts_bp = Blueprint('accounts', __name__)


def _account_to_dict(a):
    return {
        "id": a.id,
        "campaign_id": a.campaign_id,
        "creator_id": a.creator_id,
        "channel_id": a.channel_id,
        "platform_account_id": a.platform_account_id,
        "username": a.username,
        "token_expires_at": str(a.token_expires_at) if a.token_expires_at else None,
        "daily_target": a.daily_target,
        "monthly_target": a.monthly_target,
        "created_at": str(a.created_at) if a.created_at else None,
    }


def _can_access_campaign(campaign, user_id, role):
    if role == 'admin':
        return True
    if role == 'company':
        return campaign.company_id == user_id
    return CampaignCreator.query.filter_by(
        campaign_id=campaign.id, creator_id=user_id
    ).first() is not None


# ── Campaign-nested account routes ──────────────────────────────────────────

@accounts_bp.route('/campaigns/<int:campaign_id>/accounts', methods=['POST'])
@roles_required('admin', 'company')
def add_account(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if claims['role'] == 'company' and campaign.company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json()
    creator_id = data.get('creator_id')
    channel_id = data.get('channel_id')
    platform_account_id = data.get('platform_account_id')

    if not all([creator_id, channel_id, platform_account_id]):
        return jsonify({"error": "creator_id, channel_id, and platform_account_id are required"}), 400

    # Validate creator exists and has the right role
    creator = User.query.get_or_404(creator_id)
    if creator.role != 'creator':
        return jsonify({"error": "User is not a creator"}), 400

    # Validate creator is part of this campaign
    in_campaign = CampaignCreator.query.filter_by(
        campaign_id=campaign_id, creator_id=creator_id
    ).first()
    if not in_campaign:
        return jsonify({"error": "Creator is not assigned to this campaign"}), 400

    # Validate channel exists
    Channel.query.get_or_404(channel_id)

    account = Account(
        campaign_id=campaign_id,
        creator_id=creator_id,
        channel_id=channel_id,
        platform_account_id=platform_account_id,
        username=data.get('username'),
        daily_target=data.get('daily_target', 0),
        monthly_target=data.get('monthly_target', 0),
    )
    db.session.add(account)
    db.session.commit()

    return jsonify(_account_to_dict(account)), 201


@accounts_bp.route('/campaigns/<int:campaign_id>/accounts', methods=['GET'])
@jwt_required()
def list_accounts(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if not _can_access_campaign(campaign, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    accounts = Account.query.filter_by(campaign_id=campaign_id).all()
    return jsonify([_account_to_dict(a) for a in accounts]), 200


# ── Standalone account routes ────────────────────────────────────────────────

@accounts_bp.route('/accounts/<int:account_id>/oauth-url', methods=['GET'])
@jwt_required()
def get_oauth_url(account_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    account = Account.query.get_or_404(account_id)

    # Only the account's creator, or admin/company with campaign access, can initiate OAuth
    if claims['role'] == 'creator' and account.creator_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    if claims['role'] == 'company':
        campaign = Campaign.query.get(account.campaign_id)
        if campaign.company_id != user_id:
            return jsonify({"error": "Access forbidden"}), 403

    from ..services import get_platform_service
    channel = account.channel
    service = get_platform_service(channel.name)
    url = service.get_oauth_url(account.id, channel.name)
    return jsonify({"oauth_url": url}), 200


@accounts_bp.route('/oauth/callback/<channel>', methods=['GET'])
def oauth_callback(channel):
    code = request.args.get('code')
    if not code:
        return jsonify({"error": "Missing code parameter"}), 400

    state = request.args.get('state')
    from ..services import get_platform_service
    try:
        service = get_platform_service(channel)
        result = service.handle_oauth_callback(channel, code, state=state)
        return jsonify({"message": "OAuth connected", "data": result}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "OAuth callback failed"}), 500


@accounts_bp.route('/accounts/<int:account_id>/fetch-posts', methods=['POST'])
@jwt_required()
def trigger_fetch_posts(account_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    account = Account.query.get_or_404(account_id)

    # Access control
    if claims['role'] == 'creator' and account.creator_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403
    if claims['role'] == 'company':
        campaign = Campaign.query.get(account.campaign_id)
        if campaign.company_id != user_id:
            return jsonify({"error": "Access forbidden"}), 403

    if not account.access_token:
        return jsonify({"error": "Account not authorized. Complete OAuth first."}), 400

    from ..services import get_platform_service
    channel = account.channel
    service = get_platform_service(channel.name)
    posts = service.fetch_posts(account_id)
    return jsonify({"fetched": len(posts)}), 200
