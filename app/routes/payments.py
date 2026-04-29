import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity
from .. import db
from ..models import Subscription, User
from ..services import stripe_service
from . import roles_required

payments_bp = Blueprint('payments', __name__)
stripe_bp = Blueprint('stripe', __name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


# ── Subscription status ────────────────────────────────────────────────────────

@payments_bp.route('/payments/subscription', methods=['GET'])
@roles_required('admin', 'company')
def get_subscription():
    user_id = int(get_jwt_identity())
    sub = Subscription.query.filter_by(company_id=user_id).first()
    if not sub:
        return jsonify({"subscription": None}), 200
    return jsonify({
        "subscription": {
            "plan": sub.plan,
            "status": sub.status,
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        }
    }), 200


# ── Checkout session ───────────────────────────────────────────────────────────

@payments_bp.route('/payments/create-checkout-session', methods=['POST'])
@roles_required('admin', 'company')
def create_checkout_session():
    data = request.get_json() or {}
    plan = data.get('plan')
    if plan not in ('starter', 'pro'):
        return jsonify({"error": "plan must be 'starter' or 'pro'"}), 400

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    try:
        customer = stripe_service.get_or_create_customer(user)
        db.session.commit()

        session = stripe_service.create_checkout_session(
            customer_id=customer['id'],
            plan=plan,
            success_url=f"{FRONTEND_URL}/settings/subscription?billing=success",
            cancel_url=f"{FRONTEND_URL}/settings/subscription?billing=cancel",
        )
        return jsonify({"checkout_url": session['url']}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ── Customer portal ────────────────────────────────────────────────────────────

@payments_bp.route('/payments/create-portal-session', methods=['POST'])
@roles_required('admin', 'company')
def create_portal_session():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user.stripe_customer_id:
        return jsonify({"error": "No billing account found"}), 404

    try:
        session = stripe_service.create_portal_session(
            customer_id=user.stripe_customer_id,
            return_url=f"{FRONTEND_URL}/settings",
        )
        return jsonify({"portal_url": session['url']}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Stripe webhook ─────────────────────────────────────────────────────────────

@stripe_bp.route('/stripe/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe_service.handle_webhook(payload, sig_header)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    event_type = event['type']
    data_obj = event['data']['object']

    if event_type == 'checkout.session.completed':
        _handle_checkout_completed(data_obj)
    elif event_type in ('customer.subscription.updated', 'customer.subscription.created'):
        _handle_subscription_updated(data_obj)
    elif event_type == 'customer.subscription.deleted':
        _handle_subscription_deleted(data_obj)
    elif event_type == 'invoice.payment_failed':
        _handle_payment_failed(data_obj)

    return jsonify({"received": True}), 200


def _handle_checkout_completed(session):
    stripe_sub_id = session.get('subscription')
    customer_id = session.get('customer')
    plan = session.get('metadata', {}).get('plan', 'starter')

    if not stripe_sub_id:
        return

    # Find the user by customer ID
    user = User.query.filter_by(stripe_customer_id=customer_id).first()
    if not user:
        return

    sub = Subscription.query.filter_by(company_id=user.id).first()
    if not sub:
        sub = Subscription(company_id=user.id)
        db.session.add(sub)

    sub.stripe_subscription_id = stripe_sub_id
    sub.stripe_customer_id = customer_id
    sub.plan = plan
    sub.status = 'active'
    db.session.commit()


def _handle_subscription_updated(stripe_sub):
    sub = Subscription.query.filter_by(stripe_subscription_id=stripe_sub['id']).first()
    if not sub:
        # Try by customer
        user = User.query.filter_by(stripe_customer_id=stripe_sub.get('customer')).first()
        if not user:
            return
        sub = Subscription.query.filter_by(company_id=user.id).first()
        if not sub:
            return

    plan = stripe_service.plan_from_subscription(stripe_sub)
    sub.plan = plan
    sub.status = stripe_sub.get('status', sub.status)
    sub.stripe_subscription_id = stripe_sub['id']
    sub.current_period_start = stripe_service.period_datetime(stripe_sub.get('current_period_start'))
    sub.current_period_end = stripe_service.period_datetime(stripe_sub.get('current_period_end'))
    db.session.commit()


def _handle_subscription_deleted(stripe_sub):
    sub = Subscription.query.filter_by(stripe_subscription_id=stripe_sub['id']).first()
    if sub:
        sub.status = 'canceled'
        db.session.commit()


def _handle_payment_failed(invoice):
    customer_id = invoice.get('customer')
    user = User.query.filter_by(stripe_customer_id=customer_id).first()
    if user and user.subscription:
        user.subscription.status = 'past_due'
        db.session.commit()
