import os
from dotenv import load_dotenv

load_dotenv()


class ConfigMeta(type):
    """Metaclass allowing Config.SECRET_KEY to dynamically evaluate environment rules."""
    @property
    def SECRET_KEY(cls):
        return cls.get_secret_key()

    def __dir__(cls):
        return super().__dir__() + ["SECRET_KEY"]


class Config(metaclass=ConfigMeta):
    PORT = int(os.getenv("PORT", 5005))
    DEBUG = os.getenv("FLASK_ENV") == "development"
    DATABASE_URL = os.getenv("DATABASE_URL")
    CORS_HEADERS = "Content-Type"

    # Permitted origins for production Vercel frontend and local development
    DEFAULT_CORS_ORIGINS = [
        "https://sih-apex-flax.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    # Supports optional environment variable override/extension via CORS_ORIGINS
    _raw_origins = os.getenv("CORS_ORIGINS")
    if _raw_origins:
        _custom = [o.strip() for o in _raw_origins.split(",") if o.strip()]
        CORS_ORIGINS = list(dict.fromkeys(_custom + DEFAULT_CORS_ORIGINS))
    else:
        CORS_ORIGINS = DEFAULT_CORS_ORIGINS

    # Clearly documented fallback used strictly for local development
    DEV_FALLBACK_SECRET_KEY = "resq-insecure-dev-only-secret-do-not-use-in-prod"

    # Known insecure placeholder secrets that are strictly disallowed in production
    INSECURE_SECRETS = {
        "",
        "default-secret-key",
        "your-secret-key-here",
        "secret",
        "secret-key",
        "changeme",
        DEV_FALLBACK_SECRET_KEY,
    }

    @classmethod
    def get_secret_key(cls):
        """
        Resolves SECRET_KEY with strict production enforcement:
        - In production (FLASK_ENV=production or ENVIRONMENT=production):
          Requires a real SECRET_KEY from the environment and rejects missing, blank,
          or known default/insecure placeholder values.
        - In local development:
          Reads SECRET_KEY from environment if set, otherwise falls back to
          DEV_FALLBACK_SECRET_KEY so local development never breaks.
        """
        env = os.getenv("FLASK_ENV", "development").lower()
        is_production = env == "production" or os.getenv("ENVIRONMENT", "").lower() == "production"
        secret = os.getenv("SECRET_KEY")

        if is_production:
            if not secret or secret.strip() in cls.INSECURE_SECRETS:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION: SECRET_KEY must be set to a secure, "
                    "non-default value in production environments."
                )
            return secret.strip()

        # Development environment: keep development convenient
        return secret.strip() if (secret and secret.strip()) else cls.DEV_FALLBACK_SECRET_KEY
