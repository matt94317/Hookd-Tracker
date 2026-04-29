import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import func
from werkzeug.utils import secure_filename
from .. import db
from ..models import Account, Campaign, Post, Subscription
from . import roles_required, PLAN_LIMITS

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def _allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

campaigns_bp = Blueprint('campaigns', __name__, url_prefix='/campaigns')


# a shared helper that formats a campaign into JSON. Used by every endpoint so the response format is consistent
def _campaign_to_dict(c, include_stats=False):
    d = {
        "id": c.id,
        "name": c.name,
        "company_id": c.company_id,
        "cover_image_url": c.cover_image_url,
        "hashtags": c.hashtags,
        "brief_links": c.brief_links or [],
        "start_date": str(c.start_date) if c.start_date else None,
        "end_date": str(c.end_date) if c.end_date else None,
        "created_at": str(c.created_at) if c.created_at else None,
        "updated_at": str(c.updated_at) if c.updated_at else None,
    }
    if include_stats:
        account_count = Account.query.filter_by(campaign_id=c.id).count()
        post_agg = (
            db.session.query(
                func.count(Post.id),
                func.coalesce(func.sum(Post.views), 0),
                func.coalesce(func.sum(Post.likes), 0),
                func.coalesce(func.sum(Post.comments), 0),
                func.coalesce(func.sum(Post.shares), 0),
            )
            .join(Account, Post.account_id == Account.id)
            .filter(Account.campaign_id == c.id)
            .first()
        )
        post_count = int(post_agg[0] or 0)
        total_views = int(post_agg[1] or 0)
        total_likes = int(post_agg[2] or 0)
        total_comments = int(post_agg[3] or 0)
        total_shares = int(post_agg[4] or 0)
        d["account_count"] = account_count
        d["post_count"] = post_count
        d["total_views"] = total_views
        if total_views > 0:
            d["avg_engagement"] = round((total_likes + total_comments + total_shares) / total_views * 100, 1)
        else:
            d["avg_engagement"] = 0.0
    return d

# a shared helper that checks if a user is allowed to see a campaign. Avoids duplicating the same role-check logic across multiple endpoints
def _can_access_campaign(campaign, user_id, role):
    """Check if the current user is allowed to view this campaign."""
    if role == 'admin':
        return True
    if role == 'company':
        return campaign.company_id == user_id
    return False


@campaigns_bp.route('/upload-image', methods=['POST'])
@roles_required('admin', 'company')
def upload_campaign_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not _allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use PNG, JPG, GIF, or WEBP"}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))

    url = f"{request.host_url}uploads/{filename}"
    return jsonify({"url": url}), 201


@campaigns_bp.route('', methods=['POST'])
@roles_required('admin', 'company')
def create_campaign():
    data = request.get_json()
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    name = data.get('name')
    if not name:
        return jsonify({"error": "Name is required"}), 400

    # company role always owns the campaign they create
    # admin-created campaigns have no company association
    if claims['role'] == 'company':
        company_id = user_id

        # Enforce active subscription
        sub = Subscription.query.filter_by(company_id=user_id).first()
        if not sub or sub.status not in ('active', 'trialing'):
            return jsonify({
                "error": "An active subscription is required to create campaigns.",
                "code": "subscription_required",
            }), 402

        # Enforce plan campaign limit
        limit = PLAN_LIMITS.get(sub.plan, {}).get('campaigns')
        if limit is not None:
            current_count = Campaign.query.filter_by(company_id=user_id).count()
            if current_count >= limit:
                return jsonify({
                    "error": f"You have reached the {limit}-campaign limit on your {sub.plan.capitalize()} plan. Please upgrade to add more.",
                    "code": "plan_limit_reached",
                    "resource": "campaigns",
                    "limit": limit,
                    "current": current_count,
                }), 403
    else:
        company_id = None

    campaign = Campaign(
        name=name,
        company_id=company_id,
        cover_image_url=data.get('cover_image_url'),
        hashtags=data.get('hashtags'),
        brief_links=data.get('brief_links'),
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
    )
    db.session.add(campaign)
    db.session.commit()

    return jsonify(_campaign_to_dict(campaign)), 201


@campaigns_bp.route('', methods=['GET'])
@roles_required('admin', 'company')
def list_campaigns():
    claims = get_jwt()
    role = claims['role']
    user_id = int(get_jwt_identity())
    name_filter = request.args.get('name', '').strip()

    if role == 'admin':
        query = Campaign.query
    else:  # company
        query = Campaign.query.filter_by(company_id=user_id)

    if name_filter:
        query = query.filter(Campaign.name.ilike(f'%{name_filter}%'))

    return jsonify([_campaign_to_dict(c, include_stats=True) for c in query.all()]), 200


@campaigns_bp.route('/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if not _can_access_campaign(campaign, user_id, claims['role']):
        return jsonify({"error": "Access forbidden"}), 403

    return jsonify(_campaign_to_dict(campaign)), 200


@campaigns_bp.route('/<int:campaign_id>', methods=['PUT'])
@roles_required('admin', 'company')
def update_campaign(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if claims['role'] == 'company' and campaign.company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json()
    if 'name' in data:
        campaign.name = data['name']
    if 'cover_image_url' in data:
        campaign.cover_image_url = data['cover_image_url']
    if 'hashtags' in data:
        campaign.hashtags = data['hashtags']
    if 'brief_links' in data:
        campaign.brief_links = data['brief_links']
    if 'start_date' in data:
        campaign.start_date = data['start_date']
    if 'end_date' in data:
        campaign.end_date = data['end_date']

    db.session.commit()
    return jsonify(_campaign_to_dict(campaign)), 200


@campaigns_bp.route('/<int:campaign_id>', methods=['DELETE'])
@roles_required('admin', 'company')
def delete_campaign(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if claims['role'] == 'company' and campaign.company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    db.session.delete(campaign)
    db.session.commit()
    return jsonify({"message": "Campaign deleted"}), 200
