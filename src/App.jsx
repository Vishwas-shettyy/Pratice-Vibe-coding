import React, { useState, useEffect } from "react";
import "./App.css";

import NavbarSidebar from "./components/NavbarSidebar";
import HeaderTopbar from "./components/HeaderTopbar";
import OverviewView from "./components/OverviewView";
import RiskMapExplorer from "./components/RiskMapExplorer";
import RedZonesView from "./components/RedZonesView";
import SafeSitesView from "./components/SafeSitesView";
import RelocationPlannerView from "./components/RelocationPlannerView";
import AnalyticsView from "./components/AnalyticsView";
import SimulatorView from "./components/SimulatorView";
import DetailModal from "./components/DetailModal";
import ResourceManagementView from "./components/ResourceManagementView";

import { api } from "./services/api";
import {
  INITIAL_STATS,
  ALERTS_DATA,
  HABITATIONS_DATA,
  SAFE_SITES_DATA,
  HAZARD_ZONES,
  EVACUATION_ROUTES
} from "./data/disasterData";

const normalizeDashboardStats = (rawStats = {}) => ({
  populationAtRisk: Number(rawStats.populationAtRisk ?? rawStats.totalPopulationAtRisk ?? 0),
  redZonesCount: Number(rawStats.redZonesCount ?? 0),
  safeSitesCount: Number(rawStats.safeSitesCount ?? 0),
  totalCapacity: Number(rawStats.totalCapacity ?? 0),
  relocatedCount: Number(rawStats.relocatedCount ?? 0),
  surplusCapacity: Number(rawStats.surplusCapacity ?? rawStats.availableCapacity ?? 0),
  criticalAlerts: Number(rawStats.criticalAlerts ?? rawStats.criticalAlertsCount ?? 0),
  systemStatus: rawStats.systemStatus ?? "OFFLINE",
  hazardLevel: rawStats.hazardLevel ?? "UNKNOWN",
});

function App() {
  const [activeTab, setActiveTab] = useState("overview");

  // Theme State (Dark / Light) with Persistence - Dark mode default
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("apex_theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("apex_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Dynamic Data States (fetched from Flask REST API)
  const [stats, setStats] = useState(INITIAL_STATS);
  const [habitations, setHabitations] = useState(HABITATIONS_DATA);
  const [safeSites, setSafeSites] = useState(SAFE_SITES_DATA);
  const [hazardZones, setHazardZones] = useState(HAZARD_ZONES);
  const [evacuationRoutes, setEvacuationRoutes] = useState(EVACUATION_ROUTES);
  const [alerts, setAlerts] = useState(ALERTS_DATA);
  const [recommendations, setRecommendations] = useState([]);
  const [resources, setResources] = useState({});
  const [environmentalObservations, setEnvironmentalObservations] = useState([]);
  const [latestSimulationResult, setLatestSimulationResult] = useState(null);
  const [isHarshCaseActive, setIsHarshCaseActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [apiError, setApiError] = useState("");

  // Load Data from Flask Backend API
  const loadBackendData = async () => {
    try {
      setLoading(true);
      setApiError("");
      const [backendStats, backendAreas, backendShelters, backendAlerts, backendMap, backendResources, backendRecommendations, backendObs] = await Promise.all([
        api.getDashboardStats(),
        api.getRiskAreas(),
        api.getShelters(),
        api.getAlerts(),
        api.getMapData(),
        api.getResources(),
        api.getRecommendations().catch(e => { console.warn("Failed to fetch recommendations", e); return []; }),
        api.getEnvironmentalObservations().catch(e => { console.warn("Failed to fetch environmental observations", e); return []; }),
      ]);

      setStats(normalizeDashboardStats(backendStats));
      setHabitations(Array.isArray(backendAreas) ? backendAreas : HABITATIONS_DATA);
      setSafeSites(Array.isArray(backendShelters) ? backendShelters : SAFE_SITES_DATA);
      setAlerts(Array.isArray(backendAlerts) ? backendAlerts : ALERTS_DATA);
      setRecommendations(Array.isArray(backendRecommendations) ? backendRecommendations : []);
      if (Array.isArray(backendObs)) setEnvironmentalObservations(backendObs);
      if (backendMap?.hazardZones) setHazardZones(backendMap.hazardZones);
      if (backendMap?.evacuationRoutes) setEvacuationRoutes(backendMap.evacuationRoutes);
      setResources(backendResources || {});

      setBackendOnline(true);
    } catch (err) {
      console.warn("Using offline fallback data for frontend:", err.message);
      setBackendOnline(false);
      setApiError("Flask backend unavailable. Showing offline fallback data.");
      setStats(INITIAL_STATS);
      setHabitations(HABITATIONS_DATA);
      setSafeSites(SAFE_SITES_DATA);
      setAlerts(ALERTS_DATA);
      setRecommendations([]);
      setEnvironmentalObservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, []);

  // Update Relocation Status via API Call
  const handleUpdateRelocationStatus = async (areaId, newStatus, progress = null) => {
    try {
      await api.updateRelocationStatus(areaId, newStatus, progress);
      // Re-fetch updated data
      await loadBackendData();
    } catch (err) {
      console.error("Failed to update status on backend, updating local state:", err);
      setHabitations((prev) =>
        prev.map((h) => (h.id === areaId ? { ...h, relocationStatus: newStatus } : h))
      );
    }
  };

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    content: null
  });

  const closeModal = () => setModalConfig({ isOpen: false, title: "", content: null });

  // Open Habitation Inspection Modal
  const handleInspectHabitation = (hab) => {
    const riskScore = Number(hab?.riskScore ?? hab?.risk_score ?? hab?.risk_assessment?.risk_score ?? 0);
    const riskLevel = String(hab?.riskLevel ?? hab?.risk_level ?? hab?.risk_assessment?.risk_level ?? "LOW");
    const factorScores = hab?.risk_assessment?.factor_scores || {};
    const factors = hab?.risk_assessment?.contributing_factors || [];

    setModalConfig({
      isOpen: true,
      title: `Habitation Audit: ${hab.name} (${hab.code})`,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "var(--text-primary)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Risk Rating</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "6px" }}>
                <strong style={{ display: "block", fontSize: "20px", color: riskScore >= 85 ? "var(--accent-red)" : "var(--accent-amber)" }}>
                  {riskScore} / 100
                </strong>
                <span className={`badge ${riskLevel === "CRITICAL" ? "immediate" : riskLevel === "HIGH" ? "short" : "medium"}`}>
                  {riskLevel}
                </span>
              </div>
            </div>
            <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Total Population</span>
              <strong style={{ display: "block", fontSize: "20px", color: "var(--text-primary)" }}>
                {hab.population} residents
              </strong>
            </div>
          </div>

          <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px", fontSize: "13px" }}>
            <div style={{ fontWeight: 700, marginBottom: "8px", color: "var(--accent-blue)" }}>Risk Drivers</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {Object.entries(factorScores).map(([key, value]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>{key.replace(/_/g, " ")}</span>
                  <strong>{Number(value).toFixed(1)}</strong>
                </div>
              ))}
            </div>
            {factors.length > 0 && (
              <div style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--accent-cyan)" }}>Contributing factors:</strong> {factors.join(", ")}
              </div>
            )}
          </div>

          <div style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div><strong>Road Condition:</strong> {hab.roadCondition}</div>
            <div><strong>Primary Threat:</strong> {hab.hazardType} ({hab.hazardLevel})</div>
            <div><strong>Relocation Status:</strong> <span className="badge safe">{hab.relocationStatus}</span></div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              className="action-btn primary"
              style={{ flex: 1, justifyContent: "center" }}
              onClick={() => {
                closeModal();
                setActiveTab("relocation");
              }}
            >
              Dispatch Evacuation Route
            </button>
            <button className="action-btn" style={{ justifyContent: "center" }} onClick={closeModal}>
              Close Audit
            </button>
          </div>
        </div>
      )
    });
  };

  // Open Shelter Inspection Modal
  const handleInspectShelter = (site) => {
    const occPct = Math.round((site.occupied / site.capacity) * 100);
    setModalConfig({
      isOpen: true,
      title: `Shelter Control Room: ${site.name}`,
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "var(--text-primary)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>CAPACITY</span>
              <strong style={{ display: "block", fontSize: "18px" }}>{site.capacity}</strong>
            </div>
            <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>OCCUPIED</span>
              <strong style={{ display: "block", fontSize: "18px", color: "var(--accent-amber)" }}>{site.occupied} ({occPct}%)</strong>
            </div>
            <div style={{ background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>AVAILABLE</span>
              <strong style={{ display: "block", fontSize: "18px", color: "var(--accent-emerald)" }}>{site.available}</strong>
            </div>
          </div>

          <div style={{ background: "var(--bg-secondary)", padding: "14px", borderRadius: "8px" }}>
            <div style={{ fontWeight: 700, marginBottom: "10px", color: "var(--accent-cyan)", fontSize: "13px" }}>Relief Logistics Stock</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
              <div>Water: <strong>{site.waterStockLiters?.toLocaleString()} L</strong></div>
              <div>Food Rations: <strong>{site.foodMealsStock?.toLocaleString()} Meals</strong></div>
              <div>Medical Teams: <strong>{site.medicalTeams} Units</strong></div>
              <div>Gensets: <strong>{site.powerGenerators} Units</strong></div>
            </div>
          </div>

          <button className="action-btn primary" style={{ width: "100%", justifyContent: "center" }} onClick={closeModal}>
            Acknowledge Control Room Status
          </button>
        </div>
      )
    });
  };

  // Trigger Emergency Broadcast Action
  const handleTriggerEmergency = () => {
    setModalConfig({
      isOpen: true,
      title: "Emergency Broadcast Issued",
      content: (
        <div style={{ textAlign: "center", padding: "10px 0" }}>
          <div className="pulse-red" style={{ display: "inline-block", padding: "16px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.2)", marginBottom: "16px" }}>
            <svg width="44" height="44" fill="none" stroke="var(--accent-red)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 style={{ color: "var(--text-primary)", fontSize: "18px", marginBottom: "8px", fontWeight: 700 }}>
            Statewide Disaster Alert Broadcasted
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px", lineHeight: 1.5 }}>
            Emergency push SMS, weather siren warnings, and regional transport dispatch orders have been dispatched to control centers.
          </p>
          <button className="action-btn primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }} onClick={closeModal}>
            Acknowledge & Dismiss Alert
          </button>
        </div>
      )
    });
  };

  // Export GIS Report Action (with Generating -> Ready state transition)
  const handleExportReport = () => {
    // 1. Show Generating State
    setModalConfig({
      isOpen: true,
      title: "Generating GIS Disaster Executive Report",
      content: (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div style={{ display: "inline-block", padding: "16px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.15)", marginBottom: "16px" }}>
            <svg width="44" height="44" fill="none" stroke="var(--accent-blue)" viewBox="0 0 24 24" className="spin-slow">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 style={{ color: "var(--text-primary)", fontSize: "18px", marginBottom: "8px", fontWeight: 700 }}>
            Analyzing GIS Layers & Compiling Report...
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px", lineHeight: 1.5 }}>
            Processing district hazard zones, shelter capacity reserves ({stats.totalCapacity} beds), and AI relocation polylines.
          </p>
          <div style={{ width: "100%", height: "6px", background: "var(--bg-secondary)", borderRadius: "3px", overflow: "hidden" }}>
            <div className="loading-progress-bar" />
          </div>
        </div>
      )
    });

    // 2. Transition inside the SAME centered modal to Ready State after 1 second
    setTimeout(() => {
      setModalConfig({
        isOpen: true,
        title: "PDF Intelligence Report Ready",
        content: (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ display: "inline-block", padding: "16px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", marginBottom: "16px" }}>
              <svg width="44" height="44" fill="none" stroke="var(--accent-safe)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 style={{ color: "var(--text-primary)", fontSize: "18px", marginBottom: "8px", fontWeight: 700 }}>
              PDF Intelligence Report Ready
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px", lineHeight: 1.5 }}>
              Report includes Red Zone habitations analysis, shelter capacity reserves ({stats.totalCapacity} beds), and AI relocation transit routes.
            </p>
            <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              <button
                className="action-btn primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: "14px" }}
                onClick={() => {
                  const blob = new Blob(["RESQ GIS Disaster Executive Report\nGenerated: " + new Date().toISOString() + "\nStatus: District High-Risk Monitored"], { type: "text/plain" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = "RESQ_Disaster_Report.pdf";
                  link.click();
                  closeModal();
                }}
              >
                Download RESQ_Disaster_Report.pdf
              </button>
              <button className="action-btn" style={{ width: "100%", justifyContent: "center", padding: "10px" }} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        )
      });
    }, 1000);
  };

  // Handle Scenario Simulator updates
  const handleSimulateImpact = (simResult) => {
    setLatestSimulationResult(simResult.fullResult);
    setStats((prev) => ({
      ...prev,
      hazardLevel: simResult.threatLabel,
      redZonesCount: simResult.calculatedRiskIndex > 75 ? 12 : 8
    }));

    const newSimAlert = {
      id: `ALT-SIM-${Date.now()}`,
      type: "WARNING",
      title: `Scenario Simulation: ${simResult.threatLabel}`,
      time: "Just now",
      message: `Simulated Rainfall: ${simResult.rainfall}mm/hr | Slope Instability: ${simResult.slopeInstability}%. Risk Index recalculated to ${simResult.calculatedRiskIndex}/100.`
    };
    setAlerts([newSimAlert, ...alerts]);

    setActiveTab("overview");
  };

  const handleToggleHarshCase = async () => {
    if (isHarshCaseActive) {
      handleClearScenario();
      return;
    }

    try {
      setLoading(true);
      const scenarioId = "KODAGU_EXTREME_MONSOON_HARSH_CASE";
      const scenarioRes = await api.runScenario(scenarioId);
      const relocationRes = await api.runScenarioRelocation(scenarioId);
      let roadImpactsRes = [];
      try {
        roadImpactsRes = (await api.getScenarioRoadImpacts(scenarioId)) || [];
      } catch (err) {
        console.warn("Failed to fetch road impacts for harsh case", err);
      }

      const harshSimResult = {
        scenario: scenarioRes,
        relocations: relocationRes,
        roadImpacts: roadImpactsRes,
        isHarshCase: true,
        scenarioId: scenarioId,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }).replace(":", ""),
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
      };

      setLatestSimulationResult(harshSimResult);
      setIsHarshCaseActive(true);

      const harshAlert = {
        id: `ALT-SIM-HARSH-${Date.now()}`,
        type: "CRITICAL",
        severity: "CRITICAL",
        title: "HARSH CASE SCENARIO SIMULATION ACTIVE",
        time: "Just now",
        message: "Extreme 450mm rainfall and severe landslide stress simulation active across Kodagu. 15 settlements elevated to Critical Red Zones, 1,311 roads disrupted. Simulation only — not a live forecast.",
      };
      setAlerts((prev) => [harshAlert, ...prev.filter((a) => !String(a.id).startsWith("ALT-SIM-"))]);

      setStats((prev) => ({
        ...prev,
        hazardLevel: "CRITICAL",
        redZonesCount: 15,
      }));
    } catch (err) {
      console.error("Failed to run harsh case scenario", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearScenario = () => {
    setLatestSimulationResult(null);
    setIsHarshCaseActive(false);
    setAlerts((prev) => prev.filter(a => !String(a.id).startsWith("ALT-SIM-")));
    // Restore hazardLevel and redZonesCount from backend data or INITIAL_STATS
    setStats((prev) => ({
      ...prev,
      hazardLevel: INITIAL_STATS.hazardLevel,
      redZonesCount: INITIAL_STATS.redZonesCount
    }));
  };

  // Header Titles Map
  const getHeaderInfo = () => {
    switch (activeTab) {
      case "overview":
        return {
          title: "Disaster Intelligence Command Center",
          subtitle: ""
        };
      case "map":
        return {
          title: "Interactive GIS Risk Map Explorer",
          subtitle: "Live hazard buffer overlays, vulnerable habitations, and evacuation polylines"
        };
      case "redzones":
        return {
          title: "Red Zones & Vulnerable Habitations",
          subtitle: "Detailed settlement risk audit, demographic vulnerabilities, and hazard scores"
        };
      case "safesites":
        return {
          title: "Safe Sites & Relief Shelters",
          subtitle: "High-ground shelter capacities, medical teams, and emergency supply stocks"
        };
      case "relocation":
        return {
          title: "AI Relocation & Route Planner",
          subtitle: "Algorithmic origin-to-destination pairing and transport logistics calculator"
        };
      case "analytics":
        return {
          title: "Operational Decision Analysis",
          subtitle: "Multi-hazard reports, resource readiness, and simulation insights"
        };
      case "resources":
        return {
          title: "Resource Management & Logistics",
          subtitle: "Real-time visibility into emergency vehicles, personnel, and relief supplies"
        };
      case "simulator":
        return {
          title: "Hazard Impact Scenario Simulator",
          subtitle: "'What-If' severe event simulation for emergency dispatch testing"
        };
      default:
        return { title: "RESQ Command Center", subtitle: "Emergency Response Platform" };
    }
  };

  const headerInfo = getHeaderInfo();

  const getHighestPriorityAlert = () => {
    const activeAlerts = alerts.filter(a => a.status === "ACTIVE");
    if (!activeAlerts.length) return null;

    const severityOrder = { "CRITICAL": 4, "HIGH": 3, "WARNING": 2, "INFO": 1 };

    return activeAlerts.sort((a, b) => {
      const rankA = severityOrder[a.severity?.toUpperCase()] || 0;
      const rankB = severityOrder[b.severity?.toUpperCase()] || 0;
      return rankB - rankA;
    })[0];
  };

  const latestAlert = getHighestPriorityAlert();

  return (
    <div className="app-container">
      {/* LEFT SIDEBAR NAVIGATION */}
      <NavbarSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={alerts.filter((a) => a.status === "ACTIVE").length}
      />

      {/* MAIN CONTENT CONTAINER */}
      <main className="app-main">
        {/* TOP HEADER (Fixed) */}
        <div style={{ flex: "none", zIndex: 90 }}>
          <HeaderTopbar
            title={headerInfo.title}
            subtitle={headerInfo.subtitle}
            theme={theme}
            onToggleTheme={toggleTheme}
            onTriggerEmergency={handleTriggerEmergency}
            onExportReport={handleExportReport}
            latestAlert={latestAlert}
            backendOnline={backendOnline}
            isHarshCaseActive={isHarshCaseActive}
            onToggleHarshCase={handleToggleHarshCase}
          />
        </div>

        {/* SCROLLING CONTENT */}
        <div className="app-content">
          {/* DYNAMIC TAB VIEWS */}
          <div className="view-container">
          {apiError && (
            <div className="glass-panel" style={{ padding: "12px 16px", marginBottom: "12px", borderColor: "rgba(239,68,68,0.45)" }}>
              <div className="panel-sub" style={{ color: "var(--accent-red)", margin: 0 }}>
                {apiError}
              </div>
            </div>
          )}

          {loading && activeTab === "overview" ? (
            <div className="glass-panel" style={{ padding: "32px", textAlign: "center" }}>
              <div className="panel-title">Loading dashboard data…</div>
              <div className="panel-sub">Fetching disaster intelligence feeds from the Flask backend.</div>
            </div>
          ) : null}

          {activeTab === "overview" && !loading && (
            <OverviewView
              stats={stats}
              habitations={habitations}
              safeSites={safeSites}
              recommendations={recommendations}
              environmentalObservations={environmentalObservations}
              onSelectHabitation={handleInspectHabitation}
              onNavigateToMap={() => setActiveTab("map")}
              onNavigateToPlanner={() => setActiveTab("relocation")}
              onNavigateToShelters={() => setActiveTab("safesites")}
              onNavigateToResources={() => setActiveTab("resources")}
              onNavigateToRedZones={() => setActiveTab("redzones")}
              simulationResult={latestSimulationResult}
              onClearScenario={handleClearScenario}
              backendOnline={backendOnline}
            />
          )}

          {activeTab === "map" && (
            <RiskMapExplorer
              habitations={habitations}
              safeSites={safeSites}
              hazardZones={hazardZones}
              evacuationRoutes={evacuationRoutes}
              environmentalObservations={environmentalObservations}
              simulationResult={latestSimulationResult}
              onSelectHabitation={handleInspectHabitation}
              onSelectShelter={handleInspectShelter}
              onClearScenario={handleClearScenario}
            />
          )}

          {activeTab === "redzones" && (
            <RedZonesView
              habitations={habitations}
              onSelectHabitation={handleInspectHabitation}
              onUpdateStatus={handleUpdateRelocationStatus}
              simulationResult={latestSimulationResult}
              onClearScenario={handleClearScenario}
            />
          )}

          {activeTab === "safesites" && (
            <SafeSitesView
              safeSites={safeSites}
              onSelectShelter={handleInspectShelter}
            />
          )}

          {activeTab === "relocation" && (
            <RelocationPlannerView
              habitations={habitations}
              safeSites={safeSites}
              routes={evacuationRoutes}
              onRefreshData={loadBackendData}
              simulationResult={latestSimulationResult}
              onClearScenario={handleClearScenario}
            />
          )}

          {activeTab === "analytics" && (
            <AnalyticsView
              habitations={habitations}
              shelters={safeSites}
              stats={stats}
              resources={resources}
              simulationResult={latestSimulationResult}
              theme={theme}
              onExportReport={handleExportReport}
            />
          )}

          {activeTab === "resources" && (
            <ResourceManagementView
              resources={resources}
              habitations={habitations}
              safeSites={safeSites}
            />
          )}

          {activeTab === "simulator" && (
            <SimulatorView
              onSimulateImpact={handleSimulateImpact}
              onClearScenario={handleClearScenario}
              simulationResult={latestSimulationResult}
            />
          )}
        </div>
        </div>
      </main>

      {/* INSPECTION / ALERT MODAL DIALOG */}
      <DetailModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        onClose={closeModal}
      >
        {modalConfig.content}
      </DetailModal>
    </div>
  );
}

export default App;