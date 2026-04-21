import os
from datetime import timedelta
from flask import Flask, send_from_directory
from dotenv import load_dotenv

load_dotenv()  # loads backend/.env before anything else reads os.environ
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config=None):
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "postgresql://hookd:hookd@localhost:5432/hookd_tracker"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

    upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = os.path.abspath(upload_folder)
    app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB limit

    if config:
        app.config.update(config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, origins=["http://localhost:3000"])

    # Import models so Alembic can detect them
    from . import models

    from .routes.auth import auth_bp
    from .routes.campaigns import campaigns_bp
    from .routes.accounts import accounts_bp
    from .routes.posts import posts_bp
    from .routes.users import users_bp
    from .routes.payments import payments_bp, stripe_bp
    from .routes.payroll import payroll_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(campaigns_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(posts_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(stripe_bp)
    app.register_blueprint(payroll_bp)

    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Start scheduled jobs (unless disabled, e.g. during testing)
    if not app.config.get('SCHEDULER_DISABLED'):
        from .jobs import init_scheduler
        init_scheduler(app)

    return app
