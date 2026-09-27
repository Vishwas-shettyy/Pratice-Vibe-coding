import React, { useState } from "react";

function SimulatorView({ onSimulateImpact }) {
  const [rainfall, setRainfall] = useState(85);
  const [slopeInstability, setSlopeInstability] = useState(45);
  const [riverLevel, setRiverLevel] = useState(3.4);

  // Dynamic risk rating calculation based on sliders
  const calculatedRiskIndex = Math.min(100, Math.round((rainfall * 0.45) + (slopeInstability * 0.35) + (riverLevel * 8)));

  const getThreatLevel = (index) => {
    if (index >= 80) return { label: "CRITICAL (L1)", color: "#ef4444" };
    if (index >= 60) return { label: "HIGH (L2)", color: "#f59e0b" };
    return { label: "MODERATE (L3)", color: "#3b82f6" };
  };

  const threat = getThreatLevel(calculatedRiskIndex);

  const handleApply = () => {
    onSimulateImpact({ rainfall, slopeInstability, riverLevel, calculatedRiskIndex, threatLabel: threat.label });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="glass-panel" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="panel-title">Interactive Disaster "What-If" Scenario Simulator</h2>
            <p className="panel-sub">
              Adjust environmental hazard triggers to simulate real-time flood & landslide impact on red zones
            </p>
          </div>
          <span className="badge immediate">SIMULATOR MODE ACTIVE</span>
        </div>
      </div>

      <div className="grid-2-1">
        {/* SLIDERS CONTROL BOARD */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h3 style={{ color: "#fff", fontSize: "16px" }}>Environmental Hazard Triggers</h3>

          <div className="sim-controls">
            {/* SLIDER 1: RAINFALL INTENSITY */}
            <div className="sim-slider-group">
              <div className="sim-label">
                <span>🌧️ Rainfall Intensity</span>
                <strong style={{ color: "var(--accent-cyan)" }}>{rainfall} mm/hr</strong>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Monsoon Cloudburst Threshold: 100mm/hr
              </span>
            </div>

            {/* SLIDER 2: SLOPE INSTABILITY */}
            <div className="sim-slider-group">
              <div className="sim-label">
                <span>⛰️ Slope Instability & Pore Pressure</span>
                <strong style={{ color: "var(--accent-amber)" }}>{slopeInstability}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={slopeInstability}
                onChange={(e) => setSlopeInstability(Number(e.target.value))}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Landslide Slip Angle Critical Limit: 65%
              </span>
            </div>

            {/* SLIDER 3: RIVER SURGE LEVEL */}
            <div className="sim-slider-group">
              <div className="sim-label">
                <span>🌊 River Surge / Inundation Level</span>
                <strong style={{ color: "var(--accent-blue)" }}>{riverLevel} meters above mark</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={riverLevel}
                onChange={(e) => setRiverLevel(Number(e.target.value))}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Overflow Danger Mark: 4.0 meters
              </span>
            </div>
          </div>

          <button className="action-btn danger pulse-red" style={{ width: "100%", justifyContent: "center", marginTop: "10px" }} onClick={handleApply}>
            ⚡ Apply Simulation & Recalculate Evacuation Routes
          </button>
        </div>

        {/* SIMULATION IMPACT PREVIEW CARD */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ color: "#fff", fontSize: "16px" }}>Simulated Hazard Score</h3>

          <div style={{ background: "rgba(0,0,0,0.3)", padding: "24px", borderRadius: "12px", textAlign: "center", border: `1px solid ${threat.color}` }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Composite Hazard Index
            </div>
            <div style={{ fontSize: "44px", fontWeight: 800, color: threat.color, margin: "6px 0", fontFamily: "var(--font-display)" }}>
              {calculatedRiskIndex} <span style={{ fontSize: "20px" }}>/ 100</span>
            </div>
            <div style={{ display: "inline-block", background: threat.color, color: "#fff", fontWeight: 700, fontSize: "12px", padding: "4px 12px", borderRadius: "6px" }}>
              {threat.label}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Affected Red Zones:</span>
              <strong style={{ color: "#fff" }}>{calculatedRiskIndex > 75 ? "12 Habitats" : "7 Habitats"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Evacuation Speed Needed:</span>
              <strong style={{ color: threat.color }}>{calculatedRiskIndex > 75 ? "IMMEDIATE (&lt;2 hrs)" : "Standard (6 hrs)"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Road Access Risk:</span>
              <strong style={{ color: "var(--accent-amber)" }}>{slopeInstability > 60 ? "HIGH BLOCKAGE" : "PASSABLE"}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimulatorView;
