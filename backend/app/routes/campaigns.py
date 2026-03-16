from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import func
from .. import db
from ..models import Account, Campaign, CampaignCreator, Post, User
from . import roles_required

campaigns_bp = Blueprint('campaigns', __name__, url_prefix='/campaigns')


# a shared helper that formats a campaign into JSON. Used by every endpoint so the response format is consistent
def _campaign_to_dict(c, include_stats=False):
    d = {
        "id": c.id,
        "name": c.name,
        "company_id": c.company_id,
        "start_date": str(c.start_date) if c.start_date else None,
        "end_date": str(c.end_date) if c.end_date else None,
        "created_at": str(c.created_at) if c.created_at else None,
        "updated_at": str(c.updated_at) if c.updated_at else None,
    }
    if include_stats:
        creator_count = CampaignCreator.query.filter_by(campaign_id=c.id).count()
        post_agg = (
            db.session.query(func.count(Post.id), func.coalesce(func.sum(Post.views), 0))
            .join(Account, Post.account_id == Account.id)
            .filter(Account.campaign_id == c.id)
            .first()
        )
        d["creator_count"] = creator_count
        d["post_count"] = post_agg[0] or 0
        d["total_views"] = int(post_agg[1] or 0)
    return d

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


@campaigns_bp.route('', methods=['POST'])
# Creators can't create campaigns (a company hires them)
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
    else:
        company_id = None

    campaign = Campaign(
        name=name,
        company_id=company_id,
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
    )
    db.session.add(campaign)
    db.session.commit()

    return jsonify(_campaign_to_dict(campaign)), 201


@campaigns_bp.route('', methods=['GET'])
@jwt_required()
def list_campaigns():
    claims = get_jwt()
    role = claims['role']
    user_id = int(get_jwt_identity())
    name_filter = request.args.get('name', '').strip()

    if role == 'admin':
        query = Campaign.query
    elif role == 'company':
        query = Campaign.query.filter_by(company_id=user_id)
    else:  # creator
        query = (
            Campaign.query
            .join(CampaignCreator, Campaign.id == CampaignCreator.campaign_id)
            .filter(CampaignCreator.creator_id == user_id)
        )

    if name_filter:
        query = query.filter(Campaign.name.ilike(f'%{name_filter}%'))

    return jsonify([_campaign_to_dict(c, include_stats=True) for c in query.all()]), 200


@campaigns_bp.route('/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    # returns 403 if the user has no business seeing that campaign
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

# Company can only add creators to their own campaigns (ownership check)
@campaigns_bp.route('/<int:campaign_id>/creators', methods=['POST'])
@roles_required('admin', 'company')
def add_creator(campaign_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if claims['role'] == 'company' and campaign.company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    data = request.get_json()
    creator_id = data.get('creator_id')
    if not creator_id:
        return jsonify({"error": "creator_id is required"}), 400

    creator = User.query.get_or_404(creator_id)
    if creator.role != 'creator':
        return jsonify({"error": "User is not a creator"}), 400

    existing = CampaignCreator.query.filter_by(
        campaign_id=campaign_id, creator_id=creator_id
    ).first()
    if existing:
        return jsonify({"error": "Creator already in campaign"}), 409

    entry = CampaignCreator(campaign_id=campaign_id, creator_id=creator_id)
    db.session.add(entry)
    db.session.commit()

    return jsonify({"campaign_id": campaign_id, "creator_id": creator_id}), 201

# Company can only remove creators from their own campaigns (ownership check)
@campaigns_bp.route('/<int:campaign_id>/creators/<int:creator_id>', methods=['DELETE'])
@roles_required('admin', 'company')
def remove_creator(campaign_id, creator_id):
    claims = get_jwt()
    user_id = int(get_jwt_identity())

    campaign = Campaign.query.get_or_404(campaign_id)

    if claims['role'] == 'company' and campaign.company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    entry = CampaignCreator.query.filter_by(
        campaign_id=campaign_id, creator_id=creator_id
    ).first_or_404()

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Creator removed from campaign"}), 200
