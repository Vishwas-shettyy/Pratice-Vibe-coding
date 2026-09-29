"""
Explainable Simulation Impact Engine for the APEX SIH disaster intelligence backend.
"""
import uuid
from typing import Any, Dict, List

def calculate_simulation_impact(
    rainfall: float,
    slope_instability: float,
    river_level: float,
    habitations: List[Dict[str, Any]],
    shelters: List[Dict[str, Any]],
    resources: Dict[str, Any]
) -> Dict[str, Any]:
    
    affected_habitations = []
    
    # 1-3. Calculate projected habitation risks
    for hab in habitations:
        base_score = hab.get("riskScore", 0)
        hazard_type = (hab.get("hazardType") or "").lower()
        
        # Calculate modifiers based on hazard types
        rain_mod = 0
        if any(h in hazard_type for h in ["flash flood", "heavy runoff", "river overflow", "inundation", "runoff"]):
            # For every 10mm of rainfall above 50mm, add 2 to risk
            # For every 10mm below 50mm, subtract 1
            rain_mod = (rainfall - 50) * 0.2

        slope_mod = 0
        if any(h in hazard_type for h in ["slope failure", "landslide", "rockfall", "flash surge"]):
            # For every 10% above 30%, add 3 to risk
            slope_mod = (slope_instability - 30) * 0.3
            
        river_mod = 0
        if any(h in hazard_type for h in ["river overflow", "flash flood", "inundation", "heavy runoff", "runoff"]):
            # For every 0.5m above 2.0m, add 5 to risk
            river_mod = (river_level - 2.0) * 10.0
            
        total_mod = rain_mod + slope_mod + river_mod
        
        projected_score = max(0, min(100, int(base_score + total_mod)))
        
        if projected_score >= 85:
            projected_level = "CRITICAL"
        elif projected_score >= 70:
            projected_level = "HIGH"
        elif projected_score >= 40:
            projected_level = "MODERATE"
        else:
            projected_level = "LOW"
            
        affected_habitations.append({
            "id": hab.get("id"),
            "name": hab.get("name"),
            "baselineRisk": base_score,
            "projectedRisk": projected_score,
            "riskChange": projected_score - base_score,
            "projectedLevel": projected_level,
            "population": hab.get("affectedPopulation", hab.get("population", 0)),
            "medicalPriority": hab.get("medicalPriority", 0),
            "evacuationStatus": hab.get("relocationStatus", "Unknown"),
            "hazardType": hab.get("hazardType", ""),
            "roadCondition": hab.get("roadCondition", ""),
            "assignedShelterId": hab.get("assignedShelterId")
        })
        
    # Average Risk Index
    total_risk = sum(h["projectedRisk"] for h in affected_habitations)
    risk_index = total_risk // len(affected_habitations) if affected_habitations else 0
    
    threat_level = "LOW"
    if risk_index >= 80:
        threat_level = "CRITICAL"
    elif risk_index >= 65:
        threat_level = "HIGH"
    elif risk_index >= 40:
        threat_level = "MODERATE"
        
    # 5. Shelter Impact
    total_capacity = sum(s.get("capacity", 0) for s in shelters)
    available_beds = sum(s.get("available", 0) for s in shelters)
    
    # Calculate required capacity based on habitations that need relocation
    projected_relocation_pop = 0
    for h in affected_habitations:
        if h["projectedRisk"] >= 70 and str(h["evacuationStatus"]).lower() != "completed":
            projected_relocation_pop += h["population"]
            
    capacity_diff = available_beds - projected_relocation_pop
    
    shelter_impact = {
        "totalNetworkCapacity": total_capacity,
        "availableBeds": available_beds,
        "projectedRequiredCapacity": projected_relocation_pop,
        "capacitySurplus": capacity_diff if capacity_diff >= 0 else 0,
        "capacityShortfall": -capacity_diff if capacity_diff < 0 else 0
    }
    
    # 6. Resource Impact
    required_buses = 0
    required_ambulances = 0
    for h in affected_habitations:
        if h["projectedRisk"] >= 70 and str(h["evacuationStatus"]).lower() != "completed":
            required_buses += (h["population"] // 50) + (1 if h["population"] % 50 > 0 else 0)
            required_ambulances += (h["medicalPriority"] // 4) + (1 if h["medicalPriority"] % 4 > 0 else 0)
            
    vehicles = resources.get("emergencyVehicles", {})
    available_buses = vehicles.get("buses", 0)
    available_ambulances = vehicles.get("ambulances", 0)
    
    bus_diff = available_buses - required_buses
    amb_diff = available_ambulances - required_ambulances
    
    resource_impact = {
        "requiredBuses": required_buses,
        "requiredAmbulances": required_ambulances,
        "availableBuses": available_buses,
        "availableAmbulances": available_ambulances,
        "busShortfall": -bus_diff if bus_diff < 0 else 0,
        "ambulanceShortfall": -amb_diff if amb_diff < 0 else 0
    }
    
    # 7. Route Impact
    route_impact = {
        "affectedRoutes": []
    }
    for h in affected_habitations:
        if h["projectedRisk"] >= 70 and str(h["evacuationStatus"]).lower() != "completed":
            road = str(h["roadCondition"]).upper()
            if "BLOCKED" in road or "RESTRICTED" in road:
                route_impact["affectedRoutes"].append({
                    "habitation": h["name"],
                    "condition": h["roadCondition"]
                })
                
    # 9. Recommendations
    recommendations = []
    
    for h in affected_habitations:
        status = str(h["evacuationStatus"]).lower()
        if h["projectedRisk"] >= 70 and status != "completed":
            prio = "CRITICAL" if h["projectedRisk"] >= 85 or h["medicalPriority"] >= 20 else "HIGH"
            recommendations.append({
                "id": f"SIM-REC-REL-{str(uuid.uuid4())[:8].upper()}",
                "priority": prio,
                "type": "RELOCATION",
                "title": f"Immediate Relocation - {h['name']}",
                "area": h["name"],
                "reason": f"Projected risk elevated to {h['projectedLevel']} due to simulated conditions.",
                "evidence": [
                    f"Projected Risk Score: {h['projectedRisk']}/100",
                    f"Affected Population: {h['population']} residents",
                ],
                "recommendedAction": "Dispatch evacuation fleet.",
                "targetShelter": h["assignedShelterId"] or "None",
                "confidence": "HIGH"
            })
            
    if shelter_impact["capacityShortfall"] > 0:
        recommendations.append({
            "id": f"SIM-REC-SHL-{str(uuid.uuid4())[:8].upper()}",
            "priority": "HIGH",
            "type": "SHELTER",
            "title": "Shelter Capacity Shortfall (Projected)",
            "area": "District Wide",
            "reason": "Projected relocations exceed available shelter beds.",
            "evidence": [
                f"Available beds: {shelter_impact['availableBeds']}",
                f"Required beds: {shelter_impact['projectedRequiredCapacity']}"
            ],
            "recommendedAction": "Identify supplementary shelter locations.",
            "targetShelter": "N/A",
            "confidence": "HIGH"
        })
        
    if resource_impact["busShortfall"] > 0:
        recommendations.append({
            "id": f"SIM-REC-RES-{str(uuid.uuid4())[:8].upper()}",
            "priority": "CRITICAL",
            "type": "RESOURCE",
            "title": "Bus Fleet Shortfall (Projected)",
            "area": "District Wide",
            "reason": "Projected evacuation transport needs exceed available fleet.",
            "evidence": [
                f"Available buses: {resource_impact['availableBuses']}",
                f"Required buses: {resource_impact['requiredBuses']}"
            ],
            "recommendedAction": "Mobilize reserve transit fleet.",
            "targetShelter": "N/A",
            "confidence": "HIGH"
        })
        
    # 8. Operational Summary
    high_risk_count = sum(1 for h in affected_habitations if h["projectedRisk"] >= 70)
    summary_parts = [f"Scenario projects elevated hazard exposure across {high_risk_count} habitations"]
    
    if shelter_impact["capacityShortfall"] > 0:
        summary_parts.append(f"with a shelter capacity shortfall of {shelter_impact['capacityShortfall']} beds")
    else:
        summary_parts.append("with sufficient shelter capacity")
        
    if resource_impact["busShortfall"] > 0 or resource_impact["ambulanceShortfall"] > 0:
        summary_parts.append("and a transport requirement exceeding available fleet.")
    else:
        summary_parts.append("and sufficient available transport resources.")
        
    summary = ", ".join(summary_parts[:2]) + " " + summary_parts[2]
    
    # Sort habitations by projected risk descending
    affected_habitations.sort(key=lambda x: x["projectedRisk"], reverse=True)
    
    return {
        "scenario": {
            "rainfall": rainfall,
            "slopeInstability": slope_instability,
            "riverLevel": river_level
        },
        "riskIndex": risk_index,
        "threatLevel": threat_level,
        "affectedHabitations": affected_habitations,
        "shelterImpact": shelter_impact,
        "resourceImpact": resource_impact,
        "routeImpact": route_impact,
        "operationalSummary": summary,
        "evidence": [
            f"Calculated average projected risk index: {risk_index}/100",
            f"Identified {high_risk_count} habitations crossing High/Critical risk threshold"
        ],
        "recommendations": recommendations
    }
