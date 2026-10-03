import unittest
from app import create_app

class TestCorsConfiguration(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()

    def test_production_vercel_origin_allowed(self):
        response = self.app.get("/api/health", headers={"Origin": "https://sih-apex-flax.vercel.app"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://sih-apex-flax.vercel.app")

    def test_preview_vercel_origin_allowed(self):
        response = self.app.get("/api/health", headers={"Origin": "https://sih-apex-git-main-apex-a9a1.vercel.app"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://sih-apex-git-main-apex-a9a1.vercel.app")

    def test_preflight_options_allowed(self):
        response = self.app.open(
            "/api/resources",
            method="OPTIONS",
            headers={
                "Origin": "https://sih-apex-git-main-apex-a9a1.vercel.app",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://sih-apex-git-main-apex-a9a1.vercel.app")

    def test_localhost_5173_allowed(self):
        response = self.app.get("/api/health", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:5173")

    def test_localhost_5174_allowed(self):
        response = self.app.get("/api/health", headers={"Origin": "http://localhost:5174"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://localhost:5174")

    def test_127_0_0_1_5173_allowed(self):
        response = self.app.get("/api/health", headers={"Origin": "http://127.0.0.1:5173"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:5173")

    def test_127_0_0_1_5174_allowed(self):
        response = self.app.get("/api/health", headers={"Origin": "http://127.0.0.1:5174"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:5174")

    def test_unauthorized_origin_disallowed(self):
        response = self.app.get("/api/health", headers={"Origin": "https://unauthorized-domain.com"})
        self.assertEqual(response.status_code, 200)
        # Unauthorized origin must NOT receive an Access-Control-Allow-Origin header matching its domain or wildcard
        self.assertIsNone(response.headers.get("Access-Control-Allow-Origin"))

if __name__ == "__main__":
    unittest.main()
