import React, { useState } from "react";

function SimulatorView({ onSimulateImpact }) {
  const [rainfall, setRainfall] = useState(85);
  const [slopeInstability, setSlopeInstability] = useState(45);
  const [riverLevel, setRiverLevel] = useState(3.4);

  // Dynamic risk rating calculation based on sliders
  const calculatedRiskIndex = Math.min(100, Math.round((rainfall * 0.45) + (slopeInstability * 0.35) + (riverLevel * 8)));

  const getThreatLevel = (index) => {
    if (index >= 80) return { label: "CRITICAL", color: "var(--accent-critical)" };
    if (index >= 60) return { label: "HIGH", color: "var(--accent-warning)" };
    return { label: "MODERATE", color: "var(--accent-blue)" };
  };

  const threat = getThreatLevel(calculatedRiskIndex);

  const handleApply = () => {
    onSimulateImpact({ rainfall, slopeInstability, riverLevel, calculatedRiskIndex, threatLabel: threat.label });
  };

  return (
    <div className="simulator-view">
      {/* Header */}
      <div className="panel-header" style={{ marginBottom: "24px", borderBottom: "none", paddingBottom: 0 }}>
        <div>
          <h2 className="panel-title">Hazard Impact Scenario Simulator</h2>
          <p className="panel-sub">
            Adjust environmental hazard parameters to simulate impact on high-risk habitations.
          </p>
        </div>
        <div className="status-badge" style={{ background: "rgba(6, 182, 212, 0.1)", color: "var(--accent-cyan)", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px" }}>
          SIMULATION MODE
        </div>
      </div>

      <div className="grid-2-1" style={{ alignItems: "start" }}>
        {/* Scenario Inputs */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <h3 className="panel-title" style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
            Scenario Inputs
          </h3>

          <div className="sim-controls" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Rainfall */}
            <div className="sim-slider-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Rainfall Intensity</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{rainfall}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "4px" }}>mm/hr</span>
                </div>
              </div>
              <input
                type="range"
                min="20"
                max="250"
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--accent-blue)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>Min: 20</span>
                <span>Ref: Cloudburst Threshold (100)</span>
                <span>Max: 250</span>
              </div>
            </div>

            {/* Slope Instability */}
            <div className="sim-slider-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Slope Instability & Pore Pressure</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{slopeInstability}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "4px" }}>%</span>
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={slopeInstability}
                onChange={(e) => setSlopeInstability(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--accent-blue)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>Min: 10</span>
                <span>Ref: Landslide Slip Angle Limit (65%)</span>
                <span>Max: 100</span>
              </div>
            </div>

            {/* River Surge */}
            <div className="sim-slider-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>River Surge / Inundation Level</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{riverLevel}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "4px" }}>meters</span>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={riverLevel}
                onChange={(e) => setRiverLevel(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer", accentColor: "var(--accent-blue)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>Min: 0.5</span>
                <span>Ref: Overflow Danger Mark (4.0m)</span>
                <span>Max: 8.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Assessment & Action */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 className="panel-title" style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Scenario Assessment
            </h3>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Composite Hazard Index</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "42px", fontWeight: 800, fontFamily: "var(--font-display)", color: threat.color, lineHeight: 1 }}>{calculatedRiskIndex}</span>
                  <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>/ 100</span>
                </div>
              </div>
              <div style={{ background: threat.color, color: "#fff", fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {threat.label}
              </div>
            </div>

            {/* Severity Meter */}
            <div style={{ width: "100%", height: "8px", background: "var(--bg-secondary)", borderRadius: "4px", position: "relative", marginBottom: "28px", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: 0, left: 0, height: "100%",
                width: `${calculatedRiskIndex}%`,
                background: threat.color,
                transition: "width 0.3s ease, background 0.3s ease"
              }} />
            </div>

            {/* Impact Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Affected Red Zones</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{calculatedRiskIndex > 75 ? "12 Habitats" : "7 Habitats"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Evacuation Speed Needed</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: threat.color }}>{calculatedRiskIndex > 75 ? "IMMEDIATE (< 2 hrs)" : "Standard (6 hrs)"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Road Access Risk</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: slopeInstability > 60 ? "var(--accent-warning)" : "var(--accent-safe)" }}>{slopeInstability > 60 ? "HIGH BLOCKAGE" : "PASSABLE"}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 className="panel-title" style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              Run Scenario
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>
              Apply simulation inputs and recalculate evacuation impact.
            </p>
            <button className="action-btn primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }} onClick={handleApply}>
              Run Simulation
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SimulatorView;
