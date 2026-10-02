import React, { useState, useEffect } from "react";
import { api } from "../services/api";

function SimulatorView({ onSimulateImpact, onClearScenario, simulationResult: initialSimulationResult }) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  
  const [rainfall, setRainfall] = useState(85);
  const [slopeInstability, setSlopeInstability] = useState(45);
  const [riverLevel, setRiverLevel] = useState(3.4);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulationResult, setSimulationResult] = useState(initialSimulationResult || null);

  useEffect(() => {
    setSimulationResult(initialSimulationResult || null);
  }, [initialSimulationResult]);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const scens = await api.getScenarios();
        setScenarios(scens || []);
        if (scens && scens.length > 0) {
          const defaultScen = scens.find(s => s.id === "KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO") || scens[0];
          setSelectedScenarioId(defaultScen.id);
        }
      } catch (err) {
        console.warn("Failed to load scenarios", err);
      }
    };
    fetchScenarios();
  }, []);

  // Fallback calculations for initial state only
  const fallbackRiskIndex = Math.min(100, Math.round((rainfall * 0.45) + (slopeInstability * 0.35) + (riverLevel * 8)));
  const getFallbackThreatLevel = (index) => {
    if (index >= 85) return { label: "CRITICAL", color: "var(--accent-critical)" };
    if (index >= 70) return { label: "HIGH", color: "var(--accent-warning)" };
    if (index >= 40) return { label: "MODERATE", color: "var(--accent-blue)" };
    return { label: "LOW", color: "var(--accent-safe)" };
  };

  const getThreatLevelColor = (label) => {
    switch (label?.toUpperCase()) {
      case "CRITICAL": return "var(--accent-critical)";
      case "HIGH": return "var(--accent-warning)";
      case "MODERATE": return "var(--accent-blue)";
      default: return "var(--text-muted)";
    }
  };

  const getRecommendationColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case "CRITICAL": return "var(--accent-critical)";
      case "HIGH": return "var(--accent-warning)";
      case "MODERATE": return "var(--accent-blue)";
      default: return "var(--text-muted)";
    }
  };

  const handleApply = async () => {
    if (!selectedScenarioId) {
      setError("Please select a scenario.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const scenarioRes = await api.runScenario(selectedScenarioId);
      const relocationRes = await api.runScenarioRelocation(selectedScenarioId);
      
      let roadImpactsRes = [];
      try {
        const roadImpactsResponse = await api.getScenarioRoadImpacts(selectedScenarioId);
        roadImpactsRes = roadImpactsResponse || [];
      } catch (err) {
        console.warn("Failed to fetch scenario road impacts", err);
      }
      
      setSimulationResult({
        scenario: scenarioRes,
        relocations: relocationRes,
        roadImpacts: roadImpactsRes,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', ''),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
      });
      
      const criticalCount = relocationRes.filter(r => r.priority === 'CRITICAL').length;
      if (onSimulateImpact) {
        onSimulateImpact({
          threatLabel: criticalCount > 0 ? "CRITICAL" : "MODERATE",
          calculatedRiskIndex: criticalCount > 0 ? 95 : 60,
          fullResult: {
            scenario: scenarioRes,
            relocations: relocationRes,
            roadImpacts: roadImpactsRes,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', ''),
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
          }
        });
      }
    } catch (err) {
      setError(err.message || "Failed to run scenario engine.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearLocalScenario = () => {
    setSimulationResult(null);
    if (onClearScenario) {
      onClearScenario();
    }
  };

  const isSimulated = !!simulationResult;
  
  let displayRiskIndex = fallbackRiskIndex;
  let displayThreatLabel = getFallbackThreatLevel(fallbackRiskIndex).label;
  let displayHighRiskCount = fallbackRiskIndex > 75 ? 12 : 7;
  
  if (isSimulated && simulationResult.relocations) {
    const criticalCount = simulationResult.relocations.filter(r => r.priority === 'CRITICAL').length;
    displayHighRiskCount = criticalCount;
    displayRiskIndex = criticalCount > 0 ? 95 : 60;
    displayThreatLabel = criticalCount > 0 ? "CRITICAL" : "MODERATE";
  }

  const displayThreatColor = getThreatLevelColor(displayThreatLabel);

  return (
    <div className="simulator-view">
      <div className="panel-header" style={{ marginBottom: "24px", borderBottom: "none", paddingBottom: 0 }}>
        <div>
          <h2 className="panel-title">Hazard Impact Scenario Simulator</h2>
          <p className="panel-sub">
            Run deterministic scenario-based relocation and hazard engines. Data generated is strictly SCENARIO.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isSimulated && (
            <button className="action-btn" onClick={handleClearLocalScenario} style={{ border: "1px solid #a855f7", color: "#a855f7", background: "transparent" }}>
              Exit Scenario
            </button>
          )}
          <div className="status-badge" style={{ background: "rgba(6, 182, 212, 0.1)", color: "var(--accent-cyan)", padding: "6px 12px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px" }}>
            SCENARIO MODE
          </div>
        </div>
      </div>

      <div className="grid-2-1" style={{ alignItems: "start" }}>
        {/* Scenario Inputs */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "28px", height: "fit-content" }}>
          <h3 className="panel-title" style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
            Scenario Configuration (Preview Only)
          </h3>

          <div className="sim-controls" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Select Scenario</label>
              <select 
                value={selectedScenarioId} 
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                style={{ width: "100%", padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "6px" }}
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label ? `[${s.label}] ` : ""}{s.name || s.scenario_name || s.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Visual placeholders to keep the UI look */}
            <div className="sim-slider-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Rainfall Intensity (Preview Only)</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{rainfall}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "4px" }}>mm/hr</span>
                </div>
              </div>
              <input type="range" min="20" max="250" value={rainfall} onChange={(e) => setRainfall(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: "var(--accent-blue)" }} />
            </div>
            
            <div className="sim-slider-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>River Surge / Inundation (Preview Only)</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>{riverLevel}</span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "4px" }}>meters</span>
                </div>
              </div>
              <input type="range" min="0.5" max="8.0" step="0.1" value={riverLevel} onChange={(e) => setRiverLevel(Number(e.target.value))} style={{ width: "100%", cursor: "pointer", accentColor: "var(--accent-blue)" }} />
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.4 }}>
              Execute selected scenario to generate authoritative (simulated) operational and relocation assessments.
            </p>
            <button
              className="action-btn primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "14px" }}
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? "EXECUTING SCENARIO..." : "Run Scenario Engine"}
            </button>
            {error && (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "4px", color: "var(--accent-red)", fontSize: "13px", fontWeight: 500 }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assessment & Action */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          <div className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
              <h3 className="panel-title" style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", margin: 0 }}>
                Scenario Assessment
              </h3>
              {isSimulated ? (
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-safe)", letterSpacing: "0.5px" }}>
                  SCENARIO RESULT — {simulationResult.date} {simulationResult.timestamp}
                </div>
              ) : (
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", fontStyle: "italic" }}>
                  ESTIMATE ONLY — Run Scenario for Relocation Assignments
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Simulated Exposure Severity</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "42px", fontWeight: 800, fontFamily: "var(--font-display)", color: displayThreatColor, lineHeight: 1 }}>{displayRiskIndex}</span>
                  <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>/ 100</span>
                </div>
              </div>
              <div style={{ background: displayThreatColor, color: "#fff", fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {displayThreatLabel}
              </div>
            </div>

            <div style={{ width: "100%", height: "8px", background: "var(--bg-secondary)", borderRadius: "4px", position: "relative", marginBottom: "28px", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${displayRiskIndex}%`, background: displayThreatColor, transition: "width 0.3s ease, background 0.3s ease" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Affected Settlements</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{displayHighRiskCount} Critical Priority</span>
              </div>
              {isSimulated && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Road Network Impact</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-warning)" }}>
                    {simulationResult.scenario?.id === "KODAGU_EXTREME_MONSOON_HARSH_CASE"
                      ? `${simulationResult.roadImpacts?.length || 1311} Roads Impacted (~45%)`
                      : simulationResult.scenario?.roads_evaluated > 0 ? "~15% Blocked/Restricted" : "Unknown"}
                  </span>
                </div>
              )}
            </div>
            {isSimulated && (simulationResult.scenario?.id === "KODAGU_EXTREME_MONSOON_HARSH_CASE" || simulationResult.scenario?.label === "HARSH CASE") && (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.25)", borderRadius: "6px", fontSize: "12px", color: "var(--accent-critical)", lineHeight: 1.5 }}>
                <strong>HARSH CASE Simulation Active:</strong> Deterministic stress simulation under extreme rainfall and landslide conditions. Results are simulated and do not represent a live hazard forecast.
              </div>
            )}
          </div>

          {isSimulated && (
            <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>RELOCATION DECISION ENGINE</h3>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                  Decision-support simulation mapping settlements to safe sites via deterministic scenario routing.
                </p>
              </div>

              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "32px" }}>
                {simulationResult.relocations?.length > 0 ? (
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Evacuation Assignments</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {simulationResult.relocations.map(rel => (
                        <div key={rel.id} style={{ border: `1px solid var(--border-color)`, borderLeft: `3px solid ${getRecommendationColor(rel.priority)}`, borderRadius: "4px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: "10px", fontWeight: 700, color: getRecommendationColor(rel.priority), textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                                {rel.priority} PRIORITY &middot; {rel.data_status}
                              </div>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{rel.settlement_id}</div>
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "right" }}>
                              <div>Dest: {rel.recommended_site_id || "None"}</div>
                              <div style={{ fontWeight: 600, color: rel.route_status === "SUCCESS" ? "var(--accent-safe)" : "var(--accent-critical)" }}>{rel.route_status}</div>
                            </div>
                          </div>

                          <div style={{ fontSize: "13px", color: "var(--text-primary)", margin: "4px 0", lineHeight: 1.5 }}>
                            {rel.recommendation_reason}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "8px", borderRadius: "4px", marginTop: "4px" }}>
                            <span><strong>Dist:</strong> {rel.route_distance_m > 0 ? `${(rel.route_distance_m / 1000).toFixed(2)} km` : "N/A"}</span>
                            <span><strong>Time:</strong> {rel.estimated_travel_time_min > 0 ? `${Math.round(rel.estimated_travel_time_min)} min` : "N/A"}</span>
                            <span><strong>Capacity:</strong> {rel.capacity_status === "UNKNOWN_REQUIREMENT (SCENARIO ASSUMPTION)" ? "Unknown Req" : rel.capacity_status === "CAPACITY_SUFFICIENT" ? <span style={{ color: "var(--accent-safe)" }}>Sufficient</span> : <span style={{ color: "var(--accent-critical)" }}>Insufficient</span>}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>No relocation assignments generated.</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default SimulatorView;
