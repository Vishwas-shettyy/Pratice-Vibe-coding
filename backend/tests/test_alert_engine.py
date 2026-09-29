import unittest
from app.services.alert_engine import generate_alerts

class TestAlertEngine(unittest.TestCase):
    def test_no_alert_condition(self):
        habitations = [
            {
                "id": "HAB-001",
                "name": "Village Safe",
                "riskScore": 20,
                "riskLevel": "LOW",
                "hazardType": "None",
                "roadCondition": "Clear"
            }
        ]
        alerts = generate_alerts(habitations)
        self.assertEqual(len(alerts), 0)

    def test_critical_condition(self):
        habitations = [
            {
                "id": "HAB-002",
                "name": "Village Danger",
                "riskScore": 90,
                "riskLevel": "CRITICAL",
                "hazardType": "Flash Flood",
                "hazardDetails": {"floodRisk": "CRITICAL"},
                "roadCondition": "Clear"
            }
        ]
        alerts = generate_alerts(habitations)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["severity"], "CRITICAL")
        self.assertIn("Flash Flood Critical Warning", alerts[0]["title"])
        self.assertEqual(alerts[0]["affectedHabitations"], ["HAB-002"])

    def test_high_risk_condition(self):
        habitations = [
            {
                "id": "HAB-003",
                "name": "Village Risky",
                "riskScore": 75,
                "riskLevel": "HIGH",
                "hazardType": "River Overflow",
                "roadCondition": "Passable"
            }
        ]
        alerts = generate_alerts(habitations)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["severity"], "HIGH")
        self.assertIn("High Risk Advisory", alerts[0]["title"])

    def test_warning_condition_road_blocked(self):
        habitations = [
            {
                "id": "HAB-004",
                "name": "Village Blocked",
                "riskScore": 40,
                "riskLevel": "MODERATE",
                "hazardType": "Landslide",
                "roadCondition": "Blocked by debris"
            }
        ]
        alerts = generate_alerts(habitations)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["severity"], "WARNING")
        self.assertIn("Logistics Warning", alerts[0]["title"])
        self.assertIn("Evacuation routes compromised", alerts[0]["message"])

if __name__ == '__main__':
    unittest.main()
