"""
Risk assessment service for the APEX SIH disaster intelligence backend.

This module calculates a deterministic, explainable disaster risk score for an
existing habitation/area using only fields already present in the in-memory data
model. It intentionally avoids inventing new data or replacing the existing
riskScore/riskLevel fields that are already used by the frontend and API.
"""

from __future__ import annotations

from typing import Any

RISK_THRESHOLDS = {
    "LOW": 0,
    "MODERATE": 40,
    "HIGH": 70,
    "CRITICAL": 85,
}

HAZARD_LEVEL_MAP = {
    "IMMEDIATE": 90,
    "CRITICAL": 90,
    "SHORT-TERM": 70,
    "MEDIUM-TERM": 45,
    "MEDIUM": 45,
    "LOW": 20,
    "UNKNOWN": 0,
}

RISK_LABEL_MAP = {
    "LOW": 15,
    "MODERATE": 35,
    "MEDIUM": 35,
    "HIGH": 70,
    "CRITICAL": 90,
    "NEGLIGIBLE": 5,
    "UNKNOWN": 0,
}

ROAD_CONDITION_MAP = {
    "CLEAR": 10,
    "PASSABLE": 15,
    "SINGLE LANE PASSABLE": 30,
    "DEBRIS BLOCKED": 80,
    "ROAD ACCESS RESTRICTED": 90,
    "BLOCKED": 90,
    "UNKNOWN": 0,
}


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().upper()


def _normalize_key(value: Any) -> str:
    text = _safe_string(value)
    if not text:
        return ""
    normalized = "".join(ch for ch in text if ch.isalnum() or ch == " ")
    return " ".join(normalized.split())


def _resolve_road_condition(value: Any) -> int:
    packed = _normalize_key(value)
    if not packed:
        return 0

    if "PASSABLE" in packed:
        if "SINGLE LANE" in packed or "ONE LANE" in packed:
            return ROAD_CONDITION_MAP["SINGLE LANE PASSABLE"]
        return ROAD_CONDITION_MAP["PASSABLE"]
    if "DEBRIS" in packed or "BLOCKED" in packed:
        return ROAD_CONDITION_MAP["DEBRIS BLOCKED"]
    if "RESTRICTED" in packed or "ACCESS" in packed:
        return ROAD_CONDITION_MAP["ROAD ACCESS RESTRICTED"]
    if "CLEAR" in packed:
        return ROAD_CONDITION_MAP["CLEAR"]
    return ROAD_CONDITION_MAP.get(packed, 0)


def _normalize_percent(
    value: float, minimum: float = 0.0, maximum: float = 100.0
) -> float:
    if maximum <= minimum:
        return 0.0
    return max(0.0, min(100.0, ((value - minimum) / (maximum - minimum)) * 100))


def _determine_risk_level(score: float) -> str:
    if score >= RISK_THRESHOLDS["CRITICAL"]:
        return "CRITICAL"
    if score >= RISK_THRESHOLDS["HIGH"]:
        return "HIGH"
    if score >= RISK_THRESHOLDS["MODERATE"]:
        return "MODERATE"
    return "LOW"


def _severity_factor(area: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    hazard_level = _safe_string(area.get("hazardLevel"))
    hazard_type = _safe_string(area.get("hazardType"))

    base_score = HAZARD_LEVEL_MAP.get(hazard_level, 0)

    keyword_bias = 0.0
    if "FLOOD" in hazard_type:
        keyword_bias = 12
    if "LANDSLIDE" in hazard_type or "SLOPE" in hazard_type:
        keyword_bias = 13
    if "ROCKFALL" in hazard_type or "SURGE" in hazard_type:
        keyword_bias = 11
    if "WIND" in hazard_type:
        keyword_bias = 6

    score = max(0.0, min(100.0, base_score + keyword_bias))
    return score, {
        "hazard_level": hazard_level or "UNKNOWN",
        "hazard_type": area.get("hazardType") or "UNKNOWN",
        "score": round(score, 1),
    }


def _population_exposure_factor(area: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    population = max(1, _coerce_float(area.get("population"), 0.0))
    affected_population = _coerce_float(area.get("affectedPopulation"), 0.0)
    ratio = (affected_population / population) * 100 if population > 0 else 0.0
    score = min(100.0, ratio * 1.2)
    return score, {
        "affected_population": int(affected_population),
        "population": int(population),
        "score": round(score, 1),
    }


def _vulnerability_factor(area: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    population = max(1, _coerce_float(area.get("population"), 0.0))
    elderly = _coerce_float(area.get("elderly"), 0.0)
    children = _coerce_float(area.get("children"), 0.0)
    medical_priority = _coerce_float(area.get("medicalPriority"), 0.0)

    vulnerable_weight = elderly + children + (medical_priority * 2.0)
    score = min(100.0, (vulnerable_weight / population) * 100.0)
    return score, {
        "elderly": int(elderly),
        "children": int(children),
        "medical_priority": int(medical_priority),
        "score": round(score, 1),
    }


def _hazard_indicator_factor(area: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    hazard_details = area.get("hazardDetails") or {}
    flood_risk = _safe_string(hazard_details.get("floodRisk"))
    landslide_risk = _safe_string(hazard_details.get("landslideRisk"))

    indicator_scores: list[float] = []
    labels: list[str] = []

    for key_name, value in {
        "flood_risk": flood_risk,
        "landslide_risk": landslide_risk,
    }.items():
        if value:
            indicator_scores.append(RISK_LABEL_MAP.get(value, 0))
            labels.append(key_name)

    if not indicator_scores:
        return 0.0, {"hazard_details": "not_available", "score": 0.0}

    score = sum(indicator_scores) / len(indicator_scores)
    return score, {"sources": labels, "score": round(score, 1)}


def _evacuation_constraint_factor(area: dict[str, Any]) -> tuple[float, dict[str, Any]]:
    distance_km = _coerce_float(area.get("distanceToShelterKm"), 0.0)
    road_condition = _normalize_key(area.get("roadCondition"))
    evacuation_progress = _coerce_float(area.get("evacuationProgress"), 0.0)

    distance_score = min(100.0, distance_km * 12.0)
    road_score = _resolve_road_condition(road_condition)

    progress_penalty = max(0.0, (100.0 - evacuation_progress) * 0.4)
    score = min(100.0, (distance_score * 0.5) + (road_score * 0.5) + progress_penalty)
    return score, {
        "distance_to_shelter_km": round(distance_km, 1),
        "road_condition": area.get("roadCondition") or "UNKNOWN",
        "evacuation_progress": round(evacuation_progress, 1),
        "score": round(score, 1),
    }


def calculate_risk(area: dict[str, Any]) -> dict[str, Any]:
    """Calculate a deterministic disaster risk score and explain the factors."""
    if not isinstance(area, dict) or not area:
        return {
            "risk_score": 0,
            "risk_level": "LOW",
            "contributing_factors": [],
            "factor_scores": {},
        }

    severity_score, severity_meta = _severity_factor(area)
    exposure_score, exposure_meta = _population_exposure_factor(area)
    vulnerability_score, vulnerability_meta = _vulnerability_factor(area)
    indicator_score, indicator_meta = _hazard_indicator_factor(area)
    constraint_score, constraint_meta = _evacuation_constraint_factor(area)

    weighted_score = (
        (severity_score * 0.35)
        + (exposure_score * 0.25)
        + (vulnerability_score * 0.20)
        + (indicator_score * 0.15)
        + (constraint_score * 0.05)
    )

    final_score = max(0.0, min(100.0, round(weighted_score, 1)))
    risk_level = _determine_risk_level(final_score)

    contributing_factors = [
        factor
        for factor, value in {
            "hazard_severity": severity_score,
            "population_exposure": exposure_score,
            "vulnerability": vulnerability_score,
            "hazard_indicators": indicator_score,
            "evacuation_constraints": constraint_score,
        }.items()
        if value >= 30
    ]

    return {
        "risk_score": int(final_score),
        "risk_level": risk_level,
        "contributing_factors": contributing_factors,
        "factor_scores": {
            "hazard_severity": round(severity_score, 1),
            "population_exposure": round(exposure_score, 1),
            "vulnerability": round(vulnerability_score, 1),
            "hazard_indicators": round(indicator_score, 1),
            "evacuation_constraints": round(constraint_score, 1),
        },
        "factor_meta": {
            "hazard_severity": severity_meta,
            "population_exposure": exposure_meta,
            "vulnerability": vulnerability_meta,
            "hazard_indicators": indicator_meta,
            "evacuation_constraints": constraint_meta,
        },
    }


def enrich_area_risk(area: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of the area with calculated risk metadata appended without removing existing fields."""
    if not isinstance(area, dict):
        return area

    enriched = dict(area)
    risk_summary = calculate_risk(enriched)

    enriched["risk_score"] = risk_summary["risk_score"]
    enriched["risk_level"] = risk_summary["risk_level"]
    enriched["riskScore"] = risk_summary["risk_score"]
    enriched["riskLevel"] = risk_summary["risk_level"]
    enriched["risk_assessment"] = {
        "risk_score": risk_summary["risk_score"],
        "risk_level": risk_summary["risk_level"],
        "contributing_factors": risk_summary["contributing_factors"],
        "factor_scores": risk_summary["factor_scores"],
    }
    return enriched


def enrich_areas(areas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [enrich_area_risk(area) for area in areas]
