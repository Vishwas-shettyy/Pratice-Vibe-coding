import unittest
from app import create_app

class TestCors500(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()

    def test_cors_on_500(self):
        # Trigger an exception by mocking relocation_service to raise Exception
        import app.services.relocation_service as rs
        def mock_run(*args, **kwargs):
            raise Exception("Test Exception")
        rs.relocation_service.run_scenario_relocation = mock_run

        response = self.app.post(
            "/api/relocation/scenario/KODAGU_EXTREME_MONSOON_HARSH_CASE/run",
            headers={"Origin": "https://sih-apex-flax.vercel.app"}
        )
        print("Status:", response.status_code)
        print("Headers:", response.headers)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "https://sih-apex-flax.vercel.app")

if __name__ == "__main__":
    unittest.main()
