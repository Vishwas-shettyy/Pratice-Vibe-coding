/**
 * API Service Client for Flask REST Backend
 * Handles async fetch requests, error handling, loading states, and fallback defaults.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api";

async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const rawText = await response.text();
    let result = {};

    if (rawText) {
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error("Backend returned an invalid JSON response.");
      }
    }

    if (!response.ok || !result.success) {
      throw new Error(result?.error?.message || result?.message || `HTTP ${response.status}: API request failed`);
    }

    return result.data;
  } catch (error) {
    console.warn(`[API Client Warning] Failed to fetch ${endpoint}:`, error.message);
    throw error;
  }
}

export const api = {
  // Health
  getHealth: () => fetchAPI("/health"),

  // Dashboard Stats
  getDashboardStats: () => fetchAPI("/dashboard/stats"),

  // Risk Areas / Habitations
  getRiskAreas: () => fetchAPI("/risk-areas"),
  getRiskAreaById: (id) => fetchAPI(`/risk-areas/${id}`),

  // GIS Map Data
  getMapData: () => fetchAPI("/map"),

  // Relocation
  getRelocationPriorities: () => fetchAPI("/relocation/priorities"),
  getRelocationWorkflow: () => fetchAPI("/relocation/workflow"),
  assignShelter: (areaId, shelterId) =>
    fetchAPI(`/relocation/${areaId}/assign`, {
      method: "POST",
      body: JSON.stringify({ shelterId }),
    }),
  updateRelocationStatus: (areaId, status, progress) =>
    fetchAPI(`/relocation/${areaId}/update-status`, {
      method: "POST",
      body: JSON.stringify({ status, progress }),
    }),

  // Shelters
  getShelters: () => fetchAPI("/shelters"),

  // Resources
  getResources: () => fetchAPI("/resources"),

  // Alerts
  getAlerts: () => fetchAPI("/alerts"),

  // Recommendations
  getRecommendations: () => fetchAPI("/recommendations"),

  // Simulation
  runSimulationImpact: (payload) =>
    fetchAPI(`/simulation/impact`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Environmental Observations (Real Data Feed)
  getEnvironmentalObservations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/environmental-observations${query ? `?${query}` : ""}`);
  },

  // Reports
  getReports: () => fetchAPI("/reports"),

  // Scenarios & Relocation Scenario Engine
  getScenarios: () => fetchAPI("/scenarios"),
  runScenario: (scenarioId) => fetchAPI(`/scenarios/${scenarioId}/run`, { method: "POST" }),
  runScenarioRelocation: (scenarioId) => fetchAPI(`/relocation/scenario/${scenarioId}/run`, { method: "POST" }),
  getScenarioRoadImpacts: (scenarioId) => fetchAPI(`/scenarios/${scenarioId}/road-impacts`),
};
