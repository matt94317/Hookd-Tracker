import json

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from ..models import Account, Campaign, CampaignCreator, Channel

accounts_bp = Blueprint('accounts', __name__)


# a shared helper that formats an account into JSON. Used by every endpoint so the response format is consistent
def _account_to_dict(a):
    return {
        "id": a.id,
        "campaign_id": a.campaign_id,
        "creator_id": a.creator_id,
        "channel_id": a.channel_id,
        "channel_name": a.channel.name if a.channel else None,
        "platform_account_id": a.platform_account_id,
        "username": a.username,
        "token_expires_at": str(a.token_expires_at) if a.token_expires_at else None,
        "daily_target": a.daily_target,
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
    # creator: must be in campaign_creators
    return CampaignCreator.query.filter_by(
        campaign_id=campaign.id, creator_id=user_id
    ).first() is not None


# ── OAuth URL generation (Admin/Company → Creator) ─────────────────────────

@accounts_bp.route('/campaigns/<int:campaign_id>/oauth-url', methods=['POST'])
@jwt_required()
def generate_oauth_url(campaign_id):
    """Creator initiates OAuth from the campaign detail page.
    Generates an OAuth URL for Instagram or TikTok."""
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    Campaign.query.get_or_404(campaign_id)

    data = request.get_json()
    channel_id = data.get('channel_id')
    if not channel_id:
        return jsonify({"error": "channel_id is required"}), 400

    # Creator: can only generate for themselves, must be assigned to campaign
    if role == 'creator':
        creator_id = user_id
        in_campaign = CampaignCreator.query.filter_by(
            campaign_id=campaign_id, creator_id=creator_id
        ).first()
        if not in_campaign:
            return jsonify({"error": "You are not assigned to this campaign"}), 403
    else:
        return jsonify({"error": "Only creators can initiate OAuth"}), 403

    # Validate channel exists
    channel = Channel.query.get_or_404(channel_id)

    # Encode state for OAuth callback
    state = json.dumps({
        'campaign_id': campaign_id,
        'creator_id': creator_id,
        'channel_id': channel_id,
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


# ── Campaign-nested account routes ──────────────────────────────────────────

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
