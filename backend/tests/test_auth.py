import pytest
from app import create_app
from app.extensions import db
from app.models import Officer

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "WTF_CSRF_ENABLED": False,
        "JWT_SECRET_KEY": "test-secret"
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_register(client):
    response = client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "Password123!",
        "full_name": "Test User"
    })
    assert response.status_code == 201
    assert response.json["ok"] == True

def test_login(client):
    client.post('/api/auth/register', json={
        "email": "test@example.com",
        "password": "Password123!",
        "full_name": "Test User"
    })
    response = client.post('/api/auth/login', json={
        "email": "test@example.com",
        "password": "Password123!"
    })
    assert response.status_code == 200
    assert "access_token" in response.headers.get("Set-Cookie", "")
