import os
import re
import datetime
import argon2
import jwt
import hashlib
from functools import wraps
from flask import Blueprint, request, jsonify, current_app, make_response
from app.extensions import db, limiter
from app.models import Officer, RefreshToken
from app.utils.response import error_response

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')
ph = argon2.PasswordHasher()

def get_token_from_cookie():
    return request.cookies.get('access_token')

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_cookie()
        if not token:
            return jsonify({"ok": False, "error": {"code": "UNAUTHORIZED", "message": "Missing token"}}), 401
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            officer = Officer.query.get(payload['sub'])
            if not officer or not officer.is_active:
                raise Exception("Invalid officer")
            request.officer = officer
        except Exception as e:
            return jsonify({"ok": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid token"}}), 401
        return f(*args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    full_name = data.get('full_name', '').strip()

    if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"ok": False, "error": {"code": "BAD_REQUEST", "message": "Invalid email"}}), 400
    if len(password) < 10:
        return jsonify({"ok": False, "error": {"code": "BAD_REQUEST", "message": "Password must be at least 10 characters"}}), 400
    if not full_name:
        return jsonify({"ok": False, "error": {"code": "BAD_REQUEST", "message": "Full name required"}}), 400

    if Officer.query.filter_by(email=email).first():
        return jsonify({"ok": False, "error": {"code": "CONFLICT", "message": "Email already registered"}}), 409

    hashed = ph.hash(password)
    officer = Officer(email=email, password_hash=hashed, full_name=full_name)
    db.session.add(officer)
    db.session.commit()

    return jsonify({"ok": True, "data": {"id": officer.id, "email": officer.email}}), 201

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    officer = Officer.query.filter_by(email=email).first()
    
    if officer and officer.locked_until and officer.locked_until > datetime.datetime.utcnow():
        return jsonify({"ok": False, "error": {"code": "LOCKED", "message": "Account locked. Try again later."}}), 423

    invalid_err = jsonify({"ok": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid email or password"}})

    if not officer:
        return invalid_err, 401

    try:
        ph.verify(officer.password_hash, password)
    except Exception:
        officer.failed_attempts += 1
        if officer.failed_attempts >= 5:
            officer.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
        db.session.commit()
        return invalid_err, 401

    if ph.check_needs_rehash(officer.password_hash):
        officer.password_hash = ph.hash(password)

    officer.failed_attempts = 0
    officer.locked_until = None
    officer.last_login_at = datetime.datetime.utcnow()
    db.session.commit()

    return issue_tokens(officer)

def issue_tokens(officer):
    access_payload = {
        'sub': officer.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    }
    access_token = jwt.encode(access_payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    refresh_token_plain = os.urandom(32).hex()
    refresh_token_hash = hashlib.sha256(refresh_token_plain.encode()).hexdigest()
    
    rt = RefreshToken(
        officer_id=officer.id,
        token_hash=refresh_token_hash,
        user_agent=request.user_agent.string,
        ip=request.remote_addr,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=7)
    )
    db.session.add(rt)
    db.session.commit()

    resp = make_response(jsonify({
        "ok": True,
        "data": profile_dict(officer)
    }))
    
    # HttpOnly cookies
    is_secure = request.is_secure or current_app.config.get('ENV') == 'production'
    resp.set_cookie('access_token', access_token, httponly=True, secure=is_secure, samesite='Lax', max_age=15*60)
    resp.set_cookie('refresh_token', refresh_token_plain, httponly=True, secure=is_secure, samesite='Lax', max_age=7*24*3600)
    
    return resp

def profile_dict(officer):
    return {
        "id": officer.id,
        "email": officer.email,
        "fullName": officer.full_name,
        "officerId": officer.officer_id,
        "designation": officer.designation,
        "department": officer.department,
        "phone": officer.phone,
        "location": officer.location,
        "district": officer.district,
        "state": officer.state,
        "latitude": officer.latitude,
        "longitude": officer.longitude,
        "profileImage": officer.photo
    }

@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    return jsonify({"ok": True, "data": profile_dict(request.officer)})

@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    rt_plain = request.cookies.get('refresh_token')
    if not rt_plain:
        return jsonify({"ok": False, "error": {"code": "UNAUTHORIZED", "message": "No refresh token"}}), 401
    
    rt_hash = hashlib.sha256(rt_plain.encode()).hexdigest()
    rt_record = RefreshToken.query.filter_by(token_hash=rt_hash).first()
    
    if not rt_record or rt_record.revoked_at or rt_record.expires_at < datetime.datetime.utcnow():
        return jsonify({"ok": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid refresh token"}}), 401
    
    officer = Officer.query.get(rt_record.officer_id)
    if not officer or not officer.is_active:
        return jsonify({"ok": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid officer"}}), 401
    
    # Revoke old
    rt_record.revoked_at = datetime.datetime.utcnow()
    db.session.commit()
    
    return issue_tokens(officer)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    rt_plain = request.cookies.get('refresh_token')
    if rt_plain:
        rt_hash = hashlib.sha256(rt_plain.encode()).hexdigest()
        rt_record = RefreshToken.query.filter_by(token_hash=rt_hash).first()
        if rt_record:
            rt_record.revoked_at = datetime.datetime.utcnow()
            db.session.commit()
            
    resp = make_response(jsonify({"ok": True}))
    resp.set_cookie('access_token', '', expires=0)
    resp.set_cookie('refresh_token', '', expires=0)
    return resp

@auth_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile():
    data = request.get_json() or {}
    officer = request.officer
    
    if 'fullName' in data: officer.full_name = data['fullName']
    if 'officerId' in data: officer.officer_id = data['officerId']
    if 'designation' in data: officer.designation = data['designation']
    if 'department' in data: officer.department = data['department']
    if 'phone' in data: officer.phone = data['phone']
    if 'location' in data: officer.location = data['location']
    if 'district' in data: officer.district = data['district']
    if 'state' in data: officer.state = data['state']
    
    try:
        if 'latitude' in data: officer.latitude = float(data['latitude']) if data['latitude'] else None
        if 'longitude' in data: officer.longitude = float(data['longitude']) if data['longitude'] else None
    except ValueError:
        pass

    if 'profileImage' in data:
        photo = data['profileImage']
        if photo and len(photo) > 1.5 * 1024 * 1024:
            return jsonify({"ok": False, "error": {"code": "PAYLOAD_TOO_LARGE", "message": "Photo too large"}}), 413
        officer.photo = photo

    db.session.commit()
    return jsonify({"ok": True, "data": profile_dict(officer)})
