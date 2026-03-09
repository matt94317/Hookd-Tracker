import os
from flask import Flask
from .extensions import db, migrate

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://user:password@db:5432/hookd')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Register Models (importing them ensures they are known to SQLAlchemy/Migrate)
    from . import models
    
    return app