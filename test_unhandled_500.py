import unittest
from app import create_app

class TestCorsUnhandled500(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()

    def test_cors_on_unhandled_500(self):
        import app.routes.api as api
        @api.api_bp.route("/crash", methods=["POST", "OPTIONS"])
        def crash():
            raise ValueError("Unhandled Error!")

        response = self.app.post("/api/crash", headers={"Origin": "https://sih-apex-flax.vercel.app"})
        print("Status:", response.status_code)
        print("Headers:", response.headers)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://sih-apex-flax.vercel.app")

if __name__ == "__main__":
    unittest.main()
