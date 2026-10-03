from app.extensions import db
from datetime import datetime
import uuid

class Officer(db.Model):
    __tablename__ = 'officers'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    officer_id = db.Column(db.String(100), unique=True, index=True, nullable=True)
    designation = db.Column(db.String(255), nullable=True)
    department = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    district = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    photo = db.Column(db.Text, nullable=True)
    role = db.Column(db.String(50), default='officer', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    failed_attempts = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime, nullable=True)

class RefreshToken(db.Model):
    __tablename__ = 'refresh_tokens'

    id = db.Column(db.Integer, primary_key=True)
    officer_id = db.Column(db.Integer, db.ForeignKey('officers.id', ondelete='CASCADE'), nullable=False)
    token_hash = db.Column(db.Text, unique=True, index=True, nullable=False)
    user_agent = db.Column(db.Text, nullable=True)
    ip = db.Column(db.String(50), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    officer = db.relationship('Officer', backref=db.backref('refresh_tokens', lazy=True, cascade='all, delete-orphan'))
