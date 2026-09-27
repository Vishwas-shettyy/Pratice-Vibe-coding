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

function AnalyticsView({ habitations = [], shelters = [], stats = {}, theme = "dark", onExportReport }) {
  const isDark = theme === "dark";
  const textColor = isDark ? "#9ca3af" : "#475569";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";

  // 1. Habitation Risk Score Bar Chart Data
  const riskBarData = {
    labels: habitations.map((h) => h.code || h.name),
    datasets: [
      {
        label: "Risk Score (0-100)",
        data: habitations.map((h) => h.riskScore),
        backgroundColor: habitations.map((h) =>
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
        ticks: { color: textColor },
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
  const totalElderly = habitations.reduce((sum, h) => sum + (h.elderly || 0), 0);
  const totalChildren = habitations.reduce((sum, h) => sum + (h.children || 0), 0);
  const totalMedical = habitations.reduce((sum, h) => sum + (h.medicalPriority || 0), 0);
  const totalPop = stats.populationAtRisk || habitations.reduce((sum, h) => sum + (h.population || 0), 0);
  const totalGeneral = Math.max(0, totalPop - (totalElderly + totalChildren + totalMedical));

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
        position: "right",
        labels: { color: textColor, boxWidth: 12, padding: 12 },
      },
    },
    cutout: "68%",
  };

  // 3. Shelter Capacity Comparison Bar Chart
  const shelterBarData = {
    labels: shelters.map((s) => s.code || s.name),
    datasets: [
      {
        label: "Occupied Beds",
        data: shelters.map((s) => s.occupied),
        backgroundColor: "#ef4444",
        borderRadius: 4,
      },
      {
        label: "Available Surplus Beds",
        data: shelters.map((s) => s.available),
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
        ticks: { color: textColor },
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="glass-panel" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 className="panel-title">Disaster Analytics & Chart.js Intelligence</h2>
            <p className="panel-sub">
              Live multi-hazard vulnerability curves, shelter occupancy audits, and demographic analytics
            </p>
          </div>
          <button className="action-btn primary" onClick={onExportReport}>
            📥 Download Executive GIS Report (PDF)
          </button>
        </div>
      </div>

      <div className="grid-1-1">
        {/* CHART 1: HABITATION RISK SCORE (BAR CHART) */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Habitation Risk Index Breakdown</div>
              <div className="panel-sub">Chart.js hazard score (0-100) per settlement</div>
            </div>
          </div>
          <div style={{ height: "230px", padding: "10px 0" }}>
            <Bar data={riskBarData} options={riskBarOptions} />
          </div>
        </div>

        {/* CHART 2: DEMOGRAPHIC VULNERABILITY (DOUGHNUT CHART) */}
        <div className="glass-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Population Vulnerability Composition</div>
              <div className="panel-sub">Total population at risk: {totalPop.toLocaleString()}</div>
            </div>
          </div>
          <div style={{ height: "230px", padding: "10px 0" }}>
            <Doughnut data={vulnerabilityData} options={vulnerabilityOptions} />
          </div>
        </div>
      </div>

      {/* CHART 3: SHELTER CAPACITY COMPARISON */}
      <div className="glass-panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Shelter Capacity vs Occupied Beds</div>
            <div className="panel-sub">Live shelter occupancy analysis across verified safe havens</div>
          </div>
        </div>
        <div style={{ height: "240px", padding: "10px 0" }}>
          <Bar data={shelterBarData} options={shelterBarOptions} />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsView;
