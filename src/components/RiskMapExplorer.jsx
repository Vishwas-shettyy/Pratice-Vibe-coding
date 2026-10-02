import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  CircleMarker,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const getRiskStyle = (riskLevel, riskScore = 0) => {
  const normalizedLevel = String(riskLevel ?? "LOW").trim().toUpperCase();

  if (normalizedLevel === "CRITICAL" || normalizedLevel === "IMMEDIATE") {
    return {
      color: "#ef4444",
      fillColor: "#dc2626",
      label: "CRITICAL",
      stroke: "#991b1b",
      radius: 12 + Math.min(riskScore / 10, 12),
    };
  }

  if (normalizedLevel === "HIGH" || normalizedLevel === "SHORT-TERM") {
    return {
      color: "#f59e0b",
      fillColor: "#d97706",
      label: "HIGH",
      stroke: "#92400e",
      radius: 10 + Math.min(riskScore / 12, 10),
    };
  }

  if (normalizedLevel === "MODERATE") {
    return {
      color: "#eab308",
      fillColor: "#ca8a04",
      label: "MODERATE",
      stroke: "#854d0e",
      radius: 8 + Math.min(riskScore / 14, 8),
    };
  }

  return {
    color: "#10b981",
    fillColor: "#059669",
    label: "LOW",
    stroke: "#065f46",
    radius: 7 + Math.min(riskScore / 20, 6),
  };
};

function RiskMapExplorer({
  habitations = [],
  safeSites = [],
  hazardZones = [],
  evacuationRoutes = [],
  environmentalObservations = [],
  simulationResult = null,
  onClearScenario,
  onSelectHabitation,
  onSelectShelter
}) {
  const [layers, setLayers] = useState({
    redZones: true,
    habitations: true,
    safeSites: true,
    routes: true,
    realObservations: true,
    scenarioSettlements: true,
    scenarioSafeSites: true,
    scenarioRoutes: true,
    scenarioRoadImpacts: true,
  });

  const safeHabitations = Array.isArray(habitations) ? habitations : [];
  const safeSafeSites = Array.isArray(safeSites) ? safeSites : [];
  const safeHazardZones = Array.isArray(hazardZones) ? hazardZones : [];
  const safeRoutes = Array.isArray(evacuationRoutes) ? evacuationRoutes : [];
  const safeObservations = Array.isArray(environmentalObservations) ? environmentalObservations : [];

  const isSimulated = !!simulationResult;
  const simRelocations = isSimulated && Array.isArray(simulationResult.relocations) ? simulationResult.relocations : [];
  
  // Extract unique facilities used in the simulation
  const simFacilitiesMap = {};
  if (isSimulated) {
    simRelocations.forEach(rel => {
      if (rel.recommended_site_id) {
        if (!simFacilitiesMap[rel.recommended_site_id]) {
          const matchedFac = safeSafeSites.find(f => f.id === rel.recommended_site_id);
          simFacilitiesMap[rel.recommended_site_id] = {
            ...rel,
            facDetails: matchedFac
          };
        }
      }
    });
  }
  const simFacilitiesList = Object.values(simFacilitiesMap);

  const center = [12.2958, 76.6394];

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const getRiskScore = (hab) => Number(hab?.riskScore ?? hab?.risk_score ?? hab?.risk_assessment?.risk_score ?? 0);
  const getRiskLevel = (hab) => String(hab?.riskLevel ?? hab?.risk_level ?? hab?.risk_assessment?.risk_level ?? "LOW");
  const getMainHazard = (hab) => String(hab?.hazardType ?? hab?.risk_assessment?.main_hazard ?? hab?.risk_assessment?.contributing_factors?.[0] ?? "Not specified");
  const getAssessmentSummary = (hab) => {
    const factors = Array.isArray(hab?.risk_assessment?.contributing_factors) ? hab.risk_assessment.contributing_factors : [];
    const factorScores = hab?.risk_assessment?.factor_scores || {};
    const scorePairs = Object.entries(factorScores).slice(0, 3);

    if (factors.length || scorePairs.length) {
      return [...scorePairs.map(([key, value]) => `${key.replace(/_/g, " ")}: ${Number(value).toFixed(1)}`), ...factors.slice(0, 2)].join(" • ");
    }

    return "Assessment available in the detail inspection modal.";
  };

  const getOccupancyText = (shelter) => {
    const occupied = Number(shelter?.occupied ?? 0);
    const capacity = Number(shelter?.capacity ?? 0);

    if (!capacity) return "Capacity unavailable";
    return `${occupied} / ${capacity} occupied (${Math.round((occupied / capacity) * 100)}%)`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 160px)" }}>
      {/* OPERATIONAL STATUS STRIP */}
      {(() => {
        const isHarsh = isSimulated && (simulationResult?.scenario?.id === "KODAGU_EXTREME_MONSOON_HARSH_CASE" || simulationResult?.scenario?.label === "HARSH CASE");
        return (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)", padding: "12px 20px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={isSimulated ? "pulse-red" : ""} style={{ width: "8px", height: "8px", borderRadius: "50%", background: isHarsh ? "var(--accent-critical)" : isSimulated ? "#a855f7" : "var(--accent-safe)", display: "inline-block" }}></span>
                <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-primary)" }}>
                  {isHarsh ? "HARSH CASE SCENARIO OVERLAY ACTIVE" : isSimulated ? "SCENARIO OVERLAY ACTIVE" : "MAP ENGINE ACTIVE"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--accent-critical)", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
                {safeHazardZones.length} RED ZONES
              </div>
              {isSimulated && (
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{ background: isHarsh ? "rgba(220, 38, 38, 0.1)" : "rgba(168, 85, 247, 0.1)", color: isHarsh ? "var(--accent-critical)" : "#a855f7", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
                    {simRelocations.length} {isHarsh ? "HARSH RELOCATIONS" : "SCENARIO RELOCATIONS"}
                  </div>
                  <button className="action-btn" onClick={onClearScenario} style={{ border: `1px solid ${isHarsh ? "var(--accent-critical)" : "#a855f7"}`, color: isHarsh ? "var(--accent-critical)" : "#a855f7", background: "transparent", padding: "4px 10px", fontSize: "11px" }}>
                    Exit Scenario
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{ flex: 1, minHeight: 0, position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)", background: "var(--bg-card)" }}>
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          {/* OPENSTREETMAP BASE LAYER */}
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* REAL HAZARD ZONES */}
          {layers.redZones && !isSimulated &&
            safeHazardZones.map((zone) => (
              <Circle
                key={zone.id}
                center={zone.center}
                radius={zone.radius}
                pathOptions={{
                  color: zone.severity === "CRITICAL" ? "#dc2626" : "#f59e0b",
                  fillColor: zone.severity === "CRITICAL" ? "#ef4444" : "#fcd34d",
                  fillOpacity: 0.15,
                  weight: 2,
                  dashArray: zone.severity === "CRITICAL" ? "4, 6" : "2, 8"
                }}
              />
            ))}

          {/* SCENARIO EVACUATION ROUTES */}
          {isSimulated && layers.scenarioRoutes && simRelocations.map((rel) => {
            if (rel.route_status !== "SUCCESS" || !rel.route_geometry || !rel.route_geometry.coordinates) return null;
            // leaflet expects [lat, lng], geojson is [lng, lat]
            const positions = rel.route_geometry.coordinates.map(coord => [coord[1], coord[0]]);
            const pColor = rel.priority === "CRITICAL" ? "#dc2626" : "#a855f7";
            return (
              <Polyline
                key={`route-${rel.id}`}
                positions={positions}
                pathOptions={{
                  color: pColor,
                  weight: 5,
                  dashArray: "8, 8",
                  opacity: 0.8
                }}
              >
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title" style={{ color: pColor }}>SCENARIO ROUTE</strong>
                    <div className="risk-popup-row">
                      <span>Priority:</span>
                      <strong>{rel.priority}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Distance:</span>
                      <strong>{(rel.route_distance_m / 1000).toFixed(2)} km</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Travel Time:</span>
                      <strong>{Math.round(rel.estimated_travel_time_min)} min</strong>
                    </div>
                    <div className="risk-popup-row" style={{ marginTop: "6px", fontStyle: "italic", color: "var(--text-muted)", fontSize: "10px" }}>
                      Data Status: {rel.data_status}
                    </div>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* SCENARIO ROAD IMPACTS */}
          {isSimulated && layers.scenarioRoadImpacts && Array.isArray(simulationResult.roadImpacts) && 
            simulationResult.roadImpacts.map((imp) => {
              if (imp.impact_status === "OPEN" || !imp.geometry || !imp.geometry.coordinates) return null;
              
              const isBlocked = imp.impact_status === "BLOCKED";
              const pColor = isBlocked ? "#dc2626" : "#f59e0b";
              
              let coords = [];
              if (imp.geometry.type === "MultiLineString") {
                coords = imp.geometry.coordinates.map(line => line.map(coord => [coord[1], coord[0]]));
              } else if (imp.geometry.type === "LineString") {
                coords = [imp.geometry.coordinates.map(coord => [coord[1], coord[0]])];
              } else {
                return null;
              }
                
              return coords.map((lineCoords, idx) => (
                <Polyline
                  key={`road-impact-${imp.id}-${idx}`}
                  positions={lineCoords}
                  pathOptions={{
                    color: pColor,
                    weight: isBlocked ? 4 : 3,
                    opacity: 0.8
                  }}
                >
                  <Popup className="risk-map-popup">
                    <div className="risk-popup-card">
                      <strong className="risk-popup-title" style={{ color: pColor }}>SCENARIO ROAD IMPACT</strong>
                      <div className="risk-popup-row">
                        <span>Status:</span>
                        <strong>{imp.impact_status}</strong>
                      </div>
                      <div className="risk-popup-row" style={{ marginTop: "6px", fontStyle: "italic", color: "var(--text-muted)", fontSize: "10px", lineHeight: "1.2" }}>
                        {imp.impact_reason}
                      </div>
                      <div className="risk-popup-row" style={{ marginTop: "6px", fontStyle: "italic", color: "var(--text-muted)", fontSize: "10px" }}>
                        Data Status: {imp.data_status}
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              ));
            })}

          {/* REAL EVACUATION ROUTES (Fallback if no simulation) */}
          {!isSimulated && layers.routes &&
            safeRoutes.map((route) => (
              <Polyline
                key={route.id}
                positions={route.positions}
                pathOptions={{ color: route.color || "#3b82f6", weight: 4, dashArray: "6, 6", opacity: 0.8 }}
              />
            ))}

          {/* SCENARIO SETTLEMENTS */}
          {isSimulated && layers.scenarioSettlements && simRelocations.map((rel) => {
            const hab = safeHabitations.find(h => h.id === rel.settlement_id);
            if (!hab) return null;
            const isCrit = rel.priority === "CRITICAL";
            
            return (
              <CircleMarker
                key={`scen-hab-${hab.id}`}
                center={[hab.lat, hab.lng]}
                radius={isCrit ? 14 : 10}
                pathOptions={{
                  color: isCrit ? "#991b1b" : "#854d0e",
                  fillColor: isCrit ? "#ef4444" : "#eab308",
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title" style={{ color: isCrit ? "#ef4444" : "#eab308" }}>{hab.name} (SCENARIO)</strong>
                    <div className="risk-popup-row">
                      <span>Exposure:</span>
                      <strong style={{ color: isCrit ? "#ef4444" : "#eab308" }}>{isCrit ? "HIGH" : "UNKNOWN"}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Relocation Priority:</span>
                      <strong>{rel.priority}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Route Status:</span>
                      <strong>{rel.route_status}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Destination:</span>
                      <strong>{rel.recommended_site_id ? rel.recommended_site_id : "None"}</strong>
                    </div>
                    <div className="risk-popup-row" style={{ marginTop: "6px", fontStyle: "italic", color: "var(--text-muted)", fontSize: "10px" }}>
                      Data Status: {rel.data_status}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* REAL SETTLEMENTS (Fallback if no simulation) */}
          {!isSimulated && layers.habitations &&
            safeHabitations.map((hab) => {
              const riskStyle = getRiskStyle(getRiskLevel(hab), getRiskScore(hab));
              return (
                <CircleMarker
                  key={hab.id}
                  center={[hab.lat, hab.lng]}
                  radius={riskStyle.radius}
                  pathOptions={{ color: riskStyle.stroke, fillColor: riskStyle.fillColor, fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup className="risk-map-popup">
                    <div className="risk-popup-card">
                      <strong className="risk-popup-title" style={{ color: riskStyle.color }}>{hab.name}</strong>
                      <div className="risk-popup-row">
                        <span>Risk Score:</span>
                        <strong style={{ color: riskStyle.color }}>{getRiskScore(hab)}/100</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Main Hazard:</span>
                        <strong>{getMainHazard(hab)}</strong>
                      </div>
                      <button className="action-btn" style={{ marginTop: "12px", width: "100%", justifyContent: "center" }} onClick={() => onSelectHabitation?.(hab)}>
                        Inspect Settlement
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* SCENARIO SAFE SITES */}
          {isSimulated && layers.scenarioSafeSites && simFacilitiesList.map((rel) => {
            if (!rel.facDetails) return null;
            const fac = rel.facDetails;
            return (
              <Marker key={`scen-fac-${fac.id}`} position={[fac.lat, fac.lng]}>
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title" style={{ color: "#a855f7" }}>{fac.name} (SCENARIO)</strong>
                    <div className="risk-popup-row">
                      <span>Recommended for:</span>
                      <strong>{rel.settlement_id}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Capacity Status:</span>
                      <strong>{rel.capacity_status === "UNKNOWN_REQUIREMENT (SCENARIO ASSUMPTION)" ? "Unknown Req" : rel.capacity_status}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Available Scenario Cap:</span>
                      <strong>{rel.available_capacity}</strong>
                    </div>
                    <div className="risk-popup-row" style={{ marginTop: "6px", fontStyle: "italic", color: "var(--text-muted)", fontSize: "10px" }}>
                      Data Status: {simulationResult?.scenario?.id === "KODAGU_EXTREME_MONSOON_HARSH_CASE" ? "HARSH CASE / SCENARIO" : rel.data_status}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* REAL SAFE SITES (Fallback if no simulation) */}
          {!isSimulated && layers.safeSites &&
            safeSafeSites.map((shelter) => (
              <Marker key={shelter.id} position={[shelter.lat, shelter.lng]}>
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title" style={{ color: "#10b981" }}>{shelter.name}</strong>
                    <div className="risk-popup-row">
                      <span>Capacity:</span>
                      <strong>{shelter.capacity}</strong>
                    </div>
                    <button className="action-btn primary" style={{ marginTop: "12px", width: "100%", justifyContent: "center" }} onClick={() => onSelectShelter?.(shelter)}>
                      Inspect Shelter Inventory
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* REAL ENVIRONMENTAL OBSERVATION MARKERS */}
          {layers.realObservations &&
            safeObservations.map((obs) => {
              const paramName = obs.parameter_name || obs.parameterName || obs.parameter;
              const paramVal = obs.parameter_value ?? obs.parameterValue ?? obs.observed_value;
              const unit = obs.parameter_unit || obs.parameterUnit || obs.unit || "";
              const stationName = obs.station_name || obs.stationName || "Observatory";

              return (
                <CircleMarker
                  key={obs.id || `${obs.lat}-${obs.lng}`}
                  center={[obs.lat, obs.lng]}
                  radius={7}
                  pathOptions={{ color: "#0369a1", fillColor: "#06b6d4", fillOpacity: 0.85, weight: 2 }}
                >
                  <Popup className="risk-map-popup">
                    <div className="risk-popup-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <strong className="risk-popup-title" style={{ color: "#0284c7", margin: 0 }}>{stationName}</strong>
                        <span className="badge safe" style={{ fontSize: "9px", padding: "2px 4px" }}>REAL DATA</span>
                      </div>
                      <div className="risk-popup-row">
                        <span>Parameter:</span>
                        <strong>{paramName}</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Observed Value:</span>
                        <strong>{paramVal} {unit}</strong>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
        </MapContainer>

        {/* MAP LAYER CONTROLS */}
        <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 400, background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px", minWidth: "230px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: "6px", borderBottom: "1px solid var(--border-color)" }}>
            {isSimulated ? "SCENARIO LAYERS" : "GIS Layers"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            
            {isSimulated ? (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.scenarioSettlements} onChange={() => toggleLayer("scenarioSettlements")} style={{ accentColor: "#ef4444" }} />
                  Scenario Settlements
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.scenarioSafeSites} onChange={() => toggleLayer("scenarioSafeSites")} style={{ accentColor: "#a855f7" }} />
                  Scenario Safe Sites
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.scenarioRoutes} onChange={() => toggleLayer("scenarioRoutes")} style={{ accentColor: "#a855f7" }} />
                  Scenario Evac Routes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.scenarioRoadImpacts} onChange={() => toggleLayer("scenarioRoadImpacts")} style={{ accentColor: "#dc2626" }} />
                  Scenario Road Impacts
                </label>
              </>
            ) : (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.redZones} onChange={() => toggleLayer("redZones")} style={{ accentColor: "var(--accent-red)" }} />
                  Red Hazard Zones
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.habitations} onChange={() => toggleLayer("habitations")} style={{ accentColor: "var(--accent-warning)" }} />
                  Vulnerable Habitations
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.safeSites} onChange={() => toggleLayer("safeSites")} style={{ accentColor: "var(--accent-safe)" }} />
                  Safe Shelters
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  <input type="checkbox" checked={layers.routes} onChange={() => toggleLayer("routes")} style={{ accentColor: "var(--accent-blue)" }} />
                  Evacuation Routes
                </label>
              </>
            )}

            <div style={{ height: "1px", background: "var(--border-color)", margin: "4px 0" }}></div>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
              <input type="checkbox" checked={layers.realObservations} onChange={() => toggleLayer("realObservations")} style={{ accentColor: "#06b6d4" }} />
              Real Env Signals ({safeObservations.length})
            </label>
          </div>
        </div>

        {/* MAP LEGEND */}
        <div style={{ position: "absolute", bottom: "16px", left: "16px", zIndex: 400, background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "10px 14px", borderRadius: "8px", display: "flex", gap: "16px", flexWrap: "wrap", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          {isSimulated ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444", border: "1px solid #991b1b" }}></div>
                Scenario Settlement
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
                <div style={{ width: "16px", height: "3px", background: "#a855f7" }}></div>
                Scenario Route
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444", border: "1px solid #991b1b" }}></div>
                Critical Risk
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b", border: "1px solid #92400e" }}></div>
                High Risk
              </div>
            </>
          )}
          <div style={{ width: "1px", height: "14px", background: "var(--border-color)" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#06b6d4", border: "1px solid #0369a1" }}></div>
            Real Data Feed
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskMapExplorer;
