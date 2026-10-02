import os
import unittest
from unittest.mock import patch

from config import Config
from app import create_app


class TestSecretKeyConfiguration(unittest.TestCase):
    def test_dev_fallback_when_secret_key_absent(self):
        """In development mode with no SECRET_KEY, fallback is used and no error is raised."""
        with patch.dict(os.environ, {"FLASK_ENV": "development"}, clear=False):
            if "SECRET_KEY" in os.environ:
                del os.environ["SECRET_KEY"]
            secret = Config.get_secret_key()
            self.assertEqual(secret, Config.DEV_FALLBACK_SECRET_KEY)

    def test_dev_uses_provided_secret_key(self):
        """In development mode with a custom SECRET_KEY, the custom key is used."""
        with patch.dict(os.environ, {"FLASK_ENV": "development", "SECRET_KEY": "my-local-dev-secret"}):
            secret = Config.get_secret_key()
            self.assertEqual(secret, "my-local-dev-secret")

    def test_prod_raises_when_secret_key_absent(self):
        """In production mode with no SECRET_KEY, a ValueError is raised."""
        with patch.dict(os.environ, {"FLASK_ENV": "production"}, clear=False):
            if "SECRET_KEY" in os.environ:
                del os.environ["SECRET_KEY"]
            with self.assertRaises(ValueError) as ctx:
                Config.get_secret_key()
            self.assertIn("SECRET_KEY must be set", str(ctx.exception))

    def test_prod_raises_for_insecure_default_secrets(self):
        """In production mode, known insecure default secrets trigger a ValueError."""
        insecure_keys = ["default-secret-key", "your-secret-key-here", "secret", "changeme", Config.DEV_FALLBACK_SECRET_KEY]
        for bad_key in insecure_keys:
            with patch.dict(os.environ, {"FLASK_ENV": "production", "SECRET_KEY": bad_key}):
                with self.assertRaises(ValueError, msg=f"Should reject {bad_key}") as ctx:
                    Config.get_secret_key()
                self.assertIn("SECRET_KEY must be set", str(ctx.exception))

    def test_prod_accepts_strong_secret(self):
        """In production mode with a valid secret key, it is successfully accepted."""
        with patch.dict(os.environ, {"FLASK_ENV": "production", "SECRET_KEY": "super-secure-production-random-key-123"}):
            secret = Config.get_secret_key()
            self.assertEqual(secret, "super-secure-production-random-key-123")

    def test_create_app_in_production_enforces_secret(self):
        """create_app() in production raises ValueError if no valid secret key is provided."""
        with patch.dict(os.environ, {"FLASK_ENV": "production"}, clear=False):
            if "SECRET_KEY" in os.environ:
                del os.environ["SECRET_KEY"]
            with self.assertRaises(ValueError):
                create_app()

    def test_secret_key_not_exposed_in_api_response(self):
        """Verify secret key is never leaked in standard API responses."""
        with patch.dict(os.environ, {"FLASK_ENV": "development", "SECRET_KEY": "test-unleaked-secret-999"}):
            client = create_app().test_client()
            resp = client.get("/api/health")
            self.assertEqual(resp.status_code, 200)
            self.assertNotIn("test-unleaked-secret-999", resp.get_data(as_text=True))
            for header, value in resp.headers:
                self.assertNotIn("test-unleaked-secret-999", value)


if __name__ == "__main__":
    unittest.main()
