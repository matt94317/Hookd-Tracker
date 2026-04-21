from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity

from .. import db
from ..models import Account, Campaign, Post, PayrollRecord
from . import roles_required

payroll_bp = Blueprint('payroll', __name__)


def _record_to_dict(r):
    return {
        "id": r.id,
        "account_id": r.account_id,
        "account_username": r.account.username or r.account.platform_account_id,
        "channel_name": r.account.channel.name if r.account.channel else None,
        "campaign_name": r.account.campaign.name if r.account.campaign else None,
        "campaign_id": r.account.campaign_id,
        "month": r.month,
        "posts_count": r.posts_count,
        "monthly_target": r.monthly_target,
        "payout_amount": float(r.payout_amount) if r.payout_amount is not None else 0,
        "status": r.status,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _get_visible_accounts(user_id, role):
    """Return accounts the current user is allowed to see (with a monthly target set)."""
    query = Account.query.filter(Account.monthly_target > 0)
    if role == 'company':
        query = (
            query
            .join(Campaign, Account.campaign_id == Campaign.id)
            .filter(Campaign.company_id == user_id)
        )
    return query.all()


@payroll_bp.route('/payroll', methods=['GET'])
@roles_required('admin', 'company')
def list_payroll():
    """Return all payroll records. Auto-creates a pending record for any
    account that has met its monthly target this month and has no record yet."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims['role']

    now = datetime.now(timezone.utc)
    current_month = now.strftime('%Y-%m')
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    accounts = _get_visible_accounts(user_id, role)

    # Auto-create records for accounts that have hit their monthly target
    for account in accounts:
        posts_this_month = Post.query.filter(
            Post.account_id == account.id,
            Post.posted_at >= month_start,
        ).count()

        if posts_this_month >= account.monthly_target:
            existing = PayrollRecord.query.filter_by(
                account_id=account.id,
                month=current_month,
            ).first()
            if not existing:
                record = PayrollRecord(
                    account_id=account.id,
                    month=current_month,
                    posts_count=posts_this_month,
                    monthly_target=account.monthly_target,
                    payout_amount=account.payout_amount or 0,
                    status='pending',
                )
                db.session.add(record)
            else:
                # Keep posts_count up to date while still pending
                if existing.status == 'pending':
                    existing.posts_count = posts_this_month

    db.session.commit()

    account_ids = [a.id for a in accounts]
    records = (
        PayrollRecord.query
        .filter(PayrollRecord.account_id.in_(account_ids))
        .order_by(PayrollRecord.created_at.desc())
        .all()
    )

    return jsonify([_record_to_dict(r) for r in records]), 200


@payroll_bp.route('/payroll/<int:record_id>/approve', methods=['POST'])
@roles_required('admin', 'company')
def approve_payroll(record_id):
    """Approve a payroll record."""
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims['role']

    record = PayrollRecord.query.get_or_404(record_id)
    campaign = record.account.campaign

    if role == 'company' and campaign.company_id != user_id:
        return jsonify({"error": "Access forbidden"}), 403

    if record.status == 'approved':
        return jsonify({"error": "Already approved"}), 400

    record.status = 'approved'
    record.approved_at = datetime.now(timezone.utc)
    record.approved_by_id = user_id
    db.session.commit()

    return jsonify(_record_to_dict(record)), 200
