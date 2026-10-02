from datetime import datetime, timezone
from app.services.repository import repo

SCENARIO_ID = "KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO"

class SafeSiteService:
    def __init__(self, repository=None):
        self.repo = repository or repo
        
    def initialize_deterministic_operations(self):
        facilities = self.repo.get_all_facilities()
        count = 0
        for facility in facilities:
            op = self.calculate_deterministic_suitability(facility)
            self.repo.upsert_safe_site_operation(op)
            count += 1
        return count
        
    def calculate_deterministic_suitability(self, facility):
        f_type = facility.get("facility_type", "UNKNOWN")
        
        # Deterministic capacity assumptions (SCENARIO values)
        capacity = 50
        if f_type == "SCHOOL":
            capacity = 200
        elif f_type == "COLLEGE":
            capacity = 500
        elif f_type == "COMMUNITY_CENTRE":
            capacity = 300
        elif f_type == "HOSPITAL":
            capacity = 100
            
        occupancy = 0
        available_capacity = capacity - occupancy
        
        # Resource assumptions
        water_ready = (f_type in ["SCHOOL", "COLLEGE", "HOSPITAL"])
        food_ready = (f_type in ["COMMUNITY_CENTRE", "HOSPITAL"])
        medical_ready = (f_type == "HOSPITAL")
        power_ready = (f_type in ["HOSPITAL", "COLLEGE"])
        
        accessibility_status = "ACCESSIBLE"
        operational_status = "ACTIVE"
        
        # Score calculation
        score = 0.0
        reason_parts = []
        
        if operational_status == "ACTIVE":
            score += 30
            reason_parts.append("Status is ACTIVE (+30)")
        else:
            reason_parts.append("Status is not active (0)")
            
        if available_capacity > 100:
            score += 30
            reason_parts.append(f"Capacity > 100 (+30)")
        elif available_capacity > 0:
            score += 15
            reason_parts.append(f"Capacity > 0 (+15)")
        else:
            reason_parts.append("No capacity (0)")
            
        if water_ready:
            score += 10
            reason_parts.append("Water ready (+10)")
        if food_ready:
            score += 10
            reason_parts.append("Food ready (+10)")
        if medical_ready:
            score += 10
            reason_parts.append("Medical ready (+10)")
        if power_ready:
            score += 10
            reason_parts.append("Power ready (+10)")
            
        if score >= 80:
            suitability_level = "SUITABLE"
        elif score >= 50:
            suitability_level = "CONDITIONAL"
        else:
            suitability_level = "UNSUITABLE"
            
        now = datetime.now(timezone.utc).isoformat()
        return {
            "id": f"op_{facility['id']}",
            "facility_id": facility["id"],
            "operational_status": operational_status,
            "capacity": capacity,
            "occupancy": occupancy,
            "available_capacity": available_capacity,
            "water_ready": water_ready,
            "food_ready": food_ready,
            "medical_ready": medical_ready,
            "power_ready": power_ready,
            "accessibility_status": accessibility_status,
            "suitability_score": score,
            "suitability_level": suitability_level,
            "assessment_reason": " | ".join(reason_parts),
            "data_status": "SCENARIO",
            "scenario_id": SCENARIO_ID,
            "created_at": now,
            "updated_at": now
        }
        
    def get_all_safe_sites(self):
        ops = self.repo.get_all_safe_site_operations()
        facs = {f["id"]: f for f in self.repo.get_all_facilities()}
        
        results = []
        for op in ops:
            f = facs.get(op["facility_id"])
            if f:
                # Merge logic to distinguish REAL and SCENARIO data cleanly in response
                results.append({
                    "facility": f,
                    "operations": op
                })
        return results

    def get_safe_site(self, facility_id):
        all_sites = self.get_all_safe_sites()
        for s in all_sites:
            if s["facility"]["id"] == facility_id:
                return s
        return None

safe_site_service = SafeSiteService()
