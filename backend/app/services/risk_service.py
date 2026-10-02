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


def classify_rainfall_intensity(value: float) -> str:
    """Classify 24-hour accumulated rainfall (mm) using standard IMD intensity bands."""
    if value < 2.5:
        return "VERY_LIGHT"
    elif value <= 15.5:
        return "LIGHT"
    elif value <= 64.4:
        return "MODERATE"
    elif value <= 115.5:
        return "HEAVY"
    elif value <= 204.4:
        return "VERY_HEAVY"
    else:
        return "EXTREMELY_HEAVY"


def interpret_observation(obs: dict[str, Any]) -> dict[str, Any]:
    """Convert a raw observation into a source-attributed, interpreted environmental evidence item.

    Maintains complete provenance without producing arbitrary numeric risk scores.
    """
    if not isinstance(obs, dict):
        return {}

    param = (obs.get("parameter_name") or obs.get("parameterName") or "").strip()
    raw_val = (
        obs.get("parameter_value")
        if obs.get("parameter_value") is not None
        else obs.get("parameterValue")
    )
    unit = obs.get("parameter_unit") or obs.get("parameterUnit") or ""

    base = {
        "id": obs.get("id"),
        "station_name": obs.get("station_name") or obs.get("stationName"),
        "district": obs.get("district"),
        "river_basin": obs.get("river_basin") or obs.get("riverBasin"),
        "lat": obs.get("lat"),
        "lng": obs.get("lng"),
        "parameter": param,
        "observed_value": raw_val,
        "unit": unit,
        "source_name": obs.get("source_name") or obs.get("sourceName"),
        "source_url": obs.get("source_url") or obs.get("sourceUrl"),
        "source_dataset": obs.get("source_dataset") or obs.get("sourceDataset"),
        "source_type": obs.get("source_type") or obs.get("sourceType"),
        "data_status": obs.get("data_status") or obs.get("dataStatus") or "REAL",
        "observation_time": obs.get("observation_time") or obs.get("observationTime"),
    }

    if param == "RAINFALL_24H_MM":
        val_float = _coerce_float(raw_val, 0.0)
        base.update({
            "evidence_type": "REAL_OBSERVATION",
            "interpretation": classify_rainfall_intensity(val_float),
            "interpretation_source": "IMD",
            "interpretation_status": "INTERPRETED_INTENSITY",
        })
    elif param == "RIVER_STAGE_M":
        base.update({
            "evidence_type": "REAL_OBSERVATION",
            "interpretation": "STAGE_MONITORED",
            "interpretation_source": "CWC",
            "interpretation_status": "THRESHOLD_METADATA_REQUIRED",
            "note": "Quantitative threshold comparison unavailable; local Gauge Zero MSL height metadata required.",
        })
    elif param == "RESERVOIR_INFLOW_CUSECS":
        base.update({
            "evidence_type": "REAL_OBSERVATION",
            "interpretation": "INFLOW_MONITORED",
            "interpretation_source": "CWC",
            "interpretation_status": "CONTEXT_ONLY",
            "note": "Volumetric inflow rate reported without static capacity thresholds.",
        })
    elif param == "TERRAIN_ELEVATION_M":
        base.update({
            "evidence_type": "TOPOGRAPHIC_REFERENCE",
            "interpretation": "ELEVATION_BENCHMARK",
            "interpretation_source": "OSM_BHUVAN",
            "interpretation_status": "REFERENCE_ONLY",
            "note": "Elevation provides topographic reference; does not directly infer landslide risk.",
        })
    else:
        base.update({
            "evidence_type": "REAL_OBSERVATION",
            "interpretation": "UNCLASSIFIED",
            "interpretation_source": base.get("source_name", "UNKNOWN"),
            "interpretation_status": "RAW_VALUE",
        })

    return base


def interpret_observations(observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [interpret_observation(o) for o in observations if isinstance(o, dict)]


def get_environmental_signals(area: dict[str, Any], repo: Any = None) -> dict[str, Any]:
    """Retrieve real environmental observations for the district/region of a given habitation.

    Groups measurements by parameter and maintains full source provenance without
    altering baseline risk score calculation unless explicit, documented conversion rules exist.
    """
    if not isinstance(area, dict):
        return {
            "has_real_signals": False,
            "district": None,
            "observations_count": 0,
            "real_measurements": [],
            "interpreted_evidence": [],
            "summary": {},
        }

    district = area.get("district")
    if not district:
        return {
            "has_real_signals": False,
            "district": None,
            "observations_count": 0,
            "real_measurements": [],
            "interpreted_evidence": [],
            "summary": {},
        }

    if repo is None:
        try:
            from app.services.repository import repo as default_repo

            repo = default_repo
        except ImportError:
            repo = None

    if not repo or not hasattr(repo, "get_observations_by_district"):
        return {
            "has_real_signals": False,
            "district": district,
            "observations_count": 0,
            "real_measurements": [],
            "interpreted_evidence": [],
            "summary": {},
        }

    observations = repo.get_observations_by_district(district)
    real_obs = [
        o
        for o in observations
        if (o.get("data_status") == "REAL" or o.get("dataStatus") == "REAL")
    ]

    if not real_obs:
        return {
            "has_real_signals": False,
            "district": district,
            "observations_count": 0,
            "real_measurements": [],
            "interpreted_evidence": [],
            "summary": {},
        }

    rainfall_vals = [
        o.get("parameter_value")
        for o in real_obs
        if (o.get("parameter_name") or o.get("parameterName")) == "RAINFALL_24H_MM"
        and o.get("parameter_value") is not None
    ]
    river_stage_vals = [
        o.get("parameter_value")
        for o in real_obs
        if (o.get("parameter_name") or o.get("parameterName")) == "RIVER_STAGE_M"
        and o.get("parameter_value") is not None
    ]
    reservoir_inflow_vals = [
        o.get("parameter_value")
        for o in real_obs
        if (o.get("parameter_name") or o.get("parameterName"))
        == "RESERVOIR_INFLOW_CUSECS"
        and o.get("parameter_value") is not None
    ]
    elevation_vals = [
        o.get("parameter_value")
        for o in real_obs
        if (o.get("parameter_name") or o.get("parameterName"))
        == "TERRAIN_ELEVATION_M"
        and o.get("parameter_value") is not None
    ]

    summary: dict[str, Any] = {}
    if rainfall_vals:
        summary["max_rainfall_24h_mm"] = max(rainfall_vals)
    if river_stage_vals:
        summary["max_river_stage_m"] = max(river_stage_vals)
    if reservoir_inflow_vals:
        summary["max_reservoir_inflow_cusecs"] = max(reservoir_inflow_vals)
    if elevation_vals:
        summary["max_elevation_m"] = max(elevation_vals)

    interpreted_evidence = interpret_observations(real_obs)

    return {
        "has_real_signals": True,
        "district": district,
        "observations_count": len(real_obs),
        "real_measurements": real_obs,
        "interpreted_evidence": interpreted_evidence,
        "summary": summary,
    }


def enrich_area_risk(area: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of the area with calculated risk metadata appended without removing existing fields."""
    if not isinstance(area, dict):
        return area

    enriched = dict(area)
    risk_summary = calculate_risk(enriched)
    signals = get_environmental_signals(enriched)

    enriched["risk_score"] = risk_summary["risk_score"]
    enriched["risk_level"] = risk_summary["risk_level"]
    enriched["riskScore"] = risk_summary["risk_score"]
    enriched["riskLevel"] = risk_summary["risk_level"]
    enriched["environmental_signals"] = signals
    enriched["environmentalSignals"] = signals
    enriched["risk_assessment"] = {
        "risk_score": risk_summary["risk_score"],
        "risk_level": risk_summary["risk_level"],
        "contributing_factors": risk_summary["contributing_factors"],
        "factor_scores": risk_summary["factor_scores"],
        "environmental_signals": signals,
    }
    return enriched


def enrich_areas(areas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [enrich_area_risk(area) for area in areas]

