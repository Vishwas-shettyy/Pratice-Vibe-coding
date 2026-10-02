from flask import Flask
from flask_cors import CORS
from config import Config
from app.utils.response import error_response

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure SECRET_KEY is securely populated according to environment rules
    if hasattr(config_class, "get_secret_key"):
        app.config["SECRET_KEY"] = config_class.get_secret_key()
    elif not app.config.get("SECRET_KEY"):
        app.config["SECRET_KEY"] = Config.get_secret_key()

    # Enable CORS for authorized origins (production Vercel frontend and local dev)
    allowed_origins = app.config.get("CORS_ORIGINS", Config.DEFAULT_CORS_ORIGINS)
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

    # Register Blueprints
    from app.routes.api import api_bp
    app.register_blueprint(api_bp)

    # Global Error Handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return error_response(code="NOT_FOUND", message="Requested endpoint or resource not found", status_code=404)

    @app.errorhandler(500)
    def internal_error(error):
        return error_response(code="INTERNAL_SERVER_ERROR", message="An unexpected server error occurred", status_code=500)

    return app
