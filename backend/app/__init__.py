import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

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

    if config:
        app.config.update(config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Import models so Alembic can detect them
    from . import models

    from .routes.auth import auth_bp
    from .routes.campaigns import campaigns_bp
    from .routes.accounts import accounts_bp
    from .routes.posts import posts_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(campaigns_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(posts_bp)

    return app
