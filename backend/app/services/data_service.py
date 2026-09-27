"""
Data Service Layer (Mock Data / In-Memory Store)
Designed with modular data access functions to easily swap out for PostgreSQL/Supabase DB.
"""

# Initial In-Memory State
INITIAL_HABITATIONS = [
    {
        "id": "HAB-101",
        "name": "Village A (Kaveri Basin)",
        "code": "VIL-A",
        "district": "Mysuru",
        "region": "Kaveri Basin",
        "lat": 12.31,
        "lng": 76.62,
        "population": 680,
        "affectedPopulation": 610,
        "elderly": 140,
        "children": 195,
        "medicalPriority": 42,
        "riskScore": 88,
        "riskLevel": "CRITICAL",
        "hazardType": "Flash Flood & Inundation",
        "hazardLevel": "Immediate",
        "assignedShelterId": "SAFE-01",
        "distanceToShelterKm": 4.2,
        "relocationStatus": "In Progress",
        "evacuationProgress": 65,
        "roadCondition": "Passable (4WD / Buses)",
        "priority": "Critical",
        "responseStatus": "Evacuation Active",
        "hazardDetails": {
            "slopeIndex": "12° Low",
            "elevation": "720m",
            "riverProximity": "150m",
            "floodRisk": "CRITICAL",
            "landslideRisk": "LOW"
        }
    },
    {
        "id": "HAB-102",
        "name": "Village B (Mudhall Ridge)",
        "code": "VIL-B",
        "district": "Chamarajanagar",
        "region": "Mudhall Hills",
        "lat": 12.28,
        "lng": 76.67,
        "population": 450,
        "affectedPopulation": 390,
        "elderly": 85,
        "children": 110,
        "medicalPriority": 18,
        "riskScore": 76,
        "riskLevel": "HIGH",
        "hazardType": "Slope Failure & Landslide",
        "hazardLevel": "Immediate",
        "assignedShelterId": "SAFE-02",
        "distanceToShelterKm": 6.8,
        "relocationStatus": "Pending Dispatch",
        "evacuationProgress": 20,
        "roadCondition": "Debris Blocked (Eng. Team Deployed)",
        "priority": "Immediate Action",
        "responseStatus": "Debris Clearing",
        "hazardDetails": {
            "slopeIndex": "34° Steep",
            "elevation": "950m",
            "riverProximity": "1.2km",
            "floodRisk": "MODERATE",
            "landslideRisk": "CRITICAL"
        }
    },
    {
        "id": "HAB-103",
        "name": "Village C (Chamundi Foothills)",
        "code": "VIL-C",
        "district": "Mysuru",
        "region": "Chamundi Slope",
        "lat": 12.29,
        "lng": 76.59,
        "population": 300,
        "affectedPopulation": 240,
        "elderly": 50,
        "children": 78,
        "medicalPriority": 12,
        "riskScore": 62,
        "riskLevel": "MEDIUM",
        "hazardType": "Heavy Runoff",
        "hazardLevel": "Short-term",
        "assignedShelterId": "SAFE-01",
        "distanceToShelterKm": 3.1,
        "relocationStatus": "Ready",
        "evacuationProgress": 45,
        "roadCondition": "Clear",
        "priority": "Medium",
        "responseStatus": "Standby Evacuation",
        "hazardDetails": {
            "slopeIndex": "18° Moderate",
            "elevation": "810m",
            "riverProximity": "800m",
            "floodRisk": "HIGH",
            "landslideRisk": "LOW"
        }
    },
    {
        "id": "HAB-104",
        "name": "Village D (Lowland Marsh)",
        "code": "VIL-D",
        "district": "Mandya",
        "region": "KRS Lowlands",
        "lat": 12.34,
        "lng": 76.65,
        "population": 520,
        "affectedPopulation": 480,
        "elderly": 98,
        "children": 140,
        "medicalPriority": 29,
        "riskScore": 82,
        "riskLevel": "CRITICAL",
        "hazardType": "River Overflow",
        "hazardLevel": "Immediate",
        "assignedShelterId": "SAFE-03",
        "distanceToShelterKm": 5.5,
        "relocationStatus": "In Progress",
        "evacuationProgress": 80,
        "roadCondition": "Clear",
        "priority": "Critical",
        "responseStatus": "Evacuation Active",
        "hazardDetails": {
            "slopeIndex": "4° Flat",
            "elevation": "690m",
            "riverProximity": "50m",
            "floodRisk": "CRITICAL",
            "landslideRisk": "NEGLIGIBLE"
        }
    },
    {
        "id": "HAB-105",
        "name": "Village E (East Plateau)",
        "code": "VIL-E",
        "district": "Mysuru",
        "region": "East Plateau",
        "lat": 12.25,
        "lng": 76.70,
        "population": 310,
        "affectedPopulation": 150,
        "elderly": 40,
        "children": 82,
        "medicalPriority": 9,
        "riskScore": 48,
        "riskLevel": "LOW",
        "hazardType": "Wind Gust & Runoff",
        "hazardLevel": "Medium-term",
        "assignedShelterId": "SAFE-04",
        "distanceToShelterKm": 2.8,
        "relocationStatus": "Completed",
        "evacuationProgress": 100,
        "roadCondition": "Clear",
        "priority": "Low",
        "responseStatus": "Monitored",
        "hazardDetails": {
            "slopeIndex": "8° Low",
            "elevation": "880m",
            "riverProximity": "2.5km",
            "floodRisk": "LOW",
            "landslideRisk": "LOW"
        }
    },
    {
        "id": "HAB-106",
        "name": "Village F (Gorge Settlement)",
        "code": "VIL-F",
        "district": "Kodagu Border",
        "region": "Western Edge",
        "lat": 12.32,
        "lng": 76.55,
        "population": 220,
        "affectedPopulation": 190,
        "elderly": 32,
        "children": 54,
        "medicalPriority": 15,
        "riskScore": 71,
        "riskLevel": "HIGH",
        "hazardType": "Rockfall & Flash Surge",
        "hazardLevel": "Short-term",
        "assignedShelterId": "SAFE-02",
        "distanceToShelterKm": 7.2,
        "relocationStatus": "In Progress",
        "evacuationProgress": 50,
        "roadCondition": "Single Lane Passable",
        "priority": "High",
        "responseStatus": "Relocation Transit",
        "hazardDetails": {
            "slopeIndex": "28° High",
            "elevation": "760m",
            "riverProximity": "300m",
            "floodRisk": "HIGH",
            "landslideRisk": "HIGH"
        }
    }
]

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
        "contact": "+91 98765-43210 (Control Room Alpha)"
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
        "contact": "+91 98765-43211 (Control Room Beta)"
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
        "contact": "+91 98765-43212 (Control Room Gamma)"
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
        "contact": "+91 98765-43213 (Control Room Delta)"
    }
]

INITIAL_ALERTS = [
    {
        "id": "ALT-01",
        "severity": "CRITICAL",
        "type": "CRITICAL",
        "title": "Flash Flood Warning - Sector 4",
        "time": "10 mins ago",
        "area": "Kaveri Basin / Village A",
        "message": "Rainfall intensity reached 120mm/hr in North Hills. Immediate evacuation recommended for Village A & B.",
        "status": "ACTIVE"
    },
    {
        "id": "ALT-02",
        "severity": "HIGH",
        "type": "WARNING",
        "title": "Landslide Risk Elevated",
        "time": "35 mins ago",
        "area": "Mudhall Ridge / Village B",
        "message": "Slope movement detected near Mudhall Ridge (Sensor #S-104). Road access restricted.",
        "status": "ACTIVE"
    },
    {
        "id": "ALT-03",
        "severity": "INFO",
        "type": "INFO",
        "title": "Shelter #4 Capacity Update",
        "time": "1 hour ago",
        "area": "Safe Shelter Alpha",
        "message": "Safe Site Delta added 200 additional emergency beds and 500L clean water supply.",
        "status": "RESOLVED"
    }
]

INITIAL_RESOURCES = {
    "emergencyVehicles": { "buses": 34, "ambulances": 18, "rescueTrucks": 12 },
    "medicalTeams": { "active": 11, "onCall": 6 },
    "rescueTeams": { "ndrfUnits": 4, "fireServices": 8 },
    "supplies": {
        "waterStockLiters": 44000,
        "foodRations": 12700,
        "blankets": 5200,
        "generators": 8
    }
}

class DataService:
    def __init__(self):
        self.habitations = INITIAL_HABITATIONS
        self.shelters = INITIAL_SHELTERS
        self.alerts = INITIAL_ALERTS
        self.resources = INITIAL_RESOURCES

    def get_dashboard_stats(self):
        total_pop = sum(h["population"] for h in self.habitations)
        affected_pop = sum(h["affectedPopulation"] for h in self.habitations)
        red_zones = sum(1 for h in self.habitations if h["riskLevel"] in ["CRITICAL", "HIGH"])
        total_capacity = sum(s["capacity"] for s in self.shelters)
        total_occupied = sum(s["occupied"] for s in self.shelters)
        surplus_capacity = total_capacity - total_occupied
        relocated_count = sum(int(h["population"] * (h["evacuationProgress"] / 100)) for h in self.habitations)

        return {
            "totalPopulationAtRisk": total_pop,
            "affectedPopulation": affected_pop,
            "peopleRequiringRelocation": total_pop - relocated_count,
            "relocatedCount": relocated_count,
            "redZonesCount": red_zones,
            "safeSitesCount": len(self.shelters),
            "totalCapacity": total_capacity,
            "occupiedCapacity": total_occupied,
            "availableCapacity": total_capacity - total_occupied,
            "surplusCapacity": surplus_capacity,
            "criticalAlertsCount": sum(1 for a in self.alerts if a["severity"] == "CRITICAL" and a["status"] == "ACTIVE"),
            "activeResponseTeams": 15,
            "systemStatus": "ONLINE",
            "hazardLevel": "HIGH (LEVEL 3)"
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
            "hazardZones": [
                {
                    "id": "ZONE-RED-1",
                    "center": [12.31, 76.62],
                    "radius": 2800,
                    "color": "#ef4444",
                    "label": "Red Zone Alpha - Kaveri Flash Flood Buffer",
                    "severity": "CRITICAL"
                },
                {
                    "id": "ZONE-RED-2",
                    "center": [12.28, 76.67],
                    "radius": 2200,
                    "color": "#f59e0b",
                    "label": "Red Zone Beta - Mudhall Landslide Vulnerability",
                    "severity": "HIGH"
                },
                {
                    "id": "ZONE-RED-3",
                    "center": [12.34, 76.65],
                    "radius": 1900,
                    "color": "#ef4444",
                    "label": "Red Zone Gamma - Lowland River Surge",
                    "severity": "CRITICAL"
                }
            ]
        }

    def get_relocation_priorities(self):
        sorted_habs = sorted(self.habitations, key=lambda x: x["riskScore"], reverse=True)
        return sorted_habs

    def get_relocation_workflow(self):
        return [
            { "stage": "Risk Identified", "count": 6, "status": "Completed" },
            { "stage": "Assessment", "count": 6, "status": "Completed" },
            { "stage": "Relocation Planned", "count": 5, "status": "Completed" },
            { "stage": "Transport Dispatch", "count": 4, "status": "In Progress" },
            { "stage": "Shelter Allocation", "count": 3, "status": "In Progress" },
            { "stage": "Relocation Completed", "count": 1, "status": "Active" }
        ]

    def get_shelters(self):
        return self.shelters

    def get_resources(self):
        return self.resources

    def get_alerts(self):
        return self.alerts

    def get_reports(self):
        return [
            {
                "id": "REP-2026-01",
                "title": "Daily Disaster Risk & Relocation Summary",
                "date": "2026-09-27",
                "author": "SIH Emergency Control Operations",
                "summary": "Full multi-hazard assessment covering Kaveri Basin & Mudhall Ridge Red Zones.",
                "downloadUrl": "/reports/REP-2026-01.pdf"
            },
            {
                "id": "REP-2026-02",
                "title": "Shelter Occupancy & Logistics Audit",
                "date": "2026-09-26",
                "author": "Relief Supply Logistics Team",
                "summary": "Capacity surplus of 770 beds verified across 4 high-ground shelters.",
                "downloadUrl": "/reports/REP-2026-02.pdf"
            }
        ]

    def assign_shelter(self, area_id, shelter_id):
        hab = self.get_risk_area_by_id(area_id)
        if not hab:
            return None
        hab["assignedShelterId"] = shelter_id
        hab["relocationStatus"] = "Assigned"
        return hab

    def update_relocation_status(self, area_id, status, progress=None):
        hab = self.get_risk_area_by_id(area_id)
        if not hab:
            return None
        hab["relocationStatus"] = status
        if progress is not None:
            hab["evacuationProgress"] = min(100, max(0, int(progress)))
        elif status.lower() == "completed":
            hab["evacuationProgress"] = 100
        elif status.lower() == "in progress":
            hab["evacuationProgress"] = max(hab["evacuationProgress"], 50)
        return hab

# Global Singleton Instance
data_service = DataService()
