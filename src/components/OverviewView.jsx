import React, { useState } from "react";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function OverviewView({
  stats = {},
  habitations = [],
  safeSites = [],
  recommendations = [],
  environmentalObservations = [],
  simulationResult,
  onClearScenario,
  backendOnline = true,
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
      {simulationResult && (() => {
        const isHarsh = simulationResult.isHarshCase || simulationResult.scenarioId === "KODAGU_EXTREME_MONSOON_HARSH_CASE";
        const bannerColor = isHarsh ? "var(--accent-red)" : "#a855f7";
        const bannerBg = isHarsh ? "rgba(239, 68, 68, 0.04)" : "var(--bg-card)";
        const affectedCount = simulationResult.relocations?.length || 0;
        const criticalCount = simulationResult.relocations?.filter(r => r.priority === 'CRITICAL').length || 0;
        const blockedCount = simulationResult.roadImpacts?.filter(i => i.impact_status === 'BLOCKED').length || 0;
        const restrictedCount = simulationResult.roadImpacts?.filter(i => i.impact_status === 'RESTRICTED').length || 0;
        const successCount = simulationResult.relocations?.filter(r => r.route_status === 'SUCCESS').length || 0;
        const noRouteCount = simulationResult.relocations?.filter(r => r.route_status === 'NO_ROUTE').length || 0;
        const capInsuffCount = simulationResult.relocations?.filter(r => r.capacity_status === 'CAPACITY_INSUFFICIENT').length || 0;

        return (
          <div className="glass-panel" style={{ background: bannerBg, border: `1px solid ${bannerColor}`, borderTop: `3px solid ${bannerColor}`, borderRadius: "8px", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: bannerColor, color: "#fff", letterSpacing: "1px" }}>
                    {isHarsh ? "HARSH CASE" : "SCENARIO SIMULATION"}
                  </span>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", color: bannerColor, margin: 0 }}>
                    {isHarsh ? "HARSH CASE ACTIVE — Extreme Flood + Landslide Simulation" : `SCENARIO RESULT: ${simulationResult.scenario?.scenario_name || "Simulation"}`}
                  </h3>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                  Date: {simulationResult.date} {simulationResult.timestamp} | Data Status: SCENARIO | Scenario ID: {isHarsh ? "KODAGU_EXTREME_MONSOON_HARSH_CASE" : (simulationResult.scenario?.id || "KODAGU_MONSOON_FLOOD_LANDSLIDE_SCENARIO")}
                </p>
              </div>
              <button className="action-btn" onClick={onClearScenario} style={{ border: `1px solid ${bannerColor}`, color: bannerColor, background: isHarsh ? "rgba(239, 68, 68, 0.1)" : "rgba(168, 85, 247, 0.1)" }}>
                Exit Scenario
              </button>
            </div>

            {/* REQUIRED HARSH CASE DISCLAIMER */}
            <div style={{ background: isHarsh ? "rgba(239, 68, 68, 0.08)" : "rgba(168, 85, 247, 0.08)", border: `1px solid ${isHarsh ? "rgba(239, 68, 68, 0.25)" : "rgba(168, 85, 247, 0.25)"}`, borderRadius: "6px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
              <strong style={{ color: bannerColor, marginRight: "6px" }}>SIMULATION ONLY:</strong>
              HARSH CASE is a deterministic simulation used to demonstrate ResQ response under extreme disaster conditions. Results are simulated and do not represent a live hazard forecast.
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
              <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Affected Settlements</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)" }}>{affectedCount}</div>
              </div>
              
              <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Critical Priorities</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--accent-critical)" }}>{criticalCount}</div>
              </div>

              <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Blocked Roads</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--accent-red)" }}>{blockedCount}</div>
              </div>

              <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Restricted Roads</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--accent-warning)" }}>{restrictedCount}</div>
              </div>
              
              <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Successful Relocations</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--accent-safe)" }}>{successCount}</div>
              </div>
              
              <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>NO_ROUTE Cases</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: noRouteCount > 0 ? "var(--accent-critical)" : "var(--text-primary)" }}>{noRouteCount}</div>
              </div>

              <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "6px" }}>Capacity Insufficient</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: capInsuffCount > 0 ? "var(--accent-warning)" : "var(--text-primary)" }}>{capInsuffCount}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* KPI COMMAND STRIP */}
      <div className="stats-grid">
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", padding: "20px" }}>
          {!backendOnline && <div style={{ position: "absolute", top: "20px", right: "20px", fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>DEMO</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent-critical)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Population at Risk</div>
              <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.1 }}>
                {safeStats.populationAtRisk.toLocaleString()}
              </div>
            </div>
            {/* Sparkline Mock */}
            <div style={{ width: "60px", height: "30px", opacity: 0.6 }}>
              <svg viewBox="0 0 60 30" width="100%" height="100%">
                <polyline fill="none" stroke="var(--accent-critical)" strokeWidth="2" points="0,25 15,20 30,28 45,10 60,15" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" fill="none" stroke="var(--accent-critical)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
            <span style={{ color: "var(--accent-critical)", fontWeight: 600 }}>+12%</span> vs last hour
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", padding: "20px" }}>
          {!backendOnline && <div style={{ position: "absolute", top: "20px", right: "20px", fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>DEMO</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", background: "rgba(249, 115, 22, 0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent-high)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Red Zones</div>
              <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.1 }}>
                {safeStats.redZonesCount}
              </div>
            </div>
            <div style={{ width: "60px", height: "30px", opacity: 0.6 }}>
              <svg viewBox="0 0 60 30" width="100%" height="100%">
                <polyline fill="none" stroke="var(--accent-high)" strokeWidth="2" points="0,20 20,25 40,15 60,10" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" fill="none" stroke="var(--accent-high)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
            <span style={{ color: "var(--accent-high)", fontWeight: 600 }}>+2</span> new zones identified
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", padding: "20px" }}>
          {!backendOnline && <div style={{ position: "absolute", top: "20px", right: "20px", fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>DEMO</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent-blue)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Safe Shelters</div>
              <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.1 }}>
                {safeStats.safeSitesCount}
              </div>
            </div>
            <div style={{ width: "60px", height: "30px", opacity: 0.6 }}>
              <svg viewBox="0 0 60 30" width="100%" height="100%">
                <polyline fill="none" stroke="var(--accent-blue)" strokeWidth="2" points="0,15 30,15 60,15" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"/></svg>
            No change
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative", padding: "20px" }}>
          {!backendOnline && <div style={{ position: "absolute", top: "20px", right: "20px", fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>DEMO</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" fill="none" stroke="var(--accent-safe)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Available Capacity</div>
              <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", lineHeight: 1.1 }}>
                {safeStats.totalCapacity.toLocaleString()}
              </div>
            </div>
            <div style={{ width: "60px", height: "30px", opacity: 0.6 }}>
              <svg viewBox="0 0 60 30" width="100%" height="100%">
                <polyline fill="none" stroke="var(--accent-safe)" strokeWidth="2" points="0,25 20,20 40,22 60,10" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" fill="none" stroke="var(--accent-safe)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
            <span style={{ color: "var(--accent-safe)", fontWeight: 600 }}>+{safeStats.surplusCapacity}</span> capacity surplus
          </div>
        </div>
      </div>

      {/* REGIONAL RISK & PRIORITY HABITATIONS */}
      <div className="grid-2-1">
        {/* GIS LAUNCH PANEL */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "4px" }}>Regional Risk & Hazard Assessment</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>Real-time GIS hazard layers & vulnerable habitations</p>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>

            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="pulse-red" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-safe)", display: "inline-block" }}></span>
                <span style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--accent-safe)", background: "rgba(16, 185, 129, 0.1)", padding: "4px 8px", borderRadius: "12px" }}>LIVE DATA</span>
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

              {/* COMPACT MAP PREVIEW */}
              <div style={{ 
                height: "200px", 
                width: "100%", 
                borderRadius: "12px", 
                overflow: "hidden", 
                border: "1px solid var(--border-color)",
                opacity: 0.9,
                pointerEvents: "none" // PREVIEW ONLY
              }}>
                <MapContainer
                  center={[12.2958, 76.6394]}
                  zoom={10}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  attributionControl={false}
                  style={{ height: "100%", width: "100%", background: "#0f172a" }}
                >
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" opacity={1} />
                  {/* Floating map controls (left) and checklist (right) added here just visually */}
                  <div style={{ position: "absolute", top: 10, left: 10, zIndex: 400, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: "6px", padding: 6, boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: "6px", padding: 6, boxShadow: "0 2px 5px rgba(0,0,0,0.1)", cursor: "pointer" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/></svg>
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 10, right: 10, zIndex: 400, background: "#fff", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, marginBottom: "8px", color: "var(--text-primary)" }}>Map Layers</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", color: "var(--text-secondary)", marginBottom: 4 }}>
                      <input type="checkbox" defaultChecked /> Rainfall
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", color: "var(--text-secondary)", marginBottom: 4 }}>
                      <input type="checkbox" defaultChecked /> Flood Risk
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", color: "var(--text-secondary)", marginBottom: 4 }}>
                      <input type="checkbox" defaultChecked /> Landslide Risk
                    </label>
                  </div>
                  <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 400, background: "rgba(255,255,255,0.8)", padding: "2px 8px", fontSize: "10px", border: "1px solid var(--border-color)", borderRadius: "4px" }}>
                    Scale: 10km | __
                  </div>
                  {sortedHabitations.slice(0, 15).map((hab) => {
                    const riskLevel = getHabitRiskLevel(hab);
                    const isCritical = riskLevel === "CRITICAL" || riskLevel === "IMMEDIATE";
                    return (
                      <CircleMarker
                        key={`preview-${hab.id}`}
                        center={[hab.lat, hab.lng]}
                        radius={isCritical ? 7 : 5}
                        pathOptions={{ 
                          color: isCritical ? "#dc2626" : "#ea580c",
                          fillColor: isCritical ? "#ef4444" : "#f97316",
                          fillOpacity: 0.6, 
                          weight: 1 
                        }}
                      />
                    );
                  })}
                </MapContainer>
              </div>

              <div style={{ marginTop: "auto", paddingTop: "0px" }}>
                <button className="action-btn primary" style={{ padding: "10px 20px" }} onClick={onNavigateToMap}>
                  Open Interactive GIS Map
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PRIORITY QUEUE */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "4px" }}>Priority Habitations</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>Relocation queue by hazard rating</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sortedHabitations.slice(0, 4).map((hab, index) => {
              const riskLevel = getHabitRiskLevel(hab);
              const isCritical = riskLevel === "CRITICAL" || riskLevel === "IMMEDIATE";
              const isHigh = riskLevel === "HIGH" || riskLevel === "SHORT-TERM";
              const statusColor = isCritical ? "var(--accent-critical)" : isHigh ? "var(--accent-warning)" : "var(--accent-blue)";

              return (
                <div key={hab.id} onClick={() => onSelectHabitation(hab)} className="habitation-card-item" style={{ display: "flex", alignItems: "center", padding: "16px", border: "1px solid var(--border-color)", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s ease" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px", background: isCritical ? "rgba(239, 68, 68, 0.1)" : isHigh ? "rgba(249, 115, 22, 0.1)" : "rgba(245, 158, 11, 0.1)", color: statusColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {riskLevel === "IMMEDIATE" || riskLevel === "CRITICAL" ? "VERY HIGH" : riskLevel}
                    </div>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>{hab.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{hab.population} at-risk</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>{getHabitRiskScore(hab)} <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>/ 100</span></div>
                    </div>
                    <svg width="16" height="16" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            <button className="action-btn" style={{ width: "100%", justifyContent: "center", fontSize: "13px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} onClick={onNavigateToPlanner}>
              View All Priority Habitations
            </button>
          </div>
        </div>
      </div>

      {/* REAL ENVIRONMENTAL INTELLIGENCE FEED */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
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
                    className="glass-panel"
                    style={{
                      padding: "24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ width: "32px", height: "32px", background: "var(--bg-secondary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="16" height="16" fill="none" stroke="var(--text-secondary)" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px", background: interpBg, color: interpColor, letterSpacing: "0.5px" }}>
                        {interpLabel}
                      </span>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                        {district} &middot; {paramName}
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>{stationName}</div>
                      <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginTop: "4px" }}>
                        {typeof paramVal === "number" ? paramVal.toLocaleString() : paramVal} <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-muted)" }}>{unit}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "12px", fontSize: "11px", color: "var(--text-muted)" }}>
                      <span title={sourceName} style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        {sourceName}
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
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h3 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "4px" }}>Operational Recommendations</h3>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              {recommendations.slice(0, 3).map((rec, index) => {
                const priorityColor = getRecommendationColor(rec.priority);
                const priorityBg = getRecommendationBg(rec.priority);

                return (
                  <div key={rec.id} className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

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
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "4px" }}>Evacuation & Relocation Progress</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>Live tracking of population transferred to safe havens</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-secondary)", padding: "20px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
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

            <div style={{ width: "100%", height: "8px", background: "var(--bg-card)", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
              <div style={{ width: `${(safeStats.relocatedCount / (safeStats.populationAtRisk || 1)) * 100}%`, height: "100%", background: "var(--accent-blue)" }}></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "6px", background: "var(--bg-card)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Evacuated</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-safe)" }}>{safeStats.relocatedCount.toLocaleString()}</div>
            </div>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "6px", background: "var(--bg-card)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>In Transit</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-warning)" }}>420</div>
            </div>
            <div style={{ border: "1px solid var(--border-color)", padding: "16px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "6px", background: "var(--bg-card)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Pending</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>{Math.max(0, safeStats.populationAtRisk - safeStats.relocatedCount).toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* SYSTEM EXECUTION PIPELINE */}
        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)", marginBottom: "4px" }}>System Execution Pipeline</h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>Automated decision workflow</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { step: "01", title: "Hazard Detection", desc: "Flood & slope sensor metrics calculated", done: true },
              { step: "02", title: "Red Zone Demarcation", desc: "Buffer zones & high-risk habitations isolated", done: true },
              { step: "03", title: "Capacity Matching", desc: "Pair habitations to nearest available safe shelters", done: true },
              { step: "04", title: "Evacuation Dispatch", desc: "Live vehicle dispatch & route visualizer", done: false }
            ].map((st) => (
              <div key={st.step} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", border: "1px solid var(--border-color)", borderRadius: "12px", background: "var(--bg-secondary)" }}>
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
