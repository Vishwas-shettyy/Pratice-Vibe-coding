import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function AnalyticsView({ habitations = [], shelters = [], stats = {}, resources = {}, simulationResult = null, theme = "dark", onExportReport }) {
  const isDark = theme === "dark";
  const textColor = isDark ? "#9ca3af" : "#475569";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const safeHabitations = Array.isArray(habitations) ? habitations : [];
  const safeShelters = Array.isArray(shelters) ? shelters : [];

  if (!safeHabitations.length && !safeShelters.length) {
    return (
      <div className="empty-state">
        No analytics data is currently available. The backend may be offline or returning an empty response.
      </div>
    );
  }

  // Derived Operational Stats
  const popAtRisk = Number(stats.populationAtRisk || stats.totalPopulationAtRisk || 0);
  const highCriticalHabitations = safeHabitations.filter(h => {
    const score = Number(h.riskScore || h.risk_score || h.risk_assessment?.risk_score || 0);
    return score >= 65; // High/Critical threshold
  });
  const moderateHabitations = safeHabitations.filter(h => {
    const score = Number(h.riskScore || h.risk_score || h.risk_assessment?.risk_score || 0);
    return score >= 40 && score < 65;
  });
  const totalCapacity = Number(stats.totalCapacity || 0);
  const availableBeds = safeShelters.reduce((acc, s) => acc + (s.available || 0), 0);
  const occupiedBeds = totalCapacity - availableBeds;
  const shelterUtilization = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

  // Vulnerability Data
  const totalElderly = safeHabitations.reduce((sum, h) => sum + (h.elderly || 0), 0);
  const totalChildren = safeHabitations.reduce((sum, h) => sum + (h.children || 0), 0);
  const totalMedical = safeHabitations.reduce((sum, h) => sum + (h.medicalPriority || 0), 0);
  const totalGeneral = Math.max(0, popAtRisk - (totalElderly + totalChildren + totalMedical));

  // Resource Data
  const emergencyVehicles = resources?.emergencyVehicles || {};
  const busesAvail = emergencyVehicles.buses || 0;
  const busesReq = emergencyVehicles.requiredBuses || 0;
  const ambAvail = emergencyVehicles.ambulances || 0;
  const ambReq = emergencyVehicles.requiredAmbulances || 0;
  const rescueTrucks = emergencyVehicles.rescueTrucks || 0;
  const personnel = resources?.personnel || {};
  const medicalTeams = personnel.medicalTeams || 0;
  const ndrfUnits = personnel.ndrfUnits || 0;

  const shortagesCount = (busesReq > busesAvail ? 1 : 0) + (ambReq > ambAvail ? 1 : 0);

  // Sorting
  const sortedByRisk = [...safeHabitations].sort((a, b) => b.riskScore - a.riskScore);
  const highestRiskHab = sortedByRisk[0];
  const lowestRiskHab = sortedByRisk[sortedByRisk.length - 1];
  const avgRisk = Math.round(sortedByRisk.reduce((acc, h) => acc + (h.riskScore || 0), 0) / (sortedByRisk.length || 1));

  const sortedShelters = [...safeShelters].sort((a, b) => a.available - b.available);

  // 1. Habitation Risk Score Bar Chart Data
  const riskBarData = {
    labels: safeHabitations.map((h) => h.code || h.name),
    datasets: [
      {
        label: "Risk Score (0-100)",
        data: safeHabitations.map((h) => h.riskScore),
        backgroundColor: safeHabitations.map((h) =>
          h.riskScore > 80 ? "#ef4444" : h.riskScore > 65 ? "#f59e0b" : "#3b82f6"
        ),
        borderRadius: 6,
      },
    ],
  };

  const riskBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Risk Index: ${context.parsed.y}/100`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: textColor, maxRotation: 45, minRotation: 45 },
        grid: { color: gridColor },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
  };

  // 2. Demographic Vulnerability Doughnut Chart Data
  const vulnerabilityData = {
    labels: ["Elderly (60+ yrs)", "Children (<12 yrs)", "Medical Priority", "General Population"],
    datasets: [
      {
        data: [totalElderly, totalChildren, totalMedical, totalGeneral],
        backgroundColor: ["#ef4444", "#f59e0b", "#8b5cf6", "#3b82f6"],
        borderWidth: 2,
        borderColor: isDark ? "#1f293d" : "#ffffff",
      },
    ],
  };

  const vulnerabilityOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
    },
    cutout: "68%",
  };

  // 3. Shelter Capacity Comparison Bar Chart
  const shelterBarData = {
    labels: safeShelters.map((s) => s.code || s.name),
    datasets: [
      {
        label: "Occupied Beds",
        data: safeShelters.map((s) => s.occupied),
        backgroundColor: "#ef4444",
        borderRadius: 4,
      },
      {
        label: "Available Surplus Beds",
        data: safeShelters.map((s) => s.available),
        backgroundColor: "#10b981",
        borderRadius: 4,
      },
    ],
  };

  const shelterBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { color: textColor, boxWidth: 12 },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: textColor, maxRotation: 45, minRotation: 45 },
        grid: { color: gridColor },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: textColor },
        grid: { color: gridColor },
      },
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* HEADER & EXPORT */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="panel-title" style={{ fontSize: "20px", marginBottom: "4px" }}>Operational Decision Analysis</h2>
            <p className="panel-sub" style={{ margin: 0 }}>
              Live multi-hazard reports, resource readiness, and simulation insights
            </p>
          </div>
          <button className="action-btn primary" onClick={onExportReport}>
            📥 Export Operational Report (PDF)
          </button>
        </div>
      </div>

      {/* 1. OPERATIONAL SUMMARY */}
      <div className="grid-3">
        <div className="glass-panel" style={{ padding: "16px", borderTop: "3px solid var(--accent-red)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Population at Risk</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>{popAtRisk.toLocaleString()}</div>
          <div style={{ fontSize: "12px", color: "var(--accent-red)", fontWeight: 600, marginTop: "4px" }}>Across {highCriticalHabitations.length} High/Critical Zones</div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", borderTop: "3px solid var(--accent-safe)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Shelter Network Status</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)" }}>{availableBeds.toLocaleString()} <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>beds available</span></div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>Total Capacity: {totalCapacity.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: "16px", borderTop: "3px solid var(--accent-warning)" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Resource Readiness</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: shortagesCount > 0 ? "var(--accent-warning)" : "var(--accent-safe)" }}>
            {shortagesCount} <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>active shortages</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>Fleet & Personnel monitored</div>
        </div>
      </div>

      <div className="grid-2-1">
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* 2. RISK ANALYSIS */}
          <div className="glass-panel">
            <div className="panel-header" style={{ paddingBottom: "16px" }}>
              <div>
                <div className="panel-title">Habitation Risk Analysis</div>
                <div className="panel-sub">Chart.js hazard score (0-100) per settlement</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Highest Risk</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-red)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={highestRiskHab?.name}>{highestRiskHab?.name || "N/A"}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Lowest Risk</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-safe)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={lowestRiskHab?.name}>{lowestRiskHab?.name || "N/A"}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Avg Score</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{avgRisk} / 100</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Severity Split</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                  <span style={{ color: "var(--accent-red)" }}>{highCriticalHabitations.length} H</span> / <span style={{ color: "var(--accent-warning)" }}>{moderateHabitations.length} M</span>
                </div>
              </div>
            </div>

            <div style={{ height: "230px", padding: "10px 0" }}>
              <Bar data={riskBarData} options={riskBarOptions} />
            </div>
          </div>

          {/* 4. SHELTER CAPACITY ANALYSIS */}
          <div className="glass-panel">
            <div className="panel-header" style={{ paddingBottom: "16px" }}>
              <div>
                <div className="panel-title">Shelter Capacity Analysis</div>
                <div className="panel-sub">Live shelter occupancy across verified safe havens</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Network Capacity</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{totalCapacity.toLocaleString()}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Occupied Beds</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{occupiedBeds.toLocaleString()}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Utilization</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: shelterUtilization >= 90 ? "var(--accent-red)" : shelterUtilization >= 75 ? "var(--accent-warning)" : "var(--accent-safe)" }}>{shelterUtilization}%</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "6px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Lowest Reserve</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent-red)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={sortedShelters[0]?.name}>
                  {sortedShelters[0]?.name || "N/A"}
                </div>
              </div>
            </div>

            <div style={{ height: "240px", padding: "10px 0" }}>
              <Bar data={shelterBarData} options={shelterBarOptions} />
            </div>
          </div>

          {/* 8. SIMULATION ANALYSIS (Conditionally rendered) */}
          {simulationResult ? (
            <div className="glass-panel" style={{ borderLeft: "4px solid var(--accent-cyan)", background: "rgba(6, 182, 212, 0.03)" }}>
              <div className="panel-header" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
                <div>
                  <div className="panel-title" style={{ color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="pulse-blue" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-cyan)", display: "inline-block" }}></span>
                    Latest Simulation Analysis
                  </div>
                  <div className="panel-sub">Result generated on {simulationResult.date} {simulationResult.timestamp}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Scenario Inputs</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Rainfall:</span> <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{simulationResult.scenario?.rainfall} mm/hr</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Slope Instability:</span> <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{simulationResult.scenario?.slopeInstability}%</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>River Surge:</span> <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{simulationResult.scenario?.riverLevel} m</span></div>
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Projected Threat</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontSize: "28px", fontWeight: 700, color: simulationResult.threatLevel === "CRITICAL" ? "var(--accent-red)" : "var(--accent-warning)" }}>{simulationResult.riskIndex}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", background: "var(--bg-secondary)", padding: "2px 6px", borderRadius: "4px" }}>{simulationResult.threatLevel}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Projected Operational Constraints</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                    <div style={{ background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: "4px" }}>
                      <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Habitations Affected</div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{simulationResult.affectedHabitations?.length || 0} Zones</div>
                    </div>
                    <div style={{ background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: "4px" }}>
                      <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Shelter Capacity</div>
                      <div style={{ fontWeight: 600, color: simulationResult.shelterImpact?.capacityShortfall > 0 ? "var(--accent-red)" : "var(--accent-safe)" }}>
                        {simulationResult.shelterImpact?.capacityShortfall > 0 ? `Shortfall: ${simulationResult.shelterImpact.capacityShortfall}` : `Surplus: ${simulationResult.shelterImpact?.capacitySurplus}`}
                      </div>
                    </div>
                    <div style={{ background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: "4px" }}>
                      <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Bus Fleet</div>
                      <div style={{ fontWeight: 600, color: simulationResult.resourceImpact?.busShortfall > 0 ? "var(--accent-red)" : "var(--accent-safe)" }}>
                        {simulationResult.resourceImpact?.busShortfall > 0 ? `Shortfall: ${simulationResult.resourceImpact.busShortfall}` : 'Sufficient'}
                      </div>
                    </div>
                    <div style={{ background: "var(--bg-secondary)", padding: "8px 12px", borderRadius: "4px" }}>
                      <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>Ambulance Fleet</div>
                      <div style={{ fontWeight: 600, color: simulationResult.resourceImpact?.ambulanceShortfall > 0 ? "var(--accent-red)" : "var(--accent-safe)" }}>
                        {simulationResult.resourceImpact?.ambulanceShortfall > 0 ? `Shortfall: ${simulationResult.resourceImpact.ambulanceShortfall}` : 'Sufficient'}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", padding: "12px", background: "rgba(0,0,0,0.2)", borderRadius: "6px", fontSize: "13px", color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                    "{simulationResult.operationalSummary}"
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "32px", textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>NO SIMULATION RESULT AVAILABLE</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px" }}>Run a scenario in the Hazard Simulator to view projected impact analysis.</div>
            </div>
          )}

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* 3. VULNERABILITY ANALYSIS */}
          <div className="glass-panel">
            <div className="panel-header" style={{ paddingBottom: "16px" }}>
              <div>
                <div className="panel-title">Vulnerability Analysis</div>
                <div className="panel-sub">Population composition at risk</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ flex: 1, height: "180px" }}>
                <Doughnut data={vulnerabilityData} options={vulnerabilityOptions} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: 10, height: 10, background: "#ef4444", borderRadius: 2 }}></span> <span style={{ color: "var(--text-secondary)" }}>Elderly (60+)</span></div>
                  <strong style={{ color: "var(--text-primary)" }}>{totalElderly.toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: 10, height: 10, background: "#f59e0b", borderRadius: 2 }}></span> <span style={{ color: "var(--text-secondary)" }}>Children (&lt;12)</span></div>
                  <strong style={{ color: "var(--text-primary)" }}>{totalChildren.toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: 10, height: 10, background: "#8b5cf6", borderRadius: 2 }}></span> <span style={{ color: "var(--text-secondary)" }}>Medical Priority</span></div>
                  <strong style={{ color: "var(--text-primary)" }}>{totalMedical.toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: 10, height: 10, background: "#3b82f6", borderRadius: 2 }}></span> <span style={{ color: "var(--text-secondary)" }}>General</span></div>
                  <strong style={{ color: "var(--text-primary)" }}>{totalGeneral.toLocaleString()}</strong>
                </div>
                <div style={{ borderTop: "1px solid var(--border-color)", marginTop: "4px", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Total At Risk</span>
                  <strong style={{ color: "var(--text-primary)" }}>{popAtRisk.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 5. RESOURCE READINESS */}
          <div className="glass-panel">
            <div className="panel-header" style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-color)", marginBottom: "16px" }}>
              <div>
                <div className="panel-title">Resource Readiness</div>
                <div className="panel-sub">Deployment fleet and personnel status</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)", padding: "12px", borderRadius: "6px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Evacuation Buses</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{busesAvail} available / {busesReq} required</div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", background: busesAvail >= busesReq ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: busesAvail >= busesReq ? "var(--accent-safe)" : "var(--accent-red)" }}>
                  {busesAvail >= busesReq ? "SUFFICIENT" : `SHORTFALL: ${busesReq - busesAvail}`}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)", padding: "12px", borderRadius: "6px" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Ambulances</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{ambAvail} available / {ambReq} required</div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, padding: "4px 8px", borderRadius: "4px", background: ambAvail >= ambReq ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", color: ambAvail >= ambReq ? "var(--accent-safe)" : "var(--accent-red)" }}>
                  {ambAvail >= ambReq ? "SUFFICIENT" : `SHORTFALL: ${ambReq - ambAvail}`}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Rescue Trucks Active</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{rescueTrucks} Units</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Medical Teams Deployed</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{medicalTeams} Teams</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>NDRF Units Active</span>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{ndrfUnits} Units</span>
              </div>
            </div>
          </div>

          {/* 6. OPERATIONAL INSIGHTS */}
          <div className="glass-panel" style={{ borderLeft: "3px solid var(--accent-blue)" }}>
            <div className="panel-header" style={{ paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid var(--border-color)" }}>
              <div className="panel-title">Operational Insights</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "13px", lineHeight: 1.5, color: "var(--text-primary)" }}>
              {highestRiskHab && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ color: "var(--accent-red)", fontWeight: 700 }}>•</span>
                  <span><strong>{highestRiskHab.name}</strong> presents the highest active risk factor ({highestRiskHab.riskScore}/100) and requires priority operational attention.</span>
                </div>
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--accent-blue)", fontWeight: 700 }}>•</span>
                <span>The regional shelter network is operating at <strong>{shelterUtilization}% capacity</strong>, with {availableBeds.toLocaleString()} beds currently held in reserve.</span>
              </div>

              {shortagesCount > 0 ? (
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ color: "var(--accent-warning)", fontWeight: 700 }}>•</span>
                  <span>Active transport shortages detected. Immediate mobilization of reserve fleet required to meet pending evacuation demands.</span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ color: "var(--accent-safe)", fontWeight: 700 }}>•</span>
                  <span>Current transport logistics are sufficient for identified evacuation requirements.</span>
                </div>
              )}

              {totalMedical > 0 && (
                <div style={{ display: "flex", gap: "8px" }}>
                  <span style={{ color: "var(--accent-blue)", fontWeight: 700 }}>•</span>
                  <span><strong>{totalMedical.toLocaleString()}</strong> individuals identified with medical priority requiring specialized evacuation handling.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AnalyticsView;
