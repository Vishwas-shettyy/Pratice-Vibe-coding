import unittest
import json
from unittest.mock import patch, mock_open, MagicMock

# Import the validation logic and ingestion script
from scripts.ingest_osm_roads import validate_road_record, ingest_osm_roads
from app.services.repository import Repository

class TestOSMRoadsIngestion(unittest.TestCase):
    
    def setUp(self):
        self.repo = Repository(db_url=None)  # Use in-memory for tests

    def test_geometry_validation_all_inside(self):
        # lat 11.5 to 13.0, lon 75.0 to 76.5
        record = {
            "id": "osm_way_1",
            "highway_class": "primary",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [75.5, 12.0],  # Valid
                    [75.6, 12.1]   # Valid
                ]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        is_valid, reason = validate_road_record(record)
        self.assertTrue(is_valid)
        self.assertEqual(reason, "")

    def test_geometry_validation_one_outside(self):
        record = {
            "id": "osm_way_2",
            "highway_class": "primary",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [75.5, 12.0],  # Valid
                    [74.9, 12.1]   # Invalid longitude (74.9 < 75.0)
                ]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        is_valid, reason = validate_road_record(record)
        self.assertFalse(is_valid)
        self.assertIn("falls outside Kodagu boundary limits", reason)

    def test_proposed_highway_class_identifiable(self):
        record = {
            "id": "osm_way_3",
            "highway_class": "proposed",
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.5, 12.0], [75.6, 12.1]]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        
        self.repo.upsert_road(record)
        
        roads = self.repo.get_all_roads()
        self.assertEqual(len(roads), 1)
        self.assertEqual(roads[0]["highway_class"], "proposed")
        
    def test_idempotency(self):
        record = {
            "id": "osm_way_4",
            "name": "Main Street",
            "highway_class": "residential",
            "geometry": {
                "type": "LineString",
                "coordinates": [[75.5, 12.0], [75.6, 12.1]]
            },
            "source_name": "OpenStreetMap",
            "source_type": "OPEN_GEO",
            "data_status": "REAL"
        }
        
        # Ingest first time
        self.repo.upsert_road(record)
        self.assertEqual(len(self.repo.get_all_roads()), 1)
        
        # Ingest second time
        self.repo.upsert_road(record)
        self.assertEqual(len(self.repo.get_all_roads()), 1)
        
        # Verify the data
        road = self.repo.get_all_roads()[0]
        self.assertEqual(road["id"], "osm_way_4")
        self.assertEqual(road["name"], "Main Street")

if __name__ == "__main__":
    unittest.main()
