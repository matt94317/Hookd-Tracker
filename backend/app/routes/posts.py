from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from ..models import Account, Campaign, CampaignCreator, Channel, Post, User

posts_bp = Blueprint('posts', __name__)


def _post_to_dict(p):
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
    }


def _can_access_account(account, user_id, role):
    """Check if the current user is allowed to view this account's posts."""
    if role == 'admin':
        return True
    if role == 'creator':
        return account.creator_id == user_id
    # company: must own the campaign this account belongs to
    campaign = Campaign.query.get(account.campaign_id)
    return campaign.company_id == user_id


def _can_access_campaign(campaign, user_id, role):
    if role == 'admin':
        return True
    if role == 'company':
        return campaign.company_id == user_id
    return CampaignCreator.query.filter_by(
        campaign_id=campaign.id, creator_id=user_id
    ).first() is not None


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


@posts_bp.route('/campaigns/<int:campaign_id>/posts', methods=['GET'])
@jwt_required()
def list_posts_by_campaign(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if not _can_access_campaign(campaign, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    # Join through accounts to get all posts for this campaign
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


def _aggregate(posts):
    """Compute aggregated metrics for a list of Post objects."""
    return {
        "post_count": len(posts),
        "total_likes": sum(p.likes or 0 for p in posts),
        "total_comments": sum(p.comments or 0 for p in posts),
        "total_views": sum(p.views or 0 for p in posts),
        "total_shares": sum(p.shares or 0 for p in posts),
    }


# ── Creator-level aggregation ───────────────────────────────────────────────

@posts_bp.route('/creators/<int:creator_id>/posts', methods=['GET'])
@jwt_required()
def list_posts_by_creator(creator_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    creator = User.query.get_or_404(creator_id)
    if creator.role != 'creator':
        return jsonify({"error": "User is not a creator"}), 400

    # Access control
    if claims['role'] == 'creator' and creator_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403
    if claims['role'] == 'company':
        # Company can only see creators in their campaigns
        has_access = (
            CampaignCreator.query
            .join(Campaign, CampaignCreator.campaign_id == Campaign.id)
            .filter(CampaignCreator.creator_id == creator_id)
            .filter(Campaign.company_id == user_id)
            .first()
        )
        if not has_access:
            return jsonify({"error": "Access forbidden"}), 403

    channel_filter = request.args.get('channel')

    query = (
        Post.query
        .join(Account, Post.account_id == Account.id)
        .filter(Account.creator_id == creator_id)
    )
    if channel_filter:
        query = query.join(Channel, Account.channel_id == Channel.id).filter(Channel.name == channel_filter)

    posts = query.order_by(Post.posted_at.desc()).all()

    return jsonify({
        "creator_id": creator_id,
        "aggregate": _aggregate(posts),
        "posts": [_post_to_dict(p) for p in posts],
    }), 200


# ── Company-level aggregation ────────────────────────────────────────────────

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
    if claims['role'] == 'creator':
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
