import unittest
from app import create_app

class TestHealthRateLimit(unittest.TestCase):
    def setUp(self):
        # Create app and disable TESTING flag temporarily if we want limiter to act as in production, 
        # but Flask-Limiter usually respects limits in test if not bypassed. 
        # We'll just call it 60 times. Default limit is 50 per hour.
        self.app = create_app()
        self.app.config['RATELIMIT_ENABLED'] = True 
        self.client = self.app.test_client()

    def test_health_not_rate_limited(self):
        # Default limit is 50 per hour. If we call it 60 times, it should not return 429.
        for _ in range(60):
            response = self.client.get("/api/health")
            self.assertEqual(response.status_code, 200)

if __name__ == "__main__":
    unittest.main()
