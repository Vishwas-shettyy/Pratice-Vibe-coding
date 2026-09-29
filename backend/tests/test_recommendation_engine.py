import unittest
from app.services.recommendation_engine import generate_recommendations

class TestRecommendationEngine(unittest.TestCase):
    def test_immediate_relocation_high_risk(self):
        habs = [{
            "id": "H1", "name": "V1", "riskScore": 75, "riskLevel": "HIGH", 
            "relocationStatus": "Pending", "affectedPopulation": 100, "medicalPriority": 5
        }]
        shelters = []
        resources = {"emergencyVehicles": {"buses": 10, "ambulances": 10}}
        recs = generate_recommendations(habs, shelters, resources)
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]["type"], "RELOCATION")
        self.assertEqual(recs[0]["priority"], "HIGH")

    def test_completed_evacuation_no_relocation(self):
        habs = [{
            "id": "H2", "name": "V2", "riskScore": 85, "riskLevel": "CRITICAL", 
            "relocationStatus": "Completed", "affectedPopulation": 100
        }]
        recs = generate_recommendations(habs, [], {"emergencyVehicles": {"buses": 10}})
        self.assertEqual(len(recs), 0)

    def test_insufficient_shelter_capacity(self):
        habs = [{
            "id": "H3", "name": "V3", "riskScore": 80, "riskLevel": "HIGH", 
            "relocationStatus": "Assigned", "affectedPopulation": 200, "assignedShelterId": "S1"
        }]
        shelters = [{"id": "S1", "name": "Shelter A", "available": 50}]
        recs = generate_recommendations(habs, shelters, {"emergencyVehicles": {"buses": 10}})
        
        shelter_recs = [r for r in recs if r["type"] == "SHELTER"]
        self.assertEqual(len(shelter_recs), 1)
        self.assertIn("capacity", shelter_recs[0]["title"].lower())

    def test_resource_shortage(self):
        habs = [{
            "id": "H4", "name": "V4", "riskScore": 50, "relocationStatus": "Pending", 
            "population": 150, "medicalPriority": 10
        }]
        resources = {"emergencyVehicles": {"buses": 2, "ambulances": 1}}
        recs = generate_recommendations(habs, [], resources)
        
        res_recs = [r for r in recs if r["type"] == "RESOURCE"]
        self.assertEqual(len(res_recs), 2)  # Bus and Ambulance
        self.assertTrue(any("Bus" in r["title"] for r in res_recs))

    def test_route_risk(self):
        habs = [{
            "id": "H5", "name": "V5", "riskScore": 50, "relocationStatus": "Pending", 
            "roadCondition": "Blocked by debris"
        }]
        recs = generate_recommendations(habs, [], {"emergencyVehicles": {"buses": 10}})
        
        route_recs = [r for r in recs if r["type"] == "ROUTE"]
        self.assertEqual(len(route_recs), 1)
        self.assertIn("Route", route_recs[0]["title"])

    def test_medical_priority_evidence(self):
        habs = [{
            "id": "H6", "name": "V6", "riskScore": 75, "relocationStatus": "Pending", 
            "affectedPopulation": 100, "medicalPriority": 25
        }]
        recs = generate_recommendations(habs, [], {"emergencyVehicles": {"buses": 10, "ambulances": 10}})
        
        reloc_recs = [r for r in recs if r["type"] == "RELOCATION"]
        self.assertEqual(len(reloc_recs), 1)
        self.assertEqual(reloc_recs[0]["priority"], "CRITICAL")
        self.assertTrue(any("Medical priority" in e for e in reloc_recs[0]["evidence"]))

    def test_monitoring(self):
        habs = [{
            "id": "H7", "name": "V7", "riskScore": 50, "riskLevel": "MODERATE", 
            "relocationStatus": "Pending"
        }]
        recs = generate_recommendations(habs, [], {"emergencyVehicles": {"buses": 10}})
        self.assertEqual(len(recs), 1)
        self.assertEqual(recs[0]["type"], "MONITORING")

if __name__ == '__main__':
    unittest.main()
