import os
import secrets
import smtplib
import logging
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
import bcrypt
from .. import db
from ..models import User

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')


def _send_reset_email(to_email, reset_url):
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_pass = os.environ.get('SMTP_PASS')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)

    if not smtp_host or not smtp_user:
        logger.warning('[PASSWORD RESET] SMTP not configured. Reset URL: %s', reset_url)
        return

    msg = MIMEMultipart()
    msg['From'] = smtp_from
    msg['To'] = to_email
    msg['Subject'] = 'Reset your Hookd Tracker password'
    msg.attach(MIMEText(
        f"You requested a password reset for your Hookd Tracker account.\n\n"
        f"Click the link below to set a new password (expires in 1 hour):\n{reset_url}\n\n"
        f"If you didn't request this, you can safely ignore this email.\n\n— Hookd Tracker",
        'plain'
    ))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not all([name, email, password, role]):
        return jsonify({"error": "All fields are required"}), 400

    if role not in ('admin', 'company'):
        return jsonify({"error": "Role must be admin or company"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    user = User(name=name, email=email, password=hashed.decode('utf-8'), role=role)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created", "id": user.id}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not all([email, password]):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email, "name": user.name}
    )
    return jsonify({"access_token": token, "role": user.role}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # Always return success to prevent user enumeration
    user = User.query.filter_by(email=email).first()
    if user:
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.session.commit()

        reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
        try:
            _send_reset_email(user.email, reset_url)
        except Exception as e:
            logger.error('Failed to send reset email: %s', e)

    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    token = (data.get('token') or '').strip()
    new_password = data.get('new_password') or ''

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    user = User.query.filter_by(password_reset_token=token).first()

    if not user or user.password_reset_expires_at is None:
        return jsonify({"error": "Invalid or expired reset link"}), 400

    expires = user.password_reset_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires:
        return jsonify({"error": "Reset link has expired. Please request a new one."}), 400

    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password = hashed.decode('utf-8')
    user.password_reset_token = None
    user.password_reset_expires_at = None
    db.session.commit()

    return jsonify({"message": "Password updated successfully"}), 200
