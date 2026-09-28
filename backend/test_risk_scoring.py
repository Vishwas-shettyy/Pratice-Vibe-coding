#!/usr/bin/env python3
"""Phase 3 Pass 1 Risk Scoring Verification Test Suite"""

from app import create_app
from app.services.risk_service import calculate_risk

print("=" * 100)
print("PHASE 3 PASS 1 — RISK SCORING VERIFICATION")
print("=" * 100)

app = create_app()
client = app.test_client()

print("\n1. ACTUAL API RESPONSES FOR ALL 6 HABITATIONS:")
print("-" * 100)

resp = client.get("/api/risk-areas")
areas = resp.get_json()["data"]

print(
    f"{'id':<10} {'riskScore':<12} {'riskLevel':<12} {'severity':<10} {'exposure':<10} {'vulnerability':<12} {'indicators':<10} {'constraint':<10}"
)
print("-" * 100)
for area in areas:
    rs = area.get("riskScore")
    rl = area.get("riskLevel")
    fs = area.get("risk_assessment", {}).get("factor_scores", {})
    print(
        f"{area.get('id'):<10} {rs:<12} {rl:<12} {fs.get('hazard_severity', 0):<10.1f} {fs.get('population_exposure', 0):<10.1f} {fs.get('vulnerability', 0):<12.1f} {fs.get('hazard_indicators', 0):<10.1f} {fs.get('evacuation_constraints', 0):<10.1f}"
    )

print("\n2. WEIGHTED FORMULA (35-25-20-15-5):")
print("-" * 100)
for area in areas:
    fs = area.get("risk_assessment", {}).get("factor_scores", {})
    sev = fs.get("hazard_severity", 0)
    exp = fs.get("population_exposure", 0)
    vuln = fs.get("vulnerability", 0)
    ind = fs.get("hazard_indicators", 0)
    con = fs.get("evacuation_constraints", 0)
    weighted = (sev * 0.35) + (exp * 0.25) + (vuln * 0.20) + (ind * 0.15) + (con * 0.05)
    print(
        f"{area.get('id')}: ({sev}*0.35 + {exp}*0.25 + {vuln}*0.20 + {ind}*0.15 + {con}*0.05) = {weighted:.1f} → {area.get('riskScore')}"
    )

print("\n3. THRESHOLD CLASSIFICATION:")
print("-" * 100)
print("LOW: 0-39, MODERATE: 40-69, HIGH: 70-84, CRITICAL: 85-100")
for area in areas:
    rs = area.get("riskScore")
    rl = area.get("riskLevel")
    expected_level = (
        "CRITICAL"
        if rs >= 85
        else ("HIGH" if rs >= 70 else ("MODERATE" if rs >= 40 else "LOW"))
    )
    status = "✓" if rl == expected_level else "✗ MISMATCH"
    print(f"{area.get('id')}: score={rs} level={rl} expected={expected_level} {status}")

print("\n4. EDGE-CASE TESTS:")
print("-" * 100)

test_cases = [
    (
        "LOW_RISK",
        {
            "population": 100,
            "affectedPopulation": 10,
            "elderly": 5,
            "children": 8,
            "medicalPriority": 2,
            "hazardType": "Wind Gust & Runoff",
            "hazardLevel": "LOW",
            "distanceToShelterKm": 0.5,
            "roadCondition": "CLEAR",
            "evacuationProgress": 100,
            "hazardDetails": {"floodRisk": "LOW", "landslideRisk": "LOW"},
        },
    ),
    (
        "MODERATE_RISK",
        {
            "population": 300,
            "affectedPopulation": 240,
            "elderly": 50,
            "children": 78,
            "medicalPriority": 12,
            "hazardType": "Heavy Runoff",
            "hazardLevel": "Short-term",
            "distanceToShelterKm": 3.1,
            "roadCondition": "Clear",
            "evacuationProgress": 45,
            "hazardDetails": {"floodRisk": "HIGH", "landslideRisk": "LOW"},
        },
    ),
    (
        "HIGH_RISK",
        {
            "population": 450,
            "affectedPopulation": 390,
            "elderly": 85,
            "children": 110,
            "medicalPriority": 18,
            "hazardType": "Slope Failure & Landslide",
            "hazardLevel": "Immediate",
            "distanceToShelterKm": 6.8,
            "roadCondition": "Debris Blocked (Eng. Team Deployed)",
            "evacuationProgress": 20,
            "hazardDetails": {"floodRisk": "MODERATE", "landslideRisk": "CRITICAL"},
        },
    ),
    (
        "CRITICAL_RISK",
        {
            "population": 680,
            "affectedPopulation": 610,
            "elderly": 140,
            "children": 195,
            "medicalPriority": 42,
            "hazardType": "Flash Flood & Inundation",
            "hazardLevel": "IMMEDIATE",
            "distanceToShelterKm": 4.2,
            "roadCondition": "Passable (4WD / Buses)",
            "evacuationProgress": 65,
            "hazardDetails": {"floodRisk": "CRITICAL", "landslideRisk": "LOW"},
        },
    ),
    (
        "MISSING_HAZARD_DETAILS",
        {
            "population": 200,
            "affectedPopulation": 180,
            "elderly": 30,
            "children": 50,
            "medicalPriority": 8,
            "hazardType": "Unknown",
            "hazardLevel": "MEDIUM",
            "distanceToShelterKm": 2.0,
            "roadCondition": "Clear",
            "evacuationProgress": 50,
            "hazardDetails": {},
        },
    ),
    ("MINIMAL_INPUT", {"population": 50, "hazardType": "Wind", "hazardLevel": "LOW"}),
    ("EMPTY_INPUT", {}),
]

for name, test_input in test_cases:
    result = calculate_risk(test_input)
    print(
        f"{name:<30} → score={result['risk_score']:<3} level={result['risk_level']:<10} contributing={result['contributing_factors']}"
    )

print("\n5. BOUNDARY TESTS:")
print("-" * 100)

boundary_tests = [
    ("Just below 40", 39),
    ("Exactly 40", 40),
    ("Just above 40", 41),
    ("Just below 70", 69),
    ("Exactly 70", 70),
    ("Just above 70", 71),
    ("Just below 85", 84),
    ("Exactly 85", 85),
    ("Just above 85", 86),
]

for desc, score_val in boundary_tests:
    expected_level = (
        "CRITICAL"
        if score_val >= 85
        else ("HIGH" if score_val >= 70 else ("MODERATE" if score_val >= 40 else "LOW"))
    )
    print(f"{desc:<20} score={score_val:<3} → {expected_level}")

print("\n" + "=" * 100)
print("VERIFICATION COMPLETE")
print("=" * 100)
