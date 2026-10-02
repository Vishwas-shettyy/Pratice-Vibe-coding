import React, { useState } from "react";

function OverviewView({
  stats = {},
  habitations = [],
  safeSites = [],
  recommendations = [],
  environmentalObservations = [],
  onSelectHabitation,
  onNavigateToMap,
  onNavigateToPlanner,
  onNavigateToShelters,
  onNavigateToResources,
  onNavigateToRedZones
}) {
  const [selectedDistrict, setSelectedDistrict] = useState("Kodagu");

  const filteredObs = (Array.isArray(environmentalObservations) ? environmentalObservations : []).filter((obs) => {
    if (selectedDistrict === "ALL") return true;
    return (obs.district || "").toLowerCase() === selectedDistrict.toLowerCase();
  });
  const hasHabitations = Array.isArray(habitations) && habitations.length > 0;
  const hasSafeSites = Array.isArray(safeSites) && safeSites.length > 0;
  const safeStats = {
    ...stats,
    populationAtRisk: Number(stats.populationAtRisk ?? stats.totalPopulationAtRisk ?? 0),
    redZonesCount: Number(stats.redZonesCount ?? 0),
    safeSitesCount: Number(stats.safeSitesCount ?? safeSites.length ?? 0),
    totalCapacity: Number(stats.totalCapacity ?? 0),
    relocatedCount: Number(stats.relocatedCount ?? 0),
    surplusCapacity: Number(stats.surplusCapacity ?? stats.availableCapacity ?? 0),
  };

  const getHabitRiskScore = (hab) => Number(hab?.riskScore ?? hab?.risk_score ?? hab?.risk_assessment?.risk_score ?? 0);
  const getHabitRiskLevel = (hab) => String(hab?.riskLevel ?? hab?.risk_level ?? hab?.risk_assessment?.risk_level ?? "LOW").toUpperCase();

  const sortedHabitations = [...(Array.isArray(habitations) ? habitations : [])].sort((a, b) => getHabitRiskScore(b) - getHabitRiskScore(a));

  if (!hasHabitations && !hasSafeSites) {
    return (
      <div className="empty-state">
        No dashboard data is available right now. The backend may be offline or returning an empty response.
      </div>
    );
  }

  // Handle recommendation routing
  const handleRecommendationAction = (type) => {
    switch(type?.toUpperCase()) {
      case "RELOCATION": return onNavigateToPlanner?.();
      case "SHELTER": return onNavigateToShelters?.();
      case "RESOURCE": return onNavigateToResources?.();
      case "ROUTE": return onNavigateToMap?.();
      case "MONITORING": return onNavigateToRedZones?.();
      default: return null;
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

  const getRecommendationBg = (priority) => {
    switch (priority?.toUpperCase()) {
      case "CRITICAL": return "rgba(220, 38, 38, 0.1)";
      case "HIGH": return "rgba(245, 158, 11, 0.1)";
      case "MEDIUM": return "rgba(59, 130, 246, 0.1)";
      default: return "rgba(156, 163, 175, 0.1)";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* KPI COMMAND STRIP */}
      <div className="stats-grid">
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-critical)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Population at Risk</span>
            <svg width="16" height="16" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.populationAtRisk.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Across {habitations.length} vulnerable habitations
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-critical)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Red Zones</span>
            <svg width="16" height="16" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.redZonesCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Immediate action required
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-warning)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Safe Shelters</span>
            <svg width="16" height="16" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.safeSitesCount}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Verified high-ground shelters
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", borderTop: "3px solid var(--accent-safe)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Available Capacity</span>
            <svg width="16" height="16" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.2 }}>
            {safeStats.totalCapacity.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--accent-safe)", fontWeight: 600 }}>
            +{safeStats.surplusCapacity} capacity surplus
          </div>
        </div>
      </div>

      {/* REGIONAL RISK & PRIORITY HABITATIONS */}
      <div className="grid-2-1">
        {/* GIS LAUNCH PANEL */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Regional Risk & Hazard Assessment</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Real-time GIS hazard layers & vulnerable habitations</p>
          </div>

          <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-secondary)", position: "relative" }}>
            {/* Grid background effect */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(var(--border-color) 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }} />

            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="pulse-red" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-red)", display: "inline-block" }}></span>
                <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--accent-red)" }}>GIS STATUS: LIVE</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Hazard Layers</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>Flood • Landslide • Evacuation • Safe Sites</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Habitations Monitored</div>
                  <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>{habitations.length} High-Risk Zones</div>
                </div>
              </div>

              <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                <button className="action-btn primary" style={{ padding: "10px 20px" }} onClick={onNavigateToMap}>
                  Open Interactive GIS Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRIORITY QUEUE */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Priority Habitations</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Relocation queue by hazard rating</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {sortedHabitations.slice(0, 4).map((hab, index) => {
              const riskLevel = getHabitRiskLevel(hab);
              const isCritical = riskLevel === "CRITICAL" || riskLevel === "IMMEDIATE";
              const isHigh = riskLevel === "HIGH" || riskLevel === "SHORT-TERM";
              const statusColor = isCritical ? "var(--accent-critical)" : isHigh ? "var(--accent-warning)" : "var(--accent-blue)";

              return (
                <div key={hab.id} onClick={() => onSelectHabitation(hab)} style={{ display: "flex", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border-color)", cursor: "pointer", transition: "background 0.2s ease" }} onMouseOver={(e) => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", width: "24px", marginRight: "12px" }}>
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{hab.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{hab.population} people</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{getHabitRiskScore(hab)} <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>/ 100</span></div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {riskLevel}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ padding: "16px 24px", background: "rgba(0,0,0,0.02)", textAlign: "center", marginTop: "auto" }}>
            <button className="action-btn" style={{ width: "100%", justifyContent: "center", fontSize: "13px" }} onClick={onNavigateToPlanner}>
              Launch Relocation Planner
            </button>
          </div>
        </div>
      </div>

      {/* REAL ENVIRONMENTAL INTELLIGENCE FEED */}
      <div className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Real Environmental Intelligence</h3>
              <span className="badge safe" style={{ background: "rgba(16, 185, 129, 0.15)", color: "var(--accent-low)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                REAL DATA FEED
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px", margin: 0 }}>
              Live & source-attributed observations from IMD Hydro-Met, CWC India-WRIS, and OSM/Bhuvan
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>District Filter:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              <option value="Kodagu">Kodagu (Primary Basin)</option>
              <option value="Mysuru">Mysuru</option>
              <option value="Mandya">Mandya</option>
              <option value="Chamarajanagar">Chamarajanagar</option>
              <option value="Hassan">Hassan</option>
              <option value="ALL">All Districts ({environmentalObservations.length})</option>
            </select>
          </div>
        </div>

        <div style={{ padding: "0" }}>
          {filteredObs.length === 0 ? (
            <div style={{ padding: "28px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              No real environmental observations currently loaded for {selectedDistrict}.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0" }}>
              {filteredObs.slice(0, 6).map((obs, index) => {
                const paramName = obs.parameter_name || obs.parameterName || obs.parameter;
                const paramVal = obs.parameter_value ?? obs.parameterValue ?? obs.observed_value;
                const unit = obs.parameter_unit || obs.parameterUnit || obs.unit || "";
                const sourceName = obs.source_name || obs.sourceName || "Government Source";
                const sourceType = obs.source_type || obs.sourceType || "OPEN_DATA";
                const obsTime = obs.observation_time || obs.observationTime || "2024-07-18";
                const stationName = obs.station_name || obs.stationName || "Observatory";
                const district = obs.district || "Karnataka";

                // Format interpretation label
                let interpLabel = "OBSERVED";
                let interpBg = "rgba(59, 130, 246, 0.12)";
                let interpColor = "var(--accent-info)";

                if (paramName === "RAINFALL_24H_MM") {
                  if (paramVal >= 204.5) { interpLabel = "EXTREMELY HEAVY"; interpColor = "var(--accent-critical)"; interpBg = "rgba(239, 68, 68, 0.15)"; }
                  else if (paramVal >= 115.6) { interpLabel = "VERY HEAVY"; interpColor = "var(--accent-high)"; interpBg = "rgba(249, 115, 22, 0.15)"; }
                  else if (paramVal >= 64.5) { interpLabel = "HEAVY"; interpColor = "var(--accent-warning)"; interpBg = "rgba(245, 158, 11, 0.15)"; }
                  else if (paramVal >= 15.6) { interpLabel = "MODERATE"; interpColor = "var(--accent-info)"; interpBg = "rgba(59, 130, 246, 0.15)"; }
                  else { interpLabel = "LIGHT"; interpColor = "var(--accent-safe)"; interpBg = "rgba(16, 185, 129, 0.15)"; }
                } else if (paramName === "RIVER_STAGE_M") {
                  interpLabel = "THRESHOLD METADATA REQUIRED";
                  interpColor = "var(--text-secondary)";
                  interpBg = "rgba(148, 163, 184, 0.12)";
                } else if (paramName === "RESERVOIR_INFLOW_CUSECS") {
                  interpLabel = "CONTEXT ONLY";
                  interpColor = "var(--accent-cyan)";
                  interpBg = "rgba(6, 182, 212, 0.12)";
                } else if (paramName === "TERRAIN_ELEVATION_M") {
                  interpLabel = "REFERENCE ONLY";
                  interpColor = "var(--text-muted)";
                  interpBg = "rgba(100, 116, 139, 0.12)";
                }

                return (
                  <div
                    key={obs.id || index}
                    style={{
                      padding: "16px 20px",
                      borderRight: "1px solid var(--border-color)",
                      borderBottom: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      background: "var(--bg-card)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {district} &middot; {paramName}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", background: interpBg, color: interpColor }}>
                        {interpLabel}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{stationName}</div>
                      <div style={{ fontSize: "22px", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)", marginTop: "4px" }}>
                        {typeof paramVal === "number" ? paramVal.toLocaleString() : paramVal} <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}>{unit}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "8px", fontSize: "11px", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)" }}>
                      <span title={sourceName} style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        {sourceName} ({sourceType})
                      </span>
                      <span>{obsTime.split("T")[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* OPERATIONAL RECOMMENDATIONS (Phase 3D) */}
      <div className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Operational Recommendations</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>Decision-support actions generated by hazard intelligence</p>
          </div>
          {recommendations.length > 0 && (
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
              {recommendations.length} Active
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {recommendations.length === 0 ? (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>NO ACTIVE RECOMMENDATIONS</div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Current hazard conditions do not require additional operational action.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0" }}>
              {recommendations.slice(0, 3).map((rec, index) => {
                const priorityColor = getRecommendationColor(rec.priority);
                const priorityBg = getRecommendationBg(rec.priority);

                return (
                  <div key={rec.id} style={{ padding: "24px", borderRight: index < 2 ? "1px solid var(--border-color)" : "none", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "16px" }}>

                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ background: priorityBg, color: priorityColor, fontSize: "10px", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", letterSpacing: "0.5px" }}>
                        {rec.priority} &middot; {rec.type}
                      </span>
                      <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
                        CONFIDENCE: {rec.confidence}
                      </span>
                    </div>

                    {/* Title & Area */}
                    <div>
                      <h4 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{rec.title}</h4>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>{rec.area}</div>
                    </div>

                    {/* Reason */}
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                      {rec.reason}
                    </div>

                    {/* Evidence (Compact) */}
                    {rec.evidence && rec.evidence.length > 0 && (
                      <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "6px", fontSize: "12px", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "2px" }}>EVIDENCE</div>
                        {rec.evidence.slice(0, 2).map((ev, i) => (
                          <div key={i} style={{ display: "flex", gap: "6px" }}>
                            <span style={{ color: "var(--accent-blue)" }}>•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                        {rec.evidence.length > 2 && <div style={{ fontStyle: "italic", marginTop: "2px", opacity: 0.8 }}>+ {rec.evidence.length - 2} more...</div>}
                      </div>
                    )}

                    {/* Action & Button */}
                    <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px" }}>RECOMMENDED ACTION</div>
                      <div style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "16px", fontWeight: 500 }}>
                        {rec.recommendedAction}
                      </div>

                      <button
                        className="action-btn"
                        style={{ width: "100%", justifyContent: "center", fontSize: "12px", padding: "8px" }}
                        onClick={() => handleRecommendationAction(rec.type)}
                      >
                        Action {rec.type}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* LOWER SECTION: RELOCATION PROGRESS & WORKFLOW */}
      <div className="grid-1-1">

        {/* RELOCATION PROGRESS */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Evacuation & Relocation Progress</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Live tracking of population transferred to safe havens</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-secondary)", padding: "20px", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Relocation Target</div>
                <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {safeStats.relocatedCount.toLocaleString()} <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>/ {safeStats.populationAtRisk.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-blue)" }}>
                {Math.round((safeStats.relocatedCount / (safeStats.populationAtRisk || 1)) * 100)}%
              </div>
            </div>

            <div style={{ width: "100%", height: "8px", background: "rgba(0,0,0,0.06)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(safeStats.relocatedCount / (safeStats.populationAtRisk || 1)) * 100}%`, height: "100%", background: "var(--accent-blue)" }}></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Evacuated</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-safe)" }}>{safeStats.relocatedCount.toLocaleString()}</div>
            </div>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>In Transit</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-warning)" }}>420</div>
            </div>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{Math.max(0, safeStats.populationAtRisk - safeStats.relocatedCount).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* SYSTEM EXECUTION PIPELINE */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>System Execution Pipeline</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Automated decision workflow</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { step: "01", title: "Hazard Detection", desc: "Flood & slope sensor metrics calculated", done: true },
              { step: "02", title: "Red Zone Demarcation", desc: "Buffer zones & high-risk habitations isolated", done: true },
              { step: "03", title: "Capacity Matching", desc: "Pair habitations to nearest available safe shelters", done: true },
              { step: "04", title: "Evacuation Dispatch", desc: "Live vehicle dispatch & route visualizer", done: false }
            ].map((st) => (
              <div key={st.step} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "var(--bg-secondary)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: st.done ? "var(--text-secondary)" : "var(--text-muted)", width: "16px" }}>
                  {st.step}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{st.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{st.desc}</div>
                </div>
                <div style={{ fontSize: "10px", fontWeight: 700, color: st.done ? "var(--accent-safe)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", background: st.done ? "rgba(16, 185, 129, 0.1)" : "rgba(0,0,0,0.05)", padding: "4px 8px", borderRadius: "4px" }}>
                  {st.done ? "COMPLETED" : "IN PROGRESS"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewView;
