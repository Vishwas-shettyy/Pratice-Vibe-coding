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
  onSelectHabitation,
  onSelectShelter
}) {
  const [layers, setLayers] = useState({
    redZones: true,
    habitations: true,
    safeSites: true,
    routes: true,
  });

  const safeHabitations = Array.isArray(habitations) ? habitations : [];
  const safeSafeSites = Array.isArray(safeSites) ? safeSites : [];
  const safeHazardZones = Array.isArray(hazardZones) ? hazardZones : [];
  const safeRoutes = Array.isArray(evacuationRoutes) ? evacuationRoutes : [];

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

  if (!safeHabitations.length && !safeSafeSites.length && !safeHazardZones.length && !safeRoutes.length) {
    return (
      <div className="empty-state">
        No GIS data available. The backend is either offline or has not returned any map layers.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 160px)" }}>
      {/* OPERATIONAL STATUS STRIP */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)", padding: "12px 20px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
        <div style={{ display: "flex", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="pulse-red" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-safe)", display: "inline-block" }}></span>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-primary)" }}>MAP ENGINE ACTIVE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-muted)" }}>SYNC:</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>LIVE GIS FEED</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ background: "rgba(220, 38, 38, 0.1)", color: "var(--accent-critical)", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
            {safeHazardZones.length} RED ZONES LOADED
          </div>
          <div style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--accent-blue)", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
            {safeHabitations.length} HABITATIONS MONITORED
          </div>
        </div>
      </div>

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

          {/* HAZARD ZONES / CIRCLES */}
          {layers.redZones &&
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
              >
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title" style={{ color: zone.severity === "CRITICAL" ? "#dc2626" : "#d97706" }}>{zone.label}</strong>
                    <div className="risk-popup-row">
                      <span>Severity:</span>
                      <strong>{zone.severity}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Coverage Buffer:</span>
                      <strong>{(zone.radius / 1000).toFixed(1)} km</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Operational:</span>
                      <strong>{zone.severity === "CRITICAL" ? "Immediate response" : "Monitoring"}</strong>
                    </div>
                  </div>
                </Popup>
              </Circle>
            ))}

          {/* EVACUATION ROUTE POLYLINES */}
          {layers.routes &&
            safeRoutes.map((route) => (
              <Polyline
                key={route.id}
                positions={route.positions}
                pathOptions={{
                  color: route.color || "#3b82f6",
                  weight: 4,
                  dashArray: "6, 6",
                  opacity: 0.8
                }}
              >
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title" style={{ color: "#3b82f6" }}>Evacuation Path: {route.fromName} &rarr; {route.toName}</strong>
                    <div className="risk-popup-row">
                      <span>Distance:</span>
                      <strong>{route.distance}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Status:</span>
                      <strong>{route.status}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Role:</span>
                      <strong>Safe-route dispatch</strong>
                    </div>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* HABITATION MARKERS */}
          {layers.habitations &&
            safeHabitations.map((hab) => {
              const riskScore = getRiskScore(hab);
              const riskLevel = getRiskLevel(hab);
              const riskStyle = getRiskStyle(riskLevel, riskScore);
              const mainHazard = getMainHazard(hab);

              return (
                <CircleMarker
                  key={hab.id}
                  center={[hab.lat, hab.lng]}
                  radius={riskStyle.radius}
                  pathOptions={{
                    color: riskStyle.stroke,
                    fillColor: riskStyle.fillColor,
                    fillOpacity: 0.9,
                    weight: 2,
                    opacity: 1,
                  }}
                  eventHandlers={{
                    click: () => onSelectHabitation?.(hab),
                  }}
                >
                  <Popup className="risk-map-popup">
                    <div className="risk-popup-card">
                      <strong className="risk-popup-title" style={{ color: riskStyle.color }}>{hab.name}</strong>
                      <div className="risk-popup-row">
                        <span>Risk Score:</span>
                        <strong style={{ color: riskStyle.color }}>{riskScore}/100</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Risk Level:</span>
                        <strong style={{ color: riskStyle.color }}>{riskLevel}</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Main Hazard:</span>
                        <strong>{mainHazard}</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Exposure:</span>
                        <strong>{hab.population} residents</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Assessment:</span>
                        <strong>{getAssessmentSummary(hab)}</strong>
                      </div>
                      <button
                        className="action-btn"
                        style={{ marginTop: "12px", width: "100%", justifyContent: "center" }}
                        onClick={() => onSelectHabitation?.(hab)}
                      >
                        Inspect Settlement
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

          {/* SAFE SITES MARKERS */}
          {layers.safeSites &&
            safeSafeSites.map((shelter) => (
              <Marker key={shelter.id} position={[shelter.lat, shelter.lng]}>
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title" style={{ color: "#10b981" }}>{shelter.name}</strong>
                    <div className="risk-popup-row">
                      <span>Capacity:</span>
                      <strong>{shelter.capacity}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Occupancy:</span>
                      <strong>{getOccupancyText(shelter)}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Available:</span>
                      <strong>{shelter.available} beds</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Resources:</span>
                      <strong>{shelter.waterStockLiters?.toLocaleString() || 0}L / {shelter.foodMealsStock?.toLocaleString() || 0} meals</strong>
                    </div>
                    <button
                      className="action-btn primary"
                      style={{ marginTop: "12px", width: "100%", justifyContent: "center" }}
                      onClick={() => onSelectShelter?.(shelter)}
                    >
                      Inspect Shelter Inventory
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* MAP LAYER CONTROLS */}
        <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 400, background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "10px", minWidth: "220px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", paddingBottom: "6px", borderBottom: "1px solid var(--border-color)" }}>GIS Layers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
          </div>
        </div>

        {/* MAP LEGEND */}
        <div style={{ position: "absolute", bottom: "16px", left: "16px", zIndex: 400, background: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "10px 14px", borderRadius: "8px", display: "flex", gap: "16px", flexWrap: "wrap", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444", border: "1px solid #991b1b" }}></div>
            Critical Risk
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f59e0b", border: "1px solid #92400e" }}></div>
            High Risk
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#eab308", border: "1px solid #854d0e" }}></div>
            Moderate
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#10b981", border: "1px solid #065f46" }}></div>
            Low Risk / Safe
          </div>
          <div style={{ width: "1px", height: "14px", background: "var(--border-color)" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>
            <div style={{ width: "16px", height: "3px", background: "#3b82f6" }}></div>
            Evacuation Route
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskMapExplorer;
