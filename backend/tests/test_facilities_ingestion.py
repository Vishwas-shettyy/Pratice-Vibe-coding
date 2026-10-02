import unittest
from app.services.repository import Repository
from scripts.ingest_osm_facilities import validate_facility, map_facility_type

class TestFacilitiesIngestion(unittest.TestCase):
    
    def setUp(self):
        self.repo = Repository(db_url=None) # In memory
        
    def test_valid_facility_validation(self):
        elem = {
            "type": "node",
            "id": 12345,
            "lat": 12.0,
            "lon": 75.5,
            "tags": {
                "amenity": "school",
                "name": "Test School"
            }
        }
        is_valid, reason = validate_facility(elem)
        self.assertTrue(is_valid)
        self.assertEqual(reason, "")
        
    def test_invalid_coordinates(self):
        elem = {
            "type": "node",
            "id": 12345,
            "tags": {
                "amenity": "school"
            }
        } # Missing lat/lon
        is_valid, reason = validate_facility(elem)
        self.assertFalse(is_valid)
        self.assertEqual(reason, "Missing coordinates")
        
    def test_bounds_validation(self):
        elem = {
            "type": "node",
            "id": 12345,
            "lat": 10.0, # Outside Kodagu (11.5 - 13.0)
            "lon": 75.5,
            "tags": {
                "amenity": "school"
            }
        }
        is_valid, reason = validate_facility(elem)
        self.assertFalse(is_valid)
        self.assertIn("fall outside Kodagu boundary limits", reason)
        
    def test_facility_type_normalization(self):
        self.assertEqual(map_facility_type("school"), "SCHOOL")
        self.assertEqual(map_facility_type("college"), "COLLEGE")
        self.assertEqual(map_facility_type("community_centre"), "COMMUNITY_CENTRE")
        self.assertEqual(map_facility_type("hospital"), "HOSPITAL")
        self.assertIsNone(map_facility_type("restaurant"))
        
    def test_idempotent_ingestion_and_missing_fields(self):
        # A facility without a name
        facility = {
            "id": "osm_facility_node_1",
            "osm_element_id": "node/1",
            "name": None,
            "district": "Kodagu",
            "taluk": None,
            "lat": 12.0,
            "lng": 75.5,
            "facility_type": "SCHOOL",
            "source_name": "OpenStreetMap",
            "source_url": "https://www.openstreetmap.org/node/1",
            "source_dataset": "Overpass Facilities Extract",
            "source_type": "OPEN_GEO",
            "data_status": "REAL",
            "observation_time": "2026-10-02T10:00:00Z"
        }
        
        self.repo.upsert_facility(facility)
        self.assertEqual(len(self.repo.get_all_facilities()), 1)
        
        # Insert again to test idempotency
        facility["name"] = "Updated School"
        self.repo.upsert_facility(facility)
        
        facilities = self.repo.get_all_facilities()
        self.assertEqual(len(facilities), 1)
        self.assertEqual(facilities[0]["name"], "Updated School")
        self.assertEqual(facilities[0]["source_type"], "OPEN_GEO")
        self.assertEqual(facilities[0]["data_status"], "REAL")
        self.assertIsNone(facilities[0]["taluk"])

if __name__ == "__main__":
    unittest.main()
