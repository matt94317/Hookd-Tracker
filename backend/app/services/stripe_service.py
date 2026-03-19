import os
from datetime import datetime
import stripe

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

PLANS = {
    'starter': {
        'price_id': os.environ.get('STRIPE_STARTER_PRICE_ID'),
        'name': 'Starter',
        'amount': 4900,
    },
    'pro': {
        'price_id': os.environ.get('STRIPE_PRO_PRICE_ID'),
        'name': 'Pro',
        'amount': 14900,
    },
}

PRICE_TO_PLAN = {}


def _build_price_map():
    """Build reverse lookup: stripe price_id → plan key."""
    global PRICE_TO_PLAN
    PRICE_TO_PLAN = {v['price_id']: k for k, v in PLANS.items() if v['price_id']}


_build_price_map()


def get_or_create_customer(user):
    """Return existing Stripe customer or create a new one. Updates user.stripe_customer_id in-place."""
    if user.stripe_customer_id:
        return stripe.Customer.retrieve(user.stripe_customer_id)
    customer = stripe.Customer.create(
        email=user.email,
        name=user.name,
        metadata={'user_id': str(user.id)},
    )
    user.stripe_customer_id = customer['id']
    return customer


def create_checkout_session(customer_id, plan, success_url, cancel_url):
    price_id = PLANS[plan]['price_id']
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode='subscription',
        line_items=[{'price': price_id, 'quantity': 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={'plan': plan},
        subscription_data={'metadata': {'plan': plan}},
    )
    return session


def create_portal_session(customer_id, return_url):
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session


def plan_from_subscription(stripe_sub):
    """Determine plan key from a Stripe subscription object."""
    # Prefer metadata set at checkout
    plan = stripe_sub.get('metadata', {}).get('plan')
    if plan and plan in PLANS:
        return plan
    # Fall back to price lookup
    for item in stripe_sub.get('items', {}).get('data', []):
        price_id = item['price']['id']
        if price_id in PRICE_TO_PLAN:
            return PRICE_TO_PLAN[price_id]
    return 'starter'


def handle_webhook(payload, sig_header):
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    return event


def period_datetime(unix_ts):
    if unix_ts is None:
        return None
    return datetime.utcfromtimestamp(unix_ts)
