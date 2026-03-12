from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from ..models import Account, Campaign, CampaignCreator, Post

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
    return jsonify([_post_to_dict(p) for p in posts]), 200


@posts_bp.route('/campaigns/<int:campaign_id>/posts', methods=['GET'])
@jwt_required()
def list_posts_by_campaign(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if not _can_access_campaign(campaign, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    # Join through accounts to get all posts for this campaign
    posts = (
        Post.query
        .join(Account, Post.account_id == Account.id)
        .filter(Account.campaign_id == campaign_id)
        .order_by(Post.posted_at.desc())
        .all()
    )
    return jsonify([_post_to_dict(p) for p in posts]), 200
