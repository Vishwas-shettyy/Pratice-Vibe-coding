"""
Data Service Layer (Mock Data / In-Memory Store)
Designed with modular data access functions to easily swap out for PostgreSQL/Supabase DB.
"""

import json
import os

from app.services.risk_service import enrich_areas

# Initial In-Memory State
INITIAL_HABITATIONS = []

INITIAL_SHELTERS = [
    {
        "id": "SAFE-01",
        "name": "Safe Shelter Alpha (Govt Stadium)",
        "code": "S-ALP",
        "lat": 12.27,
        "lng": 76.63,
        "capacity": 1000,
        "occupied": 650,
        "available": 350,
        "type": "Stadium & Indoor Complex",
        "elevation": "840m (High Ground)",
        "waterStockLiters": 15000,
        "foodMealsStock": 4500,
        "medicalTeams": 4,
        "powerGenerators": 3,
        "status": "Active & Ready",
        "contact": "+91 98765-43210 (Control Room Alpha)",
    },
    {
        "id": "SAFE-02",
        "name": "Shelter Beta (Central University Hall)",
        "code": "S-BET",
        "lat": 12.26,
        "lng": 76.68,
        "capacity": 850,
        "occupied": 410,
        "available": 440,
        "type": "University Campus",
        "elevation": "860m (High Ground)",
        "waterStockLiters": 12000,
        "foodMealsStock": 3200,
        "medicalTeams": 3,
        "powerGenerators": 2,
        "status": "Active & Ready",
        "contact": "+91 98765-43211 (Control Room Beta)",
    },
    {
        "id": "SAFE-03",
        "name": "Shelter Gamma (Polytechnic Ground)",
        "code": "S-GAM",
        "lat": 12.35,
        "lng": 76.60,
        "capacity": 700,
        "occupied": 480,
        "available": 220,
        "type": "Educational Relief Base",
        "elevation": "830m (High Ground)",
        "waterStockLiters": 9000,
        "foodMealsStock": 2800,
        "medicalTeams": 2,
        "powerGenerators": 2,
        "status": "Active & Ready",
        "contact": "+91 98765-43212 (Control Room Gamma)",
    },
    {
        "id": "SAFE-04",
        "name": "Shelter Delta (East High School)",
        "code": "S-DEL",
        "lat": 12.23,
        "lng": 76.72,
        "capacity": 700,
        "occupied": 240,
        "available": 460,
        "type": "School Auditorium",
        "elevation": "890m (High Ground)",
        "waterStockLiters": 8000,
        "foodMealsStock": 2200,
        "medicalTeams": 2,
        "powerGenerators": 1,
        "status": "Standby Surplus",
        "contact": "+91 98765-43213 (Control Room Delta)",
    },
]

INITIAL_ALERTS = [
    {
        "id": "ALT-02",
        "severity": "HIGH",
        "type": "WARNING",
        "title": "Landslide Risk Elevated",
        "time": "35 mins ago",
        "area": "Sector 7",
        "message": "Slope movement detected near Sector 7 (Sensor #S-104). Road access restricted.",
        "status": "ACTIVE",
    },
    {
        "id": "ALT-03",
        "severity": "INFO",
        "type": "INFO",
        "title": "Shelter #4 Capacity Update",
        "time": "1 hour ago",
        "area": "Safe Shelter Alpha",
        "message": "Safe Site Delta added 200 additional emergency beds and 500L clean water supply.",
        "status": "RESOLVED",
    },
]

INITIAL_RESOURCES = {
    "emergencyVehicles": {"buses": 34, "ambulances": 18, "rescueTrucks": 12},
    "medicalTeams": {"active": 11, "onCall": 6},
    "rescueTeams": {"ndrfUnits": 4, "fireServices": 8},
    "supplies": {
        "waterStockLiters": 44000,
        "foodRations": 12700,
        "blankets": 5200,
        "generators": 8,
    },
}


class DataService:
    def __init__(self):
        from app.services.repository import repo
        self.repo = repo
        # Seed the DB or populate in-memory
        enriched = enrich_areas(INITIAL_HABITATIONS)
        self.repo.seed_data(enriched, INITIAL_SHELTERS, INITIAL_RESOURCES)

        # Auto-seed real environmental observations if repository is currently empty
        if not self.repo.get_observations():
            try:
                json_path = os.path.abspath(
                    os.path.join(
                        os.path.dirname(__file__),
                        "..",
                        "..",
                        "data",
                        "real_observations_karnataka.json",
                    )
                )
                if os.path.exists(json_path):
                    with open(json_path, "r", encoding="utf-8") as f:
                        records = json.load(f)
                        for r in records:
                            self.repo.upsert_observation(r)
            except Exception as e:
                print(f"⚠️ Failed to auto-seed real observations: {e}")

        # Auto-seed real Kodagu settlements
        try:
            settlements_path = os.path.abspath(
                os.path.join(
                    os.path.dirname(__file__),
                    "..",
                    "..",
                    "data",
                    "kodagu_settlements.json",
                )
            )
            if os.path.exists(settlements_path):
                with open(settlements_path, "r", encoding="utf-8") as f:
                    settlement_records = json.load(f)
                    for s in settlement_records:
                        self.repo.upsert_habitation(s)
        except Exception as e:
            print(f"⚠️ Failed to auto-seed real Kodagu settlements: {e}")
        # Load state dynamically
        self.alerts = INITIAL_ALERTS  # Alerts can remain mostly dynamic based on current state

    @property
    def habitations(self):
        return enrich_areas(self.repo.get_all_habitations())

    @property
    def shelters(self):
        return self.repo.get_all_shelters()

    @property
    def resources(self):
        return self.repo.get_resources()

    def get_dashboard_stats(self):
        habs = self.habitations
        shelts = self.shelters
        total_pop = sum((h.get("population") or 0) for h in habs)
        affected_pop = sum((h.get("affectedPopulation") or 0) for h in habs)
        red_zones = sum(
            1 for h in habs if h.get("riskLevel") in ["CRITICAL", "HIGH"]
        )
        total_capacity = sum(s["capacity"] for s in shelts)
        total_occupied = sum(s["occupied"] for s in shelts)
        surplus_capacity = total_capacity - total_occupied
        relocated_count = sum(
            int((h.get("population") or 0) * ((h.get("evacuationProgress") or 0) / 100))
            for h in habs
        )

        return {
            "totalPopulationAtRisk": total_pop,
            "affectedPopulation": affected_pop,
            "peopleRequiringRelocation": total_pop - relocated_count,
            "relocatedCount": relocated_count,
            "redZonesCount": red_zones,
            "safeSitesCount": len(shelts),
            "totalCapacity": total_capacity,
            "occupiedCapacity": total_occupied,
            "availableCapacity": total_capacity - total_occupied,
            "surplusCapacity": surplus_capacity,
            "criticalAlertsCount": sum(
                1
                for a in self.get_alerts()
                if a["severity"] == "CRITICAL" and a["status"] == "ACTIVE"
            ),
            "activeResponseTeams": 15,
            "systemStatus": "ONLINE",
            "hazardLevel": "HIGH (LEVEL 3)",
        }

    def get_risk_areas(self):
        return self.habitations

    def get_risk_area_by_id(self, area_id):
        for hab in self.habitations:
            if hab["id"] == area_id or hab["code"].lower() == area_id.lower():
                return hab
        return None

    def get_map_data(self):
        return {
            "riskAreas": self.habitations,
            "shelters": self.shelters,
            "hazardZones": [],
        }

    def get_relocation_priorities(self):
        sorted_habs = sorted(
            self.habitations, key=lambda x: x.get("riskScore", 0), reverse=True
        )
        return sorted_habs

    def get_relocation_workflow(self):
        return [
            {"stage": "Risk Identified", "count": 6, "status": "Completed"},
            {"stage": "Assessment", "count": 6, "status": "Completed"},
            {"stage": "Relocation Planned", "count": 5, "status": "Completed"},
            {"stage": "Transport Dispatch", "count": 4, "status": "In Progress"},
            {"stage": "Shelter Allocation", "count": 3, "status": "In Progress"},
            {"stage": "Relocation Completed", "count": 1, "status": "Active"},
        ]

    def get_shelters(self):
        return self.shelters

    def get_resources(self):
        return self.resources

    def get_alerts(self):
        # Generate new alerts dynamically based on the current habitations state
        from app.services.alert_engine import generate_alerts
        dynamic_alerts = generate_alerts(self.habitations)

        history = [a for a in self.alerts if a.get("status") == "RESOLVED"]
        return dynamic_alerts + history

    def get_recommendations(self):
        from app.services.recommendation_engine import generate_recommendations
        return generate_recommendations(self.habitations, self.shelters, self.resources)

    def get_reports(self):
        return [
            {
                "id": "REP-2026-01",
                "title": "Daily Disaster Risk & Relocation Summary",
                "date": "2026-09-27",
                "author": "SIH Emergency Control Operations",
                "summary": "Full multi-hazard assessment covering active Red Zones.",
                "downloadUrl": "/reports/REP-2026-01.pdf",
            },
            {
                "id": "REP-2026-02",
                "title": "Shelter Occupancy & Logistics Audit",
                "date": "2026-09-26",
                "author": "Relief Supply Logistics Team",
                "summary": "Capacity surplus of 770 beds verified across 4 high-ground shelters.",
                "downloadUrl": "/reports/REP-2026-02.pdf",
            },
        ]

    def assign_shelter(self, area_id, shelter_id):
        hab = self.repo.update_habitation_relocation(area_id, status="Assigned", assigned_shelter_id=shelter_id)
        if not hab:
            return None
        return enrich_areas([hab])[0]

    def update_relocation_status(self, area_id, status, progress=None):
        hab = self.repo.update_habitation_relocation(area_id, status, progress)
        if not hab:
            return None
        return enrich_areas([hab])[0]

    def get_environmental_observations(self, district=None, parameter=None):
        return self.repo.get_observations(district=district, parameter_name=parameter)

# Global Singleton Instance
data_service = DataService()
