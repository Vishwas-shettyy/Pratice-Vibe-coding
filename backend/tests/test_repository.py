import os
import unittest
from unittest.mock import patch
from app.services.repository import Repository
from app.services.data_service import INITIAL_HABITATIONS, INITIAL_SHELTERS, INITIAL_RESOURCES

class TestRepository(unittest.TestCase):
    def setUp(self):
        # We will test the memory fallback
        self.repo = Repository(db_url=None)
        
        # We need to test the database layer as well, but the prompt says:
        # "Do not require a live production database for ordinary unit tests.
        # If PostgreSQL integration tests require a database, clearly separate them."
        # We will mock the psycopg2 connection or just use memory fallback.
        # The prompt says: fallback to in-memory mode when DATABASE_URL is absent
        self.repo.seed_data(INITIAL_HABITATIONS, INITIAL_SHELTERS, INITIAL_RESOURCES)

    def test_fallback_mode(self):
        self.assertTrue(self.repo.in_memory)
        self.assertEqual(len(self.repo.get_all_habitations()), 6)
        self.assertEqual(len(self.repo.get_all_shelters()), 4)

    def test_reading_habitations(self):
        habs = self.repo.get_all_habitations()
        self.assertTrue(isinstance(habs, list))
        self.assertGreater(len(habs), 0)
        self.assertEqual(habs[0]["id"], "HAB-101")

    def test_reading_shelters(self):
        shelters = self.repo.get_all_shelters()
        self.assertTrue(isinstance(shelters, list))
        self.assertGreater(len(shelters), 0)
        self.assertEqual(shelters[0]["id"], "SAFE-01")

    def test_reading_resources(self):
        res = self.repo.get_resources()
        self.assertTrue(isinstance(res, dict))
        self.assertIn("emergencyVehicles", res)

    def test_shelter_assignment_persistence(self):
        updated = self.repo.update_habitation_relocation(
            area_id="HAB-102",
            status="Assigned",
            assigned_shelter_id="SAFE-04"
        )
        self.assertIsNotNone(updated)
        self.assertEqual(updated["assignedShelterId"], "SAFE-04")
        self.assertEqual(updated["relocationStatus"], "Assigned")

        # Verify it persists in memory
        habs = self.repo.get_all_habitations()
        hab_102 = next((h for h in habs if h["id"] == "HAB-102"), None)
        self.assertEqual(hab_102["assignedShelterId"], "SAFE-04")
        self.assertEqual(hab_102["relocationStatus"], "Assigned")

    def test_evacuation_status_persistence(self):
        updated = self.repo.update_habitation_relocation(
            area_id="HAB-103",
            status="Completed"
        )
        self.assertIsNotNone(updated)
        self.assertEqual(updated["evacuationProgress"], 100)
        self.assertEqual(updated["relocationStatus"], "Completed")

        # Verify it persists in memory
        habs = self.repo.get_all_habitations()
        hab_103 = next((h for h in habs if h["id"] == "HAB-103"), None)
        self.assertEqual(hab_103["evacuationProgress"], 100)
        self.assertEqual(hab_103["relocationStatus"], "Completed")

    @patch('app.services.repository.psycopg2')
    def test_postgres_connection_attempt(self, mock_psycopg2):
        # We test that the repo attempts to use psycopg2 if URL is set
        repo = Repository(db_url="postgres://user:pass@localhost:5432/db")
        self.assertFalse(repo.in_memory)
        mock_psycopg2.connect.assert_called_once()

if __name__ == '__main__':
    unittest.main()
