from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


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
