from flask import Blueprint, request, jsonify
from .. import db
from ..models import User
from . import roles_required

users_bp = Blueprint('users', __name__)


def _creator_to_dict(u):
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
    }


@users_bp.route('/creators', methods=['GET'])
@roles_required('admin', 'company')
def list_creators():
    """Return all users with role=creator. Supports optional ?name= filter."""
    name_filter = request.args.get('name', '').strip()

    query = User.query.filter_by(role='creator')

    if name_filter:
        query = query.filter(User.name.ilike(f'%{name_filter}%'))

    creators = query.order_by(User.name).all()
    return jsonify([_creator_to_dict(u) for u in creators]), 200
