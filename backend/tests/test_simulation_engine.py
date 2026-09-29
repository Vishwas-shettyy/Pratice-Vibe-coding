import unittest
from app.services.simulation_engine import calculate_simulation_impact

class TestSimulationEngine(unittest.TestCase):
    def setUp(self):
        self.habitations = [
            {
                "id": "H1", "name": "V1", "riskScore": 50, "hazardType": "Flash Flood", 
                "population": 100, "medicalPriority": 5, "relocationStatus": "Pending",
                "roadCondition": "Clear", "assignedShelterId": "S1"
            },
            {
                "id": "H2", "name": "V2", "riskScore": 60, "hazardType": "Landslide", 
                "population": 200, "medicalPriority": 10, "relocationStatus": "Pending",
                "roadCondition": "Blocked", "assignedShelterId": "S1"
            }
        ]
        self.shelters = [
            {"id": "S1", "capacity": 250, "available": 250}
        ]
        self.resources = {
            "emergencyVehicles": {"buses": 5, "ambulances": 5}
        }

    def test_baseline_scenario(self):
        result = calculate_simulation_impact(50, 30, 2.0, self.habitations, self.shelters, self.resources)
        v2 = next(h for h in result["affectedHabitations"] if h["id"] == "H2")
        self.assertEqual(v2["projectedRisk"], 60) # V2 Landslide
        self.assertEqual(v2["riskChange"], 0)
        v1 = next(h for h in result["affectedHabitations"] if h["id"] == "H1")
        self.assertEqual(v1["projectedRisk"], 50) # V1 Flash Flood

    def test_increased_rainfall(self):
        # 100mm rainfall = +10 to flood risk
        result = calculate_simulation_impact(100, 30, 2.0, self.habitations, self.shelters, self.resources)
        v1 = next(h for h in result["affectedHabitations"] if h["id"] == "H1")
        self.assertEqual(v1["projectedRisk"], 60)
        self.assertEqual(v1["riskChange"], 10)

    def test_increased_slope_instability(self):
        # 60% slope instability = +9 to landslide risk
        result = calculate_simulation_impact(50, 60, 2.0, self.habitations, self.shelters, self.resources)
        v2 = next(h for h in result["affectedHabitations"] if h["id"] == "H2")
        self.assertEqual(v2["projectedRisk"], 69)
        self.assertEqual(v2["riskChange"], 9)

    def test_increased_river_level(self):
        # 3.0m river = +10 to flood risk
        result = calculate_simulation_impact(50, 30, 3.0, self.habitations, self.shelters, self.resources)
        v1 = next(h for h in result["affectedHabitations"] if h["id"] == "H1")
        self.assertEqual(v1["projectedRisk"], 60)

    def test_risk_limits(self):
        # Extreme scenario
        result = calculate_simulation_impact(500, 100, 10.0, self.habitations, self.shelters, self.resources)
        for h in result["affectedHabitations"]:
            self.assertLessEqual(h["projectedRisk"], 100)
            
        # Extreme negative
        result2 = calculate_simulation_impact(0, 0, 0.0, self.habitations, self.shelters, self.resources)
        for h in result2["affectedHabitations"]:
            self.assertGreaterEqual(h["projectedRisk"], 0)

    def test_shelter_and_resource_impact(self):
        # Trigger high risk on both
        result = calculate_simulation_impact(200, 100, 5.0, self.habitations, self.shelters, self.resources)
        
        # Required beds = 300, Available = 250 -> Shortfall = 50
        self.assertEqual(result["shelterImpact"]["capacityShortfall"], 50)
        
        # Required buses = 2 + 4 = 6. Available = 5 -> Shortfall = 1
        self.assertEqual(result["resourceImpact"]["busShortfall"], 1)
        
    def test_route_impact(self):
        result = calculate_simulation_impact(200, 100, 5.0, self.habitations, self.shelters, self.resources)
        routes = result["routeImpact"]["affectedRoutes"]
        self.assertEqual(len(routes), 1)
        self.assertEqual(routes[0]["habitation"], "V2")

if __name__ == '__main__':
    unittest.main()
