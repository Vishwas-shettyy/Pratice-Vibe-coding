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

  if (normalizedLevel === "CRITICAL") {
    return {
      color: "#dc2626",
      fillColor: "#ef4444",
      label: "CRITICAL",
      stroke: "#b91c1c",
      radius: 12 + Math.min(riskScore / 10, 12),
    };
  }

  if (normalizedLevel === "HIGH") {
    return {
      color: "#d97706",
      fillColor: "#f97316",
      label: "HIGH",
      stroke: "#b45309",
      radius: 10 + Math.min(riskScore / 12, 10),
    };
  }

  if (normalizedLevel === "MODERATE") {
    return {
      color: "#b45309",
      fillColor: "#f59e0b",
      label: "MODERATE",
      stroke: "#92400e",
      radius: 8 + Math.min(riskScore / 14, 8),
    };
  }

  return {
    color: "#166534",
    fillColor: "#22c55e",
    label: "LOW",
    stroke: "#15803d",
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

  if (!safeHabitations.length && !safeSafeSites.length && !safeHazardZones.length && !safeRoutes.length) {
    return (
      <div className="empty-state">
        No GIS data available. The backend is either offline or has not returned any map layers.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="glass-panel" style={{ padding: "16px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="panel-title">Interactive GIS Risk Map & Layer Explorer</h2>
            <p className="panel-sub">
              Live multi-hazard monitoring, vulnerable settlement buffers, safe site perimeters & evacuation routes
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <span className="badge safe">MAP ENGINE ACTIVE</span>
            <span className="badge immediate">3 RED ZONES LOADED</span>
          </div>
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
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
                  color: zone.color,
                  fillColor: zone.fillColor,
                  fillOpacity: zone.fillOpacity,
                  weight: 2,
                  dashArray: zone.severity === "CRITICAL" ? "5, 5" : null
                }}
              >
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title">{zone.label}</strong>
                    <div className="risk-popup-row">
                      <span>Severity:</span>
                      <strong style={{ color: zone.severity === "CRITICAL" ? "#dc2626" : "#d97706" }}>
                        {zone.severity}
                      </strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Coverage Buffer:</span>
                      <strong>{(zone.radius / 1000).toFixed(1)} km</strong>
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
                  color: route.color,
                  weight: 4,
                  dashArray: "8, 8",
                  opacity: 0.9
                }}
              >
                <Popup className="risk-map-popup">
                  <div className="risk-popup-card">
                    <strong className="risk-popup-title">Evacuation Path: {route.fromName} &rarr; {route.toName}</strong>
                    <div className="risk-popup-row">
                      <span>Distance:</span>
                      <strong>{route.distance}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Status:</span>
                      <strong>{route.status}</strong>
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

              return (
                <CircleMarker
                  key={hab.id}
                  center={[hab.lat, hab.lng]}
                  radius={riskStyle.radius}
                  pathOptions={{
                    color: riskStyle.color,
                    fillColor: riskStyle.fillColor,
                    fillOpacity: 0.85,
                    weight: 2,
                    opacity: 1,
                  }}
                  eventHandlers={{
                    click: () => onSelectHabitation?.(hab),
                  }}
                >
                  <Popup className="risk-map-popup">
                    <div className="risk-popup-card">
                      <strong className="risk-popup-title">{hab.name}</strong>
                      <div className="risk-popup-row">
                        <span>Risk Score:</span>
                        <strong style={{ color: riskStyle.fillColor }}>{riskScore}/100</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Risk Level:</span>
                        <strong style={{ color: riskStyle.fillColor }}>{riskStyle.label}</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Population:</span>
                        <strong>{hab.population}</strong>
                      </div>
                      <div className="risk-popup-row">
                        <span>Elderly:</span>
                        <strong>{hab.elderly}</strong>
                      </div>
                      <button
                        className="risk-popup-action"
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
                    <strong className="risk-popup-title risk-popup-safe">{shelter.name}</strong>
                    <div className="risk-popup-row">
                      <span>Available Beds:</span>
                      <strong>{shelter.available} / {shelter.capacity}</strong>
                    </div>
                    <div className="risk-popup-row">
                      <span>Status:</span>
                      <strong>{shelter.status}</strong>
                    </div>
                    <button
                      className="risk-popup-action safe"
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
        <div className="map-controls-bar">
          <div className="map-control-title">GIS Layers</div>
          <div className="map-toggle-group">
            <label className="map-toggle-item">
              <input
                type="checkbox"
                checked={layers.redZones}
                onChange={() => toggleLayer("redZones")}
              />
              <span>Red Hazard Zones</span>
            </label>

            <label className="map-toggle-item">
              <input
                type="checkbox"
                checked={layers.habitations}
                onChange={() => toggleLayer("habitations")}
              />
              <span>Vulnerable Habitations</span>
            </label>

            <label className="map-toggle-item">
              <input
                type="checkbox"
                checked={layers.safeSites}
                onChange={() => toggleLayer("safeSites")}
              />
              <span>Safe Shelters</span>
            </label>

            <label className="map-toggle-item">
              <input
                type="checkbox"
                checked={layers.routes}
                onChange={() => toggleLayer("routes")}
              />
              <span>Evacuation Routes</span>
            </label>
          </div>
        </div>

        {/* MAP LEGEND */}
        <div className="map-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#22c55e" }}></div>
            <span>Low Risk</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#f59e0b" }}></div>
            <span>Moderate Risk</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#f97316" }}></div>
            <span>High Risk</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#ef4444" }}></div>
            <span>Critical Risk</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#10b981" }}></div>
            <span>Safe Haven</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#3b82f6" }}></div>
            <span>Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskMapExplorer;
