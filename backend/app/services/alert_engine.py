"""
Alert Engine for the APEX SIH disaster intelligence backend.

This module evaluates existing habitations and their risk scores to deterministically
generate explainable operational alerts.
"""
import uuid
from typing import Any, Dict, List

def generate_alerts(habitations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    alerts = []
    
    for hab in habitations:
        risk_score = hab.get("riskScore", 0)
        risk_level = hab.get("riskLevel", "LOW")
        hazard_type = hab.get("hazardType", "").upper()
        hazard_details = hab.get("hazardDetails", {})
        
        # Rule 1: Critical Risk
        if risk_score >= 85 or risk_level == "CRITICAL":
            evidence = [
                f"Overall Risk Score is {risk_score}/100 (CRITICAL)",
                f"Hazard Level is {hab.get('hazardLevel', 'UNKNOWN')}"
            ]
            if "FLOOD" in hazard_type or hazard_details.get("floodRisk") == "CRITICAL":
                title = f"Flash Flood Critical Warning - {hab.get('region', 'Unknown Region')}"
                message = f"Immediate flood risk for {hab.get('name')}. Evacuation must be prioritized."
                recommended_action = "Immediate relocation assessment and dispatch of evacuation vehicles."
            elif "LANDSLIDE" in hazard_type or "SLOPE" in hazard_type or hazard_details.get("landslideRisk") == "CRITICAL":
                title = f"Critical Landslide Threat - {hab.get('region', 'Unknown Region')}"
                message = f"Severe slope instability detected at {hab.get('name')}. Road access may be compromised."
                recommended_action = "Clear debris and initiate immediate emergency evacuation."
            else:
                title = f"Critical Hazard Alert - {hab.get('region', 'Unknown Region')}"
                message = f"Severe hazard threat ({hab.get('hazardType')}) for {hab.get('name')}."
                recommended_action = "Initiate emergency response protocols."

            alerts.append({
                "id": f"ALT-{str(uuid.uuid4())[:8].upper()}",
                "severity": "CRITICAL",
                "type": "CRITICAL", # UI compatibility
                "title": title,
                "message": message,
                "hazardType": hab.get("hazardType"),
                "riskScore": risk_score,
                "affectedHabitations": [hab.get("id")],
                "area": hab.get("name"),
                "evidence": evidence,
                "recommendedAction": recommended_action,
                "status": "ACTIVE",
                "time": "Just now"
            })
            
        # Rule 2: High Risk
        elif risk_score >= 70 or risk_level == "HIGH":
            evidence = [
                f"Overall Risk Score is {risk_score}/100 (HIGH)",
                f"Population affected: {hab.get('affectedPopulation', 0)}"
            ]
            
            title = f"High Risk Advisory - {hab.get('region', 'Unknown Region')}"
            message = f"Elevated threat level for {hab.get('name')} due to {hab.get('hazardType')}."
            recommended_action = "Prepare resources for potential evacuation and monitor situation closely."
            
            alerts.append({
                "id": f"ALT-{str(uuid.uuid4())[:8].upper()}",
                "severity": "HIGH",
                "type": "WARNING", # UI compatibility uses WARNING for High in some cases
                "title": title,
                "message": message,
                "hazardType": hab.get("hazardType"),
                "riskScore": risk_score,
                "affectedHabitations": [hab.get("id")],
                "area": hab.get("name"),
                "evidence": evidence,
                "recommendedAction": recommended_action,
                "status": "ACTIVE",
                "time": "Just now"
            })
            
        # Rule 3: Missing/Blocked Road for Evacuation (Warning)
        road_cond = str(hab.get("roadCondition", "")).upper()
        if "BLOCKED" in road_cond or "RESTRICTED" in road_cond:
            # Check if we already added a critical alert for this
            if risk_score < 70:
                evidence = [
                    f"Road condition reported as: {hab.get('roadCondition')}",
                    f"Hazard type is {hab.get('hazardType')}"
                ]
                alerts.append({
                    "id": f"ALT-{str(uuid.uuid4())[:8].upper()}",
                    "severity": "WARNING",
                    "type": "WARNING",
                    "title": f"Logistics Warning - {hab.get('name')}",
                    "message": f"Evacuation routes compromised for {hab.get('name')}. Road condition: {hab.get('roadCondition')}.",
                    "hazardType": "Logistics",
                    "riskScore": risk_score,
                    "affectedHabitations": [hab.get("id")],
                    "area": hab.get("name"),
                    "evidence": evidence,
                    "recommendedAction": "Dispatch engineering/clearing teams to secure routes.",
                    "status": "ACTIVE",
                    "time": "Just now"
                })

    return alerts
