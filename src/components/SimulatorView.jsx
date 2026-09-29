import React, { useState } from "react";
import { api } from "../services/api";

function SimulatorView({ onSimulateImpact }) {
  const [rainfall, setRainfall] = useState(85);
  const [slopeInstability, setSlopeInstability] = useState(45);
  const [riverLevel, setRiverLevel] = useState(3.4);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulationResult, setSimulationResult] = useState(null);

  // Fallback calculations for initial state only
  const fallbackRiskIndex = Math.min(100, Math.round((rainfall * 0.45) + (slopeInstability * 0.35) + (riverLevel * 8)));
  const getFallbackThreatLevel = (index) => {
    if (index >= 80) return { label: "CRITICAL", color: "var(--accent-critical)" };
    if (index >= 60) return { label: "HIGH", color: "var(--accent-warning)" };
    return { label: "MODERATE", color: "var(--accent-blue)" };
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
      case "MEDIUM": return "var(--accent-blue)";
      default: return "var(--text-muted)";
    }
  };

  const handleApply = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.runSimulationImpact({ rainfall, slopeInstability, riverLevel });
      setSimulationResult({
        ...result,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', ''),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
      });
      // Optionally notify parent if needed
      if (onSimulateImpact) {
        onSimulateImpact({
          rainfall,
          slopeInstability,
          riverLevel,
          calculatedRiskIndex: result.riskIndex,
          threatLabel: result.threatLevel,
          fullResult: {
            ...result,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }).replace(':', ''),
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
          }
        });
      }
    } catch (err) {
      setError(err.message || "Failed to calculate simulation impact.");
    } finally {
      setLoading(false);
    }
  };

  // Determine what to show in assessment block
  const isSimulated = !!simulationResult;
  const displayRiskIndex = isSimulated ? simulationResult.riskIndex : fallbackRiskIndex;
  const displayThreatLabel = isSimulated ? simulationResult.threatLevel : getFallbackThreatLevel(fallbackRiskIndex).label;
  const displayThreatColor = getThreatLevelColor(displayThreatLabel);
  const displayHighRiskCount = isSimulated ? simulationResult.affectedHabitations.filter(h => h.projectedRisk >= 70).length : (fallbackRiskIndex > 75 ? 12 : 7);

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
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "28px", height: "fit-content" }}>
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
                <span>Ref: Cloudburst (100)</span>
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
                <span>Ref: Slip Angle Limit (65%)</span>
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
                <span>Ref: Danger Mark (4.0m)</span>
                <span>Max: 8.0</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", lineHeight: 1.4 }}>
              Apply inputs to generate a full authoritative operational impact assessment via the backend.
            </p>
            <button
              className="action-btn primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: "14px" }}
              onClick={handleApply}
              disabled={loading}
            >
              {loading ? "CALCULATING IMPACT..." : "Run Simulation"}
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
                  SIMULATION RESULT — {simulationResult.date} {simulationResult.timestamp}
                </div>
              ) : (
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", fontStyle: "italic" }}>
                  ESTIMATE ONLY — Run Simulation for Authoritative Result
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Projected Risk Index</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontSize: "42px", fontWeight: 800, fontFamily: "var(--font-display)", color: displayThreatColor, lineHeight: 1 }}>{displayRiskIndex}</span>
                  <span style={{ fontSize: "16px", color: "var(--text-muted)" }}>/ 100</span>
                </div>
              </div>
              <div style={{ background: displayThreatColor, color: "#fff", fontSize: "12px", fontWeight: 700, padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {displayThreatLabel}
              </div>
            </div>

            {/* Severity Meter */}
            <div style={{ width: "100%", height: "8px", background: "var(--bg-secondary)", borderRadius: "4px", position: "relative", marginBottom: "28px", overflow: "hidden" }}>
              <div style={{
                position: "absolute", top: 0, left: 0, height: "100%",
                width: `${displayRiskIndex}%`,
                background: displayThreatColor,
                transition: "width 0.3s ease, background 0.3s ease"
              }} />
            </div>

            {/* Impact Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Affected Habitats</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{displayHighRiskCount} Critical/High Risk</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Evacuation Urgency</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: displayThreatColor }}>{displayRiskIndex > 75 ? "IMMEDIATE (< 2 hrs)" : "Standard (6 hrs)"}</span>
              </div>
              {isSimulated && simulationResult.routeImpact?.affectedRoutes?.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--bg-secondary)", borderRadius: "6px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Route Impact</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-warning)" }}>{simulationResult.routeImpact.affectedRoutes.length} Routes Compromised</span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Operational Impact (Visible only after simulation) */}
          {isSimulated && (
            <div className="glass-panel" style={{ padding: "0", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>OPERATIONAL IMPACT</h3>
                <p style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{simulationResult.operationalSummary}</p>
              </div>

              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "32px" }}>

                {/* Habitation Impact */}
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Projected Habitation Impact</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {simulationResult.affectedHabitations.filter(h => h.projectedRisk >= 70).map((hab) => (
                      <div key={hab.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--bg-secondary)", borderLeft: `3px solid ${getThreatLevelColor(hab.projectedLevel)}`, borderRadius: "4px" }}>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{hab.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Pop: {hab.population} | Status: {hab.evacuationStatus}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "16px", fontWeight: 700, color: getThreatLevelColor(hab.projectedLevel) }}>{hab.projectedRisk} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>/ 100</span></div>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--accent-red)" }}>+{hab.riskChange} projected</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shelter & Resource Impact Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {/* Shelter */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Shelter Capacity</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Available Beds:</span> <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{simulationResult.shelterImpact.availableBeds}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Projected Required:</span> <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{simulationResult.shelterImpact.projectedRequiredCapacity}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Shortfall:</span>
                        <span style={{ fontWeight: 700, color: simulationResult.shelterImpact.capacityShortfall > 0 ? "var(--accent-critical)" : "var(--accent-safe)" }}>
                          {simulationResult.shelterImpact.capacityShortfall > 0 ? `-${simulationResult.shelterImpact.capacityShortfall}` : "0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resource */}
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Resource Requirements</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Buses (Available/Req):</span> <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{simulationResult.resourceImpact.availableBuses} / {simulationResult.resourceImpact.requiredBuses}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Ambulances (Available/Req):</span> <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{simulationResult.resourceImpact.availableAmbulances} / {simulationResult.resourceImpact.requiredAmbulances}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border-color)" }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Shortfall:</span>
                        <span style={{ fontWeight: 700, color: (simulationResult.resourceImpact.busShortfall > 0 || simulationResult.resourceImpact.ambulanceShortfall > 0) ? "var(--accent-critical)" : "var(--accent-safe)" }}>
                          {simulationResult.resourceImpact.busShortfall + simulationResult.resourceImpact.ambulanceShortfall > 0 ? `-${simulationResult.resourceImpact.busShortfall + simulationResult.resourceImpact.ambulanceShortfall} vehicles` : "0"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Route Impact */}
                <div>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Route Impact</h4>
                  {simulationResult.routeImpact?.affectedRoutes?.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {simulationResult.routeImpact.affectedRoutes.map((rt, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "8px 12px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "4px" }}>
                          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{rt.habitation}</span>
                          <span style={{ fontWeight: 600, color: "var(--accent-warning)" }}>{rt.condition}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: "4px" }}>No projected route constraints.</div>
                  )}
                </div>

                {/* Projected Recommendations */}
                {simulationResult.recommendations?.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>Projected Recommendations</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {simulationResult.recommendations.map(rec => (
                        <div key={rec.id} style={{ border: `1px solid var(--border-color)`, borderLeft: `3px solid ${getRecommendationColor(rec.priority)}`, borderRadius: "4px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <div style={{ fontSize: "10px", fontWeight: 700, color: getRecommendationColor(rec.priority), textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                                {rec.priority} &middot; {rec.type}
                              </div>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{rec.title}</div>
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{rec.area}</div>
                          </div>

                          <div style={{ fontSize: "13px", color: "var(--text-primary)", margin: "4px 0" }}>{rec.reason}</div>

                          {rec.evidence && rec.evidence.length > 0 && (
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "8px", borderRadius: "4px" }}>
                              {rec.evidence.slice(0, 2).map((ev, i) => (
                                <div key={i}>• {ev}</div>
                              ))}
                            </div>
                          )}

                          <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, marginTop: "4px" }}>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "11px", marginRight: "8px" }}>ACTION:</span>
                            {rec.recommendedAction}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
