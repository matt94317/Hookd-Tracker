from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity

# Plan limits: None means unlimited
PLAN_LIMITS = {
    'starter':    {'campaigns': 3,    'accounts': 5},
    'pro':        {'campaigns': 10,   'accounts': 20},
    'enterprise': {'campaigns': None, 'accounts': None},
}


def roles_required(*roles):
    """Restrict an endpoint to users with one of the given roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") not in roles:
                return jsonify({"error": "Access forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def subscription_required(fn):
    """Require an active subscription for company-role users. Admins bypass this check."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get('role') == 'company':
            from ..models import Subscription
            user_id = int(get_jwt_identity())
            sub = Subscription.query.filter_by(company_id=user_id).first()
            if not sub or sub.status not in ('active', 'trialing'):
                return jsonify({
                    "error": "An active subscription is required to perform this action.",
                    "code": "subscription_required",
                }), 402
        return fn(*args, **kwargs)
    return wrapper
