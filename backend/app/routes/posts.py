from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from ..models import Account, Campaign, Channel, Post, User

posts_bp = Blueprint('posts', __name__)


# a shared helper that formats a post into JSON. Used by every endpoint so the response format is consistent
def _post_to_dict(p):
    """Format a post into JSON."""
    return {
        "id": p.id,
        "account_id": p.account_id,
        "platform_post_id": p.platform_post_id,
        "post_url": p.post_url,
        "caption": p.caption,
        "posted_at": str(p.posted_at) if p.posted_at else None,
        "likes": p.likes,
        "comments": p.comments,
        "views": p.views,
        "shares": p.shares,
        "created_at": str(p.created_at) if p.created_at else None,
        "updated_at": str(p.updated_at) if p.updated_at else None,
    }

# a shared helper that checks if a user is allowed to see an account. Avoids duplicating the same role-check logic across multiple endpoints
def _can_access_account(account, user_id, role):
    """Check if the current user is allowed to view this account's posts."""
    if role == 'admin':
        return True
    # company: must own the campaign this account belongs to
    if role == 'company':
        campaign = Campaign.query.get(account.campaign_id)
        return campaign.company_id == user_id
    return False

# a shared helper that checks if a user is allowed to see a campaign. Avoids duplicating the same role-check logic across multiple endpoints
def _can_access_campaign(campaign, user_id, role):
    """Check if the current user is allowed to view this campaign's posts."""
    if role == 'admin':
        return True
    if role == 'company':
        return campaign.company_id == user_id
    return False


def _aggregate(posts):
    """Compute aggregated metrics for a list of Post objects."""
    return {
        "post_count": len(posts),
        "total_likes": sum(p.likes or 0 for p in posts),
        "total_comments": sum(p.comments or 0 for p in posts),
        "total_views": sum(p.views or 0 for p in posts),
        "total_shares": sum(p.shares or 0 for p in posts),
    }


# ── Post-level (individual post) ───────────────────────────────────────────

@posts_bp.route('/posts/<int:post_id>', methods=['GET'])
@jwt_required()
def get_post(post_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    post = Post.query.get_or_404(post_id)
    account = Account.query.get(post.account_id)

    if not _can_access_account(account, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    return jsonify(_post_to_dict(post)), 200


# ── Account-level aggregation ──────────────────────────────────────────────

@posts_bp.route('/accounts/<int:account_id>/posts', methods=['GET'])
@jwt_required()
def list_posts_by_account(account_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    account = Account.query.get_or_404(account_id)

    if not _can_access_account(account, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    posts = Post.query.filter_by(account_id=account_id).order_by(Post.posted_at.desc()).all()
    return jsonify({
        "account_id": account_id,
        "aggregate": _aggregate(posts),
        "posts": [_post_to_dict(p) for p in posts],
    }), 200


# ── Campaign-level aggregation ─────────────────────────────────────────────

@posts_bp.route('/campaigns/<int:campaign_id>/posts', methods=['GET'])
@jwt_required()
def list_posts_by_campaign(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if not _can_access_campaign(campaign, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    channel_filter = request.args.get('channel')
    query = (
        Post.query
        .join(Account, Post.account_id == Account.id)
        .filter(Account.campaign_id == campaign_id)
    )
    if channel_filter:
        query = query.join(Channel, Account.channel_id == Channel.id).filter(Channel.name == channel_filter)

    posts = query.order_by(Post.posted_at.desc()).all()

    return jsonify({
        "campaign_id": campaign_id,
        "aggregate": _aggregate(posts),
        "posts": [_post_to_dict(p) for p in posts],
    }), 200


# ── Company-level aggregation ──────────────────────────────────────────────

@posts_bp.route('/companies/<int:company_id>/posts', methods=['GET'])
@jwt_required()
def list_posts_by_company(company_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    company = User.query.get_or_404(company_id)
    if company.role != 'company':
        return jsonify({"error": "User is not a company"}), 400

    # Access control
    if claims['role'] == 'company' and company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403
    if claims['role'] not in ('admin', 'company'):
        return jsonify({"error": "Access forbidden"}), 403

    channel_filter = request.args.get('channel')

    query = (
        Post.query
        .join(Account, Post.account_id == Account.id)
        .join(Campaign, Account.campaign_id == Campaign.id)
        .filter(Campaign.company_id == company_id)
    )
    if channel_filter:
        query = query.join(Channel, Account.channel_id == Channel.id).filter(Channel.name == channel_filter)

    posts = query.order_by(Post.posted_at.desc()).all()

    return jsonify({
        "company_id": company_id,
        "aggregate": _aggregate(posts),
        "posts": [_post_to_dict(p) for p in posts],
    }), 200


# ── Channel-level aggregation (by platform) ────────────────────────────────

@posts_bp.route('/channels/<int:channel_id>/posts', methods=['GET'])
@jwt_required()
def list_posts_by_channel(channel_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    role = claims['role']

    Channel.query.get_or_404(channel_id)

    query = (
        Post.query
        .join(Account, Post.account_id == Account.id)
        .filter(Account.channel_id == channel_id)
    )

    # Access control: scope to what the user can see
    if role == 'company':
        query = query.join(Campaign, Account.campaign_id == Campaign.id).filter(Campaign.company_id == user_id)
    elif role != 'admin':
        return jsonify({"error": "Access forbidden"}), 403

    posts = query.order_by(Post.posted_at.desc()).all()

    return jsonify({
        "channel_id": channel_id,
        "aggregate": _aggregate(posts),
        "posts": [_post_to_dict(p) for p in posts],
    }), 200
