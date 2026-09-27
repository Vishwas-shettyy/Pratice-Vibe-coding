import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function RiskMapExplorer({
  habitations,
  safeSites,
  hazardZones,
  evacuationRoutes,
  onSelectHabitation,
  onSelectShelter
}) {
  const [layers, setLayers] = useState({
    redZones: true,
    habitations: true,
    safeSites: true,
    routes: true,
  });

  const center = [12.2958, 76.6394];

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

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
          {/* DARK MAP TILES (CARTO DB DARK MATTER / OPENSTREETMAP) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* HAZARD ZONES / CIRCLES */}
          {layers.redZones &&
            hazardZones.map((zone) => (
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
                <Popup>
                  <div style={{ color: "#111" }}>
                    <strong style={{ fontSize: "14px" }}>{zone.label}</strong>
                    <br />
                    <span>Severity: </span>
                    <strong style={{ color: zone.severity === "CRITICAL" ? "#dc2626" : "#d97706" }}>
                      {zone.severity}
                    </strong>
                    <br />
                    <span>Coverage Buffer: {(zone.radius / 1000).toFixed(1)} km</span>
                  </div>
                </Popup>
              </Circle>
            ))}

          {/* EVACUATION ROUTE POLYLINES */}
          {layers.routes &&
            evacuationRoutes.map((route) => (
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
                <Popup>
                  <div style={{ color: "#111" }}>
                    <strong>Evacuation Path: {route.fromName} &rarr; {route.toName}</strong>
                    <br />
                    <span>Distance: {route.distance}</span>
                    <br />
                    <span>Status: {route.status}</span>
                  </div>
                </Popup>
              </Polyline>
            ))}

          {/* HABITATION MARKERS */}
          {layers.habitations &&
            habitations.map((hab) => (
              <Marker key={hab.id} position={[hab.lat, hab.lng]}>
                <Popup>
                  <div style={{ color: "#111", minWidth: "160px" }}>
                    <strong style={{ fontSize: "14px" }}>{hab.name}</strong>
                    <div style={{ margin: "4px 0", fontSize: "12px" }}>
                      Risk Score: <strong style={{ color: "#ef4444" }}>{hab.riskScore}/100</strong>
                    </div>
                    <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                      Population: <strong>{hab.population}</strong> (Elderly: {hab.elderly})
                    </div>
                    <button
                      style={{
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        width: "100%",
                        fontSize: "11px",
                        fontWeight: 600
                      }}
                      onClick={() => onSelectHabitation(hab)}
                    >
                      Inspect Settlement
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* SAFE SITES MARKERS */}
          {layers.safeSites &&
            safeSites.map((shelter) => (
              <Marker key={shelter.id} position={[shelter.lat, shelter.lng]}>
                <Popup>
                  <div style={{ color: "#111", minWidth: "160px" }}>
                    <strong style={{ fontSize: "14px", color: "#059669" }}>{shelter.name}</strong>
                    <div style={{ margin: "4px 0", fontSize: "12px" }}>
                      Available Beds: <strong>{shelter.available} / {shelter.capacity}</strong>
                    </div>
                    <div style={{ fontSize: "12px", marginBottom: "8px" }}>
                      Status: <strong>{shelter.status}</strong>
                    </div>
                    <button
                      style={{
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        width: "100%",
                        fontSize: "11px",
                        fontWeight: 600
                      }}
                      onClick={() => onSelectShelter(shelter)}
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
            <div className="legend-color" style={{ background: "#ef4444" }}></div>
            <span>Red Zone (Critical)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#f59e0b" }}></div>
            <span>High Risk Zone</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#10b981" }}></div>
            <span>Safe Haven</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: "#3b82f6" }}></div>
            <span>Evacuation Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskMapExplorer;
