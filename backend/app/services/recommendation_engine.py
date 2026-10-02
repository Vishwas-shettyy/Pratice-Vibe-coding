"""
Explainable Decision Recommendation Engine for the APEX SIH disaster intelligence backend.

Generates deterministic operational recommendations based on risk scores, resources, 
and evacuation conditions.
"""
import uuid
from typing import Any, Dict, List

def _get_shelter_by_id(shelters: List[Dict[str, Any]], shelter_id: str) -> Dict[str, Any]:
    for s in shelters:
        if s.get("id") == shelter_id or s.get("code") == shelter_id:
            return s
    return {}

def generate_recommendations(
    habitations: List[Dict[str, Any]], 
    shelters: List[Dict[str, Any]], 
    resources: Dict[str, Any]
) -> List[Dict[str, Any]]:
    
    recommendations = []
    
    for hab in habitations:
        risk_score = hab.get("riskScore", 0)
        risk_level = hab.get("riskLevel", "LOW")
        hab_status = (hab.get("relocationStatus") or "").lower()
        population = hab.get("affectedPopulation", 0) or hab.get("population", 0)
        medical = hab.get("medicalPriority", 0)
        road_cond = str(hab.get("roadCondition", "")).upper()
        
        # A & E: IMMEDIATE RELOCATION & MEDICAL PRIORITY
        if risk_score >= 70 and hab_status != "completed":
            priority = "CRITICAL" if risk_score >= 85 else "HIGH"
            if medical >= 20:
                priority = "CRITICAL"  # elevate due to medical
            
            evidence = [
                f"Risk Score is {risk_score}/100 ({risk_level})",
                f"Affected population: {population} residents",
                f"Current evacuation status: {hab.get('relocationStatus', 'Unknown')}"
            ]
            if medical > 0:
                evidence.append(f"Medical priority identified: {medical} patients require immediate care")
            
            recommendations.append({
                "id": f"REC-REL-{str(uuid.uuid4())[:8].upper()}",
                "priority": priority,
                "type": "RELOCATION",
                "title": f"Immediate Relocation Recommended - {hab.get('name')}",
                "area": hab.get('name'),
                "reason": f"High risk hazard ({hab.get('hazardType')}) threatens incomplete evacuation.",
                "evidence": evidence,
                "recommendedAction": "Dispatch evacuation fleet immediately.",
                "targetShelter": hab.get("assignedShelterId", "None"),
                "confidence": "HIGH",
                "sort_score": risk_score + (medical if medical >= 20 else 0)
            })
            
        # B. SHELTER CAPACITY
        assigned_shelter_id = hab.get("assignedShelterId")
        if risk_score >= 70 and assigned_shelter_id and hab_status != "completed":
            shelter = _get_shelter_by_id(shelters, assigned_shelter_id)
            if shelter:
                available = shelter.get("available", 0)
                if population > available:
                    evidence = [
                        f"Assigned shelter: {shelter.get('name')}",
                        f"Available capacity: {available} beds",
                        f"Required capacity: {population} residents"
                    ]
                    recommendations.append({
                        "id": f"REC-SHL-{str(uuid.uuid4())[:8].upper()}",
                        "priority": "HIGH",
                        "type": "SHELTER",
                        "title": f"Shelter Capacity Shortfall - {shelter.get('name')}",
                        "area": hab.get('name'),
                        "reason": f"Assigned shelter cannot accommodate the incoming population from {hab.get('name')}.",
                        "evidence": evidence,
                        "recommendedAction": "Reassign surplus population to an alternative high-ground shelter.",
                        "targetShelter": assigned_shelter_id,
                        "confidence": "HIGH",
                        "sort_score": 60 + risk_score
                    })
                    
        # D. ROAD / ROUTE RISK
        if "BLOCKED" in road_cond or "RESTRICTED" in road_cond:
            if hab_status != "completed":
                evidence = [
                    f"Road condition reported as: {hab.get('roadCondition')}",
                    f"Habitation: {hab.get('name')}"
                ]
                recommendations.append({
                    "id": f"REC-RTE-{str(uuid.uuid4())[:8].upper()}",
                    "priority": "HIGH",
                    "type": "ROUTE",
                    "title": f"Route Review Required - {hab.get('name')}",
                    "area": hab.get('name'),
                    "reason": "Evacuation corridor is compromised, requiring engineering intervention.",
                    "evidence": evidence,
                    "recommendedAction": "Dispatch debris clearing units and calculate alternative routing.",
                    "targetShelter": "N/A",
                    "confidence": "HIGH",
                    "sort_score": 50 + risk_score
                })
                
        # F. MONITORING
        if 40 <= risk_score < 70 and hab_status != "in progress":
            evidence = [
                f"Risk Score is {risk_score}/100 ({risk_level})",
                f"Hazard type: {hab.get('hazardType')}"
            ]
            recommendations.append({
                "id": f"REC-MON-{str(uuid.uuid4())[:8].upper()}",
                "priority": "MEDIUM",
                "type": "MONITORING",
                "title": f"Active Monitoring - {hab.get('name')}",
                "area": hab.get('name'),
                "reason": "Moderate threat detected. Situation may escalate based on weather patterns.",
                "evidence": evidence,
                "recommendedAction": "Deploy localized sensors and place rapid response teams on standby.",
                "targetShelter": "N/A",
                "confidence": "MEDIUM",
                "sort_score": risk_score
            })
            
    # C. RESOURCE SHORTAGE
    # Calculate requirements dynamically from habitations
    required_buses = 0
    required_ambulances = 0
    for hab in habitations:
        if str(hab.get("relocationStatus", "")).lower() != "completed":
            pop = hab.get("population") or 0
            med = hab.get("medicalPriority") or 0
            required_buses += (pop // 50) + (1 if pop % 50 > 0 else 0)
            required_ambulances += (med // 4) + (1 if med % 4 > 0 else 0)
            
    vehicles = resources.get("emergencyVehicles", {})
    available_buses = vehicles.get("buses", 0)
    available_ambulances = vehicles.get("ambulances", 0)
    
    if available_buses < required_buses:
        recommendations.append({
            "id": f"REC-RES-B-{str(uuid.uuid4())[:8].upper()}",
            "priority": "CRITICAL",
            "type": "RESOURCE",
            "title": "Bus Fleet Shortage",
            "area": "District Wide",
            "reason": "Active evacuation requirements exceed available transport capacity.",
            "evidence": [f"Evacuation buses: {available_buses} available vs {required_buses} required."],
            "recommendedAction": "Mobilize reserve transit fleet or request neighboring district support.",
            "targetShelter": "N/A",
            "confidence": "HIGH",
            "sort_score": 95
        })
        
    if available_ambulances < required_ambulances:
        recommendations.append({
            "id": f"REC-RES-A-{str(uuid.uuid4())[:8].upper()}",
            "priority": "CRITICAL",
            "type": "RESOURCE",
            "title": "Ambulance Fleet Shortage",
            "area": "District Wide",
            "reason": "Medical evacuation requirements exceed available specialized transport.",
            "evidence": [f"Ambulances: {available_ambulances} available vs {required_ambulances} required."],
            "recommendedAction": "Deploy standby medical teams and triage field clinics immediately.",
            "targetShelter": "N/A",
            "confidence": "HIGH",
            "sort_score": 96
        })
        
    # Sort deterministically
    recommendations.sort(key=lambda x: x.get("sort_score", 0), reverse=True)
    
    # Clean up sort_score before returning
    for r in recommendations:
        if "sort_score" in r:
            del r["sort_score"]
            
    return recommendations
